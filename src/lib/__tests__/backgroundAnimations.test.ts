/// <reference types="node" />
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  isAppInBackground,
  isDecorativeLoop,
  pauseDecorativeAnimations,
  resumeAnimations,
  startBackgroundAnimationSaver
} from '../backgroundAnimations'

function element(className: string, parentClass?: string): Element {
  const el = document.createElement('span')
  el.className = className
  if (parentClass) {
    const parent = document.createElement('div')
    parent.className = parentClass
    parent.appendChild(el)
    document.body.appendChild(parent)
  } else {
    document.body.appendChild(el)
  }
  return el
}

function animation(className: string, iterations: number, options: { parentClass?: string; playState?: string } = {}) {
  const anim = {
    playState: options.playState ?? 'running',
    pause: vi.fn(() => { anim.playState = 'paused' }),
    play: vi.fn(() => { anim.playState = 'running' }),
    effect: { getComputedTiming: () => ({ iterations }), target: element(className, options.parentClass) }
  }
  return anim
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('quais animações são pausadas em segundo plano', () => {
  it('só as que repetem para sempre: as de entrada (aviso, modal) terminam normalmente', () => {
    expect(isDecorativeLoop(animation('name-soundwave-bar', Infinity))).toBe(true)
    expect(isDecorativeLoop(animation('toast-item', 1))).toBe(false)
    expect(isDecorativeLoop(animation('modal', 3))).toBe(false)
  })

  it('carregando, reconectando e quem está falando continuam se mexendo', () => {
    expect(isDecorativeLoop(animation('loader', Infinity))).toBe(false)
    expect(isDecorativeLoop(animation('loading-spinner-circle', Infinity))).toBe(false)
    expect(isDecorativeLoop(animation('voice-reconnecting-spinner', Infinity))).toBe(false)
    expect(isDecorativeLoop(animation('avatar-ring', Infinity, { parentClass: 'participant-card speaking' }))).toBe(false)
  })

  it('pausa só o que está rodando e é decorativo; retoma só o que ela mesma pausou', () => {
    const shimmer = animation('badge', Infinity)
    const spinner = animation('loader', Infinity)
    const entrance = animation('toast-item', 1)
    const alreadyPaused = animation('badge', Infinity, { playState: 'paused' })
    const paused = new Set<any>()

    pauseDecorativeAnimations([shimmer, spinner, entrance, alreadyPaused], paused)

    expect(shimmer.pause).toHaveBeenCalledTimes(1)
    expect(spinner.pause).not.toHaveBeenCalled()
    expect(entrance.pause).not.toHaveBeenCalled()
    expect(alreadyPaused.pause).not.toHaveBeenCalled()
    expect([...paused]).toEqual([shimmer])

    resumeAnimations(paused)
    expect(shimmer.play).toHaveBeenCalledTimes(1)
    expect(alreadyPaused.play).not.toHaveBeenCalled()
    expect(paused.size).toBe(0)
  })
})

describe('quando o app conta como "em segundo plano"', () => {
  it('minimizado/oculto ou sem foco', () => {
    expect(isAppInBackground({ hidden: true, hasFocus: () => true })).toBe(true)
    expect(isAppInBackground({ hidden: false, hasFocus: () => false })).toBe(true)
    expect(isAppInBackground({ hidden: false, hasFocus: () => true })).toBe(false)
  })
})

describe('startBackgroundAnimationSaver', () => {
  const fakeDocument = (animations: any[]) => {
    const state = { hidden: false, focused: true }
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
    return { doc, win, state, listeners }
  }

  it('pausa ao perder o foco e retoma ao voltar', () => {
    const shimmer = animation('badge', Infinity)
    const { doc, win, state, listeners } = fakeDocument([shimmer])
    const stop = startBackgroundAnimationSaver(doc, win)
    expect(shimmer.pause).not.toHaveBeenCalled()

    state.focused = false
    listeners.blur()
    expect(shimmer.playState).toBe('paused')

    state.focused = true
    listeners.focus()
    expect(shimmer.playState).toBe('running')
    stop()
  })

  it('em segundo plano, pausa também as animações que surgirem depois', () => {
    vi.useFakeTimers()
    const animations: any[] = []
    const { doc, win, state, listeners } = fakeDocument(animations)
    const stop = startBackgroundAnimationSaver(doc, win)
    state.hidden = true
    listeners.visibilitychange()

    const late = animation('name-soundwave-bar', Infinity)
    animations.push(late)
    vi.advanceTimersByTime(2100)
    expect(late.playState).toBe('paused')

    stop()
    expect(late.playState).toBe('running')
    vi.useRealTimers()
  })

  it('desligar retoma tudo e para de ouvir os eventos', () => {
    const shimmer = animation('badge', Infinity)
    const { doc, win, state, listeners } = fakeDocument([shimmer])
    const stop = startBackgroundAnimationSaver(doc, win)
    state.focused = false
    listeners.blur()

    stop()
    expect(shimmer.playState).toBe('running')
    expect(Object.keys(listeners)).toEqual([])
  })
})

describe('animações sem fim do app', () => {
  // A mesma classe de defeito que fazia o chat tremer: animar tamanho ou posição refaz o layout a cada
  // quadro, para sempre. Animação que repete sem parar só pode mexer em transform, opacity e cores.
  const LAYOUT_PROPERTY = /(?<![-\w])(width|height|top|left|right|bottom|margin[\w-]*|padding[\w-]*|font-size|letter-spacing|line-height)\s*:/

  function cssFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name)
      if (statSync(path).isDirectory()) return cssFiles(path)
      return name.endsWith('.css') ? [path] : []
    })
  }

  it('nenhuma animação infinita mexe em tamanho ou posição de layout', () => {
    const all = cssFiles(join(process.cwd(), 'src')).map((file) => readFileSync(file, 'utf8')).join('\n')
    const keyframes = [...all.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)]
    const offenders = keyframes
      .filter(([, , body]) => LAYOUT_PROPERTY.test(body))
      .map(([, name]) => name)
      .filter((name) => new RegExp(`animation[^;{}]*\\b${name}\\b[^;{}]*infinite`).test(all))
    expect([...new Set(offenders)].sort()).toEqual([])
  })
})
