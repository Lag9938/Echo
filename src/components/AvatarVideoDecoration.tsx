import { useEffect, useRef } from 'react'
import { videoWidthPercent, type AvatarVideoDecoration as AvatarVideoDecorationDef } from '../lib/avatarVideoDecorations'
import { useMotionReduced } from '../hooks/useMotionReduced'
import { acquireVideoSlot, releaseVideoSlot } from '../lib/videoDecorationBudget'

/**
 * O vídeo da decoração, centrado na caixa da decoração e dimensionado para o miolo do anel ficar do tamanho do avatar.
 * Toca só enquanto está visível na tela, com a janela à vista e dentro do orçamento de vídeos simultâneos
 * (lib/videoDecorationBudget.ts); fora disso, ou com "reduzir movimento", fica parado num quadro.
 */
/** Largura da caixa da decoração (156% do avatar) a partir da qual ela é "grande": avatar de ~64 px ou mais */
const LARGE_DECORATION_PX = 100

export function AvatarVideoDecoration({ deco }: { deco: AvatarVideoDecorationDef }) {
  const ref = useRef<HTMLVideoElement | null>(null)
  const reduced = useMotionReduced()

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (reduced) {
      // um quadro bonito (anel completo), sem movimento
      video.pause()
      const still = () => {
        video.currentTime = 1
      }
      if (video.readyState >= 1) still()
      else video.addEventListener('loadedmetadata', still, { once: true })
      return
    }
    // Quem não consegue um lugar no orçamento fica parado no quadro bonito (o anel inteiro), sem gastar processador
    const still = () => {
      if (video.paused && video.currentTime < 0.5) video.currentTime = 1
    }
    if (video.readyState >= 1) still()
    else video.addEventListener('loadedmetadata', still, { once: true })

    const token = {}
    let visible = true
    const sync = () => {
      if (visible && !document.hidden) {
        // Decoração grande (perfil, loja, inventário) é a estrela da tela: sempre anima, fora do orçamento, que existe
        // para as dezenas de avatares pequenos das listas
        if ((video.parentElement?.clientWidth ?? 0) >= LARGE_DECORATION_PX) {
          releaseVideoSlot(token)
          video.play().catch(() => {})
        } else if (acquireVideoSlot(token, sync)) video.play().catch(() => {})
        else video.pause()
      } else {
        releaseVideoSlot(token)
        video.pause()
      }
    }
    const observer = typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => {
          visible = entry.isIntersecting
          sync()
        })
      : null
    observer?.observe(video)
    const resizeObserver = typeof ResizeObserver !== 'undefined' && video.parentElement ? new ResizeObserver(sync) : null
    if (resizeObserver && video.parentElement) resizeObserver.observe(video.parentElement)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      observer?.disconnect()
      resizeObserver?.disconnect()
      document.removeEventListener('visibilitychange', sync)
      video.removeEventListener('loadedmetadata', still)
      releaseVideoSlot(token)
    }
  }, [reduced, deco.src])

  return (
    <video
      ref={ref}
      className={`avatar-video-decoration avatar-video-decoration-${deco.id}`}
      src={deco.src}
      loop
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      tabIndex={-1}
      aria-hidden="true"
      style={{
        width: `${videoWidthPercent(deco)}%`,
        transform: `translate(${-deco.center.x * 100}%, ${-deco.center.y * 100}%)`
      }}
    />
  )
}