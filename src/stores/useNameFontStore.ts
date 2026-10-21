import { create } from 'zustand'
import { readStoredNameFont } from '../lib/nameFonts'

/**
 * A fonte do MEU nome. Fica numa store (e não só em props) para a mensagem, a lista de membros e o cartão mudarem na
 * hora quando eu equipo uma fonte, sem passar a informação por todas as telas no meio do caminho.
 */
interface NameFontState {
  userId: string
  fontId: string
  /** Chamado ao entrar (ou trocar de conta): carrega a fonte guardada neste aparelho */
  load: (userId: string) => void
  set: (fontId: string) => void
}

export const useNameFontStore = create<NameFontState>((set) => ({
  userId: '',
  fontId: '',
  load: (userId) => set({ userId, fontId: userId ? readStoredNameFont(userId) : '' }),
  set: (fontId) => set({ fontId })
}))
