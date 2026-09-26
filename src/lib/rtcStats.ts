// Estatísticas reais da conexão de voz (latência, jitter e perda de pacotes), lidas do WebRTC.
// Antes o app "inventava" o ping a partir de uma nota de qualidade (18/35/85 ms); aqui vem da medição do navegador.

export interface RtcStatsSummary {
  /** Latência de ida e volta até o servidor, em ms */
  ping: number
  /** Variação da chegada dos pacotes de áudio, em ms */
  jitter: number
  /** Pacotes perdidos no último intervalo, em % */
  packetLoss: number
}

/** Contadores acumulados dos pacotes recebidos, para calcular a perda só do último intervalo */
export interface InboundCounters {
  received: number
  lost: number
}

type StatsLike = { forEach: (callback: (stat: any) => void) => void }

export type ConnectionGrade = 'good' | 'mid' | 'poor'

export function summarizeRtcStats(
  reports: Array<StatsLike | null | undefined>,
  previous: InboundCounters | null
): { stats: RtcStatsSummary | null; counters: InboundCounters } {
  const rtts: number[] = []
  const jitters: number[] = []
  const counters: InboundCounters = { received: 0, lost: 0 }

  reports.forEach((report) => {
    report?.forEach((stat) => {
      if (stat.type === 'candidate-pair' && (stat.nominated || stat.state === 'succeeded') && typeof stat.currentRoundTripTime === 'number') {
        rtts.push(stat.currentRoundTripTime * 1000)
      } else if (stat.type === 'inbound-rtp') {
        if (typeof stat.packetsReceived === 'number') counters.received += stat.packetsReceived
        if (typeof stat.packetsLost === 'number') counters.lost += Math.max(0, stat.packetsLost)
        if (stat.kind === 'audio' && typeof stat.jitter === 'number') jitters.push(stat.jitter * 1000)
      }
    })
  })

  if (rtts.length === 0) return { stats: null, counters }

  const receivedDelta = previous ? Math.max(0, counters.received - previous.received) : 0
  const lostDelta = previous ? Math.max(0, counters.lost - previous.lost) : 0
  const total = receivedDelta + lostDelta
  const packetLoss = total > 0 ? Math.round((lostDelta / total) * 1000) / 10 : 0

  return {
    stats: {
      ping: Math.round(rtts.reduce((sum, value) => sum + value, 0) / rtts.length),
      jitter: jitters.length ? Math.round(Math.max(...jitters)) : 0,
      packetLoss
    },
    counters
  }
}

/** "Boa", "Instável" ou "Ruim" a partir das medições (latência alta ou perda de pacotes pesam) */
export function gradeConnection(stats: RtcStatsSummary | null): ConnectionGrade {
  if (!stats) return 'good'
  if (stats.ping >= 250 || stats.packetLoss >= 8 || stats.jitter >= 80) return 'poor'
  if (stats.ping >= 120 || stats.packetLoss >= 2 || stats.jitter >= 35) return 'mid'
  return 'good'
}
