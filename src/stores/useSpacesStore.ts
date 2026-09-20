import { create } from 'zustand'
import type { Space, Channel } from '../types'

export interface KnownProfile {
  id: string
  display_name: string
  avatar_url?: string
}

export interface SpacesState {
  spaces: Space[]
  expandedSpace: string | null
  spaceChannels: Record<string, Channel[]>
  selectedChannel: Channel | null
  unreadChannels: Set<string>
  spaceVoiceUsers: Record<string, any[]>
  spaceMembersMap: Record<string, any[]>
  spaceMembers: any[]
  knownProfiles: Record<string, KnownProfile>

  setSpaces: (spaces: Space[]) => void
  setExpandedSpace: (id: string | null) => void
  setSpaceChannels: (spaceChannels: Record<string, Channel[]>) => void
  setSelectedChannel: (channel: Channel | null) => void
  setUnreadChannels: (unread: Set<string>) => void
  markChannelRead: (channelId: string) => void
  setSpaceVoiceUsers: (users: Record<string, any[]>) => void
  setSpaceMembersMap: (map: Record<string, any[]>) => void
  setSpaceMembers: (members: any[]) => void
  setKnownProfiles: (
    profiles:
      | Record<string, KnownProfile>
      | ((prev: Record<string, KnownProfile>) => Record<string, KnownProfile>)
  ) => void
  updateKnownProfile: (id: string, profile: Partial<KnownProfile>) => void
}

export const useSpacesStore = create<SpacesState>((set) => ({
  spaces: [],
  expandedSpace: null,
  spaceChannels: {},
  selectedChannel: null,
  unreadChannels: new Set<string>(),
  spaceVoiceUsers: {},
  spaceMembersMap: {},
  spaceMembers: [],
  knownProfiles: {},

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
  setSpaceMembersMap: (spaceMembersMap) => set({ spaceMembersMap }),
  setSpaceMembers: (spaceMembers) => set({ spaceMembers }),
  setKnownProfiles: (profilesOrUpdater) =>
    set((state) => ({
      knownProfiles:
        typeof profilesOrUpdater === 'function'
          ? profilesOrUpdater(state.knownProfiles)
          : profilesOrUpdater
    })),
  updateKnownProfile: (id, profile) =>
    set((state) => {
      const existing = state.knownProfiles[id] || { id, display_name: 'Usuário' }
      return {
        knownProfiles: {
          ...state.knownProfiles,
          [id]: { ...existing, ...profile }
        }
      }
    })
}))
