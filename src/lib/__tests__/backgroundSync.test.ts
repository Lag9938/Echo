import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { startBackgroundSync } from '../backgroundSync'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('startBackgroundSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setHidden(false)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sincroniza no intervalo configurado, e não antes', () => {
    const sync = vi.fn()
    const stop = startBackgroundSync(sync, { intervalMs: 300_000 })
    vi.advanceTimersByTime(299_000)
    expect(sync).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1_000)
    expect(sync).toHaveBeenCalledTimes(1)
    stop()
  })

  it('não sincroniza enquanto a janela está escondida', () => {
    const sync = vi.fn()
    const stop = startBackgroundSync(sync, { intervalMs: 60_000 })
    setHidden(true)
    vi.advanceTimersByTime(600_000)
    expect(sync).not.toHaveBeenCalled()
    stop()
  })

  it('ao voltar para a janela relê se faz tempo, mas não se acabou de sincronizar', () => {
    const sync = vi.fn()
    const stop = startBackgroundSync(sync, { intervalMs: 300_000, resumeGapMs: 60_000 })
    setHidden(true)
    vi.advanceTimersByTime(30_000)
    setHidden(false)
    expect(sync).not.toHaveBeenCalled()

    setHidden(true)
    vi.advanceTimersByTime(120_000)
    setHidden(false)
    expect(sync).toHaveBeenCalledTimes(1)
    stop()
  })

  it('cancelar para o intervalo e o listener', () => {
    const sync = vi.fn()
    const stop = startBackgroundSync(sync, { intervalMs: 1_000, resumeGapMs: 0 })
    stop()
    vi.advanceTimersByTime(10_000)
    setHidden(true)
    setHidden(false)
    expect(sync).not.toHaveBeenCalled()
  })
})
