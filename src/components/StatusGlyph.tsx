import React from 'react'

export type EchoStatusType = 'online' | 'idle' | 'dnd' | 'invisible' | 'offline' | string

export interface StatusGlyphProps {
  status: EchoStatusType
  size?: number
  className?: string
  style?: React.CSSProperties
  withGlow?: boolean
}

/**
 * Echo Proprietary Acoustic & Cyber Status Glyphs.
 * Formatos visuais exclusivos da identidade Echo (ressonância e frequências),
 * sem cópias do Discord (sem luas, sem sinais de menos clichês).
 */
export const StatusGlyph: React.FC<StatusGlyphProps> = ({
  status,
  size = 14,
  className = '',
  style,
  withGlow = false
}) => {
  const normStatus = (status || 'offline').toLowerCase()

  switch (normStatus) {
    case 'online':
      // Pulse Core: Núcleo esmeralda ativo com anel de frequência concêntrico vivo
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`status-glyph glyph-online ${className}`}
          style={{
            filter: withGlow ? 'drop-shadow(0 0 6px #10b981)' : undefined,
            ...style
          }}
        >
          <circle cx="12" cy="12" r="4.5" fill="#10b981" />
          <circle
            cx="12"
            cy="12"
            r="8.5"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeDasharray="2.5 3"
            opacity="0.85"
          />
        </svg>
      )

    case 'idle':
      // Standby Bars: Duas barras de equalizador acústico em repouso (|| em âmbar)
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`status-glyph glyph-idle ${className}`}
          style={{
            filter: withGlow ? 'drop-shadow(0 0 6px #f59e0b)' : undefined,
            ...style
          }}
        >
          <rect x="7" y="6" width="3.5" height="12" rx="1.75" fill="#f59e0b" />
          <rect x="13.5" y="6" width="3.5" height="12" rx="1.75" fill="#f59e0b" opacity="0.75" />
        </svg>
      )

    case 'dnd':
      // Acoustic Shield: Anel acústico com corte de frequência transversal (Ø em carmesim neon)
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`status-glyph glyph-dnd ${className}`}
          style={{
            filter: withGlow ? 'drop-shadow(0 0 6px #ef4444)' : undefined,
            ...style
          }}
        >
          <circle cx="12" cy="12" r="8" stroke="#ef4444" strokeWidth="2.5" />
          <line
            x1="6.5"
            y1="17.5"
            x2="17.5"
            y2="6.5"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )

    case 'invisible':
    case 'offline':
    default:
      // Stealth Radar: Arco pontilhado de radar furtivo com núcleo camuflado em cinza
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          className={`status-glyph glyph-invisible ${className}`}
          style={{
            filter: withGlow ? 'drop-shadow(0 0 4px #94a3b8)' : undefined,
            ...style
          }}
        >
          <path
            d="M12 5C8.134 5 5 8.134 5 12C5 15.866 8.134 19 12 19C15.866 19 19 15.866 19 12"
            stroke="#94a3b8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeDasharray="2.5 3"
          />
          <circle cx="12" cy="12" r="2.5" fill="#94a3b8" />
        </svg>
      )
  }
}
