// Diagnóstico da transmissão do lado de QUEM ASSISTE, a partir das medições reais do WebRTC (uma a cada 2 s).
// Para quem assiste, todo problema parece igual ("travou"); os números separam as causas:
//   rede      pacotes de vídeo se perdendo no caminho (internet de quem assiste ou saída do servidor)
//   decoder   os quadros chegam, mas o computador de quem assiste descarta parte deles
//   origem    não há perda nem descarte e mesmo assim chegam poucos quadros ou a imagem congela: a transmissão
//             já sai assim de quem transmite, ou o servidor de voz segurou o envio
//   conexão   tudo certo, mas a mídia vem por TCP (trava a cada pacote perdido)

import type { InboundVideoStats, StreamTransport } from './screenShareStats'

export type WatchProblem = 'ok' | 'network' | 'decoder' | 'source' | 'transport'

const isTcp = (transport: StreamTransport | null) => transport === 'tcp' || transport === 'relay-tcp'

/** O que está atrapalhando NESTA medição. `targetFps` = FPS em que a pessoa está transmitindo. */
export function diagnoseInbound(stats: InboundVideoStats, targetFps: number): WatchProblem {
  if (stats.packetLossPct >= 2 || (stats.freezes > 0 && stats.packetLossPct > 0)) return 'network'
  if (stats.droppedPct >= 5) return 'decoder'
  if (stats.freezes > 0) return 'source'
  // Abaixo de 25% da meta é tela parada (menu, texto): poucos quadros de propósito
  if (targetFps > 0 && stats.fps >= targetFps * 0.25 && stats.fps < targetFps * 0.8) return 'source'
  if (isTcp(stats.transport)) return 'transport'
  return 'ok'
}

export function describeWatchProblem(problem: WatchProblem): string {
  switch (problem) {
    case 'network': return 'Rede: pacotes de vídeo se perdendo no caminho'
    case 'decoder': return 'Este computador não está dando conta de exibir todos os quadros'
    case 'source': return 'Já chega assim: poucos quadros na origem ou no servidor'
    case 'transport': return 'Conexão por TCP: trava a cada pacote perdido'
    default: return 'Nenhum problema agora'
  }
}

export interface WatchSessionSummary {
  /** Medições aproveitadas (sem o aquecimento e sem a tela parada) */
  samples: number
  targetFps: number
  avgFps: number
  avgPacketLossPct: number
  avgDroppedPct: number
  freezes: number
  networkPct: number
  decoderPct: number
  sourcePct: number
  transport: StreamTransport | null
  problem: WatchProblem
}

const WARMUP_SAMPLES = 3
const MIN_SAMPLES = 10
const PROBLEM_SHARE = 0.2
const round1 = (value: number) => Math.round(value * 10) / 10

/** Junta as medições de uma transmissão assistida e aponta o que mais atrapalhou */
export function createWatchSession(targetFps: number) {
  let seen = 0
  let used = 0
  let fpsSum = 0
  let lossSum = 0
  let droppedSum = 0
  let freezes = 0
  let transport: StreamTransport | null = null
  const counts: Record<'network' | 'decoder' | 'source', number> = { network: 0, decoder: 0, source: 0 }

  return {
    add(stats: InboundVideoStats) {
      seen++
      if (seen <= WARMUP_SAMPLES) return
      if (stats.transport) transport = stats.transport
      const problem = diagnoseInbound(stats, targetFps)
      // Tela parada sem nenhum sinal de problema não entra na conta
      if (problem === 'ok' && targetFps > 0 && stats.fps < targetFps * 0.25) return
      used++
      fpsSum += stats.fps
      lossSum += stats.packetLossPct
      droppedSum += stats.droppedPct
      freezes += stats.freezes
      if (problem === 'network' || problem === 'decoder' || problem === 'source') counts[problem]++
    },

    summary(): WatchSessionSummary {
      const share = (count: number) => (used > 0 ? count / used : 0)
      let problem: WatchProblem = 'ok'
      if (used >= MIN_SAMPLES) {
        const ranked = (Object.entries(counts) as Array<['network' | 'decoder' | 'source', number]>)
          .sort((a, b) => b[1] - a[1])
        if (share(ranked[0][1]) >= PROBLEM_SHARE) problem = ranked[0][0]
        else if (isTcp(transport)) problem = 'transport'
      }
      return {
        samples: used,
        targetFps,
        avgFps: used > 0 ? round1(fpsSum / used) : 0,
        avgPacketLossPct: used > 0 ? round1(lossSum / used) : 0,
        avgDroppedPct: used > 0 ? round1(droppedSum / used) : 0,
        freezes,
        networkPct: Math.round(share(counts.network) * 100),
        decoderPct: Math.round(share(counts.decoder) * 100),
        sourcePct: Math.round(share(counts.source) * 100),
        transport,
        problem
      }
    }
  }
}

export type WatchSession = ReturnType<typeof createWatchSession>

/** "screen_video_60fps" → 60 (o nome da faixa leva o FPS escolhido por quem transmite); 0 se não der para saber */
export function targetFpsFromTrackName(name: string | undefined | null): number {
  const match = /_(\d{2,3})fps/.exec(name ?? '')
  return match ? Number(match[1]) : 0
}
