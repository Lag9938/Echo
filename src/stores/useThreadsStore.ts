import { create } from 'zustand'

interface ThreadsStore {
  /**
   * Tópicos com resposta nova ainda não vista: mensagem-raiz → canal. Fica fora da tela do canal porque o
   * aviso chega pela caixa de entrada mesmo com outro canal (ou outra página) aberto.
   */
  unreadRoots: Record<string, string>
  /** Tópico aberto no painel agora (resposta nova nele não conta como "não vista") */
  openRootId: string | null

  markUnread: (rootId: string, channelId: string) => void
  markRead: (rootId: string) => void
  setOpenRootId: (rootId: string | null) => void
  reset: () => void
}

export const useThreadsStore = create<ThreadsStore>((set, get) => ({
  unreadRoots: {},
  openRootId: null,

  markUnread: (rootId, channelId) => {
    if (get().openRootId === rootId || get().unreadRoots[rootId] === channelId) return
    set({ unreadRoots: { ...get().unreadRoots, [rootId]: channelId } })
  },
  markRead: (rootId) => {
    if (!(rootId in get().unreadRoots)) return
    const next = { ...get().unreadRoots }
    delete next[rootId]
    set({ unreadRoots: next })
  },
  setOpenRootId: (openRootId) => {
    if (get().openRootId !== openRootId) set({ openRootId })
  },
  reset: () => set({ unreadRoots: {}, openRootId: null })
}))
