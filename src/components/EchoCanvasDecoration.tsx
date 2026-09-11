import { useEffect, useRef } from 'react'

export type CanvasDecorationId =
  | 'soundwave_orb'
  | 'fire_storm'
  | 'prismatic_crown'
  | 'cyber_hud'
  | 'quantum_vortex'
  | 'celestial_halo'
  | 'hex_shield'
  | 'ghostfire'
  | 'neko_cyber'
  | 'heart_harmony'
  | 'butterflies'

interface EchoCanvasDecorationProps {
  decorationId: CanvasDecorationId | string
  className?: string
}

export function EchoCanvasDecoration({ decorationId, className = '' }: EchoCanvasDecorationProps) {
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

    // Pre-allocated Particle Pool
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      size: number
      alpha: number
      rot: number
      rotSpeed: number
      life: number
      maxLife: number
      color: string
      seed: number
    }

    const particles: Particle[] = []
    const PARTICLE_COUNT = 30

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 80,
        y: (Math.random() - 0.5) * 80,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.8 - 0.2,
        size: 1.5 + Math.random() * 2.5,
        alpha: Math.random(),
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        life: Math.random() * 3,
        maxLife: 2 + Math.random() * 3,
        color: '#ffffff',
        seed: Math.random() * 100
      })
    }

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

    // Helper: Draw sparkling 4-point star lens flare
    const drawStar = (c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) => {
      c.save()
      c.translate(x, y)
      c.globalAlpha = alpha
      c.fillStyle = color
      c.beginPath()
      for (let i = 0; i < 4; i++) {
        c.lineTo(Math.cos((i * Math.PI) / 2) * r, Math.sin((i * Math.PI) / 2) * r)
        c.lineTo(Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (r * 0.18), Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (r * 0.18))
      }
      c.closePath()
      c.fill()
      c.restore()
    }

    // Helper: Draw curved feather
    const drawFeather = (
      c: CanvasRenderingContext2D,
      length: number,
      width: number,
      curve: number,
      fillGrad: CanvasGradient | string
    ) => {
      c.save()
      c.beginPath()
      c.moveTo(0, 0)
      c.bezierCurveTo(width * 0.4, -length * 0.3 + curve, width, -length * 0.7 + curve, 0, -length)
      c.bezierCurveTo(-width * 0.7, -length * 0.65 + curve, -width * 0.3, -length * 0.25 + curve, 0, 0)
      c.closePath()
      c.fillStyle = fillGrad
      c.fill()

      c.beginPath()
      c.moveTo(0, 0)
      c.quadraticCurveTo(curve * 0.5, -length * 0.5, 0, -length * 0.95)
      c.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      c.lineWidth = 1
      c.stroke()
      c.restore()
    }

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

      const t = (now - startTime) * 0.001
      const w = canvas.width
      const h = canvas.height

      if (w === 0 || h === 0) {
        animationFrameId = requestAnimationFrame(render)
        return
      }

      ctx.clearRect(0, 0, w, h)

      const cx = w * 0.5
      const cy = h * 0.5
      const avatarR = Math.min(w, h) * 0.33

      // ─────────────────────────────────────────────────────────────
      // 1. SOUNDWAVE ORB (Acoustic Resonance & Harmonic Satellites)
      // ─────────────────────────────────────────────────────────────
      if (decorationId === 'soundwave_orb' || decorationId === 'solar_orbit') {
        ctx.save()

        // Ambient cyan/magenta acoustic bloom behind
        ctx.globalCompositeOperation = 'lighter'
        const ambientGlow = ctx.createRadialGradient(cx, cy, avatarR * 0.8, cx, cy, avatarR * 1.5)
        ambientGlow.addColorStop(0, 'rgba(0, 242, 254, 0.15)')
        ambientGlow.addColorStop(0.6, 'rgba(168, 85, 247, 0.1)')
        ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = ambientGlow
        ctx.beginPath()
        ctx.arc(cx, cy, avatarR * 1.5, 0, Math.PI * 2)
        ctx.fill()

        // Concentric acoustic pulse rings (3 rings)
        for (let ring = 0; ring < 3; ring++) {
          const ringPhase = (t * 0.8 + ring * 0.33) % 1
          const ringR = avatarR * (1.02 + ringPhase * 0.45)
          const ringAlpha = (1 - ringPhase) * 0.8

          ctx.beginPath()
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
          ctx.strokeStyle = ring % 2 === 0 ? `rgba(0, 242, 254, ${ringAlpha})` : `rgba(192, 132, 252, ${ringAlpha})`
          ctx.lineWidth = 2.5 * (1 - ringPhase * 0.5)
          ctx.stroke()
        }

        // Circular Audio Equalizer Frequency Wave Around Circumference
        const numBars = 48
        const waveScale = avatarR * 0.03
        ctx.beginPath()
        for (let i = 0; i < numBars; i++) {
          const angle = (i / numBars) * Math.PI * 2
          const wave1 = Math.sin(angle * 6 + t * 4) * 5
          const wave2 = Math.cos(angle * 3 - t * 2.5) * 4
          const waveH = Math.max(1, (4 + wave1 + wave2) * waveScale)

          const rInner = avatarR * 1.03
          const rOuter = rInner + waveH

          const x1 = cx + Math.cos(angle) * rInner
          const y1 = cy + Math.sin(angle) * rInner
          const x2 = cx + Math.cos(angle) * rOuter
          const y2 = cy + Math.sin(angle) * rOuter

          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
        }
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.85)'
        ctx.lineWidth = Math.max(1.2, avatarR * 0.045)
        ctx.stroke()

        // 4 Harmonic Orbiting Satellites with Motion Blur Tails
        const satelliteCount = 4
        const satR = Math.max(2, avatarR * 0.08)
        for (let s = 0; s < satelliteCount; s++) {
          const baseAngle = (s / satelliteCount) * Math.PI * 2 + t * 1.6
          const orbitR = avatarR * (1.18 + Math.sin(t * 3 + s) * 0.08)

          // Trail
          for (let trail = 4; trail >= 0; trail--) {
            const trailAngle = baseAngle - trail * 0.07
            const tx = cx + Math.cos(trailAngle) * orbitR
            const ty = cy + Math.sin(trailAngle) * orbitR
            const trailAlpha = (1 - trail / 5) * 0.6
            const trailR = Math.max(1, (satR * 0.7 - trail * (satR * 0.1)))

            ctx.beginPath()
            ctx.arc(tx, ty, trailR, 0, Math.PI * 2)
            ctx.fillStyle = s % 2 === 0 ? `rgba(0, 242, 254, ${trailAlpha})` : `rgba(236, 72, 153, ${trailAlpha})`
            ctx.fill()
          }

          // Main satellite orb
          const sx = cx + Math.cos(baseAngle) * orbitR
          const sy = cy + Math.sin(baseAngle) * orbitR
          const satGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, satR)
          satGrad.addColorStop(0, '#ffffff')
          satGrad.addColorStop(0.4, s % 2 === 0 ? '#00f2fe' : '#f472b6')
          satGrad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = satGrad
          ctx.beginPath()
          ctx.arc(sx, sy, satR, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 2. FIRE STORM (Volumetric Plasma Inferno & Curl Embers)
      // ─────────────────────────────────────────────────────────────
      else if (decorationId === 'fire_storm' || decorationId === 'fire_elemental' || decorationId === 'rage_flame') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Ambient core heat halo
        const heatGlow = ctx.createRadialGradient(cx, cy, avatarR * 0.8, cx, cy, avatarR * 1.6)
        heatGlow.addColorStop(0, 'rgba(255, 69, 0, 0.25)')
        heatGlow.addColorStop(0.5, 'rgba(255, 140, 0, 0.15)')
        heatGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = heatGlow
        ctx.beginPath()
        ctx.arc(cx, cy, avatarR * 1.6, 0, Math.PI * 2)
        ctx.fill()

        // 20 Organic Plasma Flame Tongues Licking Around Rim
        const numFlames = 24
        for (let i = 0; i < numFlames; i++) {
          const angle = (i / numFlames) * Math.PI * 2
          const flamePhase = (t * 5 + i * 1.3)
          const flameH = 12 + Math.sin(flamePhase) * 7 + Math.cos(flamePhase * 1.7) * 4
          const tipSway = Math.sin(flamePhase * 1.2) * 4

          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(angle)
          ctx.translate(0, -avatarR)

          ctx.beginPath()
          ctx.moveTo(-4, 0)
          ctx.bezierCurveTo(-6, -flameH * 0.4, -2 + tipSway, -flameH * 0.7, tipSway, -flameH)
          ctx.bezierCurveTo(2 + tipSway, -flameH * 0.7, 6, -flameH * 0.4, 4, 0)
          ctx.closePath()

          const fGrad = ctx.createLinearGradient(0, 0, 0, -flameH)
          fGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
          fGrad.addColorStop(0.25, '#fbbf24')
          fGrad.addColorStop(0.65, '#f97316')
          fGrad.addColorStop(1, 'rgba(239, 68, 68, 0)')
          ctx.fillStyle = fGrad
          ctx.fill()

          ctx.restore()
        }

        // Ascending Volumetric Embers with Air Drag & Turbulent Curl Noise
        particles.forEach((p) => {

          p.life += 0.02
          if (p.life > p.maxLife) {
            p.life = 0
            const spawnAngle = Math.random() * Math.PI * 2
            p.x = cx + Math.cos(spawnAngle) * (avatarR * (0.95 + Math.random() * 0.2))
            p.y = cy + Math.sin(spawnAngle) * (avatarR * (0.95 + Math.random() * 0.2))
            p.vy = -Math.random() * 1.5 - 0.5
            p.vx = (Math.random() - 0.5) * 1.2
            p.size = 1.5 + Math.random() * 2.5
          }

          // Curl turbulence
          p.x += p.vx + Math.sin(p.life * 4 + p.seed) * 0.8
          p.y += p.vy
          p.vy *= 0.98 // Air drag

          const progress = p.life / p.maxLife
          const emberAlpha = Math.sin(progress * Math.PI) * 0.9

          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2)
          if (progress < 0.3) {
            ctx.fillStyle = `rgba(255, 255, 255, ${emberAlpha})`
          } else if (progress < 0.7) {
            ctx.fillStyle = `rgba(251, 191, 36, ${emberAlpha})`
          } else {
            ctx.fillStyle = `rgba(239, 68, 68, ${emberAlpha})`
          }
          ctx.fill()
        })

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 3. PRISMATIC CROWN (Floating Royal Crystal Geometry & Stardust)
      // ─────────────────────────────────────────────────────────────
      else if (decorationId === 'prismatic_crown' || decorationId === 'royal_crown') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        const crownY = cy - avatarR * 1.05 + Math.sin(t * 2) * (avatarR * 0.03)

        // Ambient Gold & Amethyst Radiance
        const crownGlow = ctx.createRadialGradient(cx, crownY, avatarR * 0.15, cx, crownY, avatarR * 0.75)
        crownGlow.addColorStop(0, 'rgba(251, 191, 36, 0.4)')
        crownGlow.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)')
        crownGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = crownGlow
        ctx.beginPath()
        ctx.arc(cx, crownY, avatarR * 0.75, 0, Math.PI * 2)
        ctx.fill()

        // Crown Base Band
        ctx.save()
        ctx.translate(cx, crownY)
        ctx.beginPath()
        ctx.ellipse(0, avatarR * 0.06, avatarR * 0.48, avatarR * 0.12, 0, 0, Math.PI * 2)
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = Math.max(1.4, avatarR * 0.045)
        ctx.stroke()

        // 5 Faceted Crown Spires with Prismatic Gradients
        const spires = [-0.36, -0.18, 0, 0.18, 0.36].map(x => x * avatarR)
        const heights = [0.26, 0.38, 0.52, 0.38, 0.26].map(h => h * avatarR)
        const spireHalfW = Math.max(1.5, avatarR * 0.06)

        for (let i = 0; i < spires.length; i++) {
          const sx = spires[i]
          const sh = heights[i]
          const isCenter = i === 2

          // Prismatic crystal spire
          ctx.beginPath()
          ctx.moveTo(sx - spireHalfW, avatarR * 0.05)
          ctx.lineTo(sx, -sh)
          ctx.lineTo(sx + spireHalfW, avatarR * 0.05)
          ctx.closePath()

          const spireGrad = ctx.createLinearGradient(sx - spireHalfW, 0, sx + spireHalfW, -sh)
          if (isCenter) {
            spireGrad.addColorStop(0, '#f59e0b')
            spireGrad.addColorStop(0.5, '#ffffff')
            spireGrad.addColorStop(1, '#67e8f9')
          } else {
            spireGrad.addColorStop(0, '#d97706')
            spireGrad.addColorStop(0.6, '#fbbf24')
            spireGrad.addColorStop(1, '#f472b6')
          }
          ctx.fillStyle = spireGrad
          ctx.fill()

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'
          ctx.lineWidth = Math.max(0.8, avatarR * 0.02)
          ctx.stroke()

          // Diamond glints at tips
          const glintPulse = Math.sin(t * 4 + i * 1.5) * 0.5 + 0.5
          drawStar(ctx, sx, -sh, Math.max(2, avatarR * 0.08 * glintPulse), '#ffffff', 0.9)
        }

        ctx.restore()

        // Floating Diamond Stardust Motes
        particles.slice(0, 18).forEach((p, idx) => {
          p.life += 0.015
          if (p.life > p.maxLife) {
            p.life = 0
            p.x = cx + (Math.random() - 0.5) * 50
            p.y = crownY + Math.random() * 20 - 10
            p.vy = Math.random() * 0.4 + 0.1
            p.vx = (Math.random() - 0.5) * 0.3
          }

          p.x += p.vx + Math.sin(t * 2 + idx) * 0.2
          p.y += p.vy

          const pAlpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.85
          drawStar(ctx, p.x, p.y, p.size, idx % 2 === 0 ? '#fbbf24' : '#67e8f9', pAlpha)
        })

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 4. CYBER HUD (Holographic Tactical Targeting & Data Telemetry)
      // ─────────────────────────────────────────────────────────────
      else if (decorationId === 'cyber_hud' || decorationId === 'cybernetic' || decorationId === 'cyber_tactical' || decorationId === 'cyber_glow') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Ambient Cyan HUD Bloom
        const hudBloom = ctx.createRadialGradient(cx, cy, avatarR * 0.85, cx, cy, avatarR * 1.4)
        hudBloom.addColorStop(0, 'rgba(6, 182, 212, 0.12)')
        hudBloom.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = hudBloom
        ctx.beginPath()
        ctx.arc(cx, cy, avatarR * 1.4, 0, Math.PI * 2)
        ctx.fill()

        // Inner Reticle Ring with 36 Tick Marks (Clockwise rotation)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(t * 0.4)

        const r1Base = avatarR * 1.05
        const r1Tick = avatarR * 0.08
        const r2Ring = avatarR * 1.18
        const sweepR = avatarR * 1.25

        ctx.beginPath()
        ctx.arc(0, 0, r1Base, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.5)'
        ctx.lineWidth = Math.max(1, avatarR * 0.03)
        ctx.stroke()

        for (let i = 0; i < 36; i++) {
          const tickAngle = (i / 36) * Math.PI * 2
          const isMajor = i % 9 === 0
          const r1 = r1Base
          const r2 = r1Base + (isMajor ? r1Tick : r1Tick * 0.5)

          ctx.beginPath()
          ctx.moveTo(Math.cos(tickAngle) * r1, Math.sin(tickAngle) * r1)
          ctx.lineTo(Math.cos(tickAngle) * r2, Math.sin(tickAngle) * r2)
          ctx.strokeStyle = isMajor ? '#22d3ee' : 'rgba(6, 182, 212, 0.6)'
          ctx.lineWidth = isMajor ? Math.max(1.2, avatarR * 0.04) : Math.max(0.8, avatarR * 0.02)
          ctx.stroke()
        }
        ctx.restore()

        // Outer Segmented Targeting Ring (Counter-Clockwise rotation)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(-t * 0.25)

        const segments = 4
        for (let s = 0; s < segments; s++) {
          const segStart = (s / segments) * Math.PI * 2 + 0.15
          const segEnd = ((s + 1) / segments) * Math.PI * 2 - 0.15

          ctx.beginPath()
          ctx.arc(0, 0, r2Ring, segStart, segEnd)
          ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)'
          ctx.lineWidth = Math.max(1.5, avatarR * 0.05)
          ctx.stroke()

          // Lock Nodes at Segment Corners
          const nodeX = Math.cos(segStart) * r2Ring
          const nodeY = Math.sin(segStart) * r2Ring
          ctx.fillStyle = '#ffffff'
          ctx.beginPath()
          ctx.arc(nodeX, nodeY, Math.max(1.5, avatarR * 0.05), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()

        // 360° Laser Radar Sweep Arm
        ctx.save()
        ctx.translate(cx, cy)
        const sweepAngle = t * 2.5
        const sweepGrad = ctx.createRadialGradient(0, 0, avatarR, 0, 0, sweepR)
        sweepGrad.addColorStop(0, 'rgba(6, 182, 212, 0.6)')
        sweepGrad.addColorStop(1, 'rgba(6, 182, 212, 0)')

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, sweepR, sweepAngle - 0.4, sweepAngle)
        ctx.closePath()
        ctx.fillStyle = sweepGrad
        ctx.fill()

        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(sweepAngle) * sweepR, Math.sin(sweepAngle) * sweepR)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = Math.max(1, avatarR * 0.03)
        ctx.stroke()
        ctx.restore()

        // 4 Corner Telemetry Lock Brackets
        const bracketDist = avatarR * 1.22
        const bracketOffsets = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1]
        ]
        const bracketSize = avatarR * 0.14

        bracketOffsets.forEach(([dx, dy]) => {
          const bx = cx + dx * bracketDist
          const by = cy + dy * bracketDist
          ctx.beginPath()
          ctx.moveTo(bx, by + dy * -bracketSize)
          ctx.lineTo(bx, by)
          ctx.lineTo(bx + dx * -bracketSize, by)
          ctx.strokeStyle = '#22d3ee'
          ctx.lineWidth = Math.max(1.2, avatarR * 0.04)
          ctx.stroke()
        })

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 5. QUANTUM VORTEX (Gravitational Singularity & Accretion Dust)
      // ─────────────────────────────────────────────────────────────
      else if (decorationId === 'quantum_vortex' || decorationId === 'ki_energy' || decorationId === 'radiating_energy') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Cosmic Nebula Swirl Arms (3 Spiral Arms)
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(t * 0.6)

        const arms = 3
        for (let a = 0; a < arms; a++) {
          const armAngle = (a / arms) * Math.PI * 2
          ctx.beginPath()
          for (let r = avatarR * 0.95; r < avatarR * 1.55; r += 2) {
            const theta = armAngle + (r - avatarR) * 0.08
            const x = Math.cos(theta) * r
            const y = Math.sin(theta) * r
            if (r === avatarR * 0.95) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          const armGrad = ctx.createLinearGradient(-avatarR, 0, avatarR, 0)
          armGrad.addColorStop(0, 'rgba(168, 85, 247, 0.8)')
          armGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.6)')
          armGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
          ctx.strokeStyle = armGrad
          ctx.lineWidth = 4
          ctx.stroke()
        }
        ctx.restore()

        // Event Horizon Photon Sphere Ring
        ctx.beginPath()
        ctx.arc(cx, cy, avatarR + 3, 0, Math.PI * 2)
        ctx.strokeStyle = '#c084fc'
        ctx.lineWidth = 3
        ctx.stroke()

        // Accretion Relativistic Stardust Particles
        particles.forEach((p, idx) => {
          p.seed += 0.03
          const pAngle = p.seed + idx * 0.4
          const dist = avatarR * (1.05 + ((idx * 7 + t * 20) % 40) * 0.012)
          const px = cx + Math.cos(pAngle) * dist
          const py = cy + Math.sin(pAngle) * dist

          // Velocity stretch trail
          const trailLength = 6
          const pTrailX = px - Math.sin(pAngle) * trailLength
          const pTrailY = py + Math.cos(pAngle) * trailLength

          ctx.beginPath()
          ctx.moveTo(px, py)
          ctx.lineTo(pTrailX, pTrailY)
          ctx.strokeStyle = idx % 2 === 0 ? 'rgba(216, 180, 254, 0.8)' : 'rgba(244, 114, 182, 0.8)'
          ctx.lineWidth = 1.8
          ctx.stroke()

          ctx.beginPath()
          ctx.arc(px, py, 1.5, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
        })

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 6. CELESTIAL HALO & WINGS (Divine Feather Wings & Halo)
      // ─────────────────────────────────────────────────────────────
      else if (decorationId === 'celestial_halo' || decorationId === 'angelic_wings' || decorationId === 'fairy_sprites') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        const haloY = cy - avatarR * 1.06 + Math.sin(t * 2) * (avatarR * 0.03)
        const haloRadiusX = avatarR * 0.44
        const haloRadiusY = avatarR * 0.13

        // Floating Divine Halo
        ctx.save()
        ctx.translate(cx, haloY)
        ctx.beginPath()
        ctx.ellipse(0, 0, haloRadiusX, haloRadiusY, 0, 0, Math.PI * 2)
        const haloGrad = ctx.createLinearGradient(-haloRadiusX, 0, haloRadiusX, 0)
        haloGrad.addColorStop(0, '#fde047')
        haloGrad.addColorStop(0.5, '#ffffff')
        haloGrad.addColorStop(1, '#f59e0b')
        ctx.strokeStyle = haloGrad
        ctx.lineWidth = Math.max(1.4, avatarR * 0.055)
        ctx.stroke()

        // Halo Radiance Bloom
        ctx.beginPath()
        ctx.ellipse(0, 0, haloRadiusX * 1.15, haloRadiusY * 1.45, 0, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(253, 224, 71, 0.4)'
        ctx.lineWidth = Math.max(2, avatarR * 0.07)
        ctx.stroke()
        ctx.restore()

        // Left & Right Celestial Wings (Gracefully arching outward around upper sides)
        const wingFlap = Math.sin(t * 2.2) * 0.05
        const drawWing = (isRight: boolean) => {
          ctx.save()
          ctx.translate(cx + (isRight ? avatarR * 0.78 : -avatarR * 0.78), cy - avatarR * 0.15 + Math.sin(t * 2) * (avatarR * 0.02))
          ctx.scale(isRight ? -1 : 1, 1)
          ctx.rotate(0.32 + wingFlap)

          const wingScale = avatarR * 0.012
          const feathers = [
            { l: 24 * wingScale, w: 7 * wingScale, c: 3 * wingScale, rot: 0.1 },
            { l: 30 * wingScale, w: 8 * wingScale, c: 5 * wingScale, rot: 0.28 },
            { l: 35 * wingScale, w: 9 * wingScale, c: 6 * wingScale, rot: 0.46 },
            { l: 28 * wingScale, w: 8 * wingScale, c: 5 * wingScale, rot: 0.64 },
            { l: 20 * wingScale, w: 6 * wingScale, c: 4 * wingScale, rot: 0.82 }
          ]

          feathers.forEach(f => {
            ctx.save()
            ctx.rotate(f.rot)
            const fGrad = ctx.createLinearGradient(0, 0, f.w, -f.l)
            fGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)')
            fGrad.addColorStop(0.6, 'rgba(251, 191, 36, 0.65)')
            fGrad.addColorStop(1, 'rgba(255, 255, 255, 0.2)')
            drawFeather(ctx, f.l, f.w, f.c, fGrad)
            ctx.restore()
          })

          ctx.restore()
        }

        drawWing(false)
        drawWing(true)

        // Floating Sacred Golden Particles
        particles.slice(0, 16).forEach((p) => {
          p.life += 0.02
          if (p.life > p.maxLife) {
            p.life = 0
            p.x = cx + (Math.random() - 0.5) * (avatarR * 1.6)
            p.y = cy - avatarR + Math.random() * (avatarR * 1.2)
            p.vy = -Math.random() * 0.6 - 0.2
            p.vx = (Math.random() - 0.5) * 0.3
          }

          p.x += p.vx
          p.y += p.vy

          const pAlpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.8
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(1, avatarR * 0.035), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(254, 240, 138, ${pAlpha})`
          ctx.fill()
        })

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 7. HEX SHIELD (Sci-Fi Honeycomb Energy Barrier & Sparks)
      // ─────────────────────────────────────────────────────────────
      else if (decorationId === 'hex_shield') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Ambient Mint Glow
        const hexBloom = ctx.createRadialGradient(cx, cy, avatarR * 0.85, cx, cy, avatarR * 1.45)
        hexBloom.addColorStop(0, 'rgba(52, 211, 153, 0.15)')
        hexBloom.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = hexBloom
        ctx.beginPath()
        ctx.arc(cx, cy, avatarR * 1.45, 0, Math.PI * 2)
        ctx.fill()

        // Interlocking Hexagons Ring around circumference (Sacred Geometry: 12-fold symmetry)
        const hexCount = 12
        const ringDist = avatarR * 1.16
        const hexR = ringDist * Math.sin(Math.PI / hexCount) * 0.94
        const strokeW = Math.max(1, avatarR * 0.04)

        const drawSingleHex = (hx: number, hy: number, scale: number, alpha: number) => {
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const hAngle = (i / 6) * Math.PI * 2 + Math.PI / 6
            const px = hx + Math.cos(hAngle) * (hexR * scale)
            const py = hy + Math.sin(hAngle) * (hexR * scale)
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.strokeStyle = `rgba(52, 211, 153, ${alpha})`
          ctx.lineWidth = strokeW
          ctx.stroke()
          ctx.fillStyle = `rgba(16, 185, 129, ${alpha * 0.25})`
          ctx.fill()
        }

        // Energy wave ripple cycle
        const wavePhase = (t * 2) % (Math.PI * 2)

        for (let i = 0; i < hexCount; i++) {
          const angle = (i / hexCount) * Math.PI * 2
          const hx = cx + Math.cos(angle) * ringDist
          const hy = cy + Math.sin(angle) * ringDist

          const hexPulse = Math.sin(angle * 2 - wavePhase) * 0.3 + 0.7
          drawSingleHex(hx, hy, 1, hexPulse)

          // Vertex nodes
          ctx.beginPath()
          ctx.arc(hx, hy, Math.max(1.2, avatarR * 0.04), 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
        }

        // Electric micro-lightning arcs between random nodes
        if (Math.sin(t * 8) > 0.4) {
          const randHex1 = Math.floor(Math.random() * hexCount)
          const randHex2 = (randHex1 + 1) % hexCount
          const a1 = (randHex1 / hexCount) * Math.PI * 2
          const a2 = (randHex2 / hexCount) * Math.PI * 2
          const x1 = cx + Math.cos(a1) * ringDist
          const y1 = cy + Math.sin(a1) * ringDist
          const x2 = cx + Math.cos(a2) * ringDist
          const y2 = cy + Math.sin(a2) * ringDist
          const midX = (x1 + x2) * 0.5 + (Math.random() - 0.5) * (avatarR * 0.12)
          const midY = (y1 + y2) * 0.5 + (Math.random() - 0.5) * (avatarR * 0.12)

          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(midX, midY)
          ctx.lineTo(x2, y2)
          ctx.strokeStyle = '#a7f3d0'
          ctx.lineWidth = Math.max(0.8, avatarR * 0.025)
          ctx.stroke()
        }

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 8. GHOSTFIRE (Ethereal Spectral Flame & Soul Wisps)
      // ─────────────────────────────────────────────────────────────
      else if (
        decorationId === 'ghostfire' ||
        decorationId === 'sakura_warrior' ||
        decorationId === 'flaming_sword' ||
        decorationId === 'glowing_rune' ||
        decorationId === 'malefic_crown' ||
        decorationId === 'fallen_angel_wings'
      ) {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Eerie Spectral Violet/Mint Bloom
        const wispGlow = ctx.createRadialGradient(cx, cy, avatarR * 0.8, cx, cy, avatarR * 1.6)
        wispGlow.addColorStop(0, 'rgba(192, 132, 252, 0.25)')
        wispGlow.addColorStop(0.5, 'rgba(52, 211, 153, 0.15)')
        wispGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = wispGlow
        ctx.beginPath()
        ctx.arc(cx, cy, avatarR * 1.6, 0, Math.PI * 2)
        ctx.fill()

        // 18 Ethereal Ghost Wisps Curving Organically
        const numWisps = 18
        for (let i = 0; i < numWisps; i++) {
          const angle = (i / numWisps) * Math.PI * 2
          const wispPhase = t * 3.5 + i * 1.2
          const wispH = 14 + Math.sin(wispPhase) * 8 + Math.cos(wispPhase * 1.5) * 4
          const tipSway = Math.sin(wispPhase * 1.4) * 5

          ctx.save()
          ctx.translate(cx, cy)
          ctx.rotate(angle)
          ctx.translate(0, -avatarR)

          ctx.beginPath()
          ctx.moveTo(-3, 0)
          ctx.bezierCurveTo(-5, -wispH * 0.4, -2 + tipSway, -wispH * 0.7, tipSway, -wispH)
          ctx.bezierCurveTo(2 + tipSway, -wispH * 0.7, 5, -wispH * 0.4, 3, 0)
          ctx.closePath()

          const wGrad = ctx.createLinearGradient(0, 0, 0, -wispH)
          wGrad.addColorStop(0, '#ffffff')
          wGrad.addColorStop(0.4, '#c084fc')
          wGrad.addColorStop(0.8, '#34d399')
          wGrad.addColorStop(1, 'rgba(52, 211, 153, 0)')
          ctx.fillStyle = wGrad
          ctx.fill()

          ctx.restore()
        }

        // Ascending Soul Sparkles
        particles.forEach((p, idx) => {
          p.life += 0.02
          if (p.life > p.maxLife) {
            p.life = 0
            const a = Math.random() * Math.PI * 2
            p.x = cx + Math.cos(a) * (avatarR * (0.95 + Math.random() * 0.2))
            p.y = cy + Math.sin(a) * (avatarR * (0.95 + Math.random() * 0.2))
            p.vy = -Math.random() * 1.2 - 0.4
            p.vx = (Math.random() - 0.5) * 0.8
          }

          p.x += p.vx + Math.sin(p.life * 3 + p.seed) * 0.6
          p.y += p.vy

          const pAlpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.85
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fillStyle = idx % 2 === 0 ? `rgba(192, 132, 252, ${pAlpha})` : `rgba(52, 211, 153, ${pAlpha})`
          ctx.fill()
        })

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 9. NEKO CYBER (Holographic Cat Ears & Frequency Pulses)
      // ─────────────────────────────────────────────────────────────
      else if (decorationId === 'neko_cyber' || decorationId === 'cat_ears') {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // Playful spring twitch every 4 seconds
        const twitchCycle = (t * 0.25) % 1
        const isTwitching = twitchCycle > 0.88
        const twitchAngle = isTwitching ? Math.sin(t * 30) * 0.07 : 0

        // Exact anchor on the avatar skull perimeter
        const earOffsetX = avatarR * 0.44
        // At x = ±0.44 * avatarR, circle top rim is at: y = cy - avatarR * sqrt(1 - 0.44^2) ≈ cy - 0.898 * avatarR
        const earBaseY = cy - avatarR * 0.88
        const earW = avatarR * 0.32
        const earH = avatarR * 0.42

        const drawEar = (isRight: boolean) => {
          ctx.save()
          ctx.translate(cx + (isRight ? earOffsetX : -earOffsetX), earBaseY)
          ctx.scale(isRight ? -1 : 1, 1)
          ctx.rotate(0.20 + (isRight ? -twitchAngle : twitchAngle))

          // Outer Neon Wireframe Ear
          ctx.beginPath()
          ctx.moveTo(-earW * 0.48, earW * 0.06)
          ctx.bezierCurveTo(-earW * 0.52, -earH * 0.45, -earW * 0.22, -earH * 0.88, 0, -earH)
          ctx.bezierCurveTo(earW * 0.25, -earH * 0.80, earW * 0.48, -earH * 0.35, earW * 0.46, earW * 0.06)
          ctx.closePath()

          const earGrad = ctx.createLinearGradient(0, earW * 0.06, 0, -earH)
          earGrad.addColorStop(0, 'rgba(244, 114, 182, 0.35)')
          earGrad.addColorStop(0.7, '#f472b6')
          earGrad.addColorStop(1, '#ffffff')
          ctx.strokeStyle = earGrad
          ctx.lineWidth = Math.max(1.4, avatarR * 0.05)
          ctx.stroke()
          ctx.fillStyle = 'rgba(244, 114, 182, 0.16)'
          ctx.fill()

          // Inner Acoustic Wave Lines Traveling Upward
          for (let line = 0; line < 3; line++) {
            const prog = (line + 1) / 4
            const waveY = -earH * prog + ((t * earH * 0.35) % (earH * 0.22))
            const wRatio = Math.max(0.2, 1 - prog)
            ctx.beginPath()
            ctx.moveTo(-earW * 0.32 * wRatio, waveY)
            ctx.lineTo(earW * 0.28 * wRatio, waveY)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
            ctx.lineWidth = Math.max(1, avatarR * 0.025)
            ctx.stroke()
          }

          // Tip Sparkle Lens Flare
          drawStar(ctx, 0, -earH, Math.max(2, avatarR * 0.08 + Math.sin(t * 6) * (avatarR * 0.02)), '#ffffff', 0.9)

          ctx.restore()
        }

        drawEar(false)
        drawEar(true)

        // Floating Pink & Cyan Micro-Particles
        particles.slice(0, 14).forEach((p, idx) => {
          p.life += 0.02
          if (p.life > p.maxLife) {
            p.life = 0
            p.x = cx + (Math.random() - 0.5) * (avatarR * 1.4)
            p.y = earBaseY - avatarR * 0.15 + Math.random() * (avatarR * 0.3)
            p.vy = -Math.random() * 0.6 - 0.2
            p.vx = (Math.random() - 0.5) * 0.4
          }

          p.x += p.vx
          p.y += p.vy

          const pAlpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.8
          ctx.beginPath()
          ctx.arc(p.x, p.y, Math.max(1, avatarR * 0.035), 0, Math.PI * 2)
          ctx.fillStyle = idx % 2 === 0 ? `rgba(244, 114, 182, ${pAlpha})` : `rgba(34, 211, 238, ${pAlpha})`
          ctx.fill()
        })

        ctx.restore()
      }

      // ─────────────────────────────────────────────────────────────
      // 10. HEART HARMONY / CRYSTAL BUTTERFLIES (Flapping Wings & Dust)
      // ─────────────────────────────────────────────────────────────
      else {
        ctx.save()
        ctx.globalCompositeOperation = 'lighter'

        // 3 Crystal Butterflies Orbiting Avatar with 3D Wing Flap
        const butterflyCount = 3
        for (let b = 0; b < butterflyCount; b++) {
          const bOrbit = (b / butterflyCount) * Math.PI * 2 + t * 0.9
          const bDist = avatarR * (1.15 + Math.sin(t * 2 + b) * 0.1)
          const bx = cx + Math.cos(bOrbit) * bDist
          const by = cy + Math.sin(bOrbit) * bDist

          const flap = Math.cos(t * 12 + b * 2) // 3D Perspective Wing Flap

          ctx.save()
          ctx.translate(bx, by)
          ctx.rotate(bOrbit + Math.PI / 2)

          // Left Wing
          ctx.save()
          ctx.scale(flap, 1)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.bezierCurveTo(-14, -12, -18, 4, 0, 8)
          ctx.closePath()
          const wingGradL = ctx.createLinearGradient(0, 0, -18, 0)
          wingGradL.addColorStop(0, '#ffffff')
          wingGradL.addColorStop(0.5, b === 1 ? '#34d399' : '#38bdf8')
          wingGradL.addColorStop(1, '#a855f7')
          ctx.fillStyle = wingGradL
          ctx.fill()
          ctx.restore()

          // Right Wing
          ctx.save()
          ctx.scale(-flap, 1)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.bezierCurveTo(-14, -12, -18, 4, 0, 8)
          ctx.closePath()
          const wingGradR = ctx.createLinearGradient(0, 0, -18, 0)
          wingGradR.addColorStop(0, '#ffffff')
          wingGradR.addColorStop(0.5, b === 1 ? '#34d399' : '#38bdf8')
          wingGradR.addColorStop(1, '#a855f7')
          ctx.fillStyle = wingGradR
          ctx.fill()
          ctx.restore()

          // Center Glint Body
          ctx.beginPath()
          ctx.arc(0, 2, 2, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()

          ctx.restore()
        }

        // Floating Musical Sparkles & Heart Harmony
        particles.slice(0, 20).forEach((p, idx) => {
          p.life += 0.02
          if (p.life > p.maxLife) {
            p.life = 0
            const a = Math.random() * Math.PI * 2
            p.x = cx + Math.cos(a) * (avatarR * 1.1)
            p.y = cy + Math.sin(a) * (avatarR * 1.1)
            p.vy = -Math.random() * 0.5 - 0.2
            p.vx = (Math.random() - 0.5) * 0.5
          }

          p.x += p.vx + Math.sin(t * 3 + idx) * 0.4
          p.y += p.vy

          const pAlpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.8
          drawStar(ctx, p.x, p.y, p.size, idx % 2 === 0 ? '#38bdf8' : '#f472b6', pAlpha)
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
  }, [decorationId])

  return (
    <canvas
      ref={canvasRef}
      className={`echo-canvas-decoration ${className}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        display: 'block'
      }}
      aria-hidden="true"
    />
  )
}
