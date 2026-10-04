import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEchoChannelMessages } from '../useEchoChannelMessages'
import type { Channel, Space } from '../../types'
import type { User } from '@supabase/supabase-js'
import { onNotice } from '../../lib/realtimeNotices'

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
      is: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
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

  describe('chat de texto da chamada (canal de voz)', () => {
    const voiceChannel: Channel = { id: 'voice-1', space_id: 'space-1', name: 'Callzinha', type: 'voice', position: 1 }
    const row = (id: string, body: string) => ({
      id, channel_id: 'voice-1', body, created_at: new Date().toISOString(), author_id: 'ana', profiles: { display_name: 'Ana' }
    })

    it('carrega as mensagens do canal de voz e ouve as novas em tempo real, como num canal de texto', async () => {
      // Bug real: canal de voz não carregava nem ouvia nada; o chat da chamada mostrava as mensagens do
      // último canal de texto aberto e ficava vazio ao reabrir.
      const limit = vi.fn().mockResolvedValue({ data: [row('m2', 'segunda'), row('m1', 'primeira')], error: null })
      const eq = vi.fn().mockReturnThis()
      mockSupabase.from = vi.fn().mockImplementation(() => ({
        select: vi.fn().mockReturnValue({ eq, is: vi.fn().mockReturnThis(), lt: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit, in: vi.fn().mockResolvedValue({ data: [], error: null }) })
      }))

      const { result } = setupHook({ selectedChannel: voiceChannel })

      await vi.waitFor(() => expect(result.current.messages.map((m) => m.body)).toEqual(['primeira', 'segunda']))
      expect(eq).toHaveBeenCalledWith('channel_id', 'voice-1')
      expect(mockSupabase.channel).toHaveBeenCalledWith('room-messages-voice-1', expect.objectContaining({ config: expect.objectContaining({ private: true }) }))
    })

    it('mensagem nova que chega pelo tempo real aparece no chat da chamada', async () => {
      const handlers: Record<string, (event: { payload: any }) => void> = {}
      const realtime = {
        on: vi.fn((_kind: string, filter: { event?: string }, handler: (event: { payload: any }) => void) => {
          if (filter?.event) handlers[filter.event] = handler
          return realtime
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        send: vi.fn().mockResolvedValue(undefined)
      }
      mockSupabase.channel = vi.fn().mockReturnValue(realtime)

      const { result } = setupHook({ selectedChannel: voiceChannel })
      await vi.waitFor(() => expect(handlers['new-message']).toBeTypeOf('function'))

      act(() => handlers['new-message']({ payload: { ...row('m9', '🎵 Tocando agora'), profile: { display_name: 'Echo Music Bot' } } }))

      expect(result.current.messages.map((m) => m.body)).toContain('🎵 Tocando agora')
    })
  })

  describe('avisos do banco no canal aberto (sem ouvintes de tabela)', () => {
    function captureRealtime() {
      const handlers: Record<string, (event: { payload: any }) => void> = {}
      const kinds: string[] = []
      const realtime = {
        on: vi.fn((kind: string, filter: { event?: string }, handler: (event: { payload: any }) => void) => {
          kinds.push(kind)
          if (filter?.event) handlers[filter.event] = handler
          return realtime
        }),
        subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
        send: vi.fn().mockResolvedValue(undefined)
      }
      mockSupabase.channel = vi.fn().mockReturnValue(realtime)
      return { handlers, kinds }
    }

    it('o canal aberto não usa mais postgres_changes: só broadcast em canal privado', async () => {
      const { handlers, kinds } = captureRealtime()
      setupHook()
      await vi.waitFor(() => expect(handlers['update-message']).toBeTypeOf('function'))
      expect(kinds.every((kind) => kind === 'broadcast')).toBe(true)
      expect(mockSupabase.channel).toHaveBeenCalledTimes(1)
      expect(mockSupabase.channel).toHaveBeenCalledWith('room-messages-channel-1', expect.objectContaining({ config: expect.objectContaining({ private: true }) }))
    })

    it('mensagem editada por outra pessoa recarrega o canal; edição de resposta de tópico não', async () => {
      const { handlers } = captureRealtime()
      setupHook()
      await vi.waitFor(() => expect(handlers['update-message']).toBeTypeOf('function'))
      const messageLoads = () => mockSupabase.from.mock.calls.filter(([table]: [string]) => table === 'messages').length
      await vi.waitFor(() => expect(messageLoads()).toBeGreaterThan(0))
      const before = messageLoads()

      act(() => handlers['update-message']({ payload: { id: 'm1', channel_id: 'channel-1', body: 'editada', thread_root_id: 'raiz' } }))
      expect(messageLoads()).toBe(before)

      act(() => handlers['update-message']({ payload: { id: 'm1', channel_id: 'outro-canal', body: 'editada' } }))
      expect(messageLoads()).toBe(before)

      act(() => handlers['update-message']({ payload: { id: 'm1', channel_id: 'channel-1', body: 'editada' } }))
      await vi.waitFor(() => expect(messageLoads()).toBeGreaterThan(before))
    })

    it('reação de outra pessoa recarrega as reações do canal', async () => {
      const { handlers } = captureRealtime()
      setupHook()
      await vi.waitFor(() => expect(handlers['reactions-changed']).toBeTypeOf('function'))
      const reactionLoads = () => mockSupabase.from.mock.calls.filter(([table]: [string]) => table === 'message_reactions').length
      act(() => handlers['new-message']({ payload: { id: 'm1', channel_id: 'channel-1', body: 'oi', author_id: 'ana', created_at: new Date().toISOString() } }))
      const before = reactionLoads()

      act(() => handlers['reactions-changed']({ payload: { message_id: 'm1', channel_id: 'channel-1' } }))

      await vi.waitFor(() => expect(reactionLoads()).toBeGreaterThan(before))
    })

    it('fixada mudou: repassa o aviso para quem cuida das fixadas, dizendo o canal', async () => {
      const { handlers } = captureRealtime()
      const seen: any[] = []
      const stop = onNotice('pins-changed', (notice) => seen.push(notice))
      setupHook()
      await vi.waitFor(() => expect(handlers['pins-changed']).toBeTypeOf('function'))

      act(() => handlers['pins-changed']({ payload: { channel_id: 'channel-1' } }))
      stop()

      expect(seen).toEqual([{ channel_id: 'channel-1' }])
    })
  })

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
