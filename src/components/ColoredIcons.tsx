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
