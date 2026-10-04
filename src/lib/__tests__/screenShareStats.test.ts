import { describe, it, expect } from 'vitest'
import { describeLimitation, formatBitrate, isBelowTarget, summarizeScreenShareStats } from '../screenShareStats'

const report = (stats: any[]) => ({ forEach: (callback: (stat: any) => void) => stats.forEach(callback) })

const codec = (id: string, mimeType: string) => ({ id, type: 'codec', mimeType })

const outbound = (overrides: Record<string, unknown> = {}) => ({
  id: 'out-1',
  type: 'outbound-rtp',
  kind: 'video',
  ssrc: 111,
  contentType: 'screenshare',
  mediaSourceId: 'src-1',
  codecId: 'c-h264',
  timestamp: 10_000,
  framesEncoded: 600,
  bytesSent: 1_000_000,
  frameWidth: 1920,
  frameHeight: 1080,
  framesPerSecond: 58,
  qualityLimitationReason: 'none',
  powerEfficientEncoder: true,
  ...overrides
})

const source = (overrides: Record<string, unknown> = {}) => ({
  id: 'src-1',
  type: 'media-source',
  kind: 'video',
  trackIdentifier: 'screen-track',
  framesPerSecond: 60,
  width: 1920,
  height: 1080,
  ...overrides
})

const inbound = (overrides: Record<string, unknown> = {}) => ({
  id: 'in-1',
  type: 'inbound-rtp',
  kind: 'video',
  trackIdentifier: 'remote-track',
  codecId: 'c-vp8',
  timestamp: 10_000,
  framesDecoded: 300,
  framesDropped: 0,
  bytesReceived: 500_000,
  frameWidth: 1280,
  frameHeight: 720,
  framesPerSecond: 29,
  freezeCount: 0,
  packetsReceived: 1000,
  packetsLost: 0,
  jitter: 0.012,
  powerEfficientDecoder: false,
  ...overrides
})

describe('summarizeScreenShareStats: envio', () => {
  it('na primeira leitura usa o FPS que o navegador informa; bitrate ainda não dá para calcular', () => {
    const result = summarizeScreenShareStats(report([outbound(), source(), codec('c-h264', 'video/H264')]), null, null)
    expect(result.outbound).toEqual({
      fps: 58,
      width: 1920,
      height: 1080,
      kbps: 0,
      codec: 'H264',
      hardware: true,
      captureFps: 60,
      limitation: 'none'
    })
  })

  it('da segunda leitura em diante calcula FPS e bitrate reais pelo que mudou no intervalo', () => {
    const first = summarizeScreenShareStats(report([outbound(), source()]), null, null)
    const second = summarizeScreenShareStats(
      report([outbound({ timestamp: 12_000, framesEncoded: 690, bytesSent: 2_500_000 }), source()]),
      null,
      first.counters
    )
    // 90 quadros em 2 s = 45 FPS; 1.500.000 bytes em 2 s = 6.000 kbps
    expect(second.outbound?.fps).toBe(45)
    expect(second.outbound?.kbps).toBe(6000)
  })

  it('separa a tela da câmera: câmera sozinha não conta como transmissão', () => {
    const camera = outbound({ contentType: undefined, mediaSourceId: 'src-cam' })
    const result = summarizeScreenShareStats(report([camera, source({ id: 'src-cam', trackIdentifier: 'cam-track' })]), null, null)
    expect(result.outbound).toBeNull()
  })

  it('reconhece a tela pelo id da faixa quando o navegador não marca o tipo de conteúdo', () => {
    const untagged = outbound({ contentType: undefined })
    const result = summarizeScreenShareStats(report([untagged, source()]), null, null, ['screen-track'])
    expect(result.outbound?.width).toBe(1920)
  })

  it('com várias camadas, mostra a de maior resolução, soma o bitrate e aponta a limitação de qualquer uma', () => {
    const low = outbound({ id: 'out-low', ssrc: 222, frameWidth: 640, frameHeight: 360, framesEncoded: 100, bytesSent: 100_000, qualityLimitationReason: 'bandwidth' })
    const first = summarizeScreenShareStats(report([outbound(), low, source()]), null, null)
    const second = summarizeScreenShareStats(
      report([
        outbound({ timestamp: 12_000, framesEncoded: 720, bytesSent: 2_000_000 }),
        { ...low, timestamp: 12_000, framesEncoded: 160, bytesSent: 350_000 },
        source()
      ]),
      null,
      first.counters
    )
    expect(second.outbound?.width).toBe(1920)
    expect(second.outbound?.fps).toBe(60)
    // (1.000.000 + 250.000) bytes em 2 s = 5.000 kbps
    expect(second.outbound?.kbps).toBe(5000)
    expect(second.outbound?.limitation).toBe('bandwidth')
  })

  it('contador que voltou atrás (transmissão reiniciada) não gera FPS negativo: cai no valor do navegador', () => {
    const first = summarizeScreenShareStats(report([outbound(), source()]), null, null)
    const restarted = summarizeScreenShareStats(
      report([outbound({ timestamp: 12_000, framesEncoded: 20, bytesSent: 10_000, framesPerSecond: 30 }), source()]),
      null,
      first.counters
    )
    expect(restarted.outbound?.fps).toBe(30)
    expect(restarted.outbound?.kbps).toBe(0)
  })

  it('sem transmissão de tela devolve null', () => {
    expect(summarizeScreenShareStats(report([]), report([]), null).outbound).toBeNull()
    expect(summarizeScreenShareStats(null, undefined, null).outbound).toBeNull()
  })
})

describe('summarizeScreenShareStats: recebimento', () => {
  it('devolve uma medição por faixa de vídeo recebida, pelo id da faixa', () => {
    const result = summarizeScreenShareStats(
      null,
      report([inbound(), inbound({ id: 'in-2', trackIdentifier: 'outra-faixa', frameWidth: 1920, frameHeight: 1080 }), codec('c-vp8', 'video/VP8')]),
      null
    )
    expect(Object.keys(result.inbound).sort()).toEqual(['outra-faixa', 'remote-track'])
    expect(result.inbound['remote-track']).toMatchObject({ fps: 29, width: 1280, height: 720, codec: 'VP8', hardware: false, jitterMs: 12 })
  })

  it('calcula FPS, bitrate, quadros descartados, perda de pacotes e travadas do último intervalo', () => {
    const first = summarizeScreenShareStats(null, report([inbound()]), null)
    const second = summarizeScreenShareStats(
      null,
      report([inbound({
        timestamp: 12_000,
        framesDecoded: 390,
        framesDropped: 10,
        bytesReceived: 1_000_000,
        freezeCount: 2,
        packetsReceived: 1950,
        packetsLost: 50
      })]),
      first.counters
    )
    const stats = second.inbound['remote-track']
    expect(stats.fps).toBe(45)
    expect(stats.kbps).toBe(2000)
    // 10 descartados de 100 quadros (90 mostrados + 10 descartados)
    expect(stats.droppedPct).toBe(10)
    // 50 perdidos de 1000 pacotes (950 recebidos + 50 perdidos)
    expect(stats.packetLossPct).toBe(5)
    expect(stats.freezes).toBe(2)
  })

  it('ignora áudio e vídeo sem id de faixa', () => {
    const result = summarizeScreenShareStats(null, report([inbound({ kind: 'audio' }), inbound({ id: 'x', trackIdentifier: undefined })]), null)
    expect(result.inbound).toEqual({})
  })
})

describe('textos e alerta', () => {
  it('formata o bitrate', () => {
    expect(formatBitrate(840)).toBe('840 kbps')
    expect(formatBitrate(5230)).toBe('5.2 Mbps')
  })

  it('descreve a limitação em português', () => {
    expect(describeLimitation('none')).toBe('Nenhuma')
    expect(describeLimitation('cpu')).toMatch(/Processador/)
    expect(describeLimitation('bandwidth')).toMatch(/Internet/)
  })

  it('só alerta quando a tela gera os quadros e o envio não acompanha', () => {
    // Pediu 60, captura 60, envia 40: problema
    expect(isBelowTarget(40, 60, 60)).toBe(true)
    // Pediu 60, envia 57: dentro da margem
    expect(isBelowTarget(57, 60, 60)).toBe(false)
    // Tela parada (captura 5 quadros): poucos quadros é o esperado
    expect(isBelowTarget(5, 60, 5)).toBe(false)
    // Sem saber a captura, julga só pelo enviado
    expect(isBelowTarget(20, 60, null)).toBe(true)
  })
})
