import React from 'react'

export function PhoneOffIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(135deg)', ...style }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 2.59 3.4z" fill="currentColor"/>
    </svg>
  )
}

export function PhoneIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export interface IncomingCallData {
  callerName: string
  callerAvatar?: string | null
}

export interface IncomingCallModalProps {
  incomingCall: IncomingCallData | null
  onAccept: () => void
  onReject: () => void
}

export function IncomingCallModal({ incomingCall, onAccept, onReject }: IncomingCallModalProps) {
  if (!incomingCall) return null

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-card">
        <div className="incoming-call-avatar-wrap">
          <div className="incoming-call-avatar-pulse" />
          <div className="incoming-call-avatar">
            {incomingCall.callerAvatar ? (
              <img src={incomingCall.callerAvatar} alt={incomingCall.callerName} />
            ) : (
              <span>{incomingCall.callerName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
        </div>
        <div className="incoming-call-info">
          <h3>{incomingCall.callerName}</h3>
          <p>Chamada de voz direta 1x1 no Echo...</p>
        </div>
        <div className="incoming-call-actions">
          <button 
            type="button" 
            className="incoming-call-btn decline" 
            onClick={onReject} 
            title="Recusar Chamada"
          >
            <PhoneOffIcon style={{ width: '18px', height: '18px' }} />
            <span>Recusar</span>
          </button>
          <button 
            type="button" 
            className="incoming-call-btn accept" 
            onClick={onAccept} 
            title="Atender Chamada"
          >
            <PhoneIcon style={{ width: '18px', height: '18px' }} />
            <span>Atender</span>
          </button>
        </div>
      </div>
    </div>
  )
}
