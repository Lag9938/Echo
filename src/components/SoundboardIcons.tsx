import React from 'react'

export interface SoundboardIconProps {
  soundId: string
  size?: number
  className?: string
  style?: React.CSSProperties
}

export function SoundboardIcon({ soundId, size = 28, className = '', style }: SoundboardIconProps) {
  const iconStyle = { width: `${size}px`, height: `${size}px`, ...style }

  switch (soundId) {
    case 'airhorn':
      // Tactical / MLG Airhorn with soundblast waves
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbAirhornGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff4655" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>
          <path d="M3 14H7L14 18V6L7 10H3C2.45 10 2 10.45 2 11V13C2 13.55 2.45 14 3 14Z" fill="url(#sbAirhornGrad)" stroke="#fda4af" strokeWidth="0.8" />
          <path d="M17 9C17.8 10 18.2 11 18.2 12C18.2 13 17.8 14 17 15" stroke="#ff4655" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 6.5C21.4 8.2 22 10 22 12C22 14 21.4 15.8 20 17.5" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" />
          <rect x="5" y="16" width="4" height="6" rx="1" fill="#334155" stroke="#64748b" strokeWidth="0.8" />
        </svg>
      )

    case 'victory':
      // Glorious Gold Trophy
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbTrophyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <path d="M6 4H18V9C18 12.31 15.31 15 12 15C8.69 15 6 12.31 6 9V4Z" fill="url(#sbTrophyGrad)" stroke="#fef08a" strokeWidth="0.8" />
          <path d="M6 6H3C2.45 6 2 6.45 2 7C2 9.21 3.79 11 6 11V6Z" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M18 6H21C21.55 6 22 6.45 22 7C22 9.21 20.21 11 18 11V6Z" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 15V19M8 21H16" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="12" cy="9" r="2" fill="#fff" opacity="0.8" />
        </svg>
      )

    case 'badumtss':
      // Drum set & Drumsticks
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbDrumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <ellipse cx="12" cy="7" rx="9" ry="3.5" fill="url(#sbDrumGrad)" stroke="#e9d5ff" strokeWidth="0.8" />
          <path d="M3 7V15C3 16.93 7.03 18.5 12 18.5C16.97 18.5 21 16.93 21 15V7" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="7" y1="10" x2="7" y2="17" stroke="#c084fc" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="12" y1="10.5" x2="12" y2="18.5" stroke="#c084fc" strokeWidth="1.4" strokeLinecap="round" />
          <line x1="17" y1="10" x2="17" y2="17" stroke="#c084fc" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M4 2L8 5M20 2L16 5" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )

    case 'levelup':
      // Level Up Lightning Shield
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbZapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>
          <path d="M12 2L4 6V12C4 17.5 7.5 21.5 12 22.5C16.5 21.5 20 17.5 20 12V6L12 2Z" fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" strokeWidth="1.5" />
          <path d="M13 5L7 13H12L11 19L17 11H12L13 5Z" fill="url(#sbZapGrad)" stroke="#a7f3d0" strokeWidth="0.8" strokeLinejoin="round" />
        </svg>
      )

    case 'bruh':
      // Minimalist Geometric Moai / Monolith
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbMoaiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>
          <path d="M7 4H17L15.5 12L17.5 13.5L16 20H8L7 12L8.5 10L7 4Z" fill="url(#sbMoaiGrad)" stroke="#cbd5e1" strokeWidth="1.2" strokeLinejoin="round" />
          <line x1="9" y1="8" x2="15" y2="8" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M11 10V14.5H13.5" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="10" y1="17" x2="14" y2="17" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )

    case 'applause':
      // Stylized Clapping Hands
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbClapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <path d="M11 14C11.5 14.5 12.2 15 13 15C14.7 15 16 13.7 16 12C16 10.3 14.7 9 13 9L10 12L8 10C7.2 9.2 5.8 9.2 5 10C4.2 10.8 4.2 12.2 5 13L10 18C12 20 15 21 18 20L21 17C21.6 16.4 22 15.7 22 15L15 8C14.2 7.2 12.8 7.2 12 8L11 9L11 14Z" fill="url(#sbClapGrad)" stroke="#fbcfe8" strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M5 4L7 6M2 8L5 8M12 2L12 5" stroke="#f472b6" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )

    case 'quack':
      // Geometric Neon Duck
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbDuckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>
          <path d="M14 4C11.8 4 10 5.8 10 8C10 8.5 10.1 9 10.3 9.4L6 11C4.5 11.5 4 12.5 4 13C4 13.5 5 13.8 6.5 13.4L10 12.5C9.5 14 9.5 16 11 17.5C13 19.5 17 20 20 18C20.5 16.5 21 14 19 12C18.2 11.2 17.5 10.5 17.5 9.5C17.5 6.5 16 4 14 4Z" fill="url(#sbDuckGrad)" stroke="#fef08a" strokeWidth="0.8" />
          <circle cx="13" cy="7" r="1.2" fill="#1e293b" />
          <path d="M3 13L1 14L3 15" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 21C8 20.5 12 20.5 15 21" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )

    case 'alert':
      // Tactical Siren / Red Alert Beacon
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbAlertGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
          </defs>
          <path d="M7 11C7 8.24 9.24 6 12 6C14.76 6 17 8.24 17 11V16H7V11Z" fill="url(#sbAlertGrad)" stroke="#fca5a5" strokeWidth="0.8" />
          <rect x="5" y="16" width="14" height="4" rx="1.5" fill="#334155" stroke="#64748b" strokeWidth="1" />
          <line x1="12" y1="2" x2="12" y2="4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <line x1="4" y1="6" x2="5.5" y2="7.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <line x1="20" y1="6" x2="18.5" y2="7.5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="11" r="2" fill="#fff" opacity="0.9" />
        </svg>
      )

    case 'ping':
      // Sonar Radar Wave
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbSonarGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9" stroke="url(#sbSonarGrad)" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx="12" cy="12" r="5" stroke="#93c5fd" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2.5" fill="#3b82f6" />
          <line x1="12" y1="12" x2="18.5" y2="6.5" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" />
          <circle cx="18.5" cy="6.5" r="1.5" fill="#93c5fd" />
        </svg>
      )

    case 'tada':
    default:
      // Celebration / Party Blast
      return (
        <svg className={className} style={iconStyle} viewBox="0 0 24 24" fill="none">
          <defs>
            <linearGradient id="sbTadaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
          </defs>
          <path d="M3 21L7 11L13 17L3 21Z" fill="url(#sbTadaGrad)" stroke="#a5f3fc" strokeWidth="0.8" />
          <circle cx="17" cy="5" r="2" fill="#facc15" />
          <circle cx="20" cy="10" r="1.5" fill="#f43f5e" />
          <circle cx="13" cy="7" r="1.5" fill="#a855f7" />
          <path d="M16 14L18 16M11 4L12 2M21 4L19 6" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )
  }
}

export function SoundboardHeaderIcon({ size = 22, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg style={{ width: `${size}px`, height: `${size}px`, ...style }} viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="sbHeaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="2" y="3" width="20" height="18" rx="4" fill="rgba(99, 102, 241, 0.15)" stroke="url(#sbHeaderGrad)" strokeWidth="1.8" />
      <circle cx="7" cy="8" r="2" fill="#00f2fe" />
      <circle cx="17" cy="8" r="2" fill="#a855f7" />
      <line x1="5" y1="14" x2="9" y2="14" stroke="#00f2fe" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="14" x2="19" y2="14" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="17" x2="17" y2="17" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
