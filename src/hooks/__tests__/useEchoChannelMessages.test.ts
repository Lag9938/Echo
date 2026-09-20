import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEchoChannelMessages } from '../useEchoChannelMessages'
import type { Channel, Space } from '../../types'
import type { User } from '@supabase/supabase-js'

describe('useEchoChannelMessages', () => {
  const mockUser: User = {
    id: 'test-user-id',
    email: 'user@echo.gg',
    user_metadata: { display_name: 'TestUser' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as any

  const mockChannel: Channel = {
    id: 'channel-1',
    space_id: 'space-1',
    name: 'geral',
    type: 'text',
    position: 0
  }

  const mockSpace: Space = {
    id: 'space-1',
    name: 'Comunidade Teste',
    description: 'Comunidade de testes unitários',
    creator_id: 'test-user-id',
    created_at: new Date().toISOString()
  }

  let mockSupabase: any
  let showToastMock: any
  let setErrorMock: any
  let canUserDoMock: any

  beforeEach(() => {
    localStorage.clear()
    showToastMock = vi.fn()
    setErrorMock = vi.fn()
    canUserDoMock = vi.fn().mockReturnValue(true)

    const mockSelectChain: any = {
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'db-msg-123',
          channel_id: 'channel-1',
          body: 'Olá mundo',
          created_at: new Date().toISOString(),
          author_id: 'test-user-id',
          profiles: { display_name: 'TestUser', avatar_url: '' }
        },
        error: null
      })
    }

    const mockRealtimeChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn(),
      send: vi.fn().mockResolvedValue(undefined)
    }

    mockSupabase = {
      channel: vi.fn().mockReturnValue(mockRealtimeChannel),
      removeChannel: vi.fn(),
      from: vi.fn().mockImplementation((_table: string) => ({
        select: vi.fn().mockReturnValue(mockSelectChain),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockSelectChain)
        }),
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
              then: vi.fn().mockImplementation((cb: any) => cb({ error: null }))
            }),
            then: vi.fn().mockImplementation((cb: any) => cb({ error: null }))
          })
        }),
        upsert: vi.fn().mockReturnValue({
          then: vi.fn().mockImplementation((cb: any) => cb({ error: null }))
        })
      })),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://echo.gg/file.png' } })
        })
      }
    }
  })

  function setupHook(customProps = {}) {
    return renderHook(() =>
      useEchoChannelMessages({
        user: mockUser,
        profileDisplayName: 'TestUser',
        displayName: 'TestUser',
        selectedChannel: mockChannel,
        spaces: [mockSpace],
        sfxVolume: 1,
        canUserDo: canUserDoMock,
        showToast: showToastMock,
        setError: setErrorMock,
        playDmNotificationSound: vi.fn(),
        supabase: mockSupabase,
        ...customProps
      })
    )
  }

  it('inicializa com estado padrão e lista de mensagens vazia', () => {
    const { result } = setupHook()
    expect(result.current.draft).toBe('')
    expect(result.current.slowmodeCooldown).toBe(0)
    expect(result.current.isUploading).toBe(false)
  })

  it('envia mensagem otimista e atualiza com ID oficial do banco', async () => {
    const { result } = setupHook()

    await act(async () => {
      await result.current.postChannelMessage('channel-1', 'Olá mundo')
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('messages')
    expect(result.current.messages.length).toBe(1)
    expect(result.current.messages[0].id).toBe('db-msg-123')
    expect(result.current.messages[0].status).toBe('sent')
    expect(result.current.messages[0].body).toBe('Olá mundo')
  })

  it('permite alternar reações com emoji (adicionar e remover)', () => {
    const { result } = setupHook()
    const msgId = 'msg-react-1'

    // Adiciona reação
    act(() => {
      result.current.toggleReaction(msgId, '🔥')
    })

    expect(result.current.messageReactions[msgId]?.['🔥']).toContain('test-user-id')
    expect(mockSupabase.from).toHaveBeenCalledWith('message_reactions')

    // Remove reação ao clicar novamente
    act(() => {
      result.current.toggleReaction(msgId, '🔥')
    })

    expect(result.current.messageReactions[msgId]?.['🔥']).toBeUndefined()
  })

  it('exclui mensagem com sucesso se o usuário for o autor', async () => {
    const { result } = setupHook()

    // Preenche com mensagem existente
    act(() => {
      result.current.setMessages([
        {
          id: 'msg-to-delete',
          channel_id: 'channel-1',
          body: 'Vou ser apagada',
          created_at: new Date().toISOString(),
          author_id: 'test-user-id',
          status: 'sent'
        }
      ])
    })

    expect(result.current.messages.length).toBe(1)

    await act(async () => {
      await result.current.handleDeleteMessage('msg-to-delete')
    })

    expect(result.current.messages.length).toBe(0)
    expect(showToastMock).toHaveBeenCalledWith('Mensagem Excluída', expect.any(String), 'info')
  })

  it('bloqueia exclusão de mensagem de outro autor se não tiver permissão', async () => {
    canUserDoMock.mockReturnValue(false)
    const otherUserSpace: Space = { ...mockSpace, creator_id: 'other-owner' }

    const { result } = setupHook({
      spaces: [otherUserSpace],
      canUserDo: canUserDoMock
    })

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      result.current.setMessages([
        {
          id: 'msg-other-user',
          channel_id: 'channel-1',
          body: 'Mensagem alheia',
          created_at: new Date().toISOString(),
          author_id: 'another-user-999',
          status: 'sent'
        }
      ])
    })

    await act(async () => {
      await result.current.handleDeleteMessage('msg-other-user')
    })

    // Mensagem não deve ter sido removida
    expect(result.current.messages.length).toBe(1)
    expect(showToastMock).toHaveBeenCalledWith('Permissão Negada', expect.any(String), 'info')
  })
})
