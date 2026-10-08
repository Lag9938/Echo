import { create } from 'zustand'
import type { InboundVideoStats, OutboundScreenStats } from '../lib/screenShareStats'

/** O que QUEM TRANSMITE mediu no próprio computador, recebido pela chamada (ver lib/originStats.ts) */
export interface OriginStatsEntry extends OutboundScreenStats {
  /** Quando chegou (Date.now()), para o painel não mostrar número velho */
  receivedAt: number
}

interface ScreenShareStatsStore {
  /** O que este app está enviando na própria transmissão; null se não está transmitindo ou ainda não mediu */
  outbound: OutboundScreenStats | null
  /** O que este app está recebendo, por id da faixa de vídeo (MediaStreamTrack.id) */
  inbound: Record<string, InboundVideoStats>
  /** Medições da origem de cada transmissão assistida, por id de quem transmite */
  origin: Record<string, OriginStatsEntry>

  setStats: (outbound: OutboundScreenStats | null, inbound: Record<string, InboundVideoStats>) => void
  setOrigin: (userId: string, stats: OutboundScreenStats) => void
  reset: () => void
}

const EMPTY: Record<string, InboundVideoStats> = {}
const NO_ORIGIN: Record<string, OriginStatsEntry> = {}

export const useScreenShareStatsStore = create<ScreenShareStatsStore>((set, get) => ({
  outbound: null,
  inbound: EMPTY,
  origin: NO_ORIGIN,

  setStats: (outbound, inbound) => {
    const hasInbound = Object.keys(inbound).length > 0
    const current = get()
    // Sem transmissão nenhuma (o caso comum), não acorda quem está ouvindo a cada medição
    if (!outbound && !hasInbound && !current.outbound && current.inbound === EMPTY) return
    set({ outbound, inbound: hasInbound ? inbound : EMPTY })
  },
  setOrigin: (userId, stats) => {
    set({ origin: { ...get().origin, [userId]: { ...stats, receivedAt: Date.now() } } })
  },
  reset: () => {
    const current = get()
    if (!current.outbound && current.inbound === EMPTY && current.origin === NO_ORIGIN) return
    set({ outbound: null, inbound: EMPTY, origin: NO_ORIGIN })
  }
}))
