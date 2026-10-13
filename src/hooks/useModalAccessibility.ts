import { useEffect } from 'react'

/**
 * As janelas (modais) do app: quem usa teclado ou leitor de tela precisa que elas
 *  1. sejam anunciadas como diálogo (role="dialog", aria-modal, nome vindo do título);
 *  2. recebam o foco ao abrir (senão o foco fica "atrás" e o Tab anda pela tela escondida);
 *  3. prendam o Tab dentro delas enquanto estão abertas;
 *  4. devolvam o foco a quem as abriu quando fecham.
 * Em vez de repetir isso em cada modal, este grupo é tratado aqui: o que aparece com uma destas classes ganha o
 * comportamento. Para incluir um novo modal, acrescente a classe da caixa dele.
 */
export const DIALOG_SELECTOR = [
  '.whats-new-modal',
  '.echo-channel-modal',
  '.music-bot-modal',
  '.screen-picker-modal',
  '.member-profile-card-modal',
  '.saved-messages-modal',
  '.invite-modal',
  '.channel-invite-modal',
  '.space-studio-container',
  '.member-audio-modal',
  '.soundboard-modal'
].join(',')

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let idCounter = 0

export function focusableIn(dialog: Element): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false
    const style = getComputedStyle(el)
    return style.display !== 'none' && style.visibility !== 'hidden'
  })
}

/** Papéis e nome do diálogo: o nome vem do primeiro título dentro dele */
export function prepareDialog(dialog: Element): void {
  if (!dialog.hasAttribute('role')) dialog.setAttribute('role', 'dialog')
  if (!dialog.hasAttribute('aria-modal')) dialog.setAttribute('aria-modal', 'true')
  if (dialog.hasAttribute('aria-label') || dialog.hasAttribute('aria-labelledby')) return
  const heading = dialog.querySelector('h1, h2, h3, h4')
  if (heading) {
    if (!heading.id) heading.id = `echo-dialog-title-${++idCounter}`
    dialog.setAttribute('aria-labelledby', heading.id)
  } else {
    dialog.setAttribute('aria-label', 'Janela')
  }
}

/** O diálogo mais "em cima": o último no documento */
function topDialog(): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(DIALOG_SELECTOR)).filter((d) => d.isConnected)
  return all.length ? all[all.length - 1] : null
}

/** Tab e Shift+Tab giram dentro do diálogo de cima */
export function handleDialogTab(event: KeyboardEvent): void {
  if (event.key !== 'Tab' || event.defaultPrevented) return
  const dialog = topDialog()
  if (!dialog) return
  const items = focusableIn(dialog)
  if (items.length === 0) {
    event.preventDefault()
    dialog.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (!active || !dialog.contains(active)) {
    event.preventDefault()
    ;(event.shiftKey ? last : first).focus()
  } else if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

export function useModalAccessibility(): void {
  useEffect(() => {
    // diálogo -> quem tinha o foco quando ele abriu (para devolver ao fechar)
    const openers = new Map<Element, HTMLElement | null>()

    const adopt = (dialog: Element) => {
      if (openers.has(dialog)) return
      const opener = document.activeElement instanceof HTMLElement && !dialog.contains(document.activeElement) ? document.activeElement : null
      openers.set(dialog, opener)
      prepareDialog(dialog)
      // Se um campo já tem foco (autoFocus), não tira dele
      if (dialog.contains(document.activeElement)) return
      const target = focusableIn(dialog)[0]
      if (target) {
        target.focus()
      } else if (dialog instanceof HTMLElement) {
        if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1')
        dialog.focus()
      }
    }

    const scan = (root: ParentNode) => {
      if (root instanceof Element && root.matches(DIALOG_SELECTOR)) adopt(root)
      root.querySelectorAll(DIALOG_SELECTOR).forEach(adopt)
    }

    const release = () => {
      openers.forEach((opener, dialog) => {
        if (dialog.isConnected) return
        openers.delete(dialog)
        // Só devolve se o foco se perdeu (ficou no <body>): se a pessoa já foi para outro lugar, respeita
        const lost = !document.activeElement || document.activeElement === document.body
        if (opener && opener.isConnected && lost) opener.focus()
      })
    }

    let frame = 0
    const pending: Element[] = []
    const flush = () => {
      frame = 0
      pending.splice(0).forEach((n) => n.isConnected && scan(n))
      release()
    }
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) pending.push(n)
        })
      }
      if (!frame) frame = requestAnimationFrame(flush)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    scan(document)
    document.addEventListener('keydown', handleDialogTab)

    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', handleDialogTab)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
}
