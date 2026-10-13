import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GOVERNED_FPS, adoptDecorativeAnimations, releaseAnimations, startAnimationGovernor, stepAnimations } from '../animationGovernor'

function animation(options: { iterations?: number; state?: string; className?: string; connected?: boolean } = {}) {
  const target = document.createElement('span')
  if (options.className) target.className = options.className
  Object.defineProperty(target, 'isConnected', { value: options.connected ?? true, configurable: true })
  const anim: any = {
    playState: options.state ?? 'running',
    currentTime: 0,
    effect: { getComputedTiming: () => ({ iterations: options.iterations ?? Infinity }), target }
  }
  anim.pause = vi.fn(() => { anim.playState = 'paused' })
  anim.play = vi.fn(() => { anim.playState = 'running' })
  return anim
}

describe('limitador das animações decorativas', () => {
  it('assume só as decorativas sem fim que estão rodando', () => {
    const shimmer = animation()
    const entrance = animation({ iterations: 1 })
    const spinner = animation({ className: 'loader' })
    const speaking = animation({ className: 'avatar is-speaking' })
    const nameEffect = animation({ className: 'member-name name-effect-celestial_gold' })
    const governed = new Set<any>()

    adoptDecorativeAnimations([shimmer, entrance, spinner, speaking, nameEffect], governed)
    expect([...governed]).toEqual([shimmer])
    expect(shimmer.pause).toHaveBeenCalledTimes(1)
    // Aviso deslizando, "carregando" e "quem está falando" seguem na taxa normal; efeito de nome ninguém toca
    for (const free of [entrance, spinner, speaking, nameEffect]) expect(free.pause).not.toHaveBeenCalled()

    // Assumir de novo não pausa duas vezes
    adoptDecorativeAnimations([shimmer], governed)
    expect(shimmer.pause).toHaveBeenCalledTimes(1)
  })

  it('avança no relógio próprio e solta o que acabou ou saiu da tela', () => {
    const alive = animation()
    const gone = animation({ connected: false })
    const resumedElsewhere = animation()
    const governed = new Set<any>()
    adoptDecorativeAnimations([alive, gone, resumedElsewhere], governed)
    resumedElsewhere.playState = 'running'

    stepAnimations(governed, 33)
    stepAnimations(governed, 33)
    expect(alive.currentTime).toBe(66)
    expect([...governed]).toEqual([alive])
  })

  it('desligar devolve as animações ao navegador', () => {
    const shimmer = animation()
    const governed = new Set<any>()
    adoptDecorativeAnimations([shimmer], governed)
    releaseAnimations(governed)
    expect(shimmer.play).toHaveBeenCalledTimes(1)
    expect(governed.size).toBe(0)
  })

  describe('ligado no app', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    function fakeDocument(animations: any[], state: { hidden: boolean; focused: boolean }) {
      const listeners: Record<string, () => void> = {}
      const doc: any = {
        get hidden() { return state.hidden },
        hasFocus: () => state.focused,
        getAnimations: () => animations,
        addEventListener: (name: string, fn: () => void) => { listeners[name] = fn },
        removeEventListener: (name: string) => { delete listeners[name] }
      }
      const win: any = {
        addEventListener: (name: string, fn: () => void) => { listeners[name] = fn },
        removeEventListener: (name: string) => { delete listeners[name] }
      }
      return { doc, win, listeners }
    }

    it('em primeiro plano as animações andam a 30 por segundo, não na taxa do monitor', () => {
      const shimmer = animation()
      const state = { hidden: false, focused: true }
      const { doc, win } = fakeDocument([shimmer], state)
      let clock = 0
      const stop = startAnimationGovernor(doc, win, () => clock)

      expect(shimmer.pause).toHaveBeenCalledTimes(1)
      const tick = 1000 / GOVERNED_FPS
      for (let i = 0; i < GOVERNED_FPS; i++) { clock += tick; vi.advanceTimersByTime(tick) }
      // Um segundo de relógio = um segundo de animação, em 30 passos
      expect(Math.round(shimmer.currentTime)).toBe(1000)
      stop()
      expect(shimmer.play).toHaveBeenCalledTimes(1)
    })

    it('em segundo plano o relógio para, e ao voltar não dá salto', () => {
      const shimmer = animation()
      const state = { hidden: false, focused: true }
      const { doc, win, listeners } = fakeDocument([shimmer], state)
      let clock = 0
      const stop = startAnimationGovernor(doc, win, () => clock)
      clock += 100; vi.advanceTimersByTime(100)
      const before = shimmer.currentTime

      state.focused = false
      listeners.blur()
      clock += 60000; vi.advanceTimersByTime(60000)
      expect(shimmer.currentTime).toBe(before)

      state.focused = true
      listeners.focus()
      clock += 34; vi.advanceTimersByTime(34)
      expect(shimmer.currentTime - before).toBeLessThan(100)
      stop()
    })

    it('animação que aparece depois é assumida em até um segundo', () => {
      const animations: any[] = []
      const state = { hidden: false, focused: true }
      const { doc, win } = fakeDocument(animations, state)
      const stop = startAnimationGovernor(doc, win, () => 0)
      const late = animation()
      animations.push(late)
      vi.advanceTimersByTime(1000)
      expect(late.pause).toHaveBeenCalledTimes(1)
      stop()
    })
  })
})
