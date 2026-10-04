import { describe, it, expect } from 'vitest'
import { createWatchSession, describeWatchProblem, diagnoseInbound, targetFpsFromTrackName } from '../streamWatchReport'
import { pickInboundStats, type InboundVideoStats } from '../screenShareStats'

const stats = (over: Partial<InboundVideoStats> = {}): InboundVideoStats => ({
  fps: 60, width: 1920, height: 1080, kbps: 6000, codec: 'H264', hardware: true, transport: 'udp',
  droppedPct: 0, freezes: 0, packetLossPct: 0, jitterMs: 5, ...over
})

describe('diagnóstico de quem assiste', () => {
  it('tudo chegando: nenhum problema', () => {
    expect(diagnoseInbound(stats(), 60)).toBe('ok')
    expect(describeWatchProblem('ok')).toBe('Nenhum problema agora')
  })

  it('pacotes se perdendo: é a rede (mesmo que os quadros também caiam)', () => {
    expect(diagnoseInbound(stats({ packetLossPct: 3, fps: 35 }), 60)).toBe('network')
    expect(diagnoseInbound(stats({ packetLossPct: 0.5, freezes: 1 }), 60)).toBe('network')
  })

  it('quadros chegam e são descartados: é o computador de quem assiste', () => {
    expect(diagnoseInbound(stats({ droppedPct: 12 }), 60)).toBe('decoder')
  })

  it('sem perda nem descarte e mesmo assim poucos quadros ou imagem congelada: já chega assim', () => {
    expect(diagnoseInbound(stats({ fps: 34 }), 60)).toBe('source')
    expect(diagnoseInbound(stats({ freezes: 2 }), 60)).toBe('source')
  })

  it('tela parada (menu, texto) não é problema', () => {
    expect(diagnoseInbound(stats({ fps: 3 }), 60)).toBe('ok')
  })

  it('tudo certo mas por TCP: avisa da conexão', () => {
    expect(diagnoseInbound(stats({ transport: 'tcp' }), 60)).toBe('transport')
    expect(diagnoseInbound(stats({ transport: 'relay-tcp' }), 60)).toBe('transport')
  })

  it('o FPS de quem transmite vem do nome da faixa', () => {
    expect(targetFpsFromTrackName('screen_video_60fps')).toBe(60)
    expect(targetFpsFromTrackName('screen_video_30fps')).toBe(30)
    expect(targetFpsFromTrackName('camera')).toBe(0)
    expect(targetFpsFromTrackName(undefined)).toBe(0)
  })
})

describe('qual medição o painel mostra', () => {
  const a = stats({ width: 1280, height: 720 })
  const b = stats({ width: 640, height: 360 })

  it('pelo id da faixa quando ele está entre as medidas', () => {
    expect(pickInboundStats({ t1: a, t2: b }, 't2', '1280x720')).toBe(b)
  })

  it('id desconhecido: vale a única faixa com a resolução do vídeo', () => {
    expect(pickInboundStats({ x1: a, x2: b }, 'outro-id', '1280x720')).toBe(a)
    expect(pickInboundStats({ x1: a }, undefined, '1280x720')).toBe(a)
  })

  it('não chuta: duas faixas com a mesma resolução, ou nenhuma, ficam sem medição', () => {
    expect(pickInboundStats({ x1: a, x2: stats({ width: 1280, height: 720 }) }, 'outro-id', '1280x720')).toBeUndefined()
    expect(pickInboundStats({ x1: b }, 'outro-id', '1280x720')).toBeUndefined()
    expect(pickInboundStats({}, 'outro-id', '')).toBeUndefined()
  })
})

describe('resumo de uma transmissão assistida', () => {
  function summarize(samples: InboundVideoStats[], targetFps = 60) {
    const session = createWatchSession(targetFps)
    for (let i = 0; i < 3; i++) session.add(stats({ fps: 2, freezes: 1 })) // aquecimento
    samples.forEach((sample) => session.add(sample))
    return session.summary()
  }
  const repeat = (count: number, over: Partial<InboundVideoStats> = {}) => Array.from({ length: count }, () => stats(over))

  it('transmissão fluida: sem problema, e o aquecimento não conta', () => {
    const summary = summarize(repeat(30))
    expect(summary).toMatchObject({ problem: 'ok', samples: 30, avgFps: 60, freezes: 0 })
  })

  it('engasgo em cena de muito movimento por perda de pacotes aponta a rede', () => {
    const summary = summarize([...repeat(20), ...repeat(10, { fps: 30, packetLossPct: 4, freezes: 1 })])
    expect(summary.problem).toBe('network')
    expect(summary.networkPct).toBe(33)
    expect(summary.freezes).toBe(10)
    expect(summary.avgPacketLossPct).toBe(1.3)
  })

  it('poucos quadros sem perda nenhuma aponta a origem (quem transmite ou o servidor)', () => {
    expect(summarize([...repeat(10), ...repeat(10, { fps: 35 })]).problem).toBe('source')
  })

  it('tela parada fica de fora; problema raro não vira diagnóstico', () => {
    const summary = summarize([...repeat(28), ...repeat(40, { fps: 4 }), ...repeat(2, { packetLossPct: 5 })])
    expect(summary.samples).toBe(30)
    expect(summary.problem).toBe('ok')
  })

  it('poucas medições não concluem nada', () => {
    expect(summarize(repeat(5, { packetLossPct: 10 })).problem).toBe('ok')
  })
})
