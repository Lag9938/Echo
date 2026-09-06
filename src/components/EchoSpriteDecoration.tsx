import { useEffect, useRef, useState, memo } from 'react'

export interface SpriteConfig {
  url: string
  cols: number
  rows: number
  totalFrames: number
  fps?: number
  scale?: number
  offsetX?: number
  offsetY?: number
  filter?: string
  blendMode?: 'normal' | 'screen' | 'lighten' | 'color-dodge'
}

export const SPRITE_DECORATION_CONFIGS: Record<string, SpriteConfig> = {
  fire_storm: {
    url: '/assets/sprites/decorations/firesheet5x5.png',
    cols: 5,
    rows: 5,
    totalFrames: 25,
    fps: 22,
    scale: 1.15,
    offsetY: -4,
    filter: 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.7)) drop-shadow(0 0 20px rgba(239, 68, 68, 0.4))',
    blendMode: 'screen'
  },
  hex_shield: {
    url: '/assets/sprites/decorations/barrier000.png',
    cols: 5,
    rows: 5,
    totalFrames: 25,
    fps: 20,
    scale: 1.2,
    filter: 'drop-shadow(0 0 12px rgba(52, 211, 153, 0.6)) hue-rotate(-20deg)',
    blendMode: 'screen'
  },
  quantum_vortex: {
    url: '/assets/sprites/decorations/teleportCircle.png',
    cols: 8,
    rows: 8,
    totalFrames: 64,
    fps: 32,
    scale: 1.25,
    filter: 'drop-shadow(0 0 14px rgba(168, 85, 247, 0.7)) hue-rotate(40deg)',
    blendMode: 'screen'
  },
  ghostfire: {
    url: '/assets/sprites/decorations/Smoke30Frames.png',
    cols: 6,
    rows: 5,
    totalFrames: 30,
    fps: 18,
    scale: 1.25,
    filter: 'hue-rotate(240deg) saturate(2.5) drop-shadow(0 0 16px rgba(192, 132, 252, 0.8))',
    blendMode: 'screen'
  },
  soundwave_orb: {
    url: '/assets/sprites/decorations/portalRings1.png',
    cols: 4,
    rows: 5,
    totalFrames: 20,
    fps: 16,
    scale: 1.35,
    filter: 'drop-shadow(0 0 12px rgba(0, 242, 254, 0.8)) saturate(2)',
    blendMode: 'screen'
  }
}

// Global texture cache to prevent re-downloading or re-decoding image blobs
const imageCache = new Map<string, HTMLImageElement>()

function getCachedImage(url: string, onLoaded?: () => void): HTMLImageElement {
  let img = imageCache.get(url)
  if (!img) {
    img = new Image()
    img.src = url
    imageCache.set(url, img)
  }
  if (img.complete && img.naturalWidth > 0) {
    if (onLoaded) onLoaded()
  } else if (onLoaded) {
    img.addEventListener('load', onLoaded, { once: true })
  }
  return img
}

interface EchoSpriteDecorationProps {
  config: SpriteConfig
  className?: string
}

export const EchoSpriteDecoration = memo(function EchoSpriteDecoration({
  config,
  className = ''
}: EchoSpriteDecorationProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    const img = getCachedImage(config.url, () => {
      if (active) setLoaded(true)
    })
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true)
    }
    return () => {
      active = false
    }
  }, [config.url])

  useEffect(() => {
    if (!loaded) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const img = imageCache.get(config.url)
    if (!img || !img.complete || img.naturalWidth === 0) return

    let animId: number
    let isVisible = true
    let currentFrame = 0
    let lastFrameTime = performance.now()
    const targetFps = config.fps || 24
    const frameInterval = 1000 / targetFps

    const { cols, rows, totalFrames, scale = 1, offsetX = 0, offsetY = 0 } = config
    const frameWidth = img.naturalWidth / cols
    const frameHeight = img.naturalHeight / rows

    // Handle high-DPI crisp rendering
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    const w = (rect.width || 140) * dpr
    const h = (rect.height || 140) * dpr

    canvas.width = w
    canvas.height = h

    const render = (now: number) => {
      if (!isVisible) return

      const elapsed = now - lastFrameTime
      if (elapsed >= frameInterval) {
        lastFrameTime = now - (elapsed % frameInterval)
        currentFrame = (currentFrame + 1) % totalFrames

        const col = currentFrame % cols
        const row = Math.floor(currentFrame / cols)
        const sx = col * frameWidth
        const sy = row * frameHeight

        ctx.clearRect(0, 0, w, h)

        // Draw scaled and centered frame
        const destW = w * scale
        const destH = h * scale
        const dx = (w - destW) / 2 + offsetX * dpr
        const dy = (h - destH) / 2 + offsetY * dpr

        ctx.drawImage(
          img,
          sx,
          sy,
          frameWidth,
          frameHeight,
          dx,
          dy,
          destW,
          destH
        )
      }

      animId = requestAnimationFrame(render)
    }

    // Visibility Observer - 0% CPU when hidden offscreen
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry.isIntersecting) {
        if (!isVisible) {
          isVisible = true
          lastFrameTime = performance.now()
          animId = requestAnimationFrame(render)
        }
      } else {
        isVisible = false
        cancelAnimationFrame(animId)
      }
    }, { threshold: 0.05 })

    observer.observe(canvas)
    animId = requestAnimationFrame(render)

    return () => {
      observer.disconnect()
      cancelAnimationFrame(animId)
    }
  }, [loaded, config])

  return (
    <canvas
      ref={canvasRef}
      className={`echo-sprite-canvas ${className}`}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        pointerEvents: 'none',
        mixBlendMode: config.blendMode || 'normal',
        filter: config.filter || 'none',
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.25s ease'
      }}
    />
  )
})
