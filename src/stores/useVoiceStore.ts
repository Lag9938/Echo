import { create } from 'zustand'
import type { Channel } from '../types'
import type { VoiceParticipant } from '../lib/useVoiceChannel'

export interface VoiceActions {
  handleJoinVoice?: (channelId: string, explicitSpaceId?: string) => Promise<void>
  handleLeaveVoice?: () => void
  handleToggleMute?: () => void
  handleToggleDeafen?: () => void
  leaveVoice?: () => void
  joinVoice?: (...args: any[]) => Promise<any>
  toggleMute?: () => void
  toggleDeafen?: () => void
  startScreenShare?: (sourceId?: string) => Promise<void>
  stopScreenShare?: () => void
  startCamera?: (deviceId?: string, onError?: (message: string) => void) => Promise<void>
  stopCamera?: () => void
  changeInputDevice?: (deviceId: string) => Promise<void>
  changeOutputDevice?: (deviceId: string) => Promise<void>
  changeScreenShareSettings?: (settings: any) => Promise<void>
  changePeerVolume?: (peerId: string, volume: number) => void
  changePeerPan?: (peerId: string, pan: number) => void
  setSpatialAudioEnabled?: (enabled: boolean) => void
  changePeerScreenVolume?: (peerId: string, volume: number) => void
  setPttMode?: (enabled: boolean) => void
  setPttActive?: (active: boolean) => void
  playSoundboard?: (soundId: string) => void
  startCallRecording?: () => void
  stopCallRecording?: () => void
  toggleAiDenoise?: () => void
  updateScreenSubscriptions?: (opts: any) => void
  updateLocalProfile?: (displayName: string, avatarUrl?: string) => void
  changeScreenAudioSyncDelay?: (delay: number) => void
  retryVoiceReconnect?: () => void
  cancelVoiceReconnect?: () => void
}

export interface VoiceState {
  // Connection & channels
  isConnected: boolean
  activeVoiceChannelId: string | null
  activeVoiceChannel: Channel | null
  spaceVoiceUsers: Record<string, VoiceParticipant[]>
  participants: VoiceParticipant[]

  // Local controls & audio
  isMuted: boolean
  isDeafened: boolean
  isPttActive: boolean
  isPttMode: boolean
  isAiDenoiseEnabled: boolean
  isRecordingCall: boolean
  recordingDuration: number

  // Streams & metrics
  localScreenStream: MediaStream | null
  localCameraStream: MediaStream | null
  rtcStats: { ping: number; jitter: number; packetLoss: number } | null
  screenAudioSyncDelayMs: number

  // Reconnection
  isVoiceReconnecting: boolean
  isVoiceNetworkUnstable: boolean
  voiceReconnectCountdown: number
  voiceReconnectAttempt: number

  // Screen sharing
  isScreenSharing: boolean

  // Soundboard
  lastSoundboardEvent: { soundId: string; userId: string; displayName: string; timestamp: number } | null

  // Registered actions reference
  actions: VoiceActions

  // Actions
  registerActions: (actions: VoiceActions) => void
  setActiveVoiceChannelId: (id: string | null) => void
  setActiveVoiceChannel: (channel: Channel | null) => void
  setParticipants: (participants: VoiceParticipant[] | ((prev: VoiceParticipant[]) => VoiceParticipant[])) => void
  setSpaceVoiceUsers: (users: Record<string, VoiceParticipant[]> | ((prev: Record<string, VoiceParticipant[]>) => Record<string, VoiceParticipant[]>)) => void
  setIsConnected: (isConnected: boolean) => void
  setIsMuted: (isMuted: boolean) => void
  setIsDeafened: (isDeafened: boolean) => void
  setIsPttActive: (isPttActive: boolean) => void
  setIsPttMode: (isPttMode: boolean) => void
  setIsAiDenoiseEnabled: (isAiDenoiseEnabled: boolean) => void
  setIsRecordingCall: (isRecordingCall: boolean) => void
  setRecordingDuration: (recordingDuration: number) => void
  setLocalScreenStream: (stream: MediaStream | null) => void
  setLocalCameraStream: (stream: MediaStream | null) => void
  setRtcStats: (stats: { ping: number; jitter: number; packetLoss: number } | null) => void
  setScreenAudioSyncDelayMs: (delay: number) => void
  setIsVoiceReconnecting: (isVoiceReconnecting: boolean) => void
  setIsVoiceNetworkUnstable: (isVoiceNetworkUnstable: boolean) => void
  setVoiceReconnectCountdown: (countdown: number) => void
  setVoiceReconnectAttempt: (attempt: number) => void
  setIsScreenSharing: (isScreenSharing: boolean) => void
  setVoiceState: (partial: Partial<VoiceState>) => void
  resetVoiceState: () => void

  // Action dispatchers
  handleJoinVoice: (channelId: string, explicitSpaceId?: string) => Promise<void>
  handleLeaveVoice: () => void
  handleToggleMute: () => void
  handleToggleDeafen: () => void
  leaveVoice: () => void
  joinVoice: (...args: any[]) => Promise<any>
  toggleMute: () => void
  toggleDeafen: () => void
  startScreenShare: (sourceId?: string) => Promise<void>
  stopScreenShare: () => void
  startCamera: (deviceId?: string, onError?: (message: string) => void) => Promise<void>
  stopCamera: () => void
  changeInputDevice: (deviceId: string) => Promise<void>
  changeOutputDevice: (deviceId: string) => Promise<void>
  changeScreenShareSettings: (settings: any) => Promise<void>
  changePeerVolume: (peerId: string, volume: number) => void
  changePeerPan: (peerId: string, pan: number) => void
  setSpatialAudioEnabled: (enabled: boolean) => void
  changePeerScreenVolume: (peerId: string, volume: number) => void
  setPttMode: (enabled: boolean) => void
  setPttActive: (active: boolean) => void
  playSoundboard: (soundId: string) => void
  startCallRecording: () => void
  stopCallRecording: () => void
  toggleAiDenoise: () => void
  updateScreenSubscriptions: (opts: any) => void
  updateLocalProfile: (displayName: string, avatarUrl?: string) => void
  changeScreenAudioSyncDelay: (delay: number) => void
  retryVoiceReconnect: () => void
  cancelVoiceReconnect: () => void
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  isConnected: false,
  activeVoiceChannelId: null,
  activeVoiceChannel: null,
  spaceVoiceUsers: {},
  participants: [],

  isMuted: false,
  isDeafened: false,
  isPttActive: false,
  isPttMode: false,
  isAiDenoiseEnabled: false,
  isRecordingCall: false,
  recordingDuration: 0,

  localScreenStream: null,
  localCameraStream: null,
  rtcStats: null,
  screenAudioSyncDelayMs: 0,

  isVoiceReconnecting: false,
  isVoiceNetworkUnstable: false,
  voiceReconnectCountdown: 5,
  voiceReconnectAttempt: 0,

  isScreenSharing: false,
  lastSoundboardEvent: null,

  actions: {},

  registerActions: (actions) =>
    set((state) => ({ actions: { ...state.actions, ...actions } })),

  setActiveVoiceChannelId: (activeVoiceChannelId) => set({ activeVoiceChannelId }),
  setActiveVoiceChannel: (activeVoiceChannel) => set({ activeVoiceChannel }),
  setParticipants: (participants) =>
    set((state) => ({
      participants: typeof participants === 'function' ? participants(state.participants) : participants
    })),
  setSpaceVoiceUsers: (spaceVoiceUsers) =>
    set((state) => ({
      spaceVoiceUsers: typeof spaceVoiceUsers === 'function' ? spaceVoiceUsers(state.spaceVoiceUsers) : spaceVoiceUsers
    })),
  setIsConnected: (isConnected) => set({ isConnected }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setIsDeafened: (isDeafened) => set({ isDeafened }),
  setIsPttActive: (isPttActive) => set({ isPttActive }),
  setIsPttMode: (isPttMode) => set({ isPttMode }),
  setIsAiDenoiseEnabled: (isAiDenoiseEnabled) => set({ isAiDenoiseEnabled }),
  setIsRecordingCall: (isRecordingCall) => set({ isRecordingCall }),
  setRecordingDuration: (recordingDuration) => set({ recordingDuration }),
  setLocalScreenStream: (localScreenStream) => set({ localScreenStream }),
  setLocalCameraStream: (localCameraStream) => set({ localCameraStream }),
  setRtcStats: (rtcStats) => set({ rtcStats }),
  setScreenAudioSyncDelayMs: (screenAudioSyncDelayMs) => set({ screenAudioSyncDelayMs }),
  setIsVoiceReconnecting: (isVoiceReconnecting) => set({ isVoiceReconnecting }),
  setIsVoiceNetworkUnstable: (isVoiceNetworkUnstable) => set({ isVoiceNetworkUnstable }),
  setVoiceReconnectCountdown: (voiceReconnectCountdown) => set({ voiceReconnectCountdown }),
  setVoiceReconnectAttempt: (voiceReconnectAttempt) => set({ voiceReconnectAttempt }),
  setIsScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
  setVoiceState: (partial) => set(partial),
  resetVoiceState: () =>
    set({
      isConnected: false,
      activeVoiceChannelId: null,
      activeVoiceChannel: null,
      participants: [],
      isMuted: false,
      isDeafened: false,
      isPttActive: false,
      isVoiceReconnecting: false,
      isVoiceNetworkUnstable: false,
      voiceReconnectCountdown: 5,
      voiceReconnectAttempt: 0,
      isScreenSharing: false,
  lastSoundboardEvent: null,
      localScreenStream: null,
      localCameraStream: null,
      rtcStats: null,
      isRecordingCall: false,
      recordingDuration: 0
    }),

  // Action forwarders
  handleJoinVoice: (channelId, explicitSpaceId) =>
    get().actions.handleJoinVoice?.(channelId, explicitSpaceId) ?? Promise.resolve(),
  handleLeaveVoice: () => get().actions.handleLeaveVoice?.(),
  handleToggleMute: () => get().actions.handleToggleMute?.(),
  handleToggleDeafen: () => get().actions.handleToggleDeafen?.(),
  leaveVoice: () => get().actions.leaveVoice?.(),
  joinVoice: (...args) => get().actions.joinVoice?.(...args) ?? Promise.resolve(),
  toggleMute: () => get().actions.toggleMute?.(),
  toggleDeafen: () => get().actions.toggleDeafen?.(),
  startScreenShare: (sourceId) => get().actions.startScreenShare?.(sourceId) ?? Promise.resolve(),
  stopScreenShare: () => get().actions.stopScreenShare?.(),
  startCamera: (deviceId, onError) => get().actions.startCamera?.(deviceId, onError) ?? Promise.resolve(),
  stopCamera: () => get().actions.stopCamera?.(),
  changeInputDevice: (deviceId) => get().actions.changeInputDevice?.(deviceId) ?? Promise.resolve(),
  changeOutputDevice: (deviceId) => get().actions.changeOutputDevice?.(deviceId) ?? Promise.resolve(),
  changeScreenShareSettings: (settings) => get().actions.changeScreenShareSettings?.(settings) ?? Promise.resolve(),
  changePeerVolume: (peerId, volume) => get().actions.changePeerVolume?.(peerId, volume),
  changePeerPan: (peerId, pan) => get().actions.changePeerPan?.(peerId, pan),
  setSpatialAudioEnabled: (enabled) => get().actions.setSpatialAudioEnabled?.(enabled),
  changePeerScreenVolume: (peerId, volume) => get().actions.changePeerScreenVolume?.(peerId, volume),
  setPttMode: (enabled) => get().actions.setPttMode?.(enabled),
  setPttActive: (active) => get().actions.setPttActive?.(active),
  playSoundboard: (soundId) => get().actions.playSoundboard?.(soundId),
  startCallRecording: () => get().actions.startCallRecording?.(),
  stopCallRecording: () => get().actions.stopCallRecording?.(),
  toggleAiDenoise: () => get().actions.toggleAiDenoise?.(),
  updateScreenSubscriptions: (opts) => get().actions.updateScreenSubscriptions?.(opts),
  updateLocalProfile: (displayName, avatarUrl) => get().actions.updateLocalProfile?.(displayName, avatarUrl),
  changeScreenAudioSyncDelay: (delay) => get().actions.changeScreenAudioSyncDelay?.(delay),
  retryVoiceReconnect: () => get().actions.retryVoiceReconnect?.(),
  cancelVoiceReconnect: () => get().actions.cancelVoiceReconnect?.()
}))

// Atomic selectors for zero unnecessary re-renders
export const useVoiceParticipants = () => useVoiceStore((s) => s.participants)
export const useActiveVoiceChannel = () => useVoiceStore((s) => s.activeVoiceChannel)
export const useActiveVoiceChannelId = () => useVoiceStore((s) => s.activeVoiceChannelId)
export const useSpaceVoiceUsers = () => useVoiceStore((s) => s.spaceVoiceUsers)
export const useVoiceIsConnected = () => useVoiceStore((s) => s.isConnected)
export const useVoiceIsMuted = () => useVoiceStore((s) => s.isMuted)
export const useVoiceIsDeafened = () => useVoiceStore((s) => s.isDeafened)
export const useVoiceIsReconnecting = () => useVoiceStore((s) => s.isVoiceReconnecting || s.isVoiceNetworkUnstable)
export const useVoiceRtcStats = () => useVoiceStore((s) => s.rtcStats)
export const useVoiceCallRecording = () =>
  useVoiceStore((s) => ({
    isRecordingCall: s.isRecordingCall,
    recordingDuration: s.recordingDuration
  }))

/** Selector to check if a specific user is currently speaking */
export const useIsUserSpeaking = (userId?: string | null) =>
  useVoiceStore((s) => {
    if (!userId) return false
    return s.participants.some((p) => p.userId === userId && p.isSpeaking)
  })

/** Helper function to find which voice channel a target user is in */
export function findTargetVoiceChannel(targetUserId: string): string | null {
  const { activeVoiceChannelId, participants, spaceVoiceUsers } = useVoiceStore.getState()
  if (activeVoiceChannelId && participants.some((p) => p.userId === targetUserId)) {
    return activeVoiceChannelId
  }
  const entry = Object.entries(spaceVoiceUsers).find(([, users]) => users.some((u) => u.userId === targetUserId))
  return entry ? entry[0] : null
}
