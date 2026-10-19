import { useEffect, useRef, type CSSProperties } from 'react'
import type { ProfileVideoEffect as ProfileVideoEffectDef } from '../lib/profileVideoEffects'
import { useMotionReduced } from '../hooks/useMotionReduced'

interface ProfileVideoEffectProps {
  effect: ProfileVideoEffectDef
  className?: string
  style?: CSSProperties
}

/**
 * O vídeo do efeito, esticado sobre o cartão de perfil. Fica acima do banner e do fundo (z-index 30) mas não
 * bloqueia clique nenhum (pointer-events: none). A mistura "screen" (ver profile-video-effect.css) faz o preto sumir.
 * Sem animação para quem pediu "reduzir movimento", e pausado enquanto a janela está escondida.
 */
export function ProfileVideoEffect({ effect, className = '', style }: ProfileVideoEffectProps) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const reduced = useMotionReduced()

  useEffect(() => {
    const video = ref.current
    if (!video || reduced) return
    // Só toca com o cartão realmente visível: um cartão escondido (0×0) ou fora da área rolável não decodifica vídeo à toa
    let visible = true
    const sync = () => {
      // O autoplay pode ser recusado (política do navegador); sem vídeo o cartão continua inteiro
      if (visible && !document.hidden) video.play().catch(() => {})
      else video.pause()
    }
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting
          sync()
        })
      : null
    observer?.observe(video)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [reduced, effect.src])

  if (reduced) return null

  return (
    <video
      ref={ref}
      className={`profile-video-effect profile-video-effect-${effect.id} ${className}`}
      src={effect.src}
      loop
      muted
      playsInline
      preload="auto"
      disablePictureInPicture
      tabIndex={-1}
      aria-hidden="true"
      style={{ objectPosition: effect.position, ...style }}
    />
  )
}