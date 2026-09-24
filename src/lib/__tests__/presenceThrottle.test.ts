import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { installPresenceTrackThrottle } from '../presenceThrottle'

function makeChannel() {
  return {
    track: vi.fn().mockResolvedValue('ok'),
    untrack: vi.fn().mockResolvedValue('ok')
  }
}

describe('installPresenceTrackThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('envia o primeiro track imediatamente', async () => {
    const ch = makeChannel()
    const raw = ch.track
    installPresenceTrackThrottle(ch)
    await ch.track({ user_id: 'a', online_at: '1' })
    expect(raw).toHaveBeenCalledTimes(1)
  })

  it('descarta payload idêntico (ignorando online_at) dentro do batimento', async () => {
    const ch = makeChannel()
    const raw = ch.track
    installPresenceTrackThrottle(ch)
    await ch.track({ user_id: 'a', game: null, online_at: '1' })
    vi.advanceTimersByTime(9000)
    await ch.track({ game: null, user_id: 'a', online_at: '2' })
    expect(raw).toHaveBeenCalledTimes(1)
  })

  it('reenvia o mesmo payload como batimento depois de keepAliveMs', async () => {
    const ch = makeChannel()
    const raw = ch.track
    installPresenceTrackThrottle(ch, { keepAliveMs: 25000 })
    await ch.track({ user_id: 'a' })
    vi.advanceTimersByTime(26000)
    await ch.track({ user_id: 'a' })
    expect(raw).toHaveBeenCalledTimes(2)
  })

  it('coalesce rajadas: só o estado mais recente é enviado ao fim do intervalo', async () => {
    const ch = makeChannel()
    const raw = ch.track
    installPresenceTrackThrottle(ch, { minIntervalMs: 8000 })
    await ch.track({ user_id: 'a', v: 0 })
    for (let i = 1; i <= 20; i++) {
      await ch.track({ user_id: 'a', v: i })
    }
    expect(raw).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(8000)
    expect(raw).toHaveBeenCalledTimes(2)
    expect(raw).toHaveBeenLastCalledWith({ user_id: 'a', v: 20 }, undefined)
  })

  it('nunca passa de 5 envios em uma janela de 30s mesmo com mudança a cada segundo', async () => {
    const ch = makeChannel()
    const raw = ch.track
    installPresenceTrackThrottle(ch)
    const sentAt: number[] = []
    raw.mockImplementation(() => {
      sentAt.push(Date.now())
      return Promise.resolve('ok')
    })
    for (let s = 0; s < 120; s++) {
      await ch.track({ user_id: 'a', v: s })
      vi.advanceTimersByTime(1000)
    }
    for (let i = 0; i < sentAt.length; i++) {
      const inWindow = sentAt.filter(t => t >= sentAt[i] && t < sentAt[i] + 30000)
      expect(inWindow.length).toBeLessThanOrEqual(5)
    }
    expect(sentAt.length).toBeGreaterThan(5)
  })

  it('se o estado voltar ao já publicado, o envio pendente é cancelado', async () => {
    const ch = makeChannel()
    const raw = ch.track
    installPresenceTrackThrottle(ch, { minIntervalMs: 8000 })
    await ch.track({ user_id: 'a', game: null })
    await ch.track({ user_id: 'a', game: 'X' })
    await ch.track({ user_id: 'a', game: null })
    vi.advanceTimersByTime(10000)
    expect(raw).toHaveBeenCalledTimes(1)
  })

  it('untrack zera o estado: o próximo track idêntico sai imediatamente', async () => {
    const ch = makeChannel()
    const raw = ch.track
    installPresenceTrackThrottle(ch, { minIntervalMs: 0 })
    await ch.track({ user_id: 'a' })
    await ch.untrack()
    await ch.track({ user_id: 'a' })
    expect(raw).toHaveBeenCalledTimes(2)
  })

  it('não descarta o retry idêntico se o envio anterior falhou', async () => {
    const ch = makeChannel()
    const raw = ch.track
    raw.mockRejectedValueOnce(new Error('not joined'))
    installPresenceTrackThrottle(ch, { minIntervalMs: 0 })
    await expect(ch.track({ user_id: 'a' })).rejects.toThrow('not joined')
    await ch.track({ user_id: 'a' })
    expect(raw).toHaveBeenCalledTimes(2)
  })

  it('é idempotente', async () => {
    const ch = makeChannel()
    const raw = ch.track
    installPresenceTrackThrottle(ch)
    installPresenceTrackThrottle(ch)
    await ch.track({ user_id: 'a', v: 1 })
    expect(raw).toHaveBeenCalledTimes(1)
  })
})
