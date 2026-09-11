import { create } from 'zustand'
import type { Space, Channel } from '../types'

export interface SpacesState {
  spaces: Space[]
  expandedSpace: string | null
  spaceChannels: Record<string, Channel[]>
  selectedChannel: Channel | null
  unreadChannels: Set<string>
  spaceVoiceUsers: Record<string, any[]>

  setSpaces: (spaces: Space[]) => void
  setExpandedSpace: (id: string | null) => void
  setSpaceChannels: (spaceChannels: Record<string, Channel[]>) => void
  setSelectedChannel: (channel: Channel | null) => void
  setUnreadChannels: (unread: Set<string>) => void
  markChannelRead: (channelId: string) => void
  setSpaceVoiceUsers: (users: Record<string, any[]>) => void
}

export const useSpacesStore = create<SpacesState>((set) => ({
  spaces: [],
  expandedSpace: null,
  spaceChannels: {},
  selectedChannel: null,
  unreadChannels: new Set<string>(),
  spaceVoiceUsers: {},

  setSpaces: (spaces) => set({ spaces }),
  setExpandedSpace: (expandedSpace) => set({ expandedSpace }),
  setSpaceChannels: (spaceChannels) => set({ spaceChannels }),
  setSelectedChannel: (selectedChannel) => set({ selectedChannel }),
  setUnreadChannels: (unreadChannels) => set({ unreadChannels }),
  markChannelRead: (channelId) =>
    set((state) => {
      const next = new Set(state.unreadChannels)
      next.delete(channelId)
      return { unreadChannels: next }
    }),
  setSpaceVoiceUsers: (spaceVoiceUsers) => set({ spaceVoiceUsers }),
}))
