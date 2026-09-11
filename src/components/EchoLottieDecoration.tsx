import { useEffect, useRef, memo } from 'react'
import lottie, { type AnimationItem } from 'lottie-web'

import fireStormData from '../assets/lottie/decorations/fire_storm.json'
import cyberHudData from '../assets/lottie/decorations/cyber_hud.json'
import prismaticCrownData from '../assets/lottie/decorations/prismatic_crown.json'
import hexShieldData from '../assets/lottie/decorations/hex_shield.json'
import quantumVortexData from '../assets/lottie/decorations/quantum_vortex.json'
import soundwaveOrbData from '../assets/lottie/decorations/soundwave_orb.json'
import heartHarmonyData from '../assets/lottie/decorations/heart_harmony.json'
import celestialHaloData from '../assets/lottie/decorations/celestial_halo.json'

export interface LottieDecorationConfig {
  id: string
  name: string
  animationData: object
  glowColor: string
  speed?: number
  scale?: number
  offsetY?: number
}

export const LOTTIE_DECORATIONS: Record<string, LottieDecorationConfig> = {
  fire_storm: {
    id: 'fire_storm',
    name: 'Labaredas de Plasma',
    animationData: fireStormData,
    glowColor: 'rgba(249, 115, 22, 0.75)',
    speed: 1.1,
    scale: 1.05
  },
  cyber_hud: {
    id: 'cyber_hud',
    name: 'Visor Tático Neon',
    animationData: cyberHudData,
    glowColor: 'rgba(0, 242, 254, 0.75)',
    speed: 1.0,
    scale: 1.05
  },
  prismatic_crown: {
    id: 'prismatic_crown',
    name: 'Coroa Prismática',
    animationData: prismaticCrownData,
    glowColor: 'rgba(251, 191, 36, 0.8)',
    speed: 0.9,
    scale: 1.12,
    offsetY: -6
  },
  hex_shield: {
    id: 'hex_shield',
    name: 'Escudo Hexagonal',
    animationData: hexShieldData,
    glowColor: 'rgba(52, 211, 153, 0.75)',
    speed: 1.0,
    scale: 1.05
  },
  quantum_vortex: {
    id: 'quantum_vortex',
    name: 'Vórtice Quântico',
    animationData: quantumVortexData,
    glowColor: 'rgba(168, 85, 247, 0.8)',
    speed: 1.1,
    scale: 1.05
  },
  soundwave_orb: {
    id: 'soundwave_orb',
    name: 'Orbe de Ressonância',
    animationData: soundwaveOrbData,
    glowColor: 'rgba(0, 242, 254, 0.8)',
    speed: 1.2,
    scale: 1.05
  },
  heart_harmony: {
    id: 'heart_harmony',
    name: 'Sinfonia do Coração',
    animationData: heartHarmonyData,
    glowColor: 'rgba(236, 72, 153, 0.8)',
    speed: 0.95,
    scale: 1.05
  },
  celestial_halo: {
    id: 'celestial_halo',
    name: 'Auréola Sagrada',
    animationData: celestialHaloData,
    glowColor: 'rgba(253, 224, 71, 0.8)',
    speed: 0.9,
    scale: 1.1,
    offsetY: -8
  },
  ghostfire: {
    id: 'ghostfire',
    name: 'Chamas Espectrais',
    animationData: fireStormData,
    glowColor: 'rgba(192, 132, 252, 0.8)',
    speed: 0.95,
    scale: 1.05
  },
  neko_cyber: {
    id: 'neko_cyber',
    name: 'Orelhas Holográficas',
    animationData: cyberHudData,
    glowColor: 'rgba(244, 114, 182, 0.8)',
    speed: 1.0,
    scale: 1.05
  }
}

interface EchoLottieDecorationProps {
  config: LottieDecorationConfig
  className?: string
}

export const EchoLottieDecoration = memo(function EchoLottieDecoration({
  config,
  className = ''
}: EchoLottieDecorationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animRef = useRef<AnimationItem | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (animRef.current) {
      animRef.current.destroy()
      animRef.current = null
    }

    try {
      animRef.current = lottie.loadAnimation({
        container,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: config.animationData,
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: false,
          hideOnTransparent: true
        }
      })

      if (config.speed) {
        animRef.current.setSpeed(config.speed)
      }
    } catch (err) {
      console.error('Failed to load Lottie animation:', config.name, err)
    }

    let isIntersecting = false

    const updatePlayState = () => {
      if (!animRef.current) return
      const shouldPlay = isIntersecting && !document.hidden && document.hasFocus()
      if (shouldPlay) {
        animRef.current.play()
      } else {
        animRef.current.pause()
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[0]?.isIntersecting ?? false
        updatePlayState()
      },
      { threshold: 0.05 }
    )

    observer.observe(container)

    const handleVisibility = () => updatePlayState()
    const handleFocus = () => updatePlayState()
    const handleBlur = () => updatePlayState()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      if (animRef.current) {
        animRef.current.destroy()
        animRef.current = null
      }
    }
  }, [config.animationData, config.speed, config.name])

  const scale = config.scale || 1
  const offsetY = config.offsetY || 0

  return (
    <div
      ref={containerRef}
      className={`echo-lottie-frame ${className}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        transform: `scale(${scale}) translateY(${offsetY}%)`,
        filter: `drop-shadow(0 0 10px ${config.glowColor})`
      }}
      aria-hidden="true"
    />
  )
})
