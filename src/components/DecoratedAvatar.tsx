import React from 'react'
import { AvatarDecoration } from './AvatarDecoration'

interface DecoratedAvatarProps {
  avatarUrl?: string | null
  displayName?: string
  decorationId?: string | null
  size?: number
  status?: 'online' | 'idle' | 'dnd' | 'offline' | 'invisible'
  isSpeaking?: boolean
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  title?: string
}

export function DecoratedAvatar({
  avatarUrl,
  displayName = 'U',
  decorationId,
  size = 40,
  status,
  isSpeaking,
  className = '',
  style,
  onClick,
  title
}: DecoratedAvatarProps) {
  const initial = (displayName || 'U').slice(0, 1).toUpperCase()

  return (
    <div
      className={`echo-decorated-avatar-wrap ${className}`}
      onClick={onClick}
      title={title}
      style={{
        position: 'relative',
        width: `${size}px`,
        height: `${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style
      }}
    >
      {/* Speaking Glow Ring */}
      {isSpeaking && (
        <div
          className="avatar-speaking-indicator"
          style={{
            position: 'absolute',
            inset: '-3px',
            borderRadius: '50%',
            boxShadow: '0 0 0 2px #22c55e, 0 0 10px rgba(34, 197, 94, 0.6)',
            zIndex: 1,
            pointerEvents: 'none',
            animation: 'avatar-speak-pulse 1s infinite alternate'
          }}
        />
      )}

      {/* Inner Avatar Base (circle) */}
      <div
        className="echo-avatar-core"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #374151, #1f2937)',
          color: '#f9fafb',
          fontWeight: 600,
          fontSize: `${Math.max(12, Math.round(size * 0.42))}px`,
          userSelect: 'none',
          position: 'relative',
          zIndex: 0
        }}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      {/* Overlaid Animated Decoration */}
      {decorationId && decorationId !== 'none' && (
        <AvatarDecoration decorationId={decorationId} />
      )}

      {/* Status Dot */}
      {status && status !== 'invisible' && (
        <span
          className={`echo-avatar-status-dot status-${status}`}
          style={{
            position: 'absolute',
            bottom: '-1px',
            right: '-1px',
            width: `${Math.max(8, Math.round(size * 0.28))}px`,
            height: `${Math.max(8, Math.round(size * 0.28))}px`,
            borderRadius: '50%',
            border: '2px solid #111214',
            backgroundColor:
              status === 'online'
                ? '#22c55e'
                : status === 'idle'
                ? '#f59e0b'
                : status === 'dnd'
                ? '#ef4444'
                : '#64748b',
            zIndex: 3
          }}
        />
      )}
    </div>
  )
}
