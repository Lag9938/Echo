import { create } from 'zustand'
import type { Page, Toast, FriendshipRequest } from '../types'

export interface UIState {
  page: Page
  theme: string
  topbarPinned: boolean
  isTopbarVisible: boolean
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  friendships: FriendshipRequest[]
  blockedUserIds: Set<string>

  // Modais
  showAddSpaceModal: boolean
  addSpaceModalTab: 'options' | 'create' | 'join'
  showSavedMessagesModal: boolean
  showWhatsNewModal: boolean
  showSoundboardModal: boolean
  showMusicBotModal: boolean
  showSubscriptionModal: boolean
  showCommandPalette: boolean
  lightboxImageUrl: string | null

  // Toasts
  toasts: Toast[]

  // Ações
  setPage: (page: Page) => void
  setTheme: (theme: string) => void
  setTopbarPinned: (pinned: boolean) => void
  setIsTopbarVisible: (visible: boolean) => void
  setPresenceStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  setFriendships: (
    friendships:
      | FriendshipRequest[]
      | ((prev: FriendshipRequest[]) => FriendshipRequest[])
  ) => void
  setBlockedUserIds: (
    ids: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void
  setShowAddSpaceModal: (show: boolean) => void
  setAddSpaceModalTab: (tab: 'options' | 'create' | 'join') => void
  setShowSavedMessagesModal: (show: boolean) => void
  setShowWhatsNewModal: (show: boolean) => void
  setShowSoundboardModal: (show: boolean) => void
  setShowMusicBotModal: (show: boolean) => void
  setShowSubscriptionModal: (show: boolean) => void
  setShowCommandPalette: (show: boolean) => void
  openLightbox: (url: string) => void
  closeLightbox: () => void
  addToast: (toast: Toast) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  page: 'Amigos',
  theme: 'dark-theme',
  topbarPinned: typeof window !== 'undefined' ? localStorage.getItem('echo-topbar-pinned') === 'true' : true,
  isTopbarVisible: true,
  presenceStatus: typeof window !== 'undefined' ? ((localStorage.getItem('echo-presence-status') as any) || 'online') : 'online',
  friendships: [],
  blockedUserIds: new Set<string>(),

  showAddSpaceModal: false,
  addSpaceModalTab: 'options',
  showSavedMessagesModal: false,
  showWhatsNewModal: false,
  showSoundboardModal: false,
  showMusicBotModal: false,
  showSubscriptionModal: false,
  showCommandPalette: false,
  lightboxImageUrl: null,

  toasts: [],

  setPage: (page) => set({ page }),
  setTheme: (theme) => set({ theme }),
  setTopbarPinned: (topbarPinned) => set({ topbarPinned }),
  setIsTopbarVisible: (isTopbarVisible) => set({ isTopbarVisible }),
  setPresenceStatus: (presenceStatus) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('echo-presence-status', presenceStatus)
    }
    set({ presenceStatus })
  },
  setFriendships: (friendshipsOrUpdater) =>
    set((state) => ({
      friendships:
        typeof friendshipsOrUpdater === 'function'
          ? friendshipsOrUpdater(state.friendships)
          : friendshipsOrUpdater
    })),
  setBlockedUserIds: (idsOrUpdater) =>
    set((state) => ({
      blockedUserIds:
        typeof idsOrUpdater === 'function'
          ? idsOrUpdater(state.blockedUserIds)
          : idsOrUpdater
    })),
  setShowAddSpaceModal: (showAddSpaceModal) => set({ showAddSpaceModal }),
  setAddSpaceModalTab: (addSpaceModalTab) => set({ addSpaceModalTab }),
  setShowSavedMessagesModal: (showSavedMessagesModal) => set({ showSavedMessagesModal }),
  setShowWhatsNewModal: (showWhatsNewModal) => set({ showWhatsNewModal }),
  setShowSoundboardModal: (showSoundboardModal) => set({ showSoundboardModal }),
  setShowMusicBotModal: (showMusicBotModal) => set({ showMusicBotModal }),
  setShowSubscriptionModal: (showSubscriptionModal) => set({ showSubscriptionModal }),
  setShowCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
  openLightbox: (lightboxImageUrl) => set({ lightboxImageUrl }),
  closeLightbox: () => set({ lightboxImageUrl: null }),
  addToast: (toast) => set((state) => ({ toasts: [...state.toasts, toast] })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
