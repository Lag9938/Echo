import { create } from 'zustand'
import type { Page, Toast } from '../types'

export interface UIState {
  page: Page
  theme: string
  topbarPinned: boolean
  isTopbarVisible: boolean

  // Modais
  showAddSpaceModal: boolean
  addSpaceModalTab: 'options' | 'create' | 'join'
  showSavedMessagesModal: boolean
  showWhatsNewModal: boolean
  showSoundboardModal: boolean
  showSubscriptionModal: boolean

  // Toasts
  toasts: Toast[]

  // Ações
  setPage: (page: Page) => void
  setTheme: (theme: string) => void
  setTopbarPinned: (pinned: boolean) => void
  setIsTopbarVisible: (visible: boolean) => void
  setShowAddSpaceModal: (show: boolean) => void
  setAddSpaceModalTab: (tab: 'options' | 'create' | 'join') => void
  setShowSavedMessagesModal: (show: boolean) => void
  setShowWhatsNewModal: (show: boolean) => void
  setShowSoundboardModal: (show: boolean) => void
  setShowSubscriptionModal: (show: boolean) => void
  addToast: (toast: Toast) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  page: 'Amigos',
  theme: 'dark-theme',
  topbarPinned: typeof window !== 'undefined' ? localStorage.getItem('echo-topbar-pinned') === 'true' : true,
  isTopbarVisible: true,

  showAddSpaceModal: false,
  addSpaceModalTab: 'options',
  showSavedMessagesModal: false,
  showWhatsNewModal: false,
  showSoundboardModal: false,
  showSubscriptionModal: false,

  toasts: [],

  setPage: (page) => set({ page }),
  setTheme: (theme) => set({ theme }),
  setTopbarPinned: (topbarPinned) => set({ topbarPinned }),
  setIsTopbarVisible: (isTopbarVisible) => set({ isTopbarVisible }),
  setShowAddSpaceModal: (showAddSpaceModal) => set({ showAddSpaceModal }),
  setAddSpaceModalTab: (addSpaceModalTab) => set({ addSpaceModalTab }),
  setShowSavedMessagesModal: (showSavedMessagesModal) => set({ showSavedMessagesModal }),
  setShowWhatsNewModal: (showWhatsNewModal) => set({ showWhatsNewModal }),
  setShowSoundboardModal: (showSoundboardModal) => set({ showSoundboardModal }),
  setShowSubscriptionModal: (showSubscriptionModal) => set({ showSubscriptionModal }),
  addToast: (toast) => set((state) => ({ toasts: [...state.toasts, toast] })),
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
