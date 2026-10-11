import React from 'react'

export type EchoStatusType = 'online' | 'idle' | 'dnd' | 'invisible' | 'offline' | string

export interface StatusGlyphProps {
  status: EchoStatusType
  size?: number
  className?: string
  style?: React.CSSProperties
  withGlow?: boolean
}

const COLORS = {
  online: '#22c55e',
  idle: '#f59e0b',
  dnd: '#ef4444',
  invisible: '#94a3b8'
} as const

/**
 * Selos de status do Echo ("ondas do eco"): um ponto de cor com anel em volta, como o eco de um som.
 * Mesma linguagem do seletor de status e dos selos sobre os avatares (status-picker.css):
 * Online = ponto cheio com anel · Ausente = meia-lua · Não perturbe = ponto com traço · Invisível = só o contorno.
 */
export const StatusGlyph: React.FC<StatusGlyphProps> = ({
  status,
  size = 14,
  className = '',
  style,
  withGlow = false
}) => {
  const normStatus = (status || 'offline').toLowerCase()
  const kind: keyof typeof COLORS =
    normStatus === 'online' || normStatus === 'idle' || normStatus === 'dnd' ? normStatus : 'invisible'
  const color = COLORS[kind]
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    className: `status-glyph glyph-${kind} ${className}`,
    style: {
      filter: withGlow ? `drop-shadow(0 0 5px ${color})` : undefined,
      ...style
    }
  }

  switch (kind) {
    case 'online':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="11" fill={color} opacity="0.16" />
          <circle cx="12" cy="12" r="7" fill={color} />
        </svg>
      )

    case 'idle':
      // Meia-lua: o ponto "recolhido", sem anel
      return (
        <svg {...common}>
          <path d="M20.2 14.3A8.4 8.4 0 1 1 9.7 3.8a6.6 6.6 0 0 0 10.5 10.5z" fill={color} />
        </svg>
      )

    case 'dnd':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" fill={color} />
          <rect x="7.5" y="10.75" width="9" height="2.5" rx="1.25" fill="#fff" />
        </svg>
      )

    default:
      // Invisível / offline: só o contorno, sem preenchimento
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="3" />
        </svg>
      )
  }
}
