import { describe, it, expect, beforeEach, vi } from 'vitest'
import { acquireVideoSlot, releaseVideoSlot, resetVideoSlots, MAX_PLAYING_VIDEO_DECORATIONS } from '../videoDecorationBudget'

describe('orçamento de vídeos de decoração', () => {
  beforeEach(() => resetVideoSlots())

  it('só deixa tocar o máximo permitido ao mesmo tempo', () => {
    const tokens = Array.from({ length: MAX_PLAYING_VIDEO_DECORATIONS + 2 }, () => ({}))
    const results = tokens.map((t) => acquireVideoSlot(t, () => {}))
    expect(results.filter(Boolean).length).toBe(MAX_PLAYING_VIDEO_DECORATIONS)
  })

  it('pedir de novo com o lugar já garantido continua dando o lugar', () => {
    const t = {}
    expect(acquireVideoSlot(t, () => {})).toBe(true)
    expect(acquireVideoSlot(t, () => {})).toBe(true)
  })

  it('ao liberar um lugar, o primeiro da fila é chamado e passa a tocar', () => {
    const playing = Array.from({ length: MAX_PLAYING_VIDEO_DECORATIONS }, () => ({}))
    playing.forEach((t) => acquireVideoSlot(t, () => {}))
    const waiting = {}
    const granted = vi.fn()
    expect(acquireVideoSlot(waiting, granted)).toBe(false)
    releaseVideoSlot(playing[0])
    expect(granted).toHaveBeenCalledTimes(1)
    expect(acquireVideoSlot(waiting, () => {})).toBe(true)
  })

  it('quem sai da fila antes de ganhar o lugar não é chamado', () => {
    const playing = Array.from({ length: MAX_PLAYING_VIDEO_DECORATIONS }, () => ({}))
    playing.forEach((t) => acquireVideoSlot(t, () => {}))
    const waiting = {}
    const granted = vi.fn()
    acquireVideoSlot(waiting, granted)
    releaseVideoSlot(waiting)
    releaseVideoSlot(playing[0])
    expect(granted).not.toHaveBeenCalled()
  })
})
