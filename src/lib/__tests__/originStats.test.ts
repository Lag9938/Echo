import { describe, it, expect } from 'vitest'
import { describeOrigin, encodeOriginStats, parseOriginStats } from '../originStats'
import type { OutboundScreenStats } from '../screenShareStats'

const stats = (over: Partial<OutboundScreenStats> = {}): OutboundScreenStats => ({
  fps: 60, width: 1920, height: 1080, kbps: 6000, codec: 'H264', hardware: true, transport: 'udp',
  captureFps: 60, limitation: 'none', ...over
})

describe('medições da origem enviadas a quem assiste', () => {
  it('o que quem transmite envia chega igual do outro lado', () => {
    const sent = stats({ fps: 14.8, captureFps: 15.2, kbps: 2100, limitation: 'cpu', hardware: false })
    const received = parseOriginStats(JSON.parse(new TextDecoder().decode(encodeOriginStats(sent))))
    expect(received).toEqual(sent)
  })

  it('mensagem de outro tipo, ou com números absurdos, é descartada inteira', () => {
    expect(parseOriginStats({ type: 'soundboard' })).toBeNull()
    expect(parseOriginStats(null)).toBeNull()
    expect(parseOriginStats({ type: 'stream_stats', fps: 'sessenta', width: 1, height: 1, kbps: 1 })).toBeNull()
    expect(parseOriginStats({ type: 'stream_stats', fps: -5, width: 1, height: 1, kbps: 1 })).toBeNull()
    expect(parseOriginStats({ type: 'stream_stats', fps: 60, width: 1e9, height: 1, kbps: 1 })).toBeNull()
  })

  it('campos opcionais estranhos viram valores seguros (nada do remetente vai cru para a tela)', () => {
    const parsed = parseOriginStats({
      type: 'stream_stats', fps: 60, width: 1920, height: 1080, kbps: 5000,
      captureFps: 'x', codec: '<img src=x onerror=alert(1)>', hardware: 'sim', limitation: 'hackeado', transport: 'pombo'
    })
    expect(parsed).toMatchObject({ captureFps: null, hardware: null, limitation: 'none', transport: null })
    expect(parsed?.codec).toMatch(/^[A-Za-z0-9]{0,12}$/)
  })
})

describe('causa na origem, em uma frase', () => {
  it('captura entregando poucos quadros (jogo ocupando a placa de vídeo)', () => {
    expect(describeOrigin(stats({ captureFps: 15, fps: 15 }), 60)).toBe('A captura da tela entrega poucos quadros')
  })

  it('captura boa e envio baixo, com o codificador acusando falta de máquina', () => {
    expect(describeOrigin(stats({ captureFps: 60, fps: 14, limitation: 'cpu' }), 60)).toBe('O computador de quem transmite não dá conta de codificar')
  })

  it('falta de internet de envio vem antes de tudo (ela também derruba os quadros)', () => {
    expect(describeOrigin(stats({ captureFps: 40, fps: 14, limitation: 'bandwidth' }), 60)).toBe('Internet de envio de quem transmite no limite')
  })

  it('captura boa, envio baixo e nenhuma limitação declarada', () => {
    expect(describeOrigin(stats({ captureFps: 60, fps: 15 }), 60)).toBe('A captura entrega os quadros, mas o envio não acompanha')
  })

  it('tela parada e transmissão saudável não são problema', () => {
    expect(describeOrigin(stats({ captureFps: 3, fps: 3 }), 60)).toBe('Tela parada (poucos quadros de propósito)')
    expect(describeOrigin(stats(), 60)).toBe('Nenhum problema na origem')
  })
})
