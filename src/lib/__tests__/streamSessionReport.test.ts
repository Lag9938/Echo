import { describe, it, expect } from 'vitest'
import { createStreamSession, describeStreamSummary, type StreamSample } from '../streamSessionReport'
import { transportOf, describeTransport } from '../screenShareStats'

const sample = (over: Partial<StreamSample> = {}): StreamSample => ({
  fps: 60, captureFps: 60, limitation: 'none', hardware: true, transport: 'udp', ...over
})

/** Transmissão a 60 FPS: 3 medições de aquecimento e depois as informadas */
function session(samples: StreamSample[], targetFps = 60) {
  const s = createStreamSession(targetFps)
  for (let i = 0; i < 3; i++) s.add(sample({ fps: 5, captureFps: 60 }))
  samples.forEach((x) => s.add(x))
  return s.summary()
}
const repeat = (count: number, over: Partial<StreamSample> = {}) => Array.from({ length: count }, () => sample(over))

describe('resumo de fluidez da transmissão', () => {
  it('transmissão fluida não aponta problema nem avisa ninguém', () => {
    const summary = session(repeat(30))
    expect(summary.bottleneck).toBe('ok')
    expect(summary.avgFps).toBe(60)
    expect(describeStreamSummary(summary)).toBeNull()
  })

  it('o aquecimento (codificador subindo) não conta como engasgo', () => {
    // As 3 primeiras medições do helper vêm com 5 FPS
    expect(session(repeat(12)).avgFps).toBe(60)
  })

  it('jogo ocupando a placa de vídeo: a CAPTURA entrega poucos quadros', () => {
    const summary = session([...repeat(10), ...repeat(20, { fps: 38, captureFps: 38 })])
    expect(summary.bottleneck).toBe('capture')
    expect(summary.lowCapturePct).toBe(67)
    expect(describeStreamSummary(summary)?.message).toContain('Limite o FPS do jogo')
  })

  it('captura entrega os 60 e o envio não acompanha: é o CODIFICADOR', () => {
    const summary = session([...repeat(10), ...repeat(10, { fps: 35, captureFps: 60, limitation: 'cpu', hardware: false })])
    expect(summary.bottleneck).toBe('encoder')
    expect(summary.hardware).toBe(false)
    expect(describeStreamSummary(summary)?.message).toContain('codificando pelo processador')
  })

  it('codificador acusando falta de internet de envio: é o UPLOAD, mesmo com os quadros caindo junto', () => {
    const summary = session([...repeat(10), ...repeat(10, { fps: 30, captureFps: 40, limitation: 'bandwidth' })])
    expect(summary.bottleneck).toBe('upload')
    expect(summary.bandwidthLimitedPct).toBe(50)
  })

  it('tela parada (menu, texto) não é engasgo: essas medições ficam de fora', () => {
    const summary = session([...repeat(12), ...repeat(40, { fps: 4, captureFps: 4 })])
    expect(summary.bottleneck).toBe('ok')
    expect(summary.samples).toBe(12)
  })

  it('engasgo raro (menos de 20% do tempo) não vira aviso', () => {
    expect(session([...repeat(27), ...repeat(3, { fps: 30, captureFps: 30 })]).bottleneck).toBe('ok')
  })

  it('transmissão curta demais não conclui nada', () => {
    expect(session(repeat(5, { fps: 20, captureFps: 20 })).bottleneck).toBe('ok')
  })

  it('tudo fluido mas por TCP: avisa da conexão', () => {
    const summary = session(repeat(20, { transport: 'tcp' }))
    expect(summary.bottleneck).toBe('transport')
    expect(describeStreamSummary(summary)?.message).toContain('TCP')
  })

  it('transmissão a 30 FPS usa a meta de 30', () => {
    expect(session(repeat(20, { fps: 30, captureFps: 30 }), 30).bottleneck).toBe('ok')
  })
})

describe('caminho até o servidor de voz', () => {
  const report = (local: Record<string, unknown>) => {
    const stats = [
      { id: 'T1', type: 'transport', selectedCandidatePairId: 'CP1' },
      { id: 'CP0', type: 'candidate-pair', localCandidateId: 'L0', nominated: false, state: 'failed' },
      { id: 'CP1', type: 'candidate-pair', localCandidateId: 'L1', nominated: true, state: 'succeeded' },
      { id: 'L0', type: 'local-candidate', protocol: 'tcp', candidateType: 'host' },
      { id: 'L1', type: 'local-candidate', ...local }
    ]
    return { forEach: (cb: (stat: any) => void) => stats.forEach(cb) }
  }

  it('lê o par de candidatos em uso, não um que falhou', () => {
    expect(transportOf(report({ protocol: 'udp', candidateType: 'srflx' }))).toBe('udp')
    expect(transportOf(report({ protocol: 'tcp', candidateType: 'host' }))).toBe('tcp')
  })

  it('por relay, vale o protocolo até o relay', () => {
    expect(transportOf(report({ protocol: 'udp', candidateType: 'relay', relayProtocol: 'tls' }))).toBe('relay-tcp')
    expect(transportOf(report({ protocol: 'udp', candidateType: 'relay', relayProtocol: 'udp' }))).toBe('relay-udp')
  })

  it('sem relatório ou sem par selecionado, não inventa', () => {
    expect(transportOf(null)).toBeNull()
    expect(transportOf({ forEach: () => {} })).toBeNull()
    expect(describeTransport(null)).toBe('medindo…')
    expect(describeTransport('tcp')).toContain('pior para vídeo')
  })
})
