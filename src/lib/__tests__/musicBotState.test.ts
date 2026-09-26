import { describe, it, expect } from 'vitest'
import {
  encodeMusicBotVolume,
  formatClock,
  getCurrentPositionMs,
  isMusicBotIdentity,
  MUSIC_BOT_CONTROL_TOPIC,
  parseMusicBotState,
  type MusicBotState
} from '../musicBotState'

describe('controle de volume em tempo real', () => {
  it('só considera o bot compatível quando ele avisa liveVolume: true', () => {
    const base = { v: 1, status: 'idle', volume: 100, queue: [], history: [] }
    expect(parseMusicBotState(JSON.stringify({ ...base, liveVolume: true }))?.liveVolume).toBe(true)
    expect(parseMusicBotState(JSON.stringify(base))?.liveVolume).toBe(false)
    expect(parseMusicBotState(JSON.stringify({ ...base, liveVolume: 'sim' }))?.liveVolume).toBe(false)
  })

  it('monta a mensagem de volume no formato que o bot lê, limitando 0 a 200', () => {
    const decode = (bytes: Uint8Array) => JSON.parse(new TextDecoder().decode(bytes))
    expect(decode(encodeMusicBotVolume(35))).toEqual({ cmd: 'volume', value: 35 })
    expect(decode(encodeMusicBotVolume(12.6))).toEqual({ cmd: 'volume', value: 13 })
    expect(decode(encodeMusicBotVolume(500))).toEqual({ cmd: 'volume', value: 200 })
    expect(decode(encodeMusicBotVolume(-4))).toEqual({ cmd: 'volume', value: 0 })
    expect(MUSIC_BOT_CONTROL_TOPIC).toBe('echo-music-bot')
  })
})

const valid = {
  v: 1,
  status: 'playing',
  volume: 65,
  current: { title: 'Noticed', durationSeconds: 200, positionMs: 30_000, source: null },
  queue: [{ id: 'q1', title: 'Segunda' }, { id: 'q2', title: 'Terceira' }],
  queueTotal: 2,
  history: [{ title: 'Antiga', url: 'https://youtu.be/abc' }],
  updatedAt: 123
}

describe('isMusicBotIdentity', () => {
  it('reconhece só a identidade do bot', () => {
    expect(isMusicBotIdentity('music-bot-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toBe(true)
    expect(isMusicBotIdentity('aaaaaaaa-0000-4000-8000-00000000000a')).toBe(false)
    expect(isMusicBotIdentity(undefined)).toBe(false)
    expect(isMusicBotIdentity(null)).toBe(false)
  })
})

describe('parseMusicBotState', () => {
  it('lê um estado válido', () => {
    const state = parseMusicBotState(JSON.stringify(valid))!
    expect(state.status).toBe('playing')
    expect(state.volume).toBe(65)
    expect(state.current).toEqual({ title: 'Noticed', durationSeconds: 200, positionMs: 30_000, source: null })
    expect(state.queue).toEqual([{ id: 'q1', title: 'Segunda' }, { id: 'q2', title: 'Terceira' }])
    expect(state.history).toEqual([{ title: 'Antiga', url: 'https://youtu.be/abc' }])
  })

  it.each([undefined, null, '', 'não é json', '[]', '"texto"', '{"v":2}', '{"status":"playing"}'])(
    'devolve null para metadados vazios, inválidos ou de outra versão: %s',
    (raw) => {
      expect(parseMusicBotState(raw as any)).toBeNull()
    }
  )

  it('metadados de perfil de um participante comum (sem v) são ignorados', () => {
    expect(parseMusicBotState(JSON.stringify({ avatarUrl: 'https://x/a.png' }))).toBeNull()
  })

  it('corrige valores fora do esperado em vez de quebrar', () => {
    const state = parseMusicBotState(JSON.stringify({
      v: 1,
      status: 'explodindo',
      volume: 9999,
      current: { title: 42, durationSeconds: -5, positionMs: -10 },
      queue: [null, 'texto', { id: 'DROP TABLE', title: 'x'.repeat(500) }, { id: 'Q3', title: 'ok' }],
      history: [{ title: 'h', url: 'javascript:alert(1)' }, { title: 'h2', url: 'https://ok/' }]
    }))!
    expect(state.status).toBe('idle')
    expect(state.volume).toBe(200)
    expect(state.current).toEqual({ title: 'Música', durationSeconds: null, positionMs: 0, source: null })
    expect(state.queue).toHaveLength(2)
    expect(state.queue[0]).toEqual({ id: null, title: 'x'.repeat(200) })
    expect(state.queue[1]).toEqual({ id: 'q3', title: 'ok' })
    expect(state.history[0].url).toBeNull() // só http(s) vira link de "tocar de novo"
    expect(state.history[1].url).toBe('https://ok/')
  })

  it('limita o tamanho das listas', () => {
    const state = parseMusicBotState(JSON.stringify({
      v: 1,
      queue: Array.from({ length: 200 }, (_, i) => ({ id: `q${i}`, title: `t${i}` })),
      history: Array.from({ length: 200 }, (_, i) => ({ title: `h${i}`, url: null }))
    }))!
    expect(state.queue).toHaveLength(50)
    expect(state.history).toHaveLength(20)
  })

  it('queueTotal nunca é menor que a lista recebida', () => {
    const state = parseMusicBotState(JSON.stringify({ v: 1, queue: [{ id: 'q1', title: 'a' }], queueTotal: 0 }))!
    expect(state.queueTotal).toBe(1)
  })
})

describe('getCurrentPositionMs', () => {
  const base = parseMusicBotState(JSON.stringify(valid)) as MusicBotState

  it('avança o relógio enquanto toca', () => {
    expect(getCurrentPositionMs(base, 1_000, 6_000)).toBe(35_000)
  })

  it('não avança quando pausada, ociosa ou carregando', () => {
    for (const status of ['paused', 'idle', 'loading'] as const) {
      expect(getCurrentPositionMs({ ...base, status }, 1_000, 60_000)).toBe(30_000)
    }
  })

  it('não passa da duração e devolve 0 sem faixa', () => {
    expect(getCurrentPositionMs(base, 0, 999_999)).toBe(200_000)
    expect(getCurrentPositionMs({ ...base, current: null }, 0, 10_000)).toBe(0)
  })

  it('relógio do dispositivo voltando no tempo não gera posição negativa', () => {
    expect(getCurrentPositionMs(base, 10_000, 5_000)).toBe(30_000)
  })
})

describe('formatClock', () => {
  it('formata minutos e horas', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(75_000)).toBe('1:15')
    expect(formatClock(599_000)).toBe('9:59')
    expect(formatClock(3_725_000)).toBe('1:02:05')
    expect(formatClock(-5)).toBe('0:00')
  })
})
