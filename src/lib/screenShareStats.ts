// Medição REAL da transmissão de tela, lida do WebRTC (getStats): quantos quadros por segundo estão de
// fato sendo capturados, enviados e recebidos, em que resolução e bitrate, com qual codec, e o que está
// limitando a qualidade. Antes o painel de estatísticas mostrava textos fixos ("~2.4 - 3.2 Mbps",
// "H.264 High Profile") e o FPS era arredondado para 30 ou 60, então não dava para saber se a transmissão
// estava mesmo fluida.

type StatsLike = { forEach: (callback: (stat: any) => void) => void }

export type QualityLimitation = 'none' | 'cpu' | 'bandwidth' | 'other'

/** Por onde a mídia vai até o servidor de voz. TCP (direto ou por relay) trava o vídeo a cada pacote perdido. */
export type StreamTransport = 'udp' | 'tcp' | 'relay-udp' | 'relay-tcp'

/** Lê o caminho em uso (par de candidatos selecionado) de um relatório do WebRTC; null se ainda não há */
export function transportOf(report: StatsLike | null | undefined): StreamTransport | null {
  const stats = collect(report)
  const byId = new Map<string, any>(stats.map((stat) => [stat.id, stat]))
  const transport = stats.find((stat) => stat.type === 'transport' && typeof stat.selectedCandidatePairId === 'string')
  const pair = transport
    ? byId.get(transport.selectedCandidatePairId)
    : stats.find((stat) => stat.type === 'candidate-pair' && stat.nominated && stat.state === 'succeeded')
  const local = pair && typeof pair.localCandidateId === 'string' ? byId.get(pair.localCandidateId) : null
  if (!local) return null
  if (local.candidateType === 'relay') return local.relayProtocol === 'udp' ? 'relay-udp' : 'relay-tcp'
  return local.protocol === 'tcp' ? 'tcp' : 'udp'
}

/** "UDP", "TCP (pior para vídeo)"… */
export function describeTransport(transport: StreamTransport | null): string {
  if (transport === 'udp') return 'UDP (direta)'
  if (transport === 'relay-udp') return 'UDP (por relay)'
  if (transport === 'tcp') return 'TCP (pior para vídeo)'
  if (transport === 'relay-tcp') return 'TCP por relay (pior para vídeo)'
  return 'medindo…'
}

export interface VideoFlowStats {
  /** Quadros por segundo de verdade no último intervalo */
  fps: number
  width: number
  height: number
  /** Bitrate do vídeo no último intervalo, em kbps */
  kbps: number
  /** "H264", "VP8", "VP9", "AV1"... ('' se ainda não deu para saber) */
  codec: string
  /** true = placa de vídeo, false = processador, null = o navegador não informou */
  hardware: boolean | null
  /** Caminho até o servidor de voz (null = ainda não deu para saber) */
  transport: StreamTransport | null
}

/** O que ESTE app está enviando (quem transmite) */
export interface OutboundScreenStats extends VideoFlowStats {
  /** Quadros por segundo que a captura da tela entrega ao codificador (antes de qualquer corte) */
  captureFps: number | null
  /** O que o codificador diz que está segurando a qualidade agora */
  limitation: QualityLimitation
}

/** O que ESTE app está recebendo de uma transmissão (quem assiste) */
export interface InboundVideoStats extends VideoFlowStats {
  /** % dos quadros recebidos que foram descartados em vez de mostrados, no último intervalo */
  droppedPct: number
  /** Quantas vezes a imagem congelou no último intervalo */
  freezes: number
  /** % de pacotes de vídeo perdidos no último intervalo */
  packetLossPct: number
  jitterMs: number
}

interface FlowCounters {
  at: number
  frames: number
  bytes: number
}

interface InboundCountersEntry extends FlowCounters {
  dropped: number
  freezes: number
  received: number
  lost: number
}

/** Contadores acumulados da leitura anterior, para calcular as taxas só do último intervalo */
export interface ScreenShareCounters {
  outbound: Record<string, FlowCounters>
  inbound: Record<string, InboundCountersEntry>
}

export interface ScreenShareStatsResult {
  outbound: OutboundScreenStats | null
  /** Por id da faixa de vídeo recebida (MediaStreamTrack.id) */
  inbound: Record<string, InboundVideoStats>
  counters: ScreenShareCounters
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

function collect(report: StatsLike | null | undefined): any[] {
  const stats: any[] = []
  report?.forEach((stat) => stats.push(stat))
  return stats
}

/** "video/H264" → "H264" */
function codecName(byId: Map<string, any>, codecId: unknown): string {
  const mime = typeof codecId === 'string' ? byId.get(codecId)?.mimeType : ''
  return typeof mime === 'string' && mime.includes('/') ? mime.split('/')[1].toUpperCase() : ''
}

function limitationOf(reason: unknown): QualityLimitation {
  return reason === 'cpu' || reason === 'bandwidth' || reason === 'other' ? reason : 'none'
}

/** Taxa por segundo entre duas leituras; null quando ainda não há leitura anterior utilizável */
function rate(now: number, before: number | undefined, elapsedMs: number): number | null {
  if (before === undefined || elapsedMs <= 0 || now < before) return null
  return ((now - before) * 1000) / elapsedMs
}

/**
 * Resume as estatísticas de vídeo da transmissão de tela.
 * `screenTrackIds`: ids das faixas de tela que este app está enviando (para separar da câmera); sem isso,
 * vale a marcação do próprio navegador (contentType "screenshare").
 */
export function summarizeScreenShareStats(
  publisherReport: StatsLike | null | undefined,
  subscriberReport: StatsLike | null | undefined,
  previous: ScreenShareCounters | null,
  screenTrackIds: string[] = []
): ScreenShareStatsResult {
  const counters: ScreenShareCounters = { outbound: {}, inbound: {} }

  // ── Envio ────────────────────────────────────────────────────────────────
  const published = collect(publisherReport)
  const publishedById = new Map<string, any>(published.map((stat) => [stat.id, stat]))
  const layers = published.filter((stat) => {
    if (stat.type !== 'outbound-rtp' || stat.kind !== 'video') return false
    const source = typeof stat.mediaSourceId === 'string' ? publishedById.get(stat.mediaSourceId) : null
    if (source?.trackIdentifier && screenTrackIds.includes(source.trackIdentifier)) return true
    return stat.contentType === 'screenshare'
  })

  let outbound: OutboundScreenStats | null = null
  if (layers.length > 0) {
    // Com simulcast há uma entrada por camada: a de maior resolução é a que representa a transmissão
    let best: { stat: any; fps: number; kbps: number } | null = null
    let totalKbps = 0
    for (const stat of layers) {
      const key = String(stat.ssrc ?? stat.id)
      const at = num(stat.timestamp)
      const frames = num(stat.framesEncoded)
      const bytes = num(stat.bytesSent)
      counters.outbound[key] = { at, frames, bytes }
      const before = previous?.outbound[key]
      const elapsed = before ? at - before.at : 0
      const fps = rate(frames, before?.frames, elapsed) ?? num(stat.framesPerSecond)
      const kbps = ((rate(bytes, before?.bytes, elapsed) ?? 0) * 8) / 1000
      totalKbps += kbps
      if (!best || num(stat.frameWidth) > num(best.stat.frameWidth)) best = { stat, fps, kbps }
    }
    if (best) {
      const source = typeof best.stat.mediaSourceId === 'string' ? publishedById.get(best.stat.mediaSourceId) : null
      // Qualquer camada limitada conta: é ela que explica a queda de qualidade
      const limited = layers.map((stat) => limitationOf(stat.qualityLimitationReason)).find((reason) => reason !== 'none')
      outbound = {
        fps: Math.round(best.fps * 10) / 10,
        width: num(best.stat.frameWidth) || num(source?.width),
        height: num(best.stat.frameHeight) || num(source?.height),
        kbps: Math.round(totalKbps),
        codec: codecName(publishedById, best.stat.codecId),
        hardware: typeof best.stat.powerEfficientEncoder === 'boolean' ? best.stat.powerEfficientEncoder : null,
        transport: transportOf(publisherReport),
        captureFps: typeof source?.framesPerSecond === 'number' ? Math.round(source.framesPerSecond * 10) / 10 : null,
        limitation: limited ?? 'none'
      }
    }
  }

  // ── Recebimento ──────────────────────────────────────────────────────────
  // O LiveKit pode usar duas conexões (uma para enviar, outra para receber) ou UMA só para tudo, conforme o
  // servidor. Com uma só, o que este app recebe está no relatório de "envio": procurar apenas no de
  // recebimento deixava o painel de quem assiste parado em "medindo…".
  const inbound: Record<string, InboundVideoStats> = {}
  for (const report of [subscriberReport, publisherReport]) {
    const received = collect(report)
    const receivedById = new Map<string, any>(received.map((stat) => [stat.id, stat]))
    const inboundTransport = transportOf(report)
    for (const stat of received) {
      if (stat.type !== 'inbound-rtp' || stat.kind !== 'video' || typeof stat.trackIdentifier !== 'string') continue
      const key = stat.trackIdentifier
      if (inbound[key]) continue
      const now: InboundCountersEntry = {
        at: num(stat.timestamp),
        frames: num(stat.framesDecoded),
        bytes: num(stat.bytesReceived),
        dropped: num(stat.framesDropped),
        freezes: num(stat.freezeCount),
        received: num(stat.packetsReceived),
        lost: Math.max(0, num(stat.packetsLost))
      }
      counters.inbound[key] = now
      const before = previous?.inbound[key]
      const elapsed = before ? now.at - before.at : 0
      const usable = Boolean(before && elapsed > 0 && now.frames >= before.frames)

      const decoded = usable ? now.frames - before!.frames : 0
      const dropped = usable ? Math.max(0, now.dropped - before!.dropped) : 0
      const packets = usable ? Math.max(0, now.received - before!.received) : 0
      const lost = usable ? Math.max(0, now.lost - before!.lost) : 0

      inbound[key] = {
        fps: Math.round((rate(now.frames, before?.frames, elapsed) ?? num(stat.framesPerSecond)) * 10) / 10,
        width: num(stat.frameWidth),
        height: num(stat.frameHeight),
        kbps: Math.round(((rate(now.bytes, before?.bytes, elapsed) ?? 0) * 8) / 1000),
        codec: codecName(receivedById, stat.codecId),
        hardware: typeof stat.powerEfficientDecoder === 'boolean' ? stat.powerEfficientDecoder : null,
        transport: inboundTransport,
        droppedPct: decoded + dropped > 0 ? Math.round((dropped / (decoded + dropped)) * 1000) / 10 : 0,
        freezes: usable ? Math.max(0, now.freezes - before!.freezes) : 0,
        packetLossPct: packets + lost > 0 ? Math.round((lost / (packets + lost)) * 1000) / 10 : 0,
        jitterMs: Math.round(num(stat.jitter) * 1000)
      }
    }
  }

  return { outbound, inbound, counters }
}

/** Texto curto do que está limitando a transmissão, para o painel de estatísticas */
export function describeLimitation(limitation: QualityLimitation): string {
  if (limitation === 'cpu') return 'Processador ou placa de vídeo no limite'
  if (limitation === 'bandwidth') return 'Internet de envio no limite'
  if (limitation === 'other') return 'Limitada pelo codificador'
  return 'Nenhuma'
}

/** "5.2 Mbps" ou "840 kbps" */
export function formatBitrate(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`
  return `${Math.round(kbps)} kbps`
}

/**
 * A transmissão está abaixo do que foi pedido? Só conta quando a captura entrega os quadros e o envio não
 * acompanha: tela parada (menu, texto) gera poucos quadros de propósito e não é problema.
 */
export function isBelowTarget(fps: number, targetFps: number, captureFps: number | null): boolean {
  if (targetFps <= 0) return false
  if (captureFps !== null && captureFps < targetFps * 0.8) return false
  return fps < targetFps * 0.8
}
