import { create } from 'zustand'

/**
 * Tema Automático: o Echo segue o claro/escuro do sistema (Windows) e troca sozinho quando ele muda.
 * Só vale para quem escolher "Automático"; quem já tinha um tema fixo continua com ele.
 * Fica numa store (e não em props) para a tela de Aparência e useEchoCosmetics usarem o mesmo valor.
 */
const KEY = 'echo-theme-auto'

function readAuto(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

interface ThemeModeState {
  auto: boolean
  setAuto: (auto: boolean) => void
}

export const useThemeModeStore = create<ThemeModeState>((set) => ({
  auto: readAuto(),
  setAuto: (auto) => {
    try { localStorage.setItem(KEY, auto ? 'true' : 'false') } catch { /* sem armazenamento: vale só nesta sessão */ }
    set({ auto })
  }
}))

/** Qual tema o sistema pede agora */
export function systemThemeId(): 'light' | 'aurora-dark' {
  const dark = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true
  return dark ? 'aurora-dark' : 'light'
}
