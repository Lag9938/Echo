import { useEffect, useRef } from 'react'

export type CanvasProfileEffectId =
  | 'echo_resonance'
  | 'quantum_singularity'
  | 'plasma_overdrive'
  | 'cyber_matrix'
  | 'glacial_aurora'
  | 'void_abyss'
  | 'golden_stardust'
  | 'sakura_breeze'

interface EchoCanvasEffectProps {
  effectId: CanvasProfileEffectId | string
  className?: string
}

export function EchoCanvasEffect({ effectId, className = '' }: EchoCanvasEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let animationFrameId: number = 0
    let isRunning = true
    let isVisible = true
    const startTime = performance.now()
    let lastFrameTime = performance.now()
    const TARGET_FPS = 30
    const FRAME_INTERVAL = 1000 / TARGET_FPS

    // ─────────────────────────────────────────────────────────────
    // High-Performance Visibility Culling & Background Throttling
    // ─────────────────────────────────────────────────────────────
    const startLoop = () => {
      if (!isRunning || !isVisible) return
      cancelAnimationFrame(animationFrameId)
      lastFrameTime = performance.now()
      animationFrameId = requestAnimationFrame(render)
    }

    const stopLoop = () => {
      cancelAnimationFrame(animationFrameId)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const intersecting = entry.isIntersecting
        if (intersecting) {
          if (!isVisible) {
            isVisible = true
            startLoop()
          }
        } else {
          isVisible = false
          stopLoop()
        }
      },
      { threshold: 0.01 }
    )
    observer.observe(canvas)

    const handleVisibility = () => {
      if (document.hidden) {
        isVisible = false
        stopLoop()
      } else {
        isVisible = true
        startLoop()
      }
    }
    const handleBlur = () => {
      isVisible = false
      stopLoop()
    }
    const handleFocus = () => {
      if (!document.hidden) {
        isVisible = true
        startLoop()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)


    // Particle pool definition
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      alpha: number
      maxLife: number
      life: number
      color: string
      extra?: number
      extra2?: number
    }

    let particles: Particle[] = []

    // Helper to resize canvas to display size
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.max(1, Math.floor(rect.width * dpr))
      const h = Math.max(1, Math.floor(rect.height * dpr))

      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
    }

    resizeCanvas()
    const resizeObserver = new ResizeObserver(() => resizeCanvas())
    resizeObserver.observe(canvas)

    // Initializer per effect
    const initEffect = () => {
      particles = []
      const count = effectId === 'cyber_matrix' ? 30 : effectId === 'golden_stardust' ? 65 : 50

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.002,
          vy: (Math.random() - 0.5) * 0.002,
          size: 1 + Math.random() * 3,
          alpha: Math.random(),
          maxLife: 2 + Math.random() * 4,
          life: Math.random() * 4,
          color: '#ffffff',
          extra: Math.random() * Math.PI * 2,
          extra2: Math.random()
        })
      }
    }

    initEffect()

    // Render loop
    const render = (now: number) => {
      if (!isRunning || !isVisible) return

      // FPS Capping: Target 30 FPS (~33.3ms interval) for silky-smooth animations with 80% lower CPU
      const isPerfMode = document.body.classList.contains('theme-performance-opaque')
      const targetInterval = isPerfMode ? 1000 / 15 : FRAME_INTERVAL

      const elapsed = now - lastFrameTime
      if (elapsed < targetInterval) {
        animationFrameId = requestAnimationFrame(render)
        return
      }
      lastFrameTime = now - (elapsed % targetInterval)

      const t = (now - startTime) * 0.001 // seconds
      const w = canvas.width
      const h = canvas.height

      if (w === 0 || h === 0) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, w, h)


      // ─────────────────────────────────────────────────────────────
      // 1. ECHO RESONANCE (Harmonic Acoustic Shockwaves & Audio Particles)
      // ─────────────────────────────────────────────────────────────
      if (effectId === 'echo_resonance' || effectId === 'thunderstorm') {
        const cx = w * 0.5
        const cy = h * 0.4
        const maxR = Math.max(w, h) * 0.75

        // Concentric acoustic wave fronts
        const waveCount = 4
        for (let i = 0; i < waveCount; i++) {
          const rawProgress = ((t * 0.4 + i / waveCount) % 1)
          const progress = (rawProgress + 1) % 1
          const r = Math.max(0.1, progress * maxR)
          const alpha = Math.sin(progress * Math.PI) * 0.45

          ctx.save()
          ctx.beginPath()
          ctx.ellipse(cx, cy, r, Math.max(0.1, r * 0.65), 0, 0, Math.PI * 2)
          ctx.lineWidth = 1.5 + (1 - progress) * 2
          ctx.strokeStyle = i % 2 === 0 ? `rgba(0, 242, 254, ${alpha})` : `rgba(168, 85, 247, ${alpha * 0.8})`
          ctx.stroke()
          ctx.restore()
        }

        // Equalizer wave ribbons at bottom
        ctx.save()
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (let x = 0; x <= w; x += 6) {
          const normX = x / w
          const wave1 = Math.sin(normX * 8 + t * 3.5) * (h * 0.07)
          const wave2 = Math.cos(normX * 14 - t * 2.2) * (h * 0.04)
          const y = h - 24 + wave1 + wave2
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.closePath()
        const eqGrad = ctx.createLinearGradient(0, h - 50, 0, h)
        eqGrad.addColorStop(0, 'rgba(0, 242, 254, 0.25)')
        eqGrad.addColorStop(1, 'rgba(168, 85, 247, 0.05)')
        ctx.fillStyle = eqGrad
        ctx.fill()
        ctx.restore()

        // Acoustic frequency particles
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        particles.forEach(p => {
          p.y -= 0.0015
          p.x += Math.sin(t * 2 + p.extra!) * 0.001
          if (p.y < 0) p.y = 1
          if (p.x < 0) p.x = 1
          if (p.x > 1) p.x = 0

          const px = p.x * w
          const py = p.y * h
          const pAlpha = (Math.sin(t * 3 + p.extra!) * 0.5 + 0.5) * 0.7

          const grad = ctx.createRadialGradient(px, py, 0, px, py, p.size * 2.5)
          grad.addColorStop(0, `rgba(0, 242, 254, ${pAlpha})`)
          grad.addColorStop(0.5, `rgba(168, 85, 247, ${pAlpha * 0.6})`)
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(px, py, p.size * 2.5, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 2. QUANTUM SINGULARITY (Accretion Disk & Gravitational Lensing)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'quantum_singularity' || effectId === 'cosmic_nebula') {
        const cx = w * 0.7
        const cy = h * 0.45
        const diskR = Math.min(w, h) * 0.4

        // Accretion disk glow
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (let ring = 0; ring < 3; ring++) {
          const rot = t * (0.3 - ring * 0.08)
          ctx.beginPath()
          ctx.ellipse(cx, cy, diskR * (1 + ring * 0.25), diskR * (0.35 + ring * 0.1), rot, 0, Math.PI * 2)
          ctx.lineWidth = 4 - ring
          ctx.strokeStyle = ring === 0 ? 'rgba(192, 132, 252, 0.4)' : 'rgba(59, 130, 246, 0.25)'
          ctx.stroke()
        }

        // Singularity event horizon dark circle with photon rim
        const rimGrad = ctx.createRadialGradient(cx, cy, diskR * 0.2, cx, cy, diskR * 0.4)
        rimGrad.addColorStop(0, 'rgba(10, 5, 25, 0.95)')
        rimGrad.addColorStop(0.7, 'rgba(168, 85, 247, 0.55)')
        rimGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = rimGrad
        ctx.beginPath()
        ctx.arc(cx, cy, diskR * 0.4, 0, Math.PI * 2)
        ctx.fill()

        // Inward spiraling cosmic stardust
        particles.forEach((p, idx) => {
          const angle = p.extra! + t * (0.8 + p.extra2! * 0.4)
          const dist = (0.2 + ((p.extra2! + t * 0.1) % 0.8)) * diskR * 2
          const px = cx + Math.cos(angle) * dist
          const py = cy + Math.sin(angle) * dist * 0.4

          const alpha = Math.sin((dist / (diskR * 2)) * Math.PI) * 0.7
          ctx.beginPath()
          ctx.arc(px, py, p.size * 0.8, 0, Math.PI * 2)
          ctx.fillStyle = idx % 2 === 0 ? `rgba(216, 180, 254, ${alpha})` : `rgba(147, 197, 253, ${alpha})`
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 3. PLASMA OVERDRIVE (Volumetric Flame & Thermonuclear Plasma)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'plasma_overdrive' || effectId === 'inferno_flames') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Bottom ambient heat bloom
        const baseBloom = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, h * 0.8)
        baseBloom.addColorStop(0, 'rgba(255, 107, 0, 0.35)')
        baseBloom.addColorStop(0.5, 'rgba(239, 68, 68, 0.15)')
        baseBloom.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = baseBloom
        ctx.fillRect(0, 0, w, h)

        // Rising flame tendrils
        const tendrilCount = 7
        for (let i = 0; i < tendrilCount; i++) {
          const normX = (i + 0.5) / tendrilCount
          const baseX = normX * w
          const wave = Math.sin(t * 4 + i * 1.5) * (w * 0.05)
          const flameH = (0.35 + Math.sin(t * 3 + i) * 0.15) * h

          ctx.beginPath()
          ctx.moveTo(baseX - w * 0.08, h)
          ctx.quadraticCurveTo(baseX + wave, h - flameH * 0.6, baseX + wave * 0.5, h - flameH)
          ctx.quadraticCurveTo(baseX - wave, h - flameH * 0.6, baseX + w * 0.08, h)
          ctx.closePath()

          const flameGrad = ctx.createLinearGradient(0, h, 0, h - flameH)
          flameGrad.addColorStop(0, 'rgba(255, 170, 0, 0.28)')
          flameGrad.addColorStop(0.6, 'rgba(239, 68, 68, 0.18)')
          flameGrad.addColorStop(1, 'rgba(220, 38, 38, 0)')
          ctx.fillStyle = flameGrad
          ctx.fill()
        }

        // Sparks / embers drifting upward
        particles.forEach(p => {
          p.y -= 0.003 + p.extra2! * 0.002
          p.x += Math.sin(t * 4 + p.extra!) * 0.0015
          if (p.y < 0) {
            p.y = 1
            p.x = Math.random()
          }

          const px = p.x * w
          const py = p.y * h
          const alpha = (1 - (1 - p.y) * 0.8) * (Math.sin(t * 5 + p.extra!) * 0.3 + 0.7)

          ctx.beginPath()
          ctx.arc(px, py, p.size * 0.9, 0, Math.PI * 2)
          ctx.fillStyle = p.extra2! > 0.5 ? `rgba(254, 240, 138, ${alpha})` : `rgba(251, 146, 60, ${alpha})`
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 4. CYBER MATRIX (Neon Circuit Traces & Digital Lasers)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'cyber_matrix' || effectId === 'cyber_glitch') {
        ctx.save()

        // Corner HUD Reticles
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)'
        ctx.lineWidth = 1.5

        // Top-left corner bracket
        ctx.beginPath()
        ctx.moveTo(12, 28)
        ctx.lineTo(12, 12)
        ctx.lineTo(28, 12)
        ctx.stroke()

        // Top-right corner bracket
        ctx.beginPath()
        ctx.moveTo(w - 28, 12)
        ctx.lineTo(w - 12, 12)
        ctx.lineTo(w - 12, 28)
        ctx.stroke()

        // Bottom-right corner bracket
        ctx.beginPath()
        ctx.moveTo(w - 12, h - 28)
        ctx.lineTo(w - 12, h - 12)
        ctx.lineTo(w - 28, h - 12)
        ctx.stroke()

        // Bottom-left corner bracket
        ctx.beginPath()
        ctx.moveTo(28, h - 12)
        ctx.lineTo(12, h - 12)
        ctx.lineTo(12, h - 28)
        ctx.stroke()

        // Isometric / bus traces
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.22)'
        ctx.lineWidth = 1
        const lineCount = 5
        for (let i = 0; i < lineCount; i++) {
          const yPos = h * (0.2 + i * 0.15)
          ctx.beginPath()
          ctx.moveTo(0, yPos)
          ctx.lineTo(w * 0.3, yPos)
          ctx.lineTo(w * 0.45, yPos + 18)
          ctx.lineTo(w, yPos + 18)
          ctx.stroke()
        }

        // Sweeping laser scanline
        const scanY = ((t * 0.35) % 1) * h
        const scanGrad = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12)
        scanGrad.addColorStop(0, 'rgba(6, 182, 212, 0)')
        scanGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.35)')
        scanGrad.addColorStop(1, 'rgba(6, 182, 212, 0)')
        ctx.fillStyle = scanGrad
        ctx.fillRect(0, scanY - 12, w, 24)

        // Traveling data packets along traces
        ctx.globalCompositeOperation = 'lighter'
        particles.slice(0, 16).forEach((_, idx) => {
          const progress = ((t * 0.5 + idx * 0.12) % 1)
          const px = progress * w
          const py = h * (0.2 + (idx % 5) * 0.15) + (progress > 0.3 && progress < 0.45 ? (progress - 0.3) / 0.15 * 18 : progress >= 0.45 ? 18 : 0)

          ctx.beginPath()
          ctx.arc(px, py, 2, 0, Math.PI * 2)
          ctx.fillStyle = idx % 2 === 0 ? '#00f2fe' : '#10b981'
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 5. GLACIAL AURORA (Undulating Polar Curtains & Hex Crystals)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'glacial_aurora' || effectId === 'arctic_frost') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Multi-harmonic flowing aurora curtains
        const curtainCount = 3
        for (let c = 0; c < curtainCount; c++) {
          ctx.beginPath()
          ctx.moveTo(0, 0)
          for (let x = 0; x <= w; x += 8) {
            const normX = x / w
            const waveA = Math.sin(normX * 4 + t * 0.8 + c * 1.5) * (h * 0.18)
            const waveB = Math.cos(normX * 9 - t * 0.5) * (h * 0.08)
            const y = h * (0.25 + c * 0.12) + waveA + waveB
            ctx.lineTo(x, y)
          }
          ctx.lineTo(w, 0)
          ctx.closePath()

          const aurGrad = ctx.createLinearGradient(0, 0, 0, h * 0.6)
          if (c === 0) {
            aurGrad.addColorStop(0, 'rgba(16, 185, 129, 0.22)')
            aurGrad.addColorStop(1, 'rgba(52, 211, 153, 0)')
          } else if (c === 1) {
            aurGrad.addColorStop(0, 'rgba(6, 182, 212, 0.18)')
            aurGrad.addColorStop(1, 'rgba(103, 232, 249, 0)')
          } else {
            aurGrad.addColorStop(0, 'rgba(168, 85, 247, 0.15)')
            aurGrad.addColorStop(1, 'rgba(192, 132, 252, 0)')
          }
          ctx.fillStyle = aurGrad
          ctx.fill()
        }

        // Falling hexagonal snow crystals
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.65)'
        ctx.lineWidth = 1
        particles.forEach(p => {
          p.y += 0.001 + p.extra2! * 0.001
          p.x += Math.sin(t * 1.5 + p.extra!) * 0.0008
          if (p.y > 1) p.y = 0
          if (p.x < 0) p.x = 1
          if (p.x > 1) p.x = 0

          const px = p.x * w
          const py = p.y * h
          const sz = p.size * 1.2
          const rot = t * 0.5 + p.extra!

          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(rot)
          ctx.beginPath()
          for (let arm = 0; arm < 3; arm++) {
            const rad = (arm * Math.PI) / 3
            ctx.moveTo(-Math.cos(rad) * sz, -Math.sin(rad) * sz)
            ctx.lineTo(Math.cos(rad) * sz, Math.sin(rad) * sz)
          }
          ctx.stroke()
          ctx.restore()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 6. VOID ABYSS (Dark Plasma Tendrils & Ethereal Motes)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'void_abyss' || effectId === 'void_shadows') {
        ctx.save()

        // Border dark energy mist
        const borderGlow = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.2, w * 0.5, h * 0.5, w * 0.6)
        borderGlow.addColorStop(0, 'rgba(0, 0, 0, 0)')
        borderGlow.addColorStop(0.75, 'rgba(88, 28, 135, 0.22)')
        borderGlow.addColorStop(1, 'rgba(30, 10, 50, 0.5)')
        ctx.fillStyle = borderGlow
        ctx.fillRect(0, 0, w, h)

        // Dark plasma tendrils crawling along borders
        ctx.globalCompositeOperation = 'screen'
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2 + t * 0.15
          const sx = w * 0.5 + Math.cos(angle) * (w * 0.4)
          const sy = h * 0.5 + Math.sin(angle) * (h * 0.4)
          const wave = Math.sin(t * 2 + i * 2) * 20

          ctx.beginPath()
          ctx.arc(sx + wave, sy, 35 + Math.sin(t * 3 + i) * 12, 0, Math.PI * 2)
          const tGrad = ctx.createRadialGradient(sx + wave, sy, 0, sx + wave, sy, 45)
          tGrad.addColorStop(0, 'rgba(168, 85, 247, 0.25)')
          tGrad.addColorStop(0.6, 'rgba(124, 58, 237, 0.12)')
          tGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = tGrad
          ctx.fill()
        }

        // Void motes
        particles.forEach(p => {
          p.x += (Math.random() - 0.5) * 0.0015
          p.y += (Math.random() - 0.5) * 0.0015
          p.x = (p.x + 1) % 1
          p.y = (p.y + 1) % 1

          const px = p.x * w
          const py = p.y * h
          const alpha = (Math.sin(t * 2.5 + p.extra!) * 0.5 + 0.5) * 0.55

          ctx.beginPath()
          ctx.arc(px, py, p.size * 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(192, 132, 252, ${alpha})`
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 7. GOLDEN STARDUST (24k Diamond Sparkles & Light Cascades)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'golden_stardust' || effectId === 'golden_luxury') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Soft warm ambient top-light
        const goldAmbient = ctx.createLinearGradient(0, 0, 0, h)
        goldAmbient.addColorStop(0, 'rgba(251, 191, 36, 0.15)')
        goldAmbient.addColorStop(0.4, 'rgba(245, 158, 11, 0.05)')
        goldAmbient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = goldAmbient
        ctx.fillRect(0, 0, w, h)

        // Falling golden stardust with 4-point diamond cross flare
        particles.forEach(p => {
          p.y += 0.0012 + p.extra2! * 0.001
          p.x += Math.sin(t * 2 + p.extra!) * 0.0006
          if (p.y > 1) {
            p.y = 0
            p.x = Math.random()
          }

          const px = p.x * w
          const py = p.y * h
          const sz = p.size * 1.3
          const sparkle = (Math.sin(t * 4 + p.extra!) * 0.5 + 0.5)

          // 4-point star flare
          if (p.extra2! > 0.4) {
            ctx.save()
            ctx.translate(px, py)
            ctx.beginPath()
            ctx.moveTo(-sz * 2.5 * sparkle, 0)
            ctx.lineTo(sz * 2.5 * sparkle, 0)
            ctx.moveTo(0, -sz * 2.5 * sparkle)
            ctx.lineTo(0, sz * 2.5 * sparkle)
            ctx.strokeStyle = `rgba(254, 240, 138, ${0.4 * sparkle})`
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.restore()
          }

          // Central glowing sphere
          const gGrad = ctx.createRadialGradient(px, py, 0, px, py, sz)
          gGrad.addColorStop(0, 'rgba(254, 240, 138, 0.95)')
          gGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.6)')
          gGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = gGrad
          ctx.beginPath()
          ctx.arc(px, py, sz, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 8. SAKURA BREEZE (3D Tumbling Blossom Petals & Wind Currents)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'sakura_breeze' || effectId === 'sakura_petals') {
        ctx.save()

        // Soft pastel ambient pink vignette
        const pinkGrad = ctx.createLinearGradient(0, 0, w, h)
        pinkGrad.addColorStop(0, 'rgba(244, 114, 182, 0.08)')
        pinkGrad.addColorStop(1, 'rgba(236, 72, 153, 0.04)')
        ctx.fillStyle = pinkGrad
        ctx.fillRect(0, 0, w, h)

        // 3D Tumbling Petals
        particles.forEach(p => {
          p.y += 0.0016 + p.extra2! * 0.0012
          p.x += 0.001 + Math.sin(t * 2 + p.extra!) * 0.001
          if (p.y > 1) {
            p.y = 0
            p.x = Math.random()
          }
          if (p.x > 1) p.x = 0

          const px = p.x * w
          const py = p.y * h
          const sz = p.size * 2
          const angle = t * 1.5 + p.extra!
          const scaleY = Math.cos(t * 2.5 + p.extra!) // 3D tumbling flip

          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(angle)
          ctx.scale(1, Math.max(0.15, Math.abs(scaleY)))

          // Draw realistic sakura petal shape
          ctx.beginPath()
          ctx.moveTo(0, -sz)
          ctx.bezierCurveTo(sz * 0.8, -sz * 0.5, sz * 0.8, sz * 0.5, 0, sz)
          ctx.bezierCurveTo(-sz * 0.8, sz * 0.5, -sz * 0.8, -sz * 0.5, 0, -sz)
          ctx.closePath()

          const petalGrad = ctx.createLinearGradient(0, -sz, 0, sz)
          petalGrad.addColorStop(0, '#fbcfe8')
          petalGrad.addColorStop(0.6, '#f472b6')
          petalGrad.addColorStop(1, '#ec4899')
          ctx.fillStyle = petalGrad
          ctx.fill()
          ctx.restore()
        })
        ctx.restore()
      }

      animationFrameId = requestAnimationFrame(render)
    }

    startLoop()

    return () => {
      isRunning = false
      stopLoop()
      observer.disconnect()
      resizeObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
    }

  }, [effectId])

  return (
    <canvas
      ref={canvasRef}
      className={`echo-canvas-profile-effect ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        borderRadius: 'inherit'
      }}
      aria-hidden="true"
    />
  )
}
