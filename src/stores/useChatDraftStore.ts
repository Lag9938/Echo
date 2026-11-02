import { create } from 'zustand'

export interface ChatDraftState {
  drafts: Record<string, string>
  getDraft: (channelId: string) => string
  setDraft: (channelId: string, text: string) => void
  clearDraft: (channelId: string) => void
}

export const useChatDraftStore = create<ChatDraftState>((set, get) => ({
  drafts: {},
  getDraft: (channelId: string) => {
    if (!channelId) return ''
    return get().drafts[channelId] || ''
  },
  setDraft: (channelId: string, text: string) => {
    if (!channelId) return
    set((state) => ({
      drafts: { ...state.drafts, [channelId]: text }
    }))
  },
  clearDraft: (channelId: string) => {
    if (!channelId) return
    set((state) => ({
      drafts: { ...state.drafts, [channelId]: '' }
    }))
  }
}))

/** Seletor atômico para o rascunho de um canal específico (evita re-renders ao trocar outros canais) */
export const useChannelDraft = (channelId?: string | null) =>
  useChatDraftStore((s) => (channelId ? s.drafts[channelId] || '' : ''))
