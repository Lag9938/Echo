import { useEffect, useState } from 'react'

/** True quando a pessoa pediu menos movimento (opção do app em Aparência ou configuração do sistema) */
export function motionIsReduced(): boolean {
  if (typeof document === 'undefined') return false
  const body = document.body.classList
  if (body.contains('reduce-motion')) return true
  if (body.contains('motion-full')) return false
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Igual a `motionIsReduced`, mas atualiza quando a opção muda (classe no <body> ou preferência do sistema) */
export function useMotionReduced(): boolean {
  const [reduced, setReduced] = useState(motionIsReduced)
  useEffect(() => {
    const update = () => setReduced(motionIsReduced())
    const observer = new MutationObserver(update)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    const media = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
    media?.addEventListener?.('change', update)
    return () => {
      observer.disconnect()
      media?.removeEventListener?.('change', update)
    }
  }, [])
  return reduced
}