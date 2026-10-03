import { create } from 'zustand'
import type { MusicBotState } from '../lib/musicBotState'

const MY_VOLUME_KEY = 'echo-music-bot-my-volume'
export const MUSIC_BOT_DEFAULT_VOLUME = 100
export const MUSIC_BOT_MAX_VOLUME = 200

/** Volume do bot em % (0 a 200), sempre inteiro; qualquer valor estranho vira o padrão */
export function clampMusicBotVolume(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return MUSIC_BOT_DEFAULT_VOLUME
  return Math.min(MUSIC_BOT_MAX_VOLUME, Math.max(0, Math.round(n)))
}

function readMyVolume(): number {
  try {
    const saved = localStorage.getItem(MY_VOLUME_KEY)
    return saved === null ? MUSIC_BOT_DEFAULT_VOLUME : clampMusicBotVolume(saved)
  } catch {
    return MUSIC_BOT_DEFAULT_VOLUME
  }
}

interface MusicBotStore {
  /** O participante do bot está na chamada em que o usuário está */
  present: boolean
  /** Estado publicado pelo bot; null se o bot não está na chamada ou é uma versão antiga sem painel */
  state: MusicBotState | null
  /** Quando o estado chegou (Date.now), para o painel avançar o relógio da faixa */
  receivedAt: number

  /**
   * Volume do bot só para este usuário, em % (0 a 200). É aplicado no áudio que chega aqui (como o volume
   * de qualquer participante), então não muda o que os outros ouvem. Fica salvo entre chamadas.
   */
  myVolume: number

  /**
   * Manda o volume direto ao bot pela sala do LiveKit (latência de dezenas de ms, sem banco nem chat).
   * Muda o volume para TODOS na chamada; o painel não usa mais (o controle dele é o myVolume).
   * Registrado pela conexão de voz; null fora da chamada. Devolve false se não deu para enviar.
   */
  sendVolume: ((percent: number) => Promise<boolean>) | null

  update: (present: boolean, state: MusicBotState | null) => void
  setMyVolume: (percent: number) => void
  setSendVolume: (send: ((percent: number) => Promise<boolean>) | null) => void
  reset: () => void
}

export const useMusicBotStore = create<MusicBotStore>((set) => ({
  present: false,
  state: null,
  receivedAt: 0,
  myVolume: readMyVolume(),
  sendVolume: null,

  update: (present, state) => set({ present, state, receivedAt: Date.now() }),
  setMyVolume: (percent) => {
    const myVolume = clampMusicBotVolume(percent)
    try {
      localStorage.setItem(MY_VOLUME_KEY, String(myVolume))
    } catch {
      // Sem armazenamento local: o volume vale só até fechar o app
    }
    set({ myVolume })
  },
  setSendVolume: (sendVolume) => set({ sendVolume }),
  // O volume pessoal não é zerado ao sair da chamada: é uma preferência do usuário
  reset: () => set({ present: false, state: null, receivedAt: 0, sendVolume: null })
}))
