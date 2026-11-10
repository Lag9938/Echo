import { create } from 'zustand'
import { isLiteActive, readLitePreference, writeLitePreference, type LitePreference } from '../lib/liteMode'

/**
 * Estado do Modo Leve. Numa store (e não em props) para a tela de Aparência e o aplicador da classe no <body> usarem o
 * mesmo valor sem passar nada por App.tsx e SettingsView.
 */
interface LiteModeState {
  preference: LitePreference
  /** Há um jogo aberto (vem da detecção de jogos do Electron) */
  gameRunning: boolean
  setPreference: (value: LitePreference) => void
  setGameRunning: (running: boolean) => void
}

export const useLiteModeStore = create<LiteModeState>((set) => ({
  preference: readLitePreference(),
  gameRunning: false,
  setPreference: (preference) => {
    writeLitePreference(preference)
    set({ preference })
  },
  setGameRunning: (gameRunning) => set((s) => (s.gameRunning === gameRunning ? s : { gameRunning }))
}))

/** Seletor: o Modo Leve está ativo agora? */
export const selectLiteActive = (s: LiteModeState): boolean => isLiteActive(s.preference, s.gameRunning)
