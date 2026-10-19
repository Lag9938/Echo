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
//
// DESEMPENHO — nunca ler e escrever animações de CSS intercaladas. Ler `playState` ou `currentTime` de uma
// animação de CSS obriga o navegador a recalcular os estilos se algo mudou desde a última leitura; escrever
// `currentTime` muda. Alternando os dois animação por animação, cada passo recalculava os estilos uma vez por
// animação: medido com 800 animações (o número real numa conversa com perfis enfeitados), 177 ms por passo
// para um orçamento de 33 ms — a tela ficava 99,8% ocupada só com isso. Por isso:
//   - o passo de 30/s só ESCREVE, usando um relógio próprio por animação (0,2 ms para as mesmas 800);
//   - as leituras (quem acabou, quem alguém retomou) são feitas todas juntas, uma vez por segundo, antes de
//     qualquer escrita — uma atualização de estilo só para o lote inteiro.
//
// CUIDADO — escrever `currentTime` numa animação que o navegador já cancelou RESSUSCITA a animação. Quando o
// elemento sai da página (mensagem que rolou, lista que mudou) ou fica `display: none`, o CSS cancela a animação
// dele; se o passo escreve nela antes de o limitador saber, ela volta como "pausada", presa a um elemento que não
// existe mais (ou duplicada quando ele reaparece), e o navegador a atende em todo quadro para sempre. Medido no
// app: 4.089 dessas em ~1 h de uso, 45% da tela só para atendê-las, e crescendo. Por isso cada animação assumida
// escuta o evento `cancel` (o Chromium o dispara mesmo quando ela foi ressuscitada): o limitador a solta e, se
// ela já tiver voltado, cancela de novo.

import { isAppInBackground, isDecorativeLoop } from './backgroundAnimations'

export const GOVERNED_FPS = 30
const ADOPT_INTERVAL_MS = 1000

/** Animação assumida → tempo dela no relógio próprio do limitador (ms) */
export type GovernedAnimations = Map<GovernedAnimation, number>

interface GovernedAnimation {
  playState: string
  currentTime: number | null | unknown
  pause: () => void
  play: () => void
  cancel?: () => void
  addEventListener?: (type: 'cancel', listener: () => void) => void
  effect?: { getComputedTiming?: () => { iterations?: number }; target?: (Element & { isConnected?: boolean }) | null } | null
}

/**
 * Os efeitos de nome (`.name-effect-*`) ficam de fora: letras, brilho e animação deles não são alterados por
 * nada no app, nem na taxa de quadros (regra do projeto).
 */
const UNTOUCHED_SELECTOR = '[class*="name-effect-"]'

function isUntouched(animation: GovernedAnimation): boolean {
  const target = animation.effect?.target
  return Boolean(target && typeof target.closest === 'function' && target.closest(UNTOUCHED_SELECTOR))
}

/**
 * Pausa e passa a controlar as animações decorativas que estão rodando soltas.
 * Primeiro só lê (quem é candidata e em que tempo está), depois só escreve (pausa) — veja o topo do arquivo.
 */
export function adoptDecorativeAnimations(animations: GovernedAnimation[], governed: GovernedAnimations): void {
  const picked: Array<[GovernedAnimation, number]> = []
  for (const animation of animations) {
    if (governed.has(animation) || animation.playState !== 'running' || !isDecorativeLoop(animation as any) || isUntouched(animation)) continue
    picked.push([animation, Number(animation.currentTime) || 0])
  }
  for (const [animation, time] of picked) {
    try {
      animation.pause()
      governed.set(animation, time)
      watchCancel(animation, governed)
    } catch {
      // animação já encerrada
    }
  }
}

/** Animações que já têm o ouvinte de `cancel` (uma animação pode ser assumida de novo depois de solta) */
const watchingCancel = new WeakSet<GovernedAnimation>()

/** O navegador cancelou a animação (elemento saiu da página ou foi escondido): solta, e mata a ressuscitada */
function watchCancel(animation: GovernedAnimation, governed: GovernedAnimations): void {
  if (watchingCancel.has(animation) || typeof animation.addEventListener !== 'function') return
  watchingCancel.add(animation)
  animation.addEventListener('cancel', () => {
    if (!governed.delete(animation)) return
    try {
      if (animation.playState !== 'idle') animation.cancel?.()
    } catch {
      // já encerrada
    }
  })
}

/** Tira do limitador e garante que a animação não fica viva presa a um elemento que saiu da página */
function dropDetached(animation: GovernedAnimation, governed: GovernedAnimations): void {
  governed.delete(animation)
  try {
    animation.cancel?.()
  } catch {
    // já encerrada
  }
}

/**
 * Solta as animações que não são mais do limitador: o elemento saiu da tela ou alguém as retomou/encerrou.
 * Só leituras, todas juntas (roda uma vez por segundo, não a cada passo).
 */
export function pruneAnimations(governed: GovernedAnimations): void {
  for (const animation of governed.keys()) {
    const target = animation.effect?.target
    if (target && target.isConnected === false) dropDetached(animation, governed)
    else if (animation.playState !== 'paused') governed.delete(animation)
  }
}

/** Avança as animações controladas em `elapsedMs`. Só escreve: não lê nada da animação (veja o topo do arquivo). */
export function stepAnimations(governed: GovernedAnimations, elapsedMs: number): void {
  for (const [animation, time] of governed) {
    const next = time + elapsedMs
    governed.set(animation, next)
    try {
      animation.currentTime = next
    } catch {
      governed.delete(animation)
    }
  }
}

/** Devolve as animações ao navegador (taxa do monitor) */
export function releaseAnimations(governed: GovernedAnimations): void {
  pruneAnimations(governed)
  for (const animation of governed.keys()) {
    try {
      animation.play()
    } catch {
      // o elemento saiu da tela
    }
  }
  governed.clear()
}

/** Liga o limitador. Devolve a função que desliga e devolve tudo ao normal. */
export function startAnimationGovernor(doc: Document = document, win: Window = window, now: () => number = () => performance.now()): () => void {
  if (typeof doc.getAnimations !== 'function') return () => {}
  const governed: GovernedAnimations = new Map()
  let stepTimer: ReturnType<typeof setInterval> | null = null
  let adoptTimer: ReturnType<typeof setInterval> | null = null
  let last = now()

  // Lê tudo (quem saiu, quem é nova) antes de escrever qualquer coisa
  const adopt = () => {
    pruneAnimations(governed)
    adoptDecorativeAnimations(doc.getAnimations() as unknown as GovernedAnimation[], governed)
  }
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
