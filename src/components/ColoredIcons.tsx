import React from 'react'

export function ColoredRocketIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="rocketBodyGrad" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="rocketFlameGrad" x1="4" y1="16" x2="10" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <path d="M4.5 19.5c.5-1.5 2-2.5 3.5-2.5l-1 3.5-2.5-1z" fill="url(#rocketFlameGrad)" />
      <path d="M7 14l-4 3 1.5-4.5L7 14z" fill="#6366f1" />
      <path d="M14 7l3-4-4.5 1.5L14 7z" fill="#6366f1" />
      <path d="M15 4a12.8 12.8 0 0 1 5 5c-3 5-7.5 8-11 8l-2-2c0-3.5 3-8 8-11z" fill="url(#rocketBodyGrad)" stroke="#f472b6" strokeWidth="1" />
      <circle cx="14.5" cy="9.5" r="2" fill="#38bdf8" stroke="#fff" strokeWidth="0.8" />
    </svg>
  )
}

export function ColoredWindowsIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="3" y="3" width="8" height="8" rx="2" fill="#38bdf8" />
      <rect x="13" y="3" width="8" height="8" rx="2" fill="#818cf8" />
      <rect x="3" y="13" width="8" height="8" rx="2" fill="#34d399" />
      <rect x="13" y="13" width="8" height="8" rx="2" fill="#f472b6" />
    </svg>
  )
}

export function ColoredMonitorIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="2" y="3" width="20" height="13" rx="2.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
      <rect x="4" y="5" width="16" height="9" rx="1" fill="#0284c7" fillOpacity="0.35" />
      <path d="M12 16v4m-4 0h8" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function ColoredGamepadIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="gamepadGrad" x1="2" y1="6" x2="22" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M6 11h4m-2-2v4m7-2h.01m2.99 0h.01M2 12a5 5 0 0 0 5 5c1.5 0 2.5-1 3.5-1h3c1 0 2 1 3.5 1a5 5 0 0 0 5-5c0-4-3-6-8.5-6S2 8 2 12z" fill="url(#gamepadGrad)" stroke="#c084fc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="15.5" cy="11" r="1" fill="#fef08a" />
      <circle cx="18.5" cy="11" r="1" fill="#67e8f9" />
      <path d="M6.5 11h3m-1.5-1.5v3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

export function ColoredRefreshIcon({ size = 15, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ ...style, color: '#38bdf8' }}>
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" stroke="#38bdf8" />
    </svg>
  )
}

export function ColoredPauseIcon({ size = 14, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <rect x="6" y="4" width="4" height="16" rx="1.5" fill="#60a5fa" />
      <rect x="14" y="4" width="4" height="16" rx="1.5" fill="#60a5fa" />
    </svg>
  )
}

export function ColoredShopBagIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="shopBagGrad" x1="3" y1="6" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>
      </defs>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" fill="url(#shopBagGrad)" />
      <line x1="3" y1="6" x2="21" y2="6" stroke="#f472b6" strokeWidth="1.5" />
      <path d="M16 10a4 4 0 0 1-8 0" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function ColoredBackpackIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="backpackGrad" x1="4" y1="5" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#fb7185" />
        </linearGradient>
      </defs>
      <rect x="4" y="8" width="16" height="13" rx="3" fill="url(#backpackGrad)" stroke="#fecdd3" strokeWidth="1" />
      <path d="M8 8V5a4 4 0 0 1 8 0v3" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
      <rect x="7" y="12" width="10" height="5" rx="1.5" fill="#fda4af" />
    </svg>
  )
}

export function ColoredMaskIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="maskGrad" x1="2" y1="4" x2="22" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path d="M2 9c0-3 3-5 10-5s10 2 10 5c0 5-3 9-10 9S2 14 2 9z" fill="url(#maskGrad)" stroke="#67e8f9" strokeWidth="1.2" />
      <ellipse cx="7.5" cy="9.5" rx="2.5" ry="1.5" fill="#0f172a" />
      <ellipse cx="16.5" cy="9.5" rx="2.5" ry="1.5" fill="#0f172a" />
    </svg>
  )
}

export function ColoredSparklesIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4L12 2z" fill="#facc15" />
      <path d="M19 16l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5z" fill="#ec4899" />
      <path d="M5 16l.8 1.8 1.8.8-1.8.8L5 21.2l-.8-1.8-1.8-.8 1.8-.8L5 16z" fill="#38bdf8" />
    </svg>
  )
}

export function ColoredLightningIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="boltGrad" x1="13" y1="2" x2="11" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="url(#boltGrad)" stroke="#fde047" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  )
}

export function ColoredGemIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="gemGrad" x1="2" y1="7" x2="22" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M6 3h12l4 6-10 12L2 9l4-6z" fill="url(#gemGrad)" stroke="#a5f3fc" strokeWidth="1" />
      <path d="M2 9h20M12 21L6 9l6-6 6 6-6 12z" stroke="#e0f2fe" strokeWidth="0.8" opacity="0.6" />
    </svg>
  )
}

export function ColoredClockIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="clockGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9.5" fill="url(#clockGrad)" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2" fill="#38bdf8" />
      <path d="M12 6.5v5.5l3.5 2" stroke="#f8fafc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ColoredMoonSleepIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="moonGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        fill="url(#moonGrad)"
        stroke="#c084fc"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="18" cy="6" r="1" fill="#fef08a" />
      <circle cx="21" cy="9" r="0.75" fill="#fde047" />
    </svg>
  )
}

export function ColoredTrayIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="trayGrad" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <rect x="3" y="4" width="18" height="11" rx="2.5" stroke="url(#trayGrad)" strokeWidth="1.6" fill="#0f172a" fillOpacity="0.5" />
      <path d="M7 8h10M7 11h5" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 15v5m0 0l-2-2m2 2l2-2" stroke="#38bdf8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ColoredSoundwaveIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="swaveGrad" x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect x="3" y="10" width="2.5" height="4" rx="1.25" fill="url(#swaveGrad)" />
      <rect x="7.5" y="6" width="2.5" height="12" rx="1.25" fill="url(#swaveGrad)" />
      <rect x="12" y="3" width="2.5" height="18" rx="1.25" fill="url(#swaveGrad)" />
      <rect x="16.5" y="7" width="2.5" height="10" rx="1.25" fill="url(#swaveGrad)" />
      <rect x="21" y="10" width="2.5" height="4" rx="1.25" fill="url(#swaveGrad)" />
    </svg>
  )
}

export function ColoredBrainAiIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="brainAiGrad" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path
        d="M9.5 2a3.5 3.5 0 0 0-3.5 3.5c0 .4.07.78.2 1.13A4 4 0 0 0 4 10.5c0 1.25.57 2.37 1.46 3.1A4.5 4.5 0 0 0 9.5 22h.5V2h-.5zm5 0a3.5 3.5 0 0 1 3.5 3.5c0 .4-.07.78-.2 1.13A4 4 0 0 1 20 10.5c0 1.25-.57 2.37-1.46 3.1A4.5 4.5 0 0 1 14.5 22H14V2h.5z"
        stroke="url(#brainAiGrad)"
        strokeWidth="1.6"
        fill="url(#brainAiGrad)"
        fillOpacity="0.16"
      />
      <circle cx="9" cy="8" r="1.2" fill="#ec4899" />
      <circle cx="15" cy="8" r="1.2" fill="#ec4899" />
      <circle cx="8" cy="14" r="1.2" fill="#c084fc" />
      <circle cx="16" cy="14" r="1.2" fill="#c084fc" />
      <path d="M9 8h6M8 14h8M9 8l-1 6M15 8l1 6" stroke="#fff" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
    </svg>
  )
}

export function ColoredHeadphonesIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="headphoneGrad" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00f2fe" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5zm15 0h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-5z" fill="url(#headphoneGrad)" />
      <path d="M4 14V11a8 8 0 0 1 16 0v3" stroke="url(#headphoneGrad)" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="2" cy="11" r="0.8" fill="#38bdf8" />
      <circle cx="22" cy="11" r="0.8" fill="#38bdf8" />
    </svg>
  )
}

export function ColoredMicActiveIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="micActiveGrad" x1="6" y1="2" x2="18" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      <rect x="9" y="2" width="6" height="12" rx="3" fill="url(#micActiveGrad)" stroke="#34d399" strokeWidth="0.8" />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="18" x2="12" y2="22" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function ColoredPushToTalkIcon({ size = 16, style }: { size?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="pttGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <rect x="7" y="6" width="10" height="15" rx="3" fill="url(#pttGrad)" stroke="#fca5a5" strokeWidth="0.8" />
      <line x1="10" y1="2" x2="10" y2="6" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
      <rect x="9" y="10" width="6" height="4" rx="1" fill="#ffffff" fillOpacity="0.85" />
      <circle cx="12" cy="17" r="1" fill="#fff" />
    </svg>
  )
}

export function ColoredVolumeSpeakerIcon({ size = 18, level = 1, style }: { size?: number; level?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      <defs>
        <linearGradient id="volSpeakerGrad" x1="2" y1="4" x2="16" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="url(#volSpeakerGrad)" stroke="#60a5fa" strokeWidth="1" />
      {level > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />}
      {level > 0.4 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" />}
      {level === 0 && <line x1="16" y1="9" x2="22" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />}
      {level === 0 && <line x1="22" y1="9" x2="16" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />}
    </svg>
  )
}
