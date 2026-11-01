import { useEffect, useRef, type CSSProperties } from 'react'
import type { ProfileVideoEffect as ProfileVideoEffectDef } from '../lib/profileVideoEffects'
import { useMotionReduced } from '../hooks/useMotionReduced'
import { showcaseCardOf } from '../lib/decorationMotion'

interface ProfileVideoEffectProps {
  effect: ProfileVideoEffectDef
  className?: string
  style?: CSSProperties
}

/**
 * O vídeo do efeito, esticado sobre o cartão de perfil. Fica acima do banner e do fundo (z-index 30) mas não
 * bloqueia clique nenhum (pointer-events: none). A mistura "screen" (ver profile-video-effect.css) faz o preto sumir.
 * Com "reduzir movimento" ou nos cartões da grade fora de foco, mantém um quadro iluminado visível (currentTime = 1.2)
 * para que o efeito nunca apareça preto/vazio na Loja ou no Inventário.
 */
export function ProfileVideoEffect({ effect, className = '', style }: ProfileVideoEffectProps) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const reduced = useMotionReduced()

  useEffect(() => {
    const video = ref.current
    if (!video) return

    // Garante um quadro rico e iluminado sempre que o vídeo estiver pausado (evita caixa preta na Loja/Inventário
    // ou quando o Windows está com animações desativadas / prefers-reduced-motion)
    const seekToPreviewFrame = () => {
      try {
        if (video.paused && video.currentTime < 0.5) {
          video.currentTime = 1.2
        }
      } catch {
        // Ignora se o elemento de mídia ainda não aceita seek (ex.: ambiente de teste happy-dom)
      }
    }
    if (video.readyState >= 1) seekToPreviewFrame()
    else video.addEventListener('loadedmetadata', seekToPreviewFrame, { once: true })

    // Se a pessoa escolheu explicitamente "Reduzir movimento" nas configurações do Echo, fica no quadro parado
    const explicitAppReduceMotion =
      typeof document !== 'undefined' && document.body.classList.contains('reduce-motion')
    if (explicitAppReduceMotion) {
      video.pause()
      return () => {
        video.removeEventListener('loadedmetadata', seekToPreviewFrame)
      }
    }

    // Só toca com o cartão realmente visível: um cartão escondido (0×0) ou fora da área rolável não decodifica vídeo à toa
    let visible = true
    // Num cartão das grades da Loja/Inventário, só toca com o mouse em cima do cartão (eram ~10 vídeos juntos na grade;
    // lib/decorationMotion.ts). No perfil e na prévia grande ("Seu visual"), toca normalmente.
    const card = showcaseCardOf(video)
    let hovered = false
    const onEnter = () => { hovered = true; sync() }
    const onLeave = () => { hovered = false; sync() }
    card?.addEventListener('mouseenter', onEnter)
    card?.addEventListener('mouseleave', onLeave)
    const sync = () => {
      // Com prefers-reduced-motion do sistema, fica no quadro parado por padrão, mas anima ao passar o mouse no card da Loja
      const shouldPlay = visible && !document.hidden && (card ? hovered : !reduced)
      if (shouldPlay) {
        video.play().catch(() => {})
      } else {
        video.pause()
        if (video.readyState >= 1) seekToPreviewFrame()
      }
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
      card?.removeEventListener('mouseenter', onEnter)
      card?.removeEventListener('mouseleave', onLeave)
      video.removeEventListener('loadedmetadata', seekToPreviewFrame)
    }
  }, [reduced, effect.src])

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