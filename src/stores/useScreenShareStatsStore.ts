import { create } from 'zustand'
import type { InboundVideoStats, OutboundScreenStats } from '../lib/screenShareStats'

interface ScreenShareStatsStore {
  /** O que este app está enviando na própria transmissão; null se não está transmitindo ou ainda não mediu */
  outbound: OutboundScreenStats | null
  /** O que este app está recebendo, por id da faixa de vídeo (MediaStreamTrack.id) */
  inbound: Record<string, InboundVideoStats>

  setStats: (outbound: OutboundScreenStats | null, inbound: Record<string, InboundVideoStats>) => void
  reset: () => void
}

const EMPTY: Record<string, InboundVideoStats> = {}

export const useScreenShareStatsStore = create<ScreenShareStatsStore>((set, get) => ({
  outbound: null,
  inbound: EMPTY,

  setStats: (outbound, inbound) => {
    const hasInbound = Object.keys(inbound).length > 0
    const current = get()
    // Sem transmissão nenhuma (o caso comum), não acorda quem está ouvindo a cada medição
    if (!outbound && !hasInbound && !current.outbound && current.inbound === EMPTY) return
    set({ outbound, inbound: hasInbound ? inbound : EMPTY })
  },
  reset: () => {
    const current = get()
    if (!current.outbound && current.inbound === EMPTY) return
    set({ outbound: null, inbound: EMPTY })
  }
}))
