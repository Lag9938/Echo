// Medições de QUEM TRANSMITE, enviadas a quem assiste pela própria chamada (mensagem de dados do LiveKit).
//
// Quem assiste só enxerga o que chega: 15 quadros por segundo sem perda nenhuma parece igual, venha da captura,
// do codificador ou da internet de envio de quem transmite. E quem transmite está com o jogo em tela cheia,
// sem ver o próprio painel. Com isto, o painel de quem assiste mostra também os números da origem.
// São poucos bytes a cada 2 s, e só enquanto há transmissão.

import type { OutboundScreenStats, QualityLimitation, StreamTransport } from './screenShareStats'

export const ORIGIN_STATS_TYPE = 'stream_stats'
/** Depois disso sem chegar medição nova, o painel deixa de mostrar a da origem */
export const ORIGIN_STATS_MAX_AGE_MS = 8000

const LIMITATIONS: QualityLimitation[] = ['none', 'cpu', 'bandwidth', 'other']
const TRANSPORTS: StreamTransport[] = ['udp', 'tcp', 'relay-udp', 'relay-tcp']

const finite = (value: unknown, max: number): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null

export function encodeOriginStats(stats: OutboundScreenStats): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify({
    type: ORIGIN_STATS_TYPE,
    fps: stats.fps,
    captureFps: stats.captureFps,
    width: stats.width,
    height: stats.height,
    kbps: stats.kbps,
    codec: stats.codec,
    hardware: stats.hardware,
    limitation: stats.limitation,
    transport: stats.transport
  }))
}

/**
 * Lê a mensagem recebida. Qualquer participante consegue mandar uma mensagem de dados, então nada aqui é
 * confiado: valores fora do esperado descartam a mensagem inteira (devolve null).
 */
export function parseOriginStats(data: any): OutboundScreenStats | null {
  if (!data || data.type !== ORIGIN_STATS_TYPE) return null
  const fps = finite(data.fps, 1000)
  const width = finite(data.width, 20000)
  const height = finite(data.height, 20000)
  const kbps = finite(data.kbps, 1_000_000)
  if (fps === null || width === null || height === null || kbps === null) return null
  return {
    fps,
    width,
    height,
    kbps,
    captureFps: data.captureFps === null ? null : finite(data.captureFps, 1000),
    codec: typeof data.codec === 'string' ? data.codec.slice(0, 12).replace(/[^A-Za-z0-9]/g, '') : '',
    hardware: typeof data.hardware === 'boolean' ? data.hardware : null,
    limitation: LIMITATIONS.includes(data.limitation) ? data.limitation : 'none',
    transport: TRANSPORTS.includes(data.transport) ? data.transport : null
  }
}

/**
 * Em que etapa a origem está perdendo quadros, em uma frase para o painel de quem assiste.
 * `targetFps` = FPS escolhido por quem transmite.
 */
export function describeOrigin(stats: OutboundScreenStats, targetFps: number): string {
  if (stats.limitation === 'bandwidth') return 'Internet de envio de quem transmite no limite'
  if (targetFps > 0 && stats.captureFps !== null && stats.captureFps < targetFps * 0.25) return 'Tela parada (poucos quadros de propósito)'
  if (targetFps > 0 && stats.captureFps !== null && stats.captureFps < targetFps * 0.8) return 'A captura da tela entrega poucos quadros'
  if (stats.limitation === 'cpu') return 'O computador de quem transmite não dá conta de codificar'
  if (targetFps > 0 && stats.fps < targetFps * 0.8) return 'A captura entrega os quadros, mas o envio não acompanha'
  return 'Nenhum problema na origem'
}
