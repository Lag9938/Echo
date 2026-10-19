import { useEffect, useRef } from 'react'
import { isAppInBackground } from '../lib/backgroundAnimations'

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
    const TARGET_FPS = 36
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
      extra: number
      extra2: number
      extra3: number
    }

    let particles: Particle[] = []

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

    const initEffect = () => {
      particles = []
      const count =
        effectId === 'golden_stardust'
          ? 70
          : effectId === 'quantum_singularity'
            ? 64
            : effectId === 'sakura_breeze'
              ? 46
              : 54

      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random(),
          y: Math.random(),
          vx: (Math.random() - 0.5) * 0.002,
          vy: (Math.random() - 0.5) * 0.002,
          size: 1 + Math.random() * 3,
          alpha: 0.3 + Math.random() * 0.7,
          maxLife: 2 + Math.random() * 4,
          life: Math.random() * 4,
          color: '#ffffff',
          extra: Math.random() * Math.PI * 2,
          extra2: Math.random(),
          extra3: Math.random()
        })
      }
    }

    initEffect()

    // Helper: Draw a 5-petal sakura flower
    const drawSakuraFlower = (cx: number, cy: number, radius: number, rot: number, alpha = 1) => {
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)
      ctx.globalAlpha = alpha
      for (let i = 0; i < 5; i++) {
        ctx.save()
        ctx.rotate((i * Math.PI * 2) / 5)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.bezierCurveTo(-radius * 0.45, -radius * 0.35, -radius * 0.5, -radius * 0.9, -radius * 0.14, -radius)
        ctx.lineTo(0, -radius * 0.82)
        ctx.lineTo(radius * 0.14, -radius)
        ctx.bezierCurveTo(radius * 0.5, -radius * 0.9, radius * 0.45, -radius * 0.35, 0, 0)
        ctx.closePath()
        const g = ctx.createLinearGradient(0, 0, 0, -radius)
        g.addColorStop(0, '#e11d48')
        g.addColorStop(0.55, '#fb7185')
        g.addColorStop(1, '#ffe4e6')
        ctx.fillStyle = g
        ctx.fill()
        ctx.restore()
      }
      ctx.beginPath()
      ctx.arc(0, 0, radius * 0.22, 0, Math.PI * 2)
      ctx.fillStyle = '#fde047'
      ctx.fill()
      ctx.restore()
    }

    const render = (now: number) => {
      if (!isRunning || !isVisible) return
      if (isAppInBackground()) return

      const isPerfMode = document.body.classList.contains('theme-performance-opaque')
      const targetInterval = isPerfMode ? 1000 / 15 : FRAME_INTERVAL

      const elapsed = now - lastFrameTime
      if (elapsed < targetInterval) {
        animationFrameId = requestAnimationFrame(render)
        return
      }
      lastFrameTime = now - (elapsed % targetInterval)

      const t = (now - startTime) * 0.001
      const w = canvas.width
      const h = canvas.height

      if (w === 0 || h === 0) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, w, h)

      // ─────────────────────────────────────────────────────────────
      // 1. ECHO RESONANCE (Ressonância Harmônica — Cymatics Core, Harmonic Shockwaves & 32-Band Spectrum)
      // ─────────────────────────────────────────────────────────────
      if (effectId === 'echo_resonance' || effectId === 'thunderstorm') {
        const cx = w * 0.5
        const cy = h * 0.38
        const maxR = Math.max(w, h) * 0.72
        const minDim = Math.min(w, h)

        // Ambient dual-tone studio glow
        const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.9)
        bgGlow.addColorStop(0, 'rgba(0, 242, 254, 0.16)')
        bgGlow.addColorStop(0.45, 'rgba(168, 85, 247, 0.10)')
        bgGlow.addColorStop(0.8, 'rgba(244, 114, 182, 0.05)')
        bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = bgGlow
        ctx.fillRect(0, 0, w, h)

        // Concentric harmonic cymatic shockwaves (modulated by frequency sine waves)
        const waveCount = 5
        for (let i = 0; i < waveCount; i++) {
          const progress = (t * 0.34 + i / waveCount) % 1
          const rX = Math.max(2, progress * maxR)
          const rY = Math.max(2, rX * 0.62)
          const alpha = Math.sin(progress * Math.PI) * 0.55

          ctx.save()
          ctx.beginPath()
          const segs = 64
          for (let s = 0; s <= segs; s++) {
            const ang = (s / segs) * Math.PI * 2
            const ripple = 1 + Math.sin(ang * 8 + t * 5 - i * 1.2) * 0.035 * (1 - progress * 0.5)
            const px = cx + Math.cos(ang) * rX * ripple
            const py = cy + Math.sin(ang) * rY * ripple
            if (s === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.lineWidth = (1.8 + (1 - progress) * 2.2) * (minDim / 180)
          ctx.strokeStyle =
            i % 3 === 0
              ? `rgba(0, 242, 254, ${alpha})`
              : i % 3 === 1
                ? `rgba(244, 114, 182, ${alpha * 0.9})`
                : `rgba(168, 85, 247, ${alpha * 0.85})`
          ctx.stroke()
          ctx.restore()
        }

        // Central Cymatics Ring & Radial 28-Bar Circular Equalizer
        ctx.save()
        ctx.translate(cx, cy)
        ctx.scale(1, 0.68)
        const coreR = minDim * 0.16
        const bars = 28
        for (let b = 0; b < bars; b++) {
          const ang = (b / bars) * Math.PI * 2 + t * 0.35
          const amp = (Math.sin(t * 6 + b * 0.7) * 0.5 + 0.5) * (minDim * 0.09) + minDim * 0.02
          const x1 = Math.cos(ang) * coreR
          const y1 = Math.sin(ang) * coreR
          const x2 = Math.cos(ang) * (coreR + amp)
          const y2 = Math.sin(ang) * (coreR + amp)
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.lineWidth = Math.max(1.5, minDim * 0.014)
          ctx.lineCap = 'round'
          ctx.strokeStyle = b % 2 === 0 ? 'rgba(0, 242, 254, 0.85)' : 'rgba(244, 114, 182, 0.85)'
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(0, 0, coreR * 0.82, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
        ctx.lineWidth = 1.2
        ctx.stroke()
        ctx.restore()

        // Multi-Ribbon Intertwining Acoustic Sine Waves + Bottom Spectrum Analyzer
        const ribbonColors = [
          { stroke: 'rgba(0, 242, 254, 0.65)', fill: 'rgba(0, 242, 254, 0.16)', speed: 3.6, freq: 7, amp: 0.065 },
          { stroke: 'rgba(244, 114, 182, 0.55)', fill: 'rgba(244, 114, 182, 0.12)', speed: -2.8, freq: 9, amp: 0.055 },
          { stroke: 'rgba(168, 85, 247, 0.5)', fill: 'rgba(168, 85, 247, 0.10)', speed: 2.1, freq: 12, amp: 0.04 }
        ]
        ribbonColors.forEach((rib, idx) => {
          ctx.save()
          ctx.beginPath()
          for (let x = 0; x <= w; x += 5) {
            const nx = x / w
            const y =
              h * 0.84 +
              Math.sin(nx * rib.freq + t * rib.speed + idx) * (h * rib.amp) +
              Math.cos(nx * 15 - t * 2) * (h * 0.02)
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.strokeStyle = rib.stroke
          ctx.lineWidth = 2
          ctx.stroke()
          ctx.lineTo(w, h)
          ctx.lineTo(0, h)
          ctx.closePath()
          ctx.fillStyle = rib.fill
          ctx.fill()
          ctx.restore()
        })

        // Bottom 32-Bar Digital Equalizer with Peak Dots
        const eqBars = 32
        const barW = w / eqBars
        ctx.save()
        for (let i = 0; i < eqBars; i++) {
          const env = Math.sin((i / eqBars) * Math.PI)
          const barH =
            (Math.sin(t * 5.2 + i * 0.55) * 0.45 + Math.cos(t * 3.1 - i * 0.9) * 0.35 + 0.8) *
            (h * 0.14) *
            (0.35 + env * 0.65)
          const bx = i * barW + barW * 0.22
          const bw = barW * 0.56
          const grad = ctx.createLinearGradient(0, h, 0, h - barH)
          grad.addColorStop(0, 'rgba(168, 85, 247, 0.55)')
          grad.addColorStop(0.6, 'rgba(0, 242, 254, 0.75)')
          grad.addColorStop(1, 'rgba(244, 114, 182, 0.95)')
          ctx.fillStyle = grad
          ctx.fillRect(bx, h - barH, bw, barH)

          // Peak hold dot
          const peakY = h - barH - 4 - Math.abs(Math.sin(t * 2.5 + i)) * 5
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(bx, peakY, bw, 2)
        }
        ctx.restore()

        // Floating Harmonic Orbs
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        particles.forEach((p, idx) => {
          p.y -= 0.0018 + p.extra2 * 0.001
          p.x += Math.sin(t * 2.2 + p.extra) * 0.0012
          if (p.y < 0) p.y = 1
          if (p.x < 0) p.x = 1
          if (p.x > 1) p.x = 0

          const px = p.x * w
          const py = p.y * h
          const pAlpha = (Math.sin(t * 3.5 + p.extra) * 0.45 + 0.55) * 0.85
          const rad = p.size * (minDim / 150) * 2.2

          const grad = ctx.createRadialGradient(px, py, 0, px, py, rad)
          grad.addColorStop(0, `rgba(255, 255, 255, ${pAlpha})`)
          grad.addColorStop(0.35, idx % 2 === 0 ? `rgba(0, 242, 254, ${pAlpha * 0.85})` : `rgba(244, 114, 182, ${pAlpha * 0.85})`)
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(px, py, rad, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 2. QUANTUM SINGULARITY (Singularidade Quântica — Gargantua Lensing, Relativistic Jets & Accretion Disk)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'quantum_singularity' || effectId === 'cosmic_nebula') {
        const cx = w * 0.66
        const cy = h * 0.44
        const minDim = Math.min(w, h)
        const diskR = minDim * 0.44
        const tilt = -0.38 // ~ -22 deg

        // Deep Cosmic Nebula Clouds
        const neb1 = ctx.createRadialGradient(cx, cy, diskR * 0.1, cx, cy, diskR * 2.2)
        neb1.addColorStop(0, 'rgba(192, 132, 252, 0.25)')
        neb1.addColorStop(0.4, 'rgba(109, 40, 217, 0.16)')
        neb1.addColorStop(0.75, 'rgba(30, 58, 138, 0.10)')
        neb1.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = neb1
        ctx.fillRect(0, 0, w, h)

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Relativistic Polar Plasma Jets (perpendicular to the accretion disk)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(tilt)
        const jetLen = diskR * 1.45
        const jetW = diskR * 0.16
        const jetGrad = ctx.createLinearGradient(0, -jetLen, 0, jetLen)
        jetGrad.addColorStop(0, 'rgba(56, 189, 248, 0)')
        jetGrad.addColorStop(0.35, 'rgba(168, 85, 247, 0.35)')
        jetGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)')
        jetGrad.addColorStop(0.65, 'rgba(168, 85, 247, 0.35)')
        jetGrad.addColorStop(1, 'rgba(56, 189, 248, 0)')
        ctx.fillStyle = jetGrad
        ctx.beginPath()
        ctx.moveTo(-jetW, -jetLen)
        ctx.quadraticCurveTo(0, 0, -jetW, jetLen)
        ctx.lineTo(jetW, jetLen)
        ctx.quadraticCurveTo(0, 0, jetW, -jetLen)
        ctx.closePath()
        ctx.fill()
        ctx.restore()

        // Gravitational Lensing Halo (Bent light over and under the black hole)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(tilt)
        const lensR = diskR * 0.42
        const lensGrad = ctx.createRadialGradient(0, 0, lensR * 0.65, 0, 0, lensR * 1.35)
        lensGrad.addColorStop(0, 'rgba(255, 255, 255, 0)')
        lensGrad.addColorStop(0.5, 'rgba(233, 213, 255, 0.55)')
        lensGrad.addColorStop(0.75, 'rgba(56, 189, 248, 0.28)')
        lensGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = lensGrad
        ctx.beginPath()
        ctx.arc(0, 0, lensR * 1.35, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Multi-Ring Swirling Accretion Disk with Relativistic Comets
        for (let ring = 0; ring < 5; ring++) {
          const rx = diskR * (0.58 + ring * 0.21)
          const ry = rx * (0.28 + ring * 0.02)
          const rot = tilt + Math.sin(t * 0.6 + ring) * 0.04

          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(rot)

          // Base glowing ellipse
          ctx.beginPath()
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
          ctx.lineWidth = (5.5 - ring * 0.8) * (minDim / 180)
          ctx.strokeStyle =
            ring === 0
              ? 'rgba(254, 240, 138, 0.65)'
              : ring % 2 === 1
                ? 'rgba(192, 132, 252, 0.42)'
                : 'rgba(56, 189, 248, 0.36)'
          ctx.stroke()

          // Orbiting relativistic plasma arc along the ring
          const cometAng = t * (2.4 - ring * 0.32) + ring * 1.3
          ctx.beginPath()
          ctx.ellipse(0, 0, rx, ry, 0, cometAng, cometAng + 1.15)
          ctx.lineWidth = (3.2 - ring * 0.35) * (minDim / 180)
          ctx.lineCap = 'round'
          ctx.strokeStyle = ring % 2 === 0 ? 'rgba(255, 255, 255, 0.92)' : 'rgba(103, 232, 249, 0.9)'
          ctx.stroke()
          ctx.restore()
        }

        // Spiraling Infall Photons & Stardust
        particles.forEach((p, idx) => {
          const speed = 0.9 + p.extra2 * 0.7
          const angle = p.extra + t * speed
          const rawDist = 1 - ((t * 0.18 + p.extra3) % 1)
          const dist = (0.16 + rawDist * 1.25) * diskR

          const localX = Math.cos(angle) * dist
          const localY = Math.sin(angle) * dist * 0.34
          const cosT = Math.cos(tilt)
          const sinT = Math.sin(tilt)
          const px = cx + localX * cosT - localY * sinT
          const py = cy + localX * sinT + localY * cosT

          const alpha = Math.sin(rawDist * Math.PI) * 0.9
          const r = p.size * (minDim / 180) * 1.15

          ctx.beginPath()
          ctx.arc(px, py, r, 0, Math.PI * 2)
          ctx.fillStyle =
            idx % 3 === 0
              ? `rgba(254, 240, 138, ${alpha})`
              : idx % 3 === 1
                ? `rgba(216, 180, 254, ${alpha})`
                : `rgba(103, 232, 249, ${alpha})`
          ctx.fill()
        })
        ctx.restore()

        // Event Horizon Black Core + Blazing Photon Ring
        ctx.save()
        const coreR = diskR * 0.27
        const horizonGrad = ctx.createRadialGradient(cx, cy, coreR * 0.72, cx, cy, coreR * 1.35)
        horizonGrad.addColorStop(0, '#05020d')
        horizonGrad.addColorStop(0.68, '#070312')
        horizonGrad.addColorStop(0.82, 'rgba(254, 240, 138, 0.95)')
        horizonGrad.addColorStop(0.92, 'rgba(168, 85, 247, 0.75)')
        horizonGrad.addColorStop(1, 'rgba(168, 85, 247, 0)')
        ctx.fillStyle = horizonGrad
        ctx.beginPath()
        ctx.arc(cx, cy, coreR * 1.35, 0, Math.PI * 2)
        ctx.fill()

        // Front-crossing accretion beam (passes in front of the black hole!)
        ctx.globalCompositeOperation = 'lighter'
        ctx.translate(cx, cy)
        ctx.rotate(tilt)
        ctx.beginPath()
        ctx.ellipse(0, 0, diskR * 0.58, diskR * 0.16, 0, 0.12, Math.PI - 0.12)
        ctx.lineWidth = 3.5 * (minDim / 180)
        ctx.strokeStyle = 'rgba(255, 251, 235, 0.92)'
        ctx.stroke()
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 3. PLASMA OVERDRIVE (Núcleo de Plasma — Multi-Layer Organic Fire, Solar Arcs & Ember Trails)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'plasma_overdrive' || effectId === 'inferno_flames') {
        const minDim = Math.min(w, h)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Intense Volumetric Reactor Core Glow at Bottom
        const baseBloom = ctx.createRadialGradient(w * 0.5, h * 1.05, 0, w * 0.5, h, Math.max(w, h) * 0.78)
        baseBloom.addColorStop(0, 'rgba(254, 240, 138, 0.55)')
        baseBloom.addColorStop(0.28, 'rgba(255, 107, 0, 0.42)')
        baseBloom.addColorStop(0.62, 'rgba(220, 38, 38, 0.18)')
        baseBloom.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = baseBloom
        ctx.fillRect(0, 0, w, h)

        // 3 Depth Layers of Organic S-Curve Flame Tongues (Back Crimson -> Mid Orange -> Front White-Gold)
        const layers = [
          { count: 9, maxH: 0.58, speed: 3.2, wScale: 0.14, c0: 'rgba(185, 28, 28, 0.42)', c1: 'rgba(239, 68, 68, 0.22)' },
          { count: 11, maxH: 0.44, speed: 4.4, wScale: 0.11, c0: 'rgba(249, 115, 22, 0.52)', c1: 'rgba(251, 191, 36, 0.26)' },
          { count: 8, maxH: 0.29, speed: 5.6, wScale: 0.08, c0: 'rgba(254, 249, 195, 0.68)', c1: 'rgba(251, 146, 60, 0.28)' }
        ]

        layers.forEach((layer, lIdx) => {
          for (let i = 0; i < layer.count; i++) {
            const normX = (i + 0.5) / layer.count
            const baseX = normX * w + Math.sin(i * 2.3 + lIdx) * (w * 0.03)
            const sway1 = Math.sin(t * layer.speed + i * 1.4 + lIdx) * (w * 0.045)
            const sway2 = Math.cos(t * (layer.speed * 1.3) - i * 0.9) * (w * 0.03)
            const env = 0.72 + Math.sin(normX * Math.PI) * 0.35
            const flameH = (layer.maxH * 0.7 + Math.sin(t * 3.8 + i * 1.7 + lIdx) * (layer.maxH * 0.3)) * h * env
            const halfW = w * layer.wScale

            const tipX = baseX + sway1 + sway2
            const tipY = h - flameH

            ctx.beginPath()
            ctx.moveTo(baseX - halfW, h + 4)
            ctx.bezierCurveTo(
              baseX - halfW * 0.6 + sway1 * 0.4,
              h - flameH * 0.35,
              tipX - halfW * 0.35 - sway2 * 0.5,
              h - flameH * 0.72,
              tipX,
              tipY
            )
            ctx.bezierCurveTo(
              tipX + halfW * 0.35 - sway2 * 0.5,
              h - flameH * 0.72,
              baseX + halfW * 0.6 + sway1 * 0.4,
              h - flameH * 0.35,
              baseX + halfW,
              h + 4
            )
            ctx.closePath()

            const fg = ctx.createLinearGradient(0, h, 0, tipY)
            fg.addColorStop(0, layer.c0)
            fg.addColorStop(0.65, layer.c1)
            fg.addColorStop(1, 'rgba(255, 100, 0, 0)')
            ctx.fillStyle = fg
            ctx.fill()
          }
        })

        // Thermonuclear Plasma Lightning Arcs along the bottom
        for (let a = 0; a < 2; a++) {
          ctx.beginPath()
          const startX = w * (0.15 + a * 0.35)
          const endX = startX + w * 0.35
          const steps = 10
          for (let s = 0; s <= steps; s++) {
            const px = startX + ((endX - startX) * s) / steps
            const jitter = s === 0 || s === steps ? 0 : Math.sin(t * 18 + s * 4.1 + a * 3) * (h * 0.045)
            const py = h - h * 0.08 - Math.sin((s / steps) * Math.PI) * (h * 0.09) + jitter
            if (s === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.strokeStyle = a === 0 ? 'rgba(254, 240, 138, 0.65)' : 'rgba(251, 146, 60, 0.55)'
          ctx.lineWidth = 1.4 * (minDim / 180)
          ctx.stroke()
        }

        // Swirling Convection Sparks & Elongated Ember Streaks
        particles.forEach((p, idx) => {
          const vy = 0.0045 + p.extra2 * 0.0035
          const vx = Math.sin(t * 4.5 + p.extra) * 0.0022
          p.y -= vy
          p.x += vx
          if (p.y < -0.05) {
            p.y = 1.02
            p.x = Math.random()
          }

          const px = p.x * w
          const py = p.y * h
          const alpha = Math.min(1, p.y * 1.25) * (Math.sin(t * 7 + p.extra) * 0.3 + 0.7)
          const r = p.size * (minDim / 180) * 1.15

          // Glowing ember trail
          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(px - vx * w * 3.2, py + vy * h * 3.2)
          ctx.strokeStyle = idx % 3 === 0 ? `rgba(255, 255, 255, ${alpha})` : `rgba(251, 146, 60, ${alpha * 0.85})`
          ctx.lineWidth = r * 1.4
          ctx.lineCap = 'round'
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(px, py, r, 0, Math.PI * 2)
          ctx.fillStyle = idx % 2 === 0 ? `rgba(254, 249, 195, ${alpha})` : `rgba(255, 130, 20, ${alpha})`
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 4. CYBER MATRIX (Sobrecarga de Dados — PCB Traces, Optical Comets, HUD Radar & Digital Rain)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'cyber_matrix' || effectId === 'cyber_glitch') {
        const minDim = Math.min(w, h)
        ctx.save()

        // Subtle Digital Matrix Rain Streams in Background
        ctx.fillStyle = 'rgba(6, 182, 212, 0.14)'
        const cols = 18
        for (let c = 0; c < cols; c++) {
          const cx = ((c + 0.5) / cols) * w
          const dropY = ((t * (0.28 + (c % 5) * 0.08) + c * 0.19) % 1.2) * h
          for (let d = 0; d < 4; d++) {
            const dy = dropY - d * 9
            if (dy > 0 && dy < h) {
              ctx.globalAlpha = (1 - d * 0.24) * 0.35
              ctx.fillRect(cx - 1, dy, 2.2, 5.5)
            }
          }
        }
        ctx.globalAlpha = 1

        // 7 Multi-Segment PCB Optical Bus Traces + Glowing Nodes
        const traceCount = 6
        const getTracePoint = (idx: number, prog: number): [number, number] => {
          const yBase = h * (0.16 + idx * 0.135)
          const step = (idx % 2 === 0 ? 1 : -1) * (h * 0.08)
          if (prog < 0.28) return [prog * w, yBase]
          if (prog < 0.44) {
            const k = (prog - 0.28) / 0.16
            return [prog * w, yBase + k * step]
          }
          if (prog < 0.72) return [prog * w, yBase + step]
          if (prog < 0.84) {
            const k = (prog - 0.72) / 0.12
            return [prog * w, yBase + step * (1 - k * 0.5)]
          }
          return [prog * w, yBase + step * 0.5]
        }

        for (let i = 0; i < traceCount; i++) {
          ctx.beginPath()
          const pts = [0, 0.28, 0.44, 0.72, 0.84, 1]
          pts.forEach((p, idx) => {
            const [tx, ty] = getTracePoint(i, p)
            if (idx === 0) ctx.moveTo(tx, ty)
            else ctx.lineTo(tx, ty)
          })
          ctx.strokeStyle = i % 3 === 0 ? 'rgba(0, 242, 254, 0.32)' : i % 3 === 1 ? 'rgba(16, 185, 129, 0.28)' : 'rgba(244, 114, 182, 0.24)'
          ctx.lineWidth = 1.3 * (minDim / 180)
          ctx.stroke()

          // Solder pad junction nodes
          ;[0.28, 0.44, 0.72, 0.84].forEach((jn) => {
            const [jx, jy] = getTracePoint(i, jn)
            ctx.beginPath()
            ctx.arc(jx, jy, 2.2 * (minDim / 180), 0, Math.PI * 2)
            ctx.fillStyle = 'rgba(6, 182, 212, 0.55)'
            ctx.fill()
          })
        }

        // High-Speed Optical Data Packets with Comet Trails
        ctx.globalCompositeOperation = 'lighter'
        for (let p = 0; p < 14; p++) {
          const traceIdx = p % traceCount
          const speed = 0.38 + (p % 4) * 0.09
          const prog = (t * speed + p * 0.17) % 1
          const color = p % 3 === 0 ? '#00f2fe' : p % 3 === 1 ? '#34d399' : '#f472b6'

          // Trail segments
          ctx.beginPath()
          for (let s = 0; s < 8; s++) {
            const tp = Math.max(0, prog - s * 0.012)
            const [tx, ty] = getTracePoint(traceIdx, tp)
            if (s === 0) ctx.moveTo(tx, ty)
            else ctx.lineTo(tx, ty)
          }
          ctx.strokeStyle = color
          ctx.lineWidth = 2.4 * (minDim / 180)
          ctx.lineCap = 'round'
          ctx.stroke()

          const [hx, hy] = getTracePoint(traceIdx, prog)
          ctx.beginPath()
          ctx.arc(hx, hy, 2.8 * (minDim / 180), 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
        }

        // Tactical Rotating HUD Reticle on Right Side
        ctx.save()
        ctx.translate(w * 0.8, h * 0.34)
        const hudR = minDim * 0.14
        ctx.rotate(t * 0.45)
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.45)'
        ctx.lineWidth = 1.2
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.arc(0, 0, hudR, 0, Math.PI * 2)
        ctx.stroke()
        ctx.rotate(-t * 0.9)
        ctx.setLineDash([3, 6])
        ctx.strokeStyle = 'rgba(244, 114, 182, 0.45)'
        ctx.beginPath()
        ctx.arc(0, 0, hudR * 0.68, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // Sweeping Dual Laser Scanline
        const scanY = ((t * 0.38) % 1) * h
        const scanGrad = ctx.createLinearGradient(0, scanY - 16, 0, scanY + 16)
        scanGrad.addColorStop(0, 'rgba(0, 242, 254, 0)')
        scanGrad.addColorStop(0.48, 'rgba(0, 242, 254, 0.35)')
        scanGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.75)')
        scanGrad.addColorStop(0.52, 'rgba(244, 114, 182, 0.35)')
        scanGrad.addColorStop(1, 'rgba(244, 114, 182, 0)')
        ctx.fillStyle = scanGrad
        ctx.fillRect(0, scanY - 16, w, 32)

        // Tactical Corner Brackets with Telemetry Ticks
        const bLen = Math.min(24, minDim * 0.16)
        const pad = 10
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.75)'
        ctx.lineWidth = 1.8
        const corners = [
          [pad, pad + bLen, pad, pad, pad + bLen, pad],
          [w - pad - bLen, pad, w - pad, pad, w - pad, pad + bLen],
          [w - pad, h - pad - bLen, w - pad, h - pad, w - pad - bLen, h - pad],
          [pad + bLen, h - pad, pad, h - pad, pad, h - pad - bLen]
        ]
        corners.forEach(([x1, y1, x2, y2, x3, y3]) => {
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.lineTo(x3, y3)
          ctx.stroke()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 5. GLACIAL AURORA (Aurora Ártica — Rayed Borealis Curtains, Ice Prisms & Dendritic Snowflakes)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'glacial_aurora' || effectId === 'arctic_frost') {
        const minDim = Math.min(w, h)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // 3 Undulating Borealis Curtains with Vertical Magnetic Shimmer Rays
        const curtains = [
          { yBase: 0.24, amp: 0.15, speed: 0.75, cTop: 'rgba(16, 185, 129, 0.02)', cMid: 'rgba(52, 211, 153, 0.36)', cBot: 'rgba(6, 182, 212, 0)' },
          { yBase: 0.36, amp: 0.13, speed: -0.6, cTop: 'rgba(6, 182, 212, 0.02)', cMid: 'rgba(56, 189, 248, 0.32)', cBot: 'rgba(168, 85, 247, 0)' },
          { yBase: 0.46, amp: 0.11, speed: 0.9, cTop: 'rgba(168, 85, 247, 0.02)', cMid: 'rgba(232, 121, 249, 0.26)', cBot: 'rgba(52, 211, 153, 0)' }
        ]

        curtains.forEach((cur, cIdx) => {
          const curtainH = h * 0.42
          const stepX = Math.max(4, w / 48)
          for (let x = 0; x < w; x += stepX) {
            const nx = x / w
            const wave =
              Math.sin(nx * 4.5 + t * cur.speed + cIdx * 1.7) * (h * cur.amp) +
              Math.cos(nx * 9.5 - t * 0.5) * (h * 0.05)
            const yCenter = h * cur.yBase + wave
            const rayInt = 0.45 + Math.sin(nx * 28 + t * 2.4 + cIdx * 2) * 0.55

            const g = ctx.createLinearGradient(0, yCenter - curtainH * 0.65, 0, yCenter + curtainH * 0.35)
            g.addColorStop(0, cur.cTop)
            g.addColorStop(0.55, cur.cMid)
            g.addColorStop(1, cur.cBot)
            ctx.globalAlpha = rayInt
            ctx.fillStyle = g
            ctx.fillRect(x, yCenter - curtainH * 0.65, stepX + 1, curtainH)
          }
        })
        ctx.globalAlpha = 1

        // Detailed 6-Branch Dendritic Snowflakes & Diamond Dust
        particles.forEach((p, idx) => {
          p.y += 0.0012 + p.extra2 * 0.0012
          p.x += Math.sin(t * 1.4 + p.extra) * 0.0009
          if (p.y > 1.05) {
            p.y = -0.05
            p.x = Math.random()
          }
          if (p.x < 0) p.x = 1
          if (p.x > 1) p.x = 0

          const px = p.x * w
          const py = p.y * h
          const sz = (1.6 + p.size * 1.15) * (minDim / 180)
          const rot = t * 0.6 + p.extra

          if (idx % 2 === 0) {
            // Ornate 6-pointed snowflake with side barbules
            ctx.save()
            ctx.translate(px, py)
            ctx.rotate(rot)
            ctx.strokeStyle = idx % 4 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(186, 230, 253, 0.78)'
            ctx.lineWidth = Math.max(0.85, minDim / 190)
            ctx.beginPath()
            for (let arm = 0; arm < 6; arm++) {
              const ang = (arm * Math.PI) / 3
              const ca = Math.cos(ang)
              const sa = Math.sin(ang)
              ctx.moveTo(0, 0)
              ctx.lineTo(ca * sz, sa * sz)
              // Side V-branch
              const bx = ca * (sz * 0.58)
              const by = sa * (sz * 0.58)
              ctx.moveTo(bx, by)
              ctx.lineTo(bx + Math.cos(ang + 0.6) * (sz * 0.36), by + Math.sin(ang + 0.6) * (sz * 0.36))
              ctx.moveTo(bx, by)
              ctx.lineTo(bx + Math.cos(ang - 0.6) * (sz * 0.36), by + Math.sin(ang - 0.6) * (sz * 0.36))
            }
            ctx.stroke()
            ctx.restore()
          } else {
            // Shimmering diamond ice dust
            const twinkle = Math.sin(t * 4 + p.extra) * 0.4 + 0.6
            ctx.fillStyle = `rgba(167, 243, 208, ${twinkle * 0.85})`
            ctx.beginPath()
            ctx.arc(px, py, sz * 0.42, 0, Math.PI * 2)
            ctx.fill()
          }
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 6. VOID ABYSS (Abismo do Vazio — Eldritch Void Eclipse, Sinuous Shadow Tendrils & Dark-Core Orbs)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'void_abyss' || effectId === 'void_shadows') {
        const minDim = Math.min(w, h)
        const cx = w * 0.5
        const cy = h * 0.42
        ctx.save()

        // Deep Vignette Border Mist
        const borderGlow = ctx.createRadialGradient(cx, cy, minDim * 0.12, cx, cy, Math.max(w, h) * 0.68)
        borderGlow.addColorStop(0, 'rgba(0, 0, 0, 0)')
        borderGlow.addColorStop(0.65, 'rgba(88, 28, 135, 0.28)')
        borderGlow.addColorStop(1, 'rgba(15, 5, 28, 0.72)')
        ctx.fillStyle = borderGlow
        ctx.fillRect(0, 0, w, h)

        // 8 Sinuous Shadow-Plasma Tentacles / Tendrils Crawling from Edges
        const tendrilCount = 8
        for (let i = 0; i < tendrilCount; i++) {
          const baseAng = (i / tendrilCount) * Math.PI * 2 + t * 0.12
          const startX = cx + Math.cos(baseAng) * (w * 0.58)
          const startY = cy + Math.sin(baseAng) * (h * 0.58)
          const inAng = baseAng + Math.PI
          const len = minDim * (0.34 + (i % 3) * 0.08)

          ctx.save()
          ctx.beginPath()
          const segs = 12
          for (let s = 0; s <= segs; s++) {
            const p = s / segs
            const wave = Math.sin(t * 2.6 - p * 5 + i * 1.3) * (minDim * 0.06 * p)
            const perpX = -Math.sin(inAng) * wave
            const perpY = Math.cos(inAng) * wave
            const tx = startX + Math.cos(inAng) * (len * p) + perpX
            const ty = startY + Math.sin(inAng) * (len * p) + perpY
            if (s === 0) ctx.moveTo(tx, ty)
            else ctx.lineTo(tx, ty)
          }
          ctx.strokeStyle = i % 2 === 0 ? 'rgba(168, 85, 247, 0.38)' : 'rgba(192, 132, 252, 0.28)'
          ctx.lineWidth = (4.5 - (i % 2) * 1.2) * (minDim / 180)
          ctx.lineCap = 'round'
          ctx.stroke()
          ctx.restore()
        }

        // Central Eldritch Void Eclipse & Reality Fractures
        const riftR = minDim * 0.16 * (1 + Math.sin(t * 2.2) * 0.06)
        const corona = ctx.createRadialGradient(cx, cy, riftR * 0.6, cx, cy, riftR * 2.4)
        corona.addColorStop(0, '#04010a')
        corona.addColorStop(0.42, '#090214')
        corona.addColorStop(0.55, 'rgba(192, 132, 252, 0.85)')
        corona.addColorStop(0.75, 'rgba(124, 58, 237, 0.35)')
        corona.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = corona
        ctx.beginPath()
        ctx.arc(cx, cy, riftR * 2.4, 0, Math.PI * 2)
        ctx.fill()

        // Antimatter Dark-Core Orbs (Black center with glowing ultraviolet rim)
        particles.forEach((p, idx) => {
          p.y -= 0.0012 + p.extra2 * 0.001
          p.x += Math.sin(t * 1.8 + p.extra) * 0.001
          if (p.y < -0.05) p.y = 1.05
          if (p.x < 0) p.x = 1
          if (p.x > 1) p.x = 0

          const px = p.x * w
          const py = p.y * h
          const pulse = Math.sin(t * 2.8 + p.extra) * 0.35 + 0.65
          const r = (1.8 + p.size * 1.3) * (minDim / 180)

          const orbGrad = ctx.createRadialGradient(px, py, r * 0.25, px, py, r * 1.8)
          orbGrad.addColorStop(0, '#070210')
          orbGrad.addColorStop(0.45, idx % 2 === 0 ? `rgba(192, 132, 252, ${pulse * 0.85})` : `rgba(232, 121, 249, ${pulse * 0.75})`)
          orbGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = orbGrad
          ctx.beginPath()
          ctx.arc(px, py, r * 1.8, 0, Math.PI * 2)
          ctx.fill()
        })
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 7. GOLDEN STARDUST (Stardust Imperial — 24k God-Rays, Constellation Lines & 8-Point Diamond Flares)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'golden_stardust' || effectId === 'golden_luxury') {
        const minDim = Math.min(w, h)
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Diagonal Volumetric 24k Golden God-Rays from Top
        for (let r = 0; r < 4; r++) {
          const rayX = w * (0.18 + r * 0.22) + Math.sin(t * 0.7 + r) * (w * 0.05)
          const rayW = w * 0.14
          const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + w * 0.18, h * 0.9)
          rayGrad.addColorStop(0, 'rgba(253, 224, 71, 0.18)')
          rayGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)')
          rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = rayGrad
          ctx.beginPath()
          ctx.moveTo(rayX - rayW * 0.5, 0)
          ctx.lineTo(rayX + rayW * 0.5, 0)
          ctx.lineTo(rayX + w * 0.22 + rayW, h)
          ctx.lineTo(rayX + w * 0.22 - rayW, h)
          ctx.closePath()
          ctx.fill()
        }

        // Update Star Positions
        const starPositions: { x: number; y: number; sz: number; sp: number }[] = []
        particles.forEach((p, idx) => {
          p.y += 0.001 + p.extra2 * 0.001
          p.x += Math.sin(t * 1.8 + p.extra) * 0.0006
          if (p.y > 1.04) {
            p.y = -0.04
            p.x = Math.random()
          }
          const px = p.x * w
          const py = p.y * h
          const sz = (1.2 + p.size * 1.2) * (minDim / 180)
          const sp = Math.sin(t * 3.8 + p.extra) * 0.5 + 0.5
          if (idx < 22) starPositions.push({ x: px, y: py, sz, sp })

          // Warm golden bokeh halo
          const gGrad = ctx.createRadialGradient(px, py, 0, px, py, sz * 1.6)
          gGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
          gGrad.addColorStop(0.35, 'rgba(254, 240, 138, 0.85)')
          gGrad.addColorStop(0.7, 'rgba(245, 158, 11, 0.4)')
          gGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.fillStyle = gGrad
          ctx.beginPath()
          ctx.arc(px, py, sz * 1.6, 0, Math.PI * 2)
          ctx.fill()

          // 8-Point Diamond Cross Flare on bright stars
          if (p.extra2 > 0.42) {
            const flareLen = sz * (2.6 + sp * 2.2)
            ctx.save()
            ctx.translate(px, py)
            ctx.strokeStyle = `rgba(254, 249, 195, ${0.35 + sp * 0.55})`
            ctx.lineWidth = Math.max(0.8, minDim / 200)
            ctx.beginPath()
            ctx.moveTo(-flareLen, 0)
            ctx.lineTo(flareLen, 0)
            ctx.moveTo(0, -flareLen)
            ctx.lineTo(0, flareLen)
            const dLen = flareLen * 0.48
            ctx.moveTo(-dLen, -dLen)
            ctx.lineTo(dLen, dLen)
            ctx.moveTo(-dLen, dLen)
            ctx.lineTo(dLen, -dLen)
            ctx.stroke()
            ctx.restore()
          }
        })

        // Imperial Constellation Lines linking nearby bright stars
        const maxDist = minDim * 0.28
        ctx.lineWidth = Math.max(0.65, minDim / 220)
        for (let i = 0; i < starPositions.length; i++) {
          for (let j = i + 1; j < starPositions.length; j++) {
            const dx = starPositions[i].x - starPositions[j].x
            const dy = starPositions[i].y - starPositions[j].y
            const d = Math.hypot(dx, dy)
            if (d < maxDist) {
              const a = (1 - d / maxDist) * 0.35
              ctx.strokeStyle = `rgba(253, 224, 71, ${a})`
              ctx.beginPath()
              ctx.moveTo(starPositions[i].x, starPositions[i].y)
              ctx.lineTo(starPositions[j].x, starPositions[j].y)
              ctx.stroke()
            }
          }
        }
        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 8. SAKURA BREEZE (Brisa de Florescer — Glowing Wind Ribbons, Corner Blossoms & Notched 3D Petals)
      // ─────────────────────────────────────────────────────────────
      else if (effectId === 'sakura_breeze' || effectId === 'sakura_petals') {
        const minDim = Math.min(w, h)
        ctx.save()

        // Warm Spring Sunset Vignette
        const pinkGrad = ctx.createLinearGradient(0, 0, w, h)
        pinkGrad.addColorStop(0, 'rgba(244, 114, 182, 0.14)')
        pinkGrad.addColorStop(0.5, 'rgba(251, 113, 133, 0.07)')
        pinkGrad.addColorStop(1, 'rgba(253, 224, 71, 0.06)')
        ctx.fillStyle = pinkGrad
        ctx.fillRect(0, 0, w, h)

        // Flowing Translucent Wind Current Ribbons
        for (let wIdx = 0; wIdx < 3; wIdx++) {
          ctx.save()
          ctx.beginPath()
          const yStart = h * (0.22 + wIdx * 0.26)
          for (let x = 0; x <= w; x += 8) {
            const nx = x / w
            const wy =
              yStart +
              nx * (h * 0.18) +
              Math.sin(nx * 5 - t * 2.2 + wIdx * 1.6) * (h * 0.07)
            if (x === 0) ctx.moveTo(x, wy)
            else ctx.lineTo(x, wy)
          }
          const wg = ctx.createLinearGradient(0, 0, w, 0)
          wg.addColorStop(0, 'rgba(251, 207, 232, 0)')
          wg.addColorStop(0.5, wIdx % 2 === 0 ? 'rgba(249, 168, 212, 0.34)' : 'rgba(254, 240, 138, 0.24)')
          wg.addColorStop(1, 'rgba(251, 207, 232, 0)')
          ctx.strokeStyle = wg
          ctx.lineWidth = (2.2 - wIdx * 0.4) * (minDim / 180)
          ctx.lineCap = 'round'
          ctx.stroke()
          ctx.restore()
        }

        // Corner Swaying Sakura Blossoms (Top-Left & Top-Right)
        const sway = Math.sin(t * 1.8) * 0.12
        drawSakuraFlower(w * 0.08, h * 0.14, minDim * 0.085, sway, 0.85)
        drawSakuraFlower(w * 0.15, h * 0.08, minDim * 0.06, -sway + 0.4, 0.72)
        drawSakuraFlower(w * 0.92, h * 0.16, minDim * 0.075, -sway, 0.8)

        // 3D Tumbling Notched Sakura Petals & Golden Spring Pollen
        particles.forEach((p, idx) => {
          p.y += 0.0017 + p.extra2 * 0.0013
          p.x += 0.0014 + Math.sin(t * 2 + p.extra) * 0.0011
          if (p.y > 1.06) {
            p.y = -0.06
            p.x = Math.random()
          }
          if (p.x > 1.06) p.x = -0.06

          const px = p.x * w
          const py = p.y * h

          if (idx % 4 === 0) {
            // Golden floating pollen mote
            const pAlpha = (Math.sin(t * 3.5 + p.extra) * 0.4 + 0.6) * 0.8
            ctx.beginPath()
            ctx.arc(px, py, (1.2 + p.extra2 * 1.4) * (minDim / 180), 0, Math.PI * 2)
            ctx.fillStyle = `rgba(254, 240, 138, ${pAlpha})`
            ctx.fill()
            return
          }

          const sz = (3.2 + p.size * 1.7) * (minDim / 180)
          const angle = t * 1.6 + p.extra
          const flipY = Math.cos(t * 2.6 + p.extra)
          const flipX = Math.sin(t * 1.9 + p.extra3 * 5)

          ctx.save()
          ctx.translate(px, py)
          ctx.rotate(angle)
          ctx.scale(Math.max(0.28, Math.abs(flipX)), Math.max(0.2, Math.abs(flipY)))

          // Authentic Sakura Petal with Cloven V-Notch at Tip
          ctx.beginPath()
          ctx.moveTo(0, sz)
          ctx.bezierCurveTo(-sz * 0.85, sz * 0.45, -sz * 0.95, -sz * 0.65, -sz * 0.25, -sz)
          ctx.lineTo(0, -sz * 0.72) // V-notch
          ctx.lineTo(sz * 0.25, -sz)
          ctx.bezierCurveTo(sz * 0.95, -sz * 0.65, sz * 0.85, sz * 0.45, 0, sz)
          ctx.closePath()

          const petalGrad = ctx.createLinearGradient(0, -sz, 0, sz)
          petalGrad.addColorStop(0, '#ffffff')
          petalGrad.addColorStop(0.45, '#fbcfe8')
          petalGrad.addColorStop(1, '#f43f5e')
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
