// Resumo de UMA transmissão de tela, do lado de quem transmite: junta as medições reais do WebRTC (uma a cada
// 2 s) e diz em que etapa a transmissão perdeu fluidez. Quem transmite um jogo está com o jogo em tela cheia e
// não vê o painel de estatísticas na hora do engasgo — sem este resumo, ninguém sabe onde está o problema.

import type { QualityLimitation, StreamTransport } from './screenShareStats'

export interface StreamSample {
  /** Quadros por segundo de fato enviados */
  fps: number
  /** Quadros por segundo que a captura entregou ao codificador (null = o navegador não informou) */
  captureFps: number | null
  limitation: QualityLimitation
  hardware: boolean | null
  transport: StreamTransport | null
}

/** Onde a transmissão perdeu fluidez */
export type StreamBottleneck = 'ok' | 'capture' | 'encoder' | 'upload' | 'transport'

export interface StreamSessionSummary {
  /** Medições aproveitadas (sem o aquecimento e sem a tela parada) */
  samples: number
  targetFps: number
  avgFps: number
  avgCaptureFps: number | null
  /** % das medições em que a captura entregou menos quadros que a meta */
  lowCapturePct: number
  /** % em que a captura entregou os quadros e o codificador não acompanhou (ou acusou falta de máquina) */
  encoderLimitedPct: number
  /** % em que o codificador acusou falta de internet de envio */
  bandwidthLimitedPct: number
  hardware: boolean | null
  transport: StreamTransport | null
  bottleneck: StreamBottleneck
}

/** As primeiras medições pegam o codificador ainda subindo de qualidade */
const WARMUP_SAMPLES = 3
/** Menos que isso (20 s de transmissão em movimento) não dá para concluir nada */
const MIN_SAMPLES = 10
/** Uma etapa só é apontada se atrapalhou em pelo menos 20% do tempo */
const BOTTLENECK_SHARE = 0.2

const round1 = (value: number) => Math.round(value * 10) / 10

export function createStreamSession(targetFps: number) {
  let seen = 0
  let used = 0
  let fpsSum = 0
  let captureSum = 0
  let captureCount = 0
  let lowCapture = 0
  let encoderLimited = 0
  let bandwidthLimited = 0
  let hardware: boolean | null = null
  let transport: StreamTransport | null = null

  return {
    add(sample: StreamSample) {
      seen++
      if (seen <= WARMUP_SAMPLES || targetFps <= 0) return
      if (sample.hardware !== null) hardware = sample.hardware
      if (sample.transport) transport = sample.transport
      // Tela parada (menu, texto, jogo pausado): a captura quase não gera quadros de propósito. Não conta.
      if (sample.captureFps !== null && sample.captureFps < targetFps * 0.25) return

      used++
      fpsSum += sample.fps
      if (sample.captureFps !== null) {
        captureSum += sample.captureFps
        captureCount++
      }

      const captureShort = sample.captureFps !== null && sample.captureFps < targetFps * 0.8
      if (sample.limitation === 'bandwidth') bandwidthLimited++
      else if (captureShort) lowCapture++
      else if (sample.limitation === 'cpu' || sample.fps < targetFps * 0.8) encoderLimited++
    },

    summary(): StreamSessionSummary {
      const share = (count: number) => (used > 0 ? count / used : 0)
      let bottleneck: StreamBottleneck = 'ok'
      if (used >= MIN_SAMPLES) {
        const ranked: Array<[StreamBottleneck, number]> = [
          ['capture', share(lowCapture)],
          ['encoder', share(encoderLimited)],
          ['upload', share(bandwidthLimited)]
        ]
        ranked.sort((a, b) => b[1] - a[1])
        if (ranked[0][1] >= BOTTLENECK_SHARE) bottleneck = ranked[0][0]
        // Vídeo por TCP engasga a cada pacote perdido, por melhor que esteja o resto
        else if (transport === 'tcp' || transport === 'relay-tcp') bottleneck = 'transport'
      }
      return {
        samples: used,
        targetFps,
        avgFps: used > 0 ? round1(fpsSum / used) : 0,
        avgCaptureFps: captureCount > 0 ? round1(captureSum / captureCount) : null,
        lowCapturePct: Math.round(share(lowCapture) * 100),
        encoderLimitedPct: Math.round(share(encoderLimited) * 100),
        bandwidthLimitedPct: Math.round(share(bandwidthLimited) * 100),
        hardware,
        transport,
        bottleneck
      }
    }
  }
}

export type StreamSession = ReturnType<typeof createStreamSession>

/** Aviso para quem transmitiu, em linguagem simples; null quando a transmissão foi bem */
export function describeStreamSummary(summary: StreamSessionSummary): { title: string; message: string } | null {
  const target = summary.targetFps
  switch (summary.bottleneck) {
    case 'capture':
      return {
        title: 'Sua transmissão perdeu fluidez na captura',
        message: `A captura da tela entregou em média ${summary.avgCaptureFps ?? summary.avgFps} de ${target} FPS: o jogo está usando quase toda a placa de vídeo. Limite o FPS do jogo (por exemplo, em 144) ou transmita em 720p.`
      }
    case 'encoder':
      return {
        title: 'Sua transmissão perdeu fluidez na codificação',
        message: `O computador enviou em média ${summary.avgFps} de ${target} FPS${summary.hardware === false ? ', codificando pelo processador' : ''}. Transmita em 720p ou feche programas pesados.`
      }
    case 'upload':
      return {
        title: 'Sua internet de envio não sustentou a transmissão',
        message: `Em ${summary.bandwidthLimitedPct}% do tempo faltou velocidade de envio. Transmita em 720p ou use cabo de rede em vez de Wi-Fi.`
      }
    case 'transport':
      return {
        title: 'Sua transmissão foi por uma conexão mais lenta',
        message: 'A ligação com o servidor de voz usou TCP em vez de UDP, e o vídeo trava a cada pacote perdido. Uma rede ou antivírus pode estar bloqueando UDP.'
      }
    default:
      return null
  }
}
