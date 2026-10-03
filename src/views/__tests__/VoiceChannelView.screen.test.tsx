import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { VoiceChannelView } from '../VoiceChannelView'
import { useUIStore } from '../../stores/useUIStore'

const ME = 'me'
const ANA = 'ana'
const BOT = 'music-bot-c1'
const channel = { id: 'c1', name: 'Callzinha', type: 'voice', space_id: 's1' }

function makeProps(overrides: Record<string, unknown> = {}): any {
  return {
    currentSpace: { id: 's1', name: 'Trupe', creator_id: ME },
    selectedChannel: channel,
    spaceChannels: { s1: [channel] },
    spaceVoiceUsers: {},
    user: { id: ME, user_metadata: {} },
    profileDisplayName: 'Eu',
    profileAvatarUrl: '',
    presenceData: {},
    onlineUsers: new Set<string>(),
    presenceStatus: 'online',
    serverRoles: [],
    memberRoleMap: {},
    getUserHighestRole: () => null,
    setSpaceForAddMembers: vi.fn(),
    setInspectedMember: vi.fn(),
    setHoveredMemberPopover: vi.fn(),
    hoverTimeoutRef: { current: null },
    spaceMembers: [],
    activeVoiceChannelId: null,
    isConnected: false,
    participants: [],
    handleJoinVoice: vi.fn(),
    handleLeaveVoice: vi.fn(),
    isMuted: false,
    handleToggleMute: vi.fn(),
    isDeafened: false,
    handleToggleDeafen: vi.fn(),
    isAiDenoiseEnabled: false,
    toggleAiDenoise: vi.fn(),
    isPttMode: false,
    isPttActive: false,
    pttKey: 'V',
    setShowSoundboardModal: vi.fn(),
    isRecordingCall: false,
    startCallRecording: vi.fn(),
    stopCallRecording: vi.fn(),
    recordingDuration: 0,
    setVolumeControlUser: vi.fn(),
    activeScreenSharers: [],
    activeScreenSharer: null,
    setSelectedScreenSharerUserId: vi.fn(),
    screenShareViewMode: 'focus',
    setScreenShareViewMode: vi.fn(),
    isWatchingStreams: false,
    setIsWatchingStreams: vi.fn(),
    isPiPActive: false,
    setIsPiPActive: vi.fn(),
    localScreenStream: null,
    handleStopScreenShare: vi.fn(),
    openScreenPicker: vi.fn(),
    forceOpenScreenPicker: vi.fn(),
    localCameraStream: null,
    handleToggleCamera: vi.fn(),
    screenQuality: '1080p',
    handleQualityChange: vi.fn(),
    screenFps: 30,
    handleFpsChange: vi.fn(),
    activeSharingSource: null,
    peerScreenVolumes: {},
    setPeerScreenVolumes: vi.fn(),
    screenAudioSyncDelayMs: 0,
    changeScreenAudioSyncDelay: vi.fn(),
    screenShareContainerRef: { current: null },
    isScreenFullScreen: false,
    toggleScreenFullScreen: vi.fn(),
    messages: [],
    send: vi.fn(),
    draft: '',
    setDraft: vi.fn(),
    handleChatFileUpload: vi.fn(),
    isUploading: false,
    canUserDo: () => true,
    isMessageSaved: () => false,
    toggleSaveMessage: vi.fn(),
    handleDeleteMessage: vi.fn(),
    activePlayingVoiceNote: null,
    handleToggleVoicePlay: vi.fn(),
    voiceNotePlaySpeed: 1,
    handleChangeVoiceSpeed: vi.fn(),
    voiceNoteAudioRef: { current: null },
    pinnedMessages: {},
    togglePinMessage: vi.fn(),
    messagesEndRef: { current: null },
    showVoiceChat: false,
    setShowVoiceChat: vi.fn(),
    showMembersList: false,
    setShowMembersList: vi.fn(),
    showPinnedMessagesPanel: false,
    setShowPinnedMessagesPanel: vi.fn(),
    showSearchInput: false,
    setShowSearchInput: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    showScreenMenu: false,
    setShowScreenMenu: vi.fn(),
    ...overrides
  }
}

const inCall = (extra: Record<string, unknown> = {}) =>
  makeProps({
    activeVoiceChannelId: 'c1',
    isConnected: true,
    participants: [
      { userId: ME, displayName: 'Eu', isSpeaking: false, isMuted: false },
      { userId: ANA, displayName: 'Ana', isSpeaking: true, isMuted: false },
      { userId: BOT, displayName: 'Echo Music Bot', isSpeaking: true, isMuted: false }
    ],
    ...extra
  })

describe('Tela da chamada de voz', () => {
  const button = (container: HTMLElement, selector: string) => container.querySelector(selector) as HTMLButtonElement

  it('fora da chamada: mostra "Entrar na chamada" e entra no canal certo', () => {
    const props = makeProps()
    const { container } = render(<VoiceChannelView {...props} />)

    expect(container.querySelector('.control-btn')).toBeNull()
    fireEvent.click(button(container, '.voice-join-submit-btn'))
    expect(props.handleJoinVoice).toHaveBeenCalledTimes(1)
    expect(props.handleJoinVoice.mock.calls[0][0]).toBe('c1')
  })

  it('na chamada: um cartão por pessoa, quem fala fica marcado e o bot tem cartão próprio', () => {
    const { container } = render(<VoiceChannelView {...inCall()} />)

    const cards = [...container.querySelectorAll('.participant-card')]
    expect(cards).toHaveLength(3)
    expect(cards[0].textContent).toContain('Eu (Você)')
    expect(cards[1].classList.contains('speaking')).toBe(true)
    expect(cards[1].textContent).toContain('Ana')
    expect(cards[2].classList.contains('music-bot-card')).toBe(true)
    expect(container.querySelector('.voice-join-submit-btn')).toBeNull()
  })

  it('os controles da chamada chamam a ação certa', () => {
    const props = inCall()
    const { container } = render(<VoiceChannelView {...props} />)

    fireEvent.click(button(container, '.control-btn.mic-btn'))
    expect(props.handleToggleMute).toHaveBeenCalledTimes(1)

    fireEvent.click(button(container, '.control-btn.deafen-btn'))
    expect(props.handleToggleDeafen).toHaveBeenCalledTimes(1)

    fireEvent.click(button(container, '.control-btn.ai-btn'))
    expect(props.toggleAiDenoise).toHaveBeenCalledTimes(1)

    fireEvent.click(button(container, '.control-btn.camera-btn'))
    expect(props.handleToggleCamera).toHaveBeenCalledTimes(1)

    fireEvent.click(button(container, '.control-btn.soundboard-btn'))
    expect(props.setShowSoundboardModal).toHaveBeenCalledWith(true)

    fireEvent.click(button(container, '.control-btn.leave-btn'))
    expect(props.handleLeaveVoice).toHaveBeenCalledTimes(1)
  })

  it('o botão do bot de música e o cartão do bot abrem o painel do bot', () => {
    act(() => useUIStore.getState().setShowMusicBotModal(false))
    const { container } = render(<VoiceChannelView {...inCall()} />)

    fireEvent.click(button(container, '.control-btn.music-btn'))
    expect(useUIStore.getState().showMusicBotModal).toBe(true)

    act(() => useUIStore.getState().setShowMusicBotModal(false))
    fireEvent.click(container.querySelector('.music-bot-card') as HTMLElement)
    expect(useUIStore.getState().showMusicBotModal).toBe(true)
  })

  it('clicar no cartão de outra pessoa abre o volume dela; o do bot não passa por aí', () => {
    const props = inCall()
    const { container } = render(<VoiceChannelView {...props} />)

    const cards = [...container.querySelectorAll('.participant-card')] as HTMLElement[]
    fireEvent.click(cards[1])
    expect(props.setVolumeControlUser).toHaveBeenCalledWith(expect.objectContaining({ userId: ANA }))

    props.setVolumeControlUser.mockClear()
    fireEvent.click(cards[2])
    expect(props.setVolumeControlUser).not.toHaveBeenCalled()
  })

  it('microfone mutado e fone silenciado aparecem nos botões', () => {
    const { container } = render(<VoiceChannelView {...inCall({ isMuted: true, isDeafened: true })} />)

    expect(button(container, '.control-btn.mic-btn').title).not.toBe('Mutar microfone')
    expect(button(container, '.control-btn.deafen-btn').title).not.toBe('Ensurdecer (Silenciar chamada)')
  })
})
