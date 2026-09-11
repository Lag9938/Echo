import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'

export interface AuthState {
  user: User | null
  profileDisplayName: string
  profileAvatarUrl: string
  presenceStatus: string
  customStatus: string
  setUser: (user: User | null) => void
  setProfileDisplayName: (name: string) => void
  setProfileAvatarUrl: (url: string) => void
  setPresenceStatus: (status: string) => void
  setCustomStatus: (status: string) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profileDisplayName: '',
  profileAvatarUrl: '',
  presenceStatus: 'online',
  customStatus: '',
  setUser: (user) => set({ user }),
  setProfileDisplayName: (profileDisplayName) => set({ profileDisplayName }),
  setProfileAvatarUrl: (profileAvatarUrl) => set({ profileAvatarUrl }),
  setPresenceStatus: (presenceStatus) => set({ presenceStatus }),
  setCustomStatus: (customStatus) => set({ customStatus }),
}))
