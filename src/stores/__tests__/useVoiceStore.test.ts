import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useVoiceStore, findTargetVoiceChannel } from '../useVoiceStore'
import type { VoiceParticipant } from '../../lib/useVoiceChannel'

describe('useVoiceStore', () => {
  beforeEach(() => {
    useVoiceStore.getState().resetVoiceState()
  })

  it('inicializa com estado desconectado padrão', () => {
    const state = useVoiceStore.getState()
    expect(state.isConnected).toBe(false)
    expect(state.activeVoiceChannelId).toBeNull()
    expect(state.activeVoiceChannel).toBeNull()
    expect(state.participants).toEqual([])
    expect(state.isMuted).toBe(false)
    expect(state.isDeafened).toBe(false)
    expect(state.isVoiceReconnecting).toBe(false)
  })

  it('permite atualizar participantes e canais de forma reativa', () => {
    const mockParticipant: VoiceParticipant = {
      userId: 'user-123',
      displayName: 'Alice',
      isSpeaking: false,
      isMuted: false,
      isDeafened: false
    }

    useVoiceStore.getState().setActiveVoiceChannelId('voice-ch-1')
    useVoiceStore.getState().setParticipants([mockParticipant])

    expect(useVoiceStore.getState().activeVoiceChannelId).toBe('voice-ch-1')
    expect(useVoiceStore.getState().participants).toHaveLength(1)
    expect(useVoiceStore.getState().participants[0].displayName).toBe('Alice')
  })

  it('localiza o canal de voz correto usando findTargetVoiceChannel', () => {
    useVoiceStore.getState().setActiveVoiceChannelId('call-channel-alpha')
    useVoiceStore.getState().setParticipants([
      { userId: 'user-bob', displayName: 'Bob', isSpeaking: true }
    ])
    useVoiceStore.getState().setSpaceVoiceUsers({
      'call-channel-beta': [
        { userId: 'user-charlie', displayName: 'Charlie', isSpeaking: false }
      ]
    })

    expect(findTargetVoiceChannel('user-bob')).toBe('call-channel-alpha')
    expect(findTargetVoiceChannel('user-charlie')).toBe('call-channel-beta')
    expect(findTargetVoiceChannel('user-nonexistent')).toBeNull()
  })

  it('registra e despacha ações estáveis de voz', async () => {
    const mockJoin = vi.fn().mockResolvedValue(undefined)
    const mockToggleMute = vi.fn()

    useVoiceStore.getState().registerActions({
      handleJoinVoice: mockJoin,
      handleToggleMute: mockToggleMute
    })

    await useVoiceStore.getState().handleJoinVoice('ch-99', 'space-1')
    useVoiceStore.getState().handleToggleMute()

    expect(mockJoin).toHaveBeenCalledWith('ch-99', 'space-1')
    expect(mockToggleMute).toHaveBeenCalledTimes(1)
  })

  it('reseta o estado ao sair da chamada', () => {
    useVoiceStore.getState().setVoiceState({
      isConnected: true,
      activeVoiceChannelId: 'room-1',
      isMuted: true,
      isDeafened: true,
      isVoiceReconnecting: true
    })

    useVoiceStore.getState().resetVoiceState()

    const state = useVoiceStore.getState()
    expect(state.isConnected).toBe(false)
    expect(state.activeVoiceChannelId).toBeNull()
    expect(state.isMuted).toBe(false)
    expect(state.isVoiceReconnecting).toBe(false)
  })
})
