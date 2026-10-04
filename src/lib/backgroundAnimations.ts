// Pausa as animações decorativas enquanto o Echo está em segundo plano (minimizado ou sem foco).
//
// O app é configurado para continuar ativo quando está coberto por outra janela (a voz precisa disso), e o
// efeito colateral é que os brilhos, pulsos e equalizadores que rodam sem parar seguem usando a placa de
// vídeo enquanto a pessoa joga em tela cheia. Os efeitos em canvas e Lottie já paravam ao perder o foco;
// as animações de CSS não.
//
// Só são pausadas as animações SEM FIM (as que repetem para sempre). As de entrada (um aviso deslizando,
// um modal abrindo) terminam normalmente: pausá-las no meio deixaria o elemento invisível ou torto.

/** Indicadores que precisam continuar se mexendo mesmo sem foco: carregando, reconectando e quem está falando */
const KEEP_RUNNING_SELECTOR = [
  '.loader',
  '.loading-spinner-circle',
  '.sticker-loading-spinner',
  '.voice-reconnecting-spinner',
  '[class*="speaking"]',
  '[class*="reconnect"]'
].join(', ')

const RESCAN_INTERVAL_MS = 2000

interface AnimationLike {
  playState: string
  pause: () => void
  play: () => void
  effect?: { getComputedTiming?: () => { iterations?: number }; target?: Element | null } | null
}

/** Animação que repete para sempre, em um elemento que não é indicador de estado */
export function isDecorativeLoop(animation: AnimationLike): boolean {
  const iterations = animation.effect?.getComputedTiming?.().iterations
  if (iterations !== Infinity) return false
  const target = animation.effect?.target
  if (!target || typeof target.closest !== 'function') return true
  return target.closest(KEEP_RUNNING_SELECTOR) === null
}

/** O app está em segundo plano? (minimizado/oculto ou sem o foco do teclado) */
export function isAppInBackground(doc: Pick<Document, 'hidden' | 'hasFocus'> = document): boolean {
  return doc.hidden || !doc.hasFocus()
}

/** Pausa as animações decorativas que estão rodando agora e devolve as que pausou */
export function pauseDecorativeAnimations(animations: AnimationLike[], alreadyPaused: Set<AnimationLike>): void {
  for (const animation of animations) {
    if (animation.playState !== 'running' || !isDecorativeLoop(animation)) continue
    try {
      animation.pause()
      alreadyPaused.add(animation)
    } catch {
      // animação já encerrada: nada a pausar
    }
  }
}

/** Retoma só o que este módulo pausou (não mexe em animação pausada por outro motivo) */
export function resumeAnimations(paused: Set<AnimationLike>): void {
  for (const animation of paused) {
    try {
      if (animation.playState === 'paused') animation.play()
    } catch {
      // o elemento saiu da tela enquanto o app estava em segundo plano
    }
  }
  paused.clear()
}

/**
 * Liga a economia: pausa ao ir para segundo plano, retoma ao voltar. Enquanto está em segundo plano,
 * confere de tempos em tempos as animações que nasceram depois (alguém entrou na chamada, chegou mensagem).
 * Devolve a função que desliga tudo.
 */
export function startBackgroundAnimationSaver(doc: Document = document, win: Window = window): () => void {
  if (typeof doc.getAnimations !== 'function') return () => {}
  const paused = new Set<AnimationLike>()
  let timer: ReturnType<typeof setInterval> | null = null

  const pauseNow = () => pauseDecorativeAnimations(doc.getAnimations() as unknown as AnimationLike[], paused)

  const update = () => {
    if (isAppInBackground(doc)) {
      pauseNow()
      if (!timer) timer = setInterval(pauseNow, RESCAN_INTERVAL_MS)
    } else {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      resumeAnimations(paused)
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
    if (timer) clearInterval(timer)
    resumeAnimations(paused)
  }
}
