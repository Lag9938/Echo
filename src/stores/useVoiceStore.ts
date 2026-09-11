import { create } from 'zustand'

export interface VoiceState {
  activeVoiceChannelId: string | null
  participants: any[]
  isMuted: boolean
  isDeafened: boolean
  isPttActive: boolean
  isVoiceReconnecting: boolean
  isScreenSharing: boolean

  setActiveVoiceChannelId: (id: string | null) => void
  setParticipants: (participants: any[]) => void
  setIsMuted: (isMuted: boolean) => void
  setIsDeafened: (isDeafened: boolean) => void
  setIsPttActive: (isPttActive: boolean) => void
  setIsVoiceReconnecting: (isVoiceReconnecting: boolean) => void
  setIsScreenSharing: (isScreenSharing: boolean) => void
}

export const useVoiceStore = create<VoiceState>((set) => ({
  activeVoiceChannelId: null,
  participants: [],
  isMuted: false,
  isDeafened: false,
  isPttActive: false,
  isVoiceReconnecting: false,
  isScreenSharing: false,

  setActiveVoiceChannelId: (activeVoiceChannelId) => set({ activeVoiceChannelId }),
  setParticipants: (participants) => set({ participants }),
  setIsMuted: (isMuted) => set({ isMuted }),
  setIsDeafened: (isDeafened) => set({ isDeafened }),
  setIsPttActive: (isPttActive) => set({ isPttActive }),
  setIsVoiceReconnecting: (isVoiceReconnecting) => set({ isVoiceReconnecting }),
  setIsScreenSharing: (isScreenSharing) => set({ isScreenSharing }),
}))
