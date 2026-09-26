import { create } from 'zustand'
import type { MusicBotState } from '../lib/musicBotState'

interface MusicBotStore {
  /** O participante do bot está na chamada em que o usuário está */
  present: boolean
  /** Estado publicado pelo bot; null se o bot não está na chamada ou é uma versão antiga sem painel */
  state: MusicBotState | null
  /** Quando o estado chegou (Date.now), para o painel avançar o relógio da faixa */
  receivedAt: number

  /**
   * Manda o volume direto ao bot pela sala do LiveKit (latência de dezenas de ms, sem banco nem chat).
   * Registrado pela conexão de voz; null fora da chamada. Devolve false se não deu para enviar.
   */
  sendVolume: ((percent: number) => Promise<boolean>) | null

  update: (present: boolean, state: MusicBotState | null) => void
  setSendVolume: (send: ((percent: number) => Promise<boolean>) | null) => void
  reset: () => void
}

export const useMusicBotStore = create<MusicBotStore>((set) => ({
  present: false,
  state: null,
  receivedAt: 0,
  sendVolume: null,

  update: (present, state) => set({ present, state, receivedAt: Date.now() }),
  setSendVolume: (sendVolume) => set({ sendVolume }),
  reset: () => set({ present: false, state: null, receivedAt: 0, sendVolume: null })
}))
