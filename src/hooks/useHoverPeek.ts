import { useCallback, useEffect, useRef, useState } from 'react'

export interface HoverPeekOptions {
  /** Quanto o mouse precisa ficar no botão antes de a janela espiar (evita abrir ao passar de raspão) */
  openDelay?: number
  /** Quanto a janela espera depois que o mouse sai do botão e da própria janela antes de fechar */
  closeDelay?: number
}

/**
 * "Espiar ao passar o mouse, fixar ao clicar": passar o mouse no botão abre a janela (membros, chat da
 * chamada…) como uma espiada; tirar o mouse fecha. Clicar fixa a janela aberta; clicar de novo desafixa.
 *
 * - `pinned`/`setPinned`: o estado "fixo" que já existia (o que o clique liga e desliga).
 * - `peek`: aberta só pela espiada (nunca é true com a janela fixa).
 * - `visible`: a janela deve aparecer (fixa ou espiando).
 * - `triggerProps`: espalhe no botão. `panelProps`: espalhe na janela, para ela não fechar enquanto o mouse está nela.
 */
export function useHoverPeek(
  pinned: boolean,
  setPinned: (next: boolean) => void,
  { openDelay = 140, closeDelay = 600 }: HoverPeekOptions = {}
) {
  const [peek, setPeek] = useState(false)
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Depois de desafixar com um clique o mouse ainda está no botão: sem isto a janela reabriria na hora
  const suppressUntilLeave = useRef(false)

  const clearTimers = useCallback(() => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null }
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }, [])

  useEffect(() => clearTimers, [clearTimers])

  // Fixou (por qualquer caminho): a espiada deixa de existir
  useEffect(() => {
    if (pinned) {
      clearTimers()
      setPeek(false)
    }
  }, [pinned, clearTimers])

  const scheduleClose = useCallback(() => {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null }
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setPeek(false), closeDelay)
  }, [closeDelay])

  const keepOpen = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }, [])

  const onTriggerEnter = useCallback(() => {
    keepOpen()
    if (pinned || suppressUntilLeave.current) return
    if (openTimer.current) clearTimeout(openTimer.current)
    openTimer.current = setTimeout(() => setPeek(true), openDelay)
  }, [keepOpen, pinned, openDelay])

  const onTriggerLeave = useCallback(() => {
    suppressUntilLeave.current = false
    scheduleClose()
  }, [scheduleClose])

  const onTriggerClick = useCallback(() => {
    clearTimers()
    if (pinned) {
      suppressUntilLeave.current = true
      setPeek(false)
      setPinned(false)
    } else {
      setPeek(false)
      setPinned(true)
    }
  }, [clearTimers, pinned, setPinned])

  return {
    peek: peek && !pinned,
    visible: pinned || peek,
    triggerProps: {
      onMouseEnter: onTriggerEnter,
      onMouseLeave: onTriggerLeave,
      onClick: onTriggerClick
    },
    panelProps: {
      onMouseEnter: keepOpen,
      onMouseLeave: scheduleClose
    }
  }
}

export type HoverPeek = ReturnType<typeof useHoverPeek>
