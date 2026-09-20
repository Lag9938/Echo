import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEchoSpaces } from '../useEchoSpaces'
import { useSpacesStore } from '../../stores/useSpacesStore'
import type { User } from '@supabase/supabase-js'

describe('useEchoSpaces', () => {
  const mockUser: User = {
    id: 'user-space-owner',
    email: 'admin@echo.gg',
    user_metadata: { display_name: 'DonoDoServer' },
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  } as any

  let mockSupabase: any
  let showToastMock: any
  let setErrorMock: any
  let setPageMock: any

  beforeEach(() => {
    localStorage.clear()
    useSpacesStore.setState({
      spaces: [],
      expandedSpace: null,
      selectedChannel: null,
      spaceChannels: {},
      spaceMembersMap: {},
      spaceMembers: []
    })

    showToastMock = vi.fn()
    setErrorMock = vi.fn()
    setPageMock = vi.fn()

    const mockRealtimeChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      unsubscribe: vi.fn(),
      track: vi.fn().mockResolvedValue(undefined),
      untrack: vi.fn().mockResolvedValue(undefined)
    }

    mockSupabase = {
      channel: vi.fn().mockReturnValue(mockRealtimeChannel),
      removeChannel: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'spaces') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'space-alpha',
                    name: 'Comunidade Alfa',
                    creator_id: 'user-space-owner',
                    created_at: new Date().toISOString()
                  },
                  {
                    id: 'space-beta',
                    name: 'Comunidade Beta',
                    creator_id: 'other-user',
                    created_at: new Date().toISOString()
                  }
                ],
                error: null
              })
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'space-new', name: 'Novo Espaço', creator_id: 'user-space-owner' },
                  error: null
                })
              })
            })
          }
        }
        if (table === 'space_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    spaces: {
                      id: 'space-alpha',
                      name: 'Comunidade Alfa',
                      creator_id: 'user-space-owner',
                      created_at: new Date().toISOString()
                    }
                  }
                ],
                error: null
              })
            }),
            insert: vi.fn().mockResolvedValue({ error: null })
          }
        }
        if (table === 'profiles') {
          return {
            upsert: vi.fn().mockResolvedValue({ error: null }),
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [], error: null })
            })
          }
        }
        if (table === 'channels') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'ch-text-1', name: 'geral', type: 'text', space_id: 'space-alpha', position: 0 },
                    { id: 'ch-voice-1', name: 'Lobby', type: 'voice', space_id: 'space-alpha', position: 1 }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
          upsert: vi.fn().mockResolvedValue({ error: null })
        }
      })
    }
  })

  function setupHook() {
    return renderHook(() =>
      useEchoSpaces({
        user: mockUser,
        displayName: 'DonoDoServer',
        setPage: setPageMock,
        showToast: showToastMock,
        setError: setErrorMock,
        supabase: mockSupabase
      })
    )
  }

  it('inicializa com estados padrão vazios', () => {
    const { result } = setupHook()
    expect(result.current.spaces).toEqual([])
    expect(result.current.expandedSpace).toBeNull()
    expect(result.current.selectedChannel).toBeNull()
  })

  it('carrega espaços do usuário e seleciona o primeiro por padrão', async () => {
    const { result } = setupHook()

    await act(async () => {
      await result.current.loadSpaces()
    })

    expect(result.current.spaces.length).toBe(1)
    expect(result.current.spaces[0].id).toBe('space-alpha')
    expect(result.current.expandedSpace).toBe('space-alpha')
    // Verifica sincronização com store Zustand
    expect(useSpacesStore.getState().spaces.length).toBe(1)
  })

  it('carrega canais para um espaço e seleciona o primeiro canal de texto', async () => {
    const { result } = setupHook()

    await act(async () => {
      await result.current.loadChannelsForSpace('space-alpha')
    })

    expect(result.current.spaceChannels['space-alpha']).toBeDefined()
    expect(result.current.spaceChannels['space-alpha'].length).toBe(2)
    expect(result.current.selectedChannel?.id).toBe('ch-text-1')
    expect(result.current.selectedChannel?.name).toBe('geral')
  })

  it('isola membros rigorosamente por spaceId', async () => {
    const { result } = setupHook()

    // Define o espaço ativo
    act(() => {
      result.current.setExpandedSpace('space-alpha')
    })

    // Adiciona membros ao espaço alfa
    act(() => {
      result.current.setSpaceMembers([
        { id: 'member-1', user: { display_name: 'Membro Alfa 1' } },
        { id: 'member-2', user: { display_name: 'Membro Alfa 2' } }
      ])
    })

    expect(result.current.spaceMembers.length).toBe(2)
    expect(useSpacesStore.getState().spaceMembersMap['space-alpha']?.length).toBe(2)
    expect(useSpacesStore.getState().spaceMembersMap['space-beta']).toBeUndefined()

    // Alterna para o espaço beta
    act(() => {
      result.current.setExpandedSpace('space-beta')
    })

    // No espaço beta, a lista de membros deve estar vazia (isolamento preservado)
    expect(result.current.spaceMembers.length).toBe(0)

    // Adiciona membro ao espaço beta
    act(() => {
      result.current.setSpaceMembers([
        { id: 'member-3', user: { display_name: 'Membro Beta 1' } }
      ])
    })

    expect(result.current.spaceMembers.length).toBe(1)
    // O espaço alfa continua intacto com seus 2 membros
    expect(useSpacesStore.getState().spaceMembersMap['space-alpha']?.length).toBe(2)
  })
})
