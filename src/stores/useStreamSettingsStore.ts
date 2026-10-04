import { create } from 'zustand'

const SMOOTHING_KEY = 'echo-stream-smoothing-ms'
export const STREAM_SMOOTHING_DEFAULT_MS = 150
export const STREAM_SMOOTHING_MAX_MS = 1000

/**
 * Quanto de vídeo quem ASSISTE guarda antes de mostrar. Sem reserva (0), cada oscilação da internet vira
 * uma travadinha na imagem; com uma reserva pequena, a imagem sai num ritmo constante, ao custo de aparecer
 * esse mesmo tanto mais tarde. Vale só para transmissões de tela (a voz não muda).
 */
export const STREAM_SMOOTHING_PRESETS = [
  { ms: 0, label: 'Rápida', hint: 'Menor atraso; trava mais se a internet oscilar' },
  { ms: 150, label: 'Equilibrada', hint: 'Recomendada: imagem estável com atraso que não se nota' },
  { ms: 400, label: 'Suave', hint: 'Para internet instável; a imagem chega quase meio segundo depois' }
] as const

export function clampStreamSmoothing(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return STREAM_SMOOTHING_DEFAULT_MS
  return Math.min(STREAM_SMOOTHING_MAX_MS, Math.max(0, Math.round(n)))
}

function readSmoothing(): number {
  try {
    const saved = localStorage.getItem(SMOOTHING_KEY)
    return saved === null ? STREAM_SMOOTHING_DEFAULT_MS : clampStreamSmoothing(saved)
  } catch {
    return STREAM_SMOOTHING_DEFAULT_MS
  }
}

interface StreamSettingsStore {
  /** Reserva de vídeo de quem assiste, em ms */
  smoothingMs: number
  setSmoothingMs: (ms: number) => void
}

export const useStreamSettingsStore = create<StreamSettingsStore>((set) => ({
  smoothingMs: readSmoothing(),
  setSmoothingMs: (ms) => {
    const smoothingMs = clampStreamSmoothing(ms)
    try {
      localStorage.setItem(SMOOTHING_KEY, String(smoothingMs))
    } catch {
      // Sem armazenamento local: a escolha vale só até fechar o app
    }
    set({ smoothingMs })
  }
}))
