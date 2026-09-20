import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEchoFriendships } from '../useEchoFriendships'
import type { User } from '@supabase/supabase-js'

describe('useEchoFriendships', () => {
  const mockUser: User = {
    id: 'my-user-id',
    email: 'me@echo.gg',
    user_metadata: { display_name: 'MinhaConta' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as any

  let mockSupabase: any
  let showToastMock: any
  let setErrorMock: any
  let playFriendRequestSoundMock: any
  let playFriendAcceptSoundMock: any
  let socialChannelRef: any

  beforeEach(() => {
    showToastMock = vi.fn()
    setErrorMock = vi.fn()
    playFriendRequestSoundMock = vi.fn()
    playFriendAcceptSoundMock = vi.fn()
    socialChannelRef = { current: { send: vi.fn().mockResolvedValue(undefined) } }

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'friendships') {
          return {
            select: vi.fn().mockReturnValue({
              or: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'friendship-1',
                    status: 'accepted',
                    user_id: 'my-user-id',
                    friend_id: 'friend-2',
                    friend: { id: 'friend-2', display_name: 'CyberFriend', avatar_url: '' }
                  },
                  {
                    id: 'friendship-2',
                    status: 'pending',
                    user_id: 'stranger-3',
                    friend_id: 'my-user-id',
                    user: { id: 'stranger-3', display_name: 'NovoUsuario', avatar_url: '' }
                  }
                ],
                error: null
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            }),
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              ilike: vi.fn().mockResolvedValue({
                data: [{ id: 'target-99', display_name: 'GamerAlvo', avatar_url: '' }],
                error: null
              })
            })
          }
        }
        return {}
      })
    }
  })

  function setupHook() {
    return renderHook(() =>
      useEchoFriendships({
        user: mockUser,
        profileDisplayName: 'MinhaConta',
        displayName: 'MinhaConta',
        socialChannelRef,
        sfxVolume: 1,
        showToast: showToastMock,
        triggerDesktopNotification: vi.fn(),
        setError: setErrorMock,
        setOnlineUsers: vi.fn(),
        setPresenceData: vi.fn(),
        playFriendRequestSound: playFriendRequestSoundMock,
        playFriendAcceptSound: playFriendAcceptSoundMock,
        supabase: mockSupabase
      })
    )
  }

  it('inicializa com lista de amizades vazia', () => {
    const { result } = setupHook()
    expect(result.current.friendships).toEqual([])
    expect(result.current.pendingFriendCount).toBe(0)
    expect(result.current.friendSearchQuery).toBe('')
  })

  it('carrega lista de amizades e contabiliza solicitações pendentes recebidas', async () => {
    const { result } = setupHook()

    await act(async () => {
      await result.current.loadFriendships()
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('friendships')
    expect(result.current.friendships.length).toBe(2)
    // 1 pendente recebida de stranger-3
    expect(result.current.pendingFriendCount).toBe(1)
  })

  it('aceita solicitação de amizade com sucesso e emite som e broadcast', async () => {
    const { result } = setupHook()

    await act(async () => {
      await result.current.loadFriendships()
    })

    await act(async () => {
      await result.current.acceptFriendRequest('friendship-2')
    })

    expect(playFriendAcceptSoundMock).toHaveBeenCalledWith(1)
    expect(showToastMock).toHaveBeenCalledWith('Amizade Aceita!', expect.any(String), 'friend')
    expect(socialChannelRef.current.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'friend-event',
        payload: expect.objectContaining({
          type: 'friend-request-accepted',
          targetUserId: 'stranger-3'
        })
      })
    )
  })

  it('detecta quando o usuário já é amigo ao tentar enviar pedido para mesmo ID', async () => {
    const { result } = setupHook()

    await act(async () => {
      await result.current.loadFriendships()
    })

    await act(async () => {
      await result.current.sendFriendRequestToUser('friend-2', 'CyberFriend')
    })

    expect(showToastMock).toHaveBeenCalledWith('Já são amigos', expect.any(String), 'info')
  })

  it('cancela ou desfaz amizade chamando delete no Supabase e disparando broadcast', async () => {
    const { result } = setupHook()

    await act(async () => {
      await result.current.loadFriendships()
    })

    await act(async () => {
      await result.current.removeFriendship('friendship-1')
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('friendships')
    expect(socialChannelRef.current.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'broadcast',
        event: 'friend-event',
        payload: expect.objectContaining({
          type: 'friend-removed',
          targetUserId: 'friend-2'
        })
      })
    )
  })
})
