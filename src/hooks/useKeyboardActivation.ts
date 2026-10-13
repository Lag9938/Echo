import { useEffect } from 'react'

/**
 * Elementos do app que são clicáveis por mouse mas não são <button>/<a> (cartões, linhas de lista, miniaturas):
 * sem isto o Tab pula todos eles e a pessoa que usa só teclado não consegue abrir uma conversa, escolher um
 * cartão ou enviar uma imagem. Em vez de editar cada um (e esquecer os próximos), este grupo ganha
 * `tabindex="0"` e `role="button"`, e Enter/Espaço dispara o clique, como num botão de verdade.
 *
 * Para incluir um novo componente, basta acrescentar a classe dele aqui.
 */
export const KEYBOARD_CLICKABLE_SELECTOR = [
  '.friend-card-modern',
  '.dm-list-item',
  '.stream-strip-card',
  '.participant-card',
  '.echo-transmit-card',
  '.density-card',
  '.dm-media-card',
  '.echo-shop-card',
  '.echo-inv-card',
  '.echo-badge-choice-card',
  '.echo-hero-banner',
  '.echo-hero-avatar-squircle',
  '.echo-avatar-uploader-thumb',
  '.chat-link-embed',
  '.mention-picker-item'
].join(',')

/** Já são controles do navegador: têm foco e teclado próprios */
const NATIVE_CONTROLS = 'button, a[href], input, select, textarea, summary, [contenteditable="true"]'

/** Torna o elemento (se for dos listados) alcançável por Tab e anunciado como botão */
export function enhanceKeyboardTarget(el: Element): void {
  if (!el.matches(KEYBOARD_CLICKABLE_SELECTOR) || el.matches(NATIVE_CONTROLS)) return
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0')
  if (!el.hasAttribute('role')) el.setAttribute('role', 'button')
}

function enhanceTree(root: Element | Document): void {
  if (root instanceof Element) enhanceKeyboardTarget(root)
  root.querySelectorAll(KEYBOARD_CLICKABLE_SELECTOR).forEach(enhanceKeyboardTarget)
}

/** Enter ou Espaço sobre um desses elementos (e só sobre ele, não sobre um botão dentro dele) = clique */
export function handleKeyboardActivation(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
  const target = event.target
  if (!(target instanceof HTMLElement)) return
  if (!target.matches(KEYBOARD_CLICKABLE_SELECTOR) || target.matches(NATIVE_CONTROLS)) return
  event.preventDefault() // o Espaço não deve rolar a página
  target.click()
}

/** Liga o ativador de teclado ao app inteiro: elementos que já existem e os que aparecerem depois */
export function useKeyboardActivation(): void {
  useEffect(() => {
    enhanceTree(document)

    // Só olha o que foi ADICIONADO (mensagens novas, telas que abrem), agrupado por quadro: não varre a página toda
    let pending: Element[] = []
    let frame = 0
    const flush = () => {
      frame = 0
      const batch = pending
      pending = []
      batch.forEach((node) => {
        if (node.isConnected) enhanceTree(node)
      })
    }
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) pending.push(n)
        })
      }
      if (pending.length && !frame) frame = requestAnimationFrame(flush)
    })
    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('keydown', handleKeyboardActivation)

    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', handleKeyboardActivation)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])
}
