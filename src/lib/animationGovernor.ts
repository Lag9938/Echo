// Limita a 30 quadros por segundo as animações decorativas que repetem para sempre (brilhos, pulsos,
// molduras de avatar, equalizadores), com o Echo em primeiro plano.
//
// O navegador roda animações de CSS na taxa do monitor. Num monitor de 180 Hz, com ~100 dessas animações na
// tela (uma chamada com alguns perfis enfeitados), o Echo redesenhava 180 vezes por segundo: medido no app
// instalado, a tela usava 125% de um núcleo e o processo gráfico 145%; com as animações paradas, 42% e 44%.
// Era isso que travava o computador das pessoas.
//
// Como funciona: cada animação decorativa sem fim é pausada e passa a avançar por um relógio só, 30 vezes
// por segundo (a mesma taxa que os efeitos em canvas do Echo já usam). O movimento continua igual; o que
// muda é quantas vezes a tela é redesenhada. Em segundo plano o relógio para (backgroundAnimations.ts já
// cuidava disso; aqui as animações simplesmente ficam onde estão).
//
// Indicadores de estado (carregando, reconectando, quem está falando) ficam de fora e rodam normalmente.

import { isAppInBackground, isDecorativeLoop } from './backgroundAnimations'

export const GOVERNED_FPS = 30
const ADOPT_INTERVAL_MS = 1000

interface GovernedAnimation {
  playState: string
  currentTime: number | null | unknown
  pause: () => void
  play: () => void
  effect?: { getComputedTiming?: () => { iterations?: number }; target?: (Element & { isConnected?: boolean }) | null } | null
}

/** Pausa e passa a controlar as animações decorativas que estão rodando soltas */
export function adoptDecorativeAnimations(animations: GovernedAnimation[], governed: Set<GovernedAnimation>): void {
  for (const animation of animations) {
    if (governed.has(animation) || animation.playState !== 'running' || !isDecorativeLoop(animation as any)) continue
    try {
      animation.pause()
      governed.add(animation)
    } catch {
      // animação já encerrada
    }
  }
}

/** Avança as animações controladas em `elapsedMs`; solta as que acabaram ou cujo elemento saiu da tela */
export function stepAnimations(governed: Set<GovernedAnimation>, elapsedMs: number): void {
  for (const animation of governed) {
    const target = animation.effect?.target
    if (animation.playState !== 'paused' || (target && target.isConnected === false)) {
      governed.delete(animation)
      continue
    }
    try {
      animation.currentTime = (Number(animation.currentTime) || 0) + elapsedMs
    } catch {
      governed.delete(animation)
    }
  }
}

/** Devolve as animações ao navegador (taxa do monitor) */
export function releaseAnimations(governed: Set<GovernedAnimation>): void {
  for (const animation of governed) {
    try {
      if (animation.playState === 'paused') animation.play()
    } catch {
      // o elemento saiu da tela
    }
  }
  governed.clear()
}

/** Liga o limitador. Devolve a função que desliga e devolve tudo ao normal. */
export function startAnimationGovernor(doc: Document = document, win: Window = window, now: () => number = () => performance.now()): () => void {
  if (typeof doc.getAnimations !== 'function') return () => {}
  const governed = new Set<GovernedAnimation>()
  let stepTimer: ReturnType<typeof setInterval> | null = null
  let adoptTimer: ReturnType<typeof setInterval> | null = null
  let last = now()

  const adopt = () => adoptDecorativeAnimations(doc.getAnimations() as unknown as GovernedAnimation[], governed)
  const step = () => {
    const current = now()
    // Depois de uma pausa longa (app voltou do segundo plano) não dá um salto: retoma de onde parou
    const elapsed = Math.min(current - last, 250)
    last = current
    stepAnimations(governed, elapsed)
  }

  const update = () => {
    const active = !isAppInBackground(doc)
    if (active && !stepTimer) {
      last = now()
      adopt()
      stepTimer = setInterval(step, 1000 / GOVERNED_FPS)
      adoptTimer = setInterval(adopt, ADOPT_INTERVAL_MS)
    } else if (!active && stepTimer) {
      clearInterval(stepTimer)
      if (adoptTimer) clearInterval(adoptTimer)
      stepTimer = null
      adoptTimer = null
    }
  }

  doc.addEventListener('visibilitychange', update)
  win.addEventListener('blur', update)
  win.addEventListener('focus', update)
  update()

  return () => {
    doc.removeEventListener('visibilitychange', update)
    win.removeEventListener('blur', update)
    win.removeEventListener('focus', update)
    if (stepTimer) clearInterval(stepTimer)
    if (adoptTimer) clearInterval(adoptTimer)
    releaseAnimations(governed)
  }
}
