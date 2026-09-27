import { create } from 'zustand'
import type { RtcStatsSummary } from '../lib/rtcStats'

interface CallStatsStore {
  /** Quando a própria pessoa entrou na chamada atual (Date.now); null fora da chamada */
  joinedAt: number | null
  /** Medições reais da conexão; null enquanto ainda não mediu */
  stats: RtcStatsSummary | null
  /** Reconectando ou com a rede instável (avisos do próprio LiveKit) */
  unstable: boolean

  setJoinedAt: (joinedAt: number | null) => void
  setStats: (stats: RtcStatsSummary | null) => void
  setUnstable: (unstable: boolean) => void
  reset: () => void
}

export const useCallStatsStore = create<CallStatsStore>((set) => ({
  joinedAt: null,
  stats: null,
  unstable: false,

  setJoinedAt: (joinedAt) => set({ joinedAt }),
  setStats: (stats) => set({ stats }),
  setUnstable: (unstable) => set({ unstable }),
  reset: () => set({ joinedAt: null, stats: null, unstable: false })
}))
