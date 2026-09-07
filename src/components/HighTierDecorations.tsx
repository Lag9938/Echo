import React from 'react'

interface DecorationProps {
  className?: string
  style?: React.CSSProperties
}

/* ─────────────────────────────────────────────────────────────────────────────
   1. ORBE DE RESSONÂNCIA (Soundwave HUD / Sonic Resonance)
   ───────────────────────────────────────────────────────────────────────────── */
export function SoundwaveOrbDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-soundwave-orb ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="swo-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="50%" stopColor="#4facfe" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        <linearGradient id="swo-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <filter id="swo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer Rotating Calibrated Gauge */}
      <g className="echo-anim-spin-slow">
        <circle
          cx="60"
          cy="60"
          r="54"
          stroke="url(#swo-grad-1)"
          strokeWidth="1.6"
          strokeDasharray="4 8 16 6"
          strokeLinecap="round"
          opacity="0.85"
          filter="url(#swo-glow)"
        />
        {/* Ticks */}
        <line x1="60" y1="3" x2="60" y2="8" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" />
        <line x1="60" y1="112" x2="60" y2="117" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
        <line x1="3" y1="60" x2="8" y2="60" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" />
        <line x1="112" y1="60" x2="117" y2="60" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Middle Counter-Rotating Frequency Ring */}
      <g className="echo-anim-spin-reverse">
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="url(#swo-grad-2)"
          strokeWidth="2"
          strokeDasharray="28 14 8 14"
          strokeLinecap="round"
          filter="url(#swo-glow)"
        />
        {/* Orbiting Satellites */}
        <circle cx="60" cy="10" r="3" fill="#00f2fe" filter="url(#swo-glow)" />
        <circle cx="110" cy="60" r="2.5" fill="#f43f5e" filter="url(#swo-glow)" />
        <circle cx="60" cy="110" r="3" fill="#38bdf8" filter="url(#swo-glow)" />
        <circle cx="10" cy="60" r="2.5" fill="#a855f7" filter="url(#swo-glow)" />
      </g>

      {/* Acoustic Sinusoidal Wave Ribbons */}
      <g className="echo-anim-pulse-subtle">
        <circle
          cx="60"
          cy="60"
          r="47"
          stroke="#00f2fe"
          strokeWidth="1"
          strokeDasharray="2 6"
          opacity="0.6"
        />
        <circle
          cx="60"
          cy="60"
          r="44"
          stroke="#f43f5e"
          strokeWidth="0.8"
          strokeDasharray="1 5"
          opacity="0.5"
        />
      </g>

      {/* Orbiting Sonic Ring Pulse */}
      <circle
        cx="60"
        cy="60"
        r="49"
        stroke="#ffffff"
        strokeWidth="1.2"
        strokeDasharray="6 30"
        className="echo-anim-spin-fast"
        opacity="0.9"
        filter="url(#swo-glow)"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. LABAREDAS DE PLASMA (Solar Flare / Phoenix Fire)
   ───────────────────────────────────────────────────────────────────────────── */
export function FireStormDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-fire-storm ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fire-grad-core" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="40%" stopColor="#ea580c" />
          <stop offset="80%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#fef08a" />
        </linearGradient>
        <linearGradient id="fire-grad-ember" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="60%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fde047" />
        </linearGradient>
        <filter id="fire-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Heat Haze Ambient Ring */}
      <circle
        cx="60"
        cy="60"
        r="49"
        stroke="url(#fire-grad-core)"
        strokeWidth="3.5"
        strokeDasharray="30 8 15 12"
        strokeLinecap="round"
        className="echo-anim-flame-base"
        filter="url(#fire-glow)"
        opacity="0.9"
      />

      {/* Licking Flame Tongue - Top Left */}
      <path
        d="M 38 25 C 34 16 46 8 47 4 C 48 10 52 16 50 24 C 48 18 42 14 38 25 Z"
        fill="url(#fire-grad-core)"
        className="echo-anim-flame-tongue-1"
        filter="url(#fire-glow)"
      />

      {/* Main Apex Flame - Top Center */}
      <path
        d="M 52 20 C 49 11 58 5 60 1 C 63 7 70 12 67 21 C 64 15 58 13 52 20 Z"
        fill="url(#fire-grad-core)"
        className="echo-anim-flame-tongue-2"
        filter="url(#fire-glow)"
      />

      {/* Licking Flame Tongue - Top Right */}
      <path
        d="M 68 23 C 71 14 81 10 83 5 C 83 12 80 18 76 25 C 77 18 73 16 68 23 Z"
        fill="url(#fire-grad-core)"
        className="echo-anim-flame-tongue-3"
        filter="url(#fire-glow)"
      />

      {/* Lateral Flame Wings - Left & Right */}
      <path
        d="M 18 48 C 10 44 8 36 3 35 C 7 42 12 48 19 56 C 14 50 12 42 18 48 Z"
        fill="url(#fire-grad-ember)"
        className="echo-anim-flame-wing-l"
        filter="url(#fire-glow)"
      />
      <path
        d="M 102 48 C 110 44 112 36 117 35 C 113 42 108 48 101 56 C 106 50 108 42 102 48 Z"
        fill="url(#fire-grad-ember)"
        className="echo-anim-flame-wing-r"
        filter="url(#fire-glow)"
      />

      {/* Ascending Fire Embers */}
      <g className="echo-anim-embers">
        <circle cx="58" cy="8" r="1.8" fill="#fef08a" filter="url(#fire-glow)" />
        <circle cx="42" cy="12" r="1.5" fill="#fde047" filter="url(#fire-glow)" />
        <circle cx="75" cy="10" r="1.6" fill="#fde047" filter="url(#fire-glow)" />
        <circle cx="28" cy="24" r="1.4" fill="#fb923c" filter="url(#fire-glow)" />
        <circle cx="92" cy="22" r="1.4" fill="#fb923c" filter="url(#fire-glow)" />
      </g>

      {/* Thermal Corona Ring */}
      <circle
        cx="60"
        cy="60"
        r="46"
        stroke="#ffedd5"
        strokeWidth="1.2"
        strokeDasharray="4 24"
        strokeLinecap="round"
        className="echo-anim-spin-fast"
        opacity="0.8"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. VISOR TÁTICO NEON (Cyberpunk Tactical HUD)
   ───────────────────────────────────────────────────────────────────────────── */
export function CyberHudDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-cyber-hud ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hud-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <filter id="hud-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 4 Outer Tactical Corner Brackets */}
      <g stroke="#00f2fe" strokeWidth="2.2" strokeLinecap="square" filter="url(#hud-glow)">
        {/* Top Left */}
        <path d="M 16 30 L 16 16 L 30 16" />
        {/* Top Right */}
        <path d="M 104 30 L 104 16 L 90 16" />
        {/* Bottom Left */}
        <path d="M 16 90 L 16 104 L 30 104" />
        {/* Bottom Right */}
        <path d="M 104 90 L 104 104 L 90 104" />
      </g>

      {/* Rotating Dial Scale */}
      <g className="echo-anim-spin-slow">
        <circle
          cx="60"
          cy="60"
          r="52"
          stroke="url(#hud-cyan)"
          strokeWidth="1.8"
          strokeDasharray="22 14 6 14"
          strokeLinecap="round"
          filter="url(#hud-glow)"
        />
        {/* Target Reticles */}
        <circle cx="60" cy="8" r="2.5" fill="#f43f5e" filter="url(#hud-glow)" />
        <circle cx="60" cy="112" r="2.5" fill="#f43f5e" filter="url(#hud-glow)" />
      </g>

      {/* Inner Counter-Rotating Telemetry Ring */}
      <g className="echo-anim-spin-reverse">
        <circle
          cx="60"
          cy="60"
          r="48"
          stroke="#00f2fe"
          strokeWidth="1"
          strokeDasharray="2 8 18 8"
          opacity="0.8"
        />
        {/* Degree notches */}
        <line x1="12" y1="60" x2="20" y2="60" stroke="#00f2fe" strokeWidth="1.5" />
        <line x1="100" y1="60" x2="108" y2="60" stroke="#00f2fe" strokeWidth="1.5" />
      </g>

      {/* Sweeping Radar Scanner Arc */}
      <g className="echo-anim-spin-fast">
        <path
          d="M 60 60 L 60 10 A 50 50 0 0 1 95 25 Z"
          fill="url(#hud-cyan)"
          opacity="0.16"
        />
        <line x1="60" y1="60" x2="60" y2="10" stroke="#ffffff" strokeWidth="1.6" opacity="0.9" filter="url(#hud-glow)" />
      </g>

      {/* Sci-Fi Target Crosshair Ticks */}
      <g stroke="#ffffff" strokeWidth="1.2" opacity="0.85">
        <line x1="60" y1="12" x2="60" y2="18" />
        <line x1="60" y1="102" x2="60" y2="108" />
        <line x1="12" y1="60" x2="18" y2="60" />
        <line x1="102" y1="60" x2="108" y2="60" />
      </g>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. VÓRTICE QUÂNTICO (Quantum Singularity / Cosmic Accretion)
   ───────────────────────────────────────────────────────────────────────────── */
export function QuantumVortexDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-quantum-vortex ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="vortex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="40%" stopColor="#7928ca" />
          <stop offset="80%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#f43f5e" />
        </linearGradient>
        <filter id="vortex-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Tilted Accretion Disk 1 (Elliptical 3D Orbit) */}
      <g className="echo-anim-orbit-tilt-1">
        <ellipse
          cx="60"
          cy="60"
          rx="54"
          ry="20"
          stroke="url(#vortex-grad)"
          strokeWidth="2.4"
          strokeDasharray="24 10 40 12"
          filter="url(#vortex-glow)"
        />
        <circle cx="110" cy="60" r="3.2" fill="#38bdf8" filter="url(#vortex-glow)" />
        <circle cx="10" cy="60" r="2.6" fill="#f43f5e" filter="url(#vortex-glow)" />
      </g>

      {/* Tilted Accretion Disk 2 (Opposite 3D Inclination) */}
      <g className="echo-anim-orbit-tilt-2">
        <ellipse
          cx="60"
          cy="60"
          rx="52"
          ry="22"
          stroke="url(#vortex-grad)"
          strokeWidth="2"
          strokeDasharray="30 16 12 16"
          filter="url(#vortex-glow)"
          opacity="0.85"
        />
        <circle cx="60" cy="38" r="2.8" fill="#c084fc" filter="url(#vortex-glow)" />
        <circle cx="60" cy="82" r="3" fill="#38bdf8" filter="url(#vortex-glow)" />
      </g>

      {/* Event Horizon Rim Glow */}
      <circle
        cx="60"
        cy="60"
        r="49"
        stroke="#c084fc"
        strokeWidth="1.6"
        strokeDasharray="6 18"
        className="echo-anim-spin-fast"
        filter="url(#vortex-glow)"
        opacity="0.9"
      />

      {/* Relativistic Stardust Particles */}
      <g className="echo-anim-stardust">
        <circle cx="48" cy="18" r="1.4" fill="#ffffff" filter="url(#vortex-glow)" />
        <circle cx="76" cy="22" r="1.6" fill="#38bdf8" filter="url(#vortex-glow)" />
        <circle cx="26" cy="74" r="1.5" fill="#f43f5e" filter="url(#vortex-glow)" />
        <circle cx="94" cy="72" r="1.3" fill="#c084fc" filter="url(#vortex-glow)" />
      </g>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. COROA PRISMÁTICA VIP (Prismatic Gem Crown)
   ───────────────────────────────────────────────────────────────────────────── */
export function PrismaticCrownDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-prismatic-crown ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="crown-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="prism-gem" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
        <filter id="crown-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Floating Gem Crown Base Arc */}
      <path
        d="M 36 28 C 44 24 52 22 60 22 C 68 22 76 24 84 28"
        stroke="url(#crown-gold)"
        strokeWidth="3.2"
        strokeLinecap="round"
        filter="url(#crown-glow)"
      />

      {/* Crown Crest & Spires */}
      <g className="echo-anim-crown-bob" filter="url(#crown-glow)">
        {/* Center Apex Crystal */}
        <polygon
          points="60,4 66,16 60,24 54,16"
          fill="url(#prism-gem)"
          stroke="#fef08a"
          strokeWidth="1.2"
        />
        {/* Left Spire Crystal */}
        <polygon
          points="46,12 51,21 46,27 41,21"
          fill="url(#crown-gold)"
          stroke="#fffbeb"
          strokeWidth="1"
        />
        {/* Right Spire Crystal */}
        <polygon
          points="74,12 79,21 74,27 69,21"
          fill="url(#crown-gold)"
          stroke="#fffbeb"
          strokeWidth="1"
        />
        {/* Far Left Star */}
        <circle cx="36" cy="27" r="3" fill="#fde047" />
        {/* Far Right Star */}
        <circle cx="84" cy="27" r="3" fill="#fde047" />
      </g>

      {/* Shimmering Diamond Glints */}
      <g className="echo-anim-sparkle">
        <path d="M 60 0 L 61 3 L 64 4 L 61 5 L 60 8 L 59 5 L 56 4 L 59 3 Z" fill="#ffffff" filter="url(#crown-glow)" />
        <path d="M 38 10 L 39 12 L 41 13 L 39 14 L 38 16 L 37 14 L 35 13 L 37 12 Z" fill="#ffffff" filter="url(#crown-glow)" />
        <path d="M 82 10 L 83 12 L 85 13 L 83 14 L 82 16 L 81 14 L 79 13 L 81 12 Z" fill="#ffffff" filter="url(#crown-glow)" />
      </g>

      {/* Base Golden Halo Shimmer Ring */}
      <circle
        cx="60"
        cy="60"
        r="49"
        stroke="url(#crown-gold)"
        strokeWidth="1.4"
        strokeDasharray="18 12 4 12"
        className="echo-anim-spin-slow"
        opacity="0.75"
        filter="url(#crown-glow)"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   6. AURÉOLA CELESTIAL (Divine Sacred Halo)
   ───────────────────────────────────────────────────────────────────────────── */
export function CelestialHaloDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-celestial-halo ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="halo-gold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <filter id="halo-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Floating Elliptical Halo Overhead */}
      <g className="echo-anim-halo-float">
        <ellipse
          cx="60"
          cy="18"
          rx="38"
          ry="10"
          stroke="url(#halo-gold)"
          strokeWidth="3.2"
          filter="url(#halo-glow)"
        />
        <ellipse
          cx="60"
          cy="18"
          rx="38"
          ry="10"
          stroke="#ffffff"
          strokeWidth="1.2"
          strokeDasharray="14 18 32 14"
          className="echo-anim-spin-fast"
        />
        {/* Halo Divine Runes / Jewels */}
        <circle cx="60" cy="8" r="2.8" fill="#ffffff" filter="url(#halo-glow)" />
        <circle cx="22" cy="18" r="2.4" fill="#fde047" filter="url(#halo-glow)" />
        <circle cx="98" cy="18" r="2.4" fill="#fde047" filter="url(#halo-glow)" />
      </g>

      {/* Descending Rays of Glory */}
      <g opacity="0.6" stroke="url(#halo-gold)" strokeWidth="1" strokeDasharray="4 6">
        <line x1="60" y1="28" x2="60" y2="44" />
        <line x1="42" y1="26" x2="38" y2="42" />
        <line x1="78" y1="26" x2="82" y2="42" />
      </g>

      {/* Ambient Starlight Orbit */}
      <circle
        cx="60"
        cy="60"
        r="49"
        stroke="#fde047"
        strokeWidth="1.4"
        strokeDasharray="2 12 16 12"
        className="echo-anim-spin-slow"
        opacity="0.8"
        filter="url(#halo-glow)"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   7. CHAMAS ESPECTRAIS (Ghostfire / Soul Flames)
   ───────────────────────────────────────────────────────────────────────────── */
export function GhostfireDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-ghostfire ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="ghost-emerald" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="60%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#6ee7b7" />
        </linearGradient>
        <linearGradient id="ghost-amethyst" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
        <filter id="ghost-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Emerald Soul Flame Serpentine Ribbon */}
      <g className="echo-anim-spin-slow">
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="url(#ghost-emerald)"
          strokeWidth="3"
          strokeDasharray="45 25 15 35"
          strokeLinecap="round"
          filter="url(#ghost-glow)"
        />
        {/* Emerald Wisps */}
        <circle cx="60" cy="10" r="3.6" fill="#6ee7b7" filter="url(#ghost-glow)" />
        <circle cx="110" cy="60" r="2.8" fill="#10b981" filter="url(#ghost-glow)" />
      </g>

      {/* Amethyst Counter-Spiraling Soul Flame */}
      <g className="echo-anim-spin-reverse">
        <circle
          cx="60"
          cy="60"
          r="47"
          stroke="url(#ghost-amethyst)"
          strokeWidth="2.6"
          strokeDasharray="35 30 20 35"
          strokeLinecap="round"
          filter="url(#ghost-glow)"
        />
        {/* Amethyst Wisps */}
        <circle cx="60" cy="107" r="3.4" fill="#c084fc" filter="url(#ghost-glow)" />
        <circle cx="13" cy="60" r="2.8" fill="#8b5cf6" filter="url(#ghost-glow)" />
      </g>

      {/* Soul Wisps Floating Off */}
      <g className="echo-anim-flame-tongue-1">
        <path d="M 56 12 C 54 6 62 2 64 0 C 66 5 62 8 60 12 Z" fill="#6ee7b7" filter="url(#ghost-glow)" />
      </g>
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   8. ORELHAS HOLOGRÁFICAS (Neko Cyberpunk Ears)
   ───────────────────────────────────────────────────────────────────────────── */
export function NekoCyberDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-neko-cyber ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="neko-pink" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#00f2fe" />
        </linearGradient>
        <filter id="neko-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Left Holographic Cat Ear */}
      <g className="echo-anim-ear-left" filter="url(#neko-glow)">
        <polygon
          points="24,38 32,6 50,30"
          stroke="url(#neko-pink)"
          strokeWidth="2.4"
          fill="rgba(244, 114, 182, 0.18)"
          strokeLinejoin="round"
        />
        {/* Inner Frequency Bar */}
        <line x1="33" y1="28" x2="38" y2="16" stroke="#00f2fe" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="32" cy="6" r="2.2" fill="#00f2fe" />
      </g>

      {/* Right Holographic Cat Ear */}
      <g className="echo-anim-ear-right" filter="url(#neko-glow)">
        <polygon
          points="96,38 88,6 70,30"
          stroke="url(#neko-pink)"
          strokeWidth="2.4"
          fill="rgba(244, 114, 182, 0.18)"
          strokeLinejoin="round"
        />
        {/* Inner Frequency Bar */}
        <line x1="87" y1="28" x2="82" y2="16" stroke="#00f2fe" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="88" cy="6" r="2.2" fill="#00f2fe" />
      </g>

      {/* Cute Neon Sparkles */}
      <g className="echo-anim-sparkle">
        <circle cx="60" cy="18" r="1.8" fill="#f472b6" filter="url(#neko-glow)" />
        <circle cx="20" cy="50" r="1.5" fill="#00f2fe" filter="url(#neko-glow)" />
        <circle cx="100" cy="50" r="1.5" fill="#00f2fe" filter="url(#neko-glow)" />
      </g>

      {/* Lower Soundwave Pulse Rim */}
      <circle
        cx="60"
        cy="60"
        r="49"
        stroke="url(#neko-pink)"
        strokeWidth="1.6"
        strokeDasharray="14 8 2 8"
        className="echo-anim-spin-slow"
        opacity="0.8"
        filter="url(#neko-glow)"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   9. ESCUDO HEXAGONAL (Hex Forcefield Shield)
   ───────────────────────────────────────────────────────────────────────────── */
export function HexShieldDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-hex-shield ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <filter id="hex-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer Hexagonal Shield Boundary */}
      <polygon
        points="60,6 104,30 104,90 60,114 16,90 16,30"
        stroke="url(#hex-grad)"
        strokeWidth="2.2"
        strokeLinejoin="round"
        filter="url(#hex-glow)"
        className="echo-anim-pulse-hex"
      />

      {/* Rotating Inner Hex Ring */}
      <g className="echo-anim-spin-slow">
        <polygon
          points="60,12 98,34 98,86 60,108 22,86 22,34"
          stroke="#34d399"
          strokeWidth="1.2"
          strokeDasharray="12 18"
          strokeLinejoin="round"
          opacity="0.8"
        />
        {/* Node Capacitors */}
        <circle cx="60" cy="6" r="2.6" fill="#34d399" filter="url(#hex-glow)" />
        <circle cx="104" cy="30" r="2.6" fill="#06b6d4" filter="url(#hex-glow)" />
        <circle cx="104" cy="90" r="2.6" fill="#10b981" filter="url(#hex-glow)" />
        <circle cx="60" cy="114" r="2.6" fill="#34d399" filter="url(#hex-glow)" />
        <circle cx="16" cy="90" r="2.6" fill="#06b6d4" filter="url(#hex-glow)" />
        <circle cx="16" cy="30" r="2.6" fill="#10b981" filter="url(#hex-glow)" />
      </g>

      {/* Circular Energy Core */}
      <circle
        cx="60"
        cy="60"
        r="48"
        stroke="#06b6d4"
        strokeWidth="1.4"
        strokeDasharray="4 14"
        className="echo-anim-spin-fast"
        filter="url(#hex-glow)"
        opacity="0.75"
      />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   10. SINFONIA DO CORAÇÃO (Heart Harmony / Musical Bloom)
   ───────────────────────────────────────────────────────────────────────────── */
export function HeartHarmonyDecoration({ className = '', style }: DecorationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`echo-deco-svg deco-heart-harmony ${className}`}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#fda4af" />
        </linearGradient>
        <filter id="heart-glow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="2.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Orbiting Ring of Musical Harmonics */}
      <g className="echo-anim-spin-slow">
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="url(#heart-grad)"
          strokeWidth="2"
          strokeDasharray="26 14 8 14"
          filter="url(#heart-glow)"
        />
        {/* Floating Glossy Hearts */}
        <g transform="translate(52, 2) scale(0.7)">
          <path
            d="M 12 4 C 8 -2 0 0 0 7 C 0 13 8 18 12 22 C 16 18 24 13 24 7 C 24 0 16 -2 12 4 Z"
            fill="url(#heart-grad)"
            filter="url(#heart-glow)"
          />
        </g>
        <g transform="translate(100, 52) scale(0.6)">
          <path
            d="M 12 4 C 8 -2 0 0 0 7 C 0 13 8 18 12 22 C 16 18 24 13 24 7 C 24 0 16 -2 12 4 Z"
            fill="#fda4af"
            filter="url(#heart-glow)"
          />
        </g>
        <g transform="translate(2, 52) scale(0.6)">
          <path
            d="M 12 4 C 8 -2 0 0 0 7 C 0 13 8 18 12 22 C 16 18 24 13 24 7 C 24 0 16 -2 12 4 Z"
            fill="#f43f5e"
            filter="url(#heart-glow)"
          />
        </g>
      </g>

      {/* Counter-Rotating Musical Clef Notes */}
      <g className="echo-anim-spin-reverse">
        <circle
          cx="60"
          cy="60"
          r="46"
          stroke="#fda4af"
          strokeWidth="1.2"
          strokeDasharray="2 10 16 10"
          opacity="0.8"
        />
        {/* Orbiting Starlight */}
        <circle cx="60" cy="106" r="2.8" fill="#ffffff" filter="url(#heart-glow)" />
      </g>
    </svg>
  )
}
