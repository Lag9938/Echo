import { ColoredClockIcon, ColoredMoonSleepIcon } from '../ColoredIcons'

export interface AfkPromptModalProps {
  isOpen: boolean
  afkCountdown: number
  onStay: () => void
}

export function AfkPromptModal({ isOpen, afkCountdown, onStay }: AfkPromptModalProps) {
  if (!isOpen) return null

  const minutes = String(Math.floor(afkCountdown / 60)).padStart(2, '0')
  const seconds = String(afkCountdown % 60).padStart(2, '0')
  const formattedTime = `${minutes}:${seconds}`

  return (
    <div 
      className="modal-backdrop" 
      style={{ 
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999, 
        backdropFilter: 'blur(12px)', 
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(0, 0, 0, 0.76)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="modal-content afk-prompt-modal" 
        style={{ 
          maxWidth: '460px', 
          width: '90%', 
          textAlign: 'center', 
          padding: '36px 28px', 
          background: 'linear-gradient(145deg, #131722, #0d1017)',
          borderRadius: '20px',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(56, 189, 248, 0.2)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(14, 165, 233, 0.05) 75%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 0 24px rgba(56, 189, 248, 0.3)'
          }}>
            <ColoredClockIcon size={36} />
          </div>
        </div>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '23px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          Você ainda está aí?
        </h2>

        <div style={{
          margin: '14px auto 18px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 20px',
          background: 'rgba(245, 158, 11, 0.12)',
          borderRadius: '24px',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: '#fbbf24',
          fontFamily: 'monospace',
          fontSize: '22px',
          fontWeight: 800,
          letterSpacing: '2px',
          boxShadow: '0 0 16px rgba(245, 158, 11, 0.15)'
        }}>
          <span>⏱</span>
          <span>{formattedTime}</span>
        </div>

        <p style={{ margin: '0 0 26px 0', fontSize: '14px', color: '#94a3b8', lineHeight: 1.55 }}>
          A chamada e transmissão serão pausadas em{' '}
          <strong style={{ color: '#f1f5f9' }}>{formattedTime}</strong>{' '}
          se você não responder.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-modal-primary"
            style={{
              minWidth: '180px',
              padding: '13px 28px',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(2, 132, 199, 0.45)',
              transition: 'all 0.15s ease'
            }}
            onClick={onStay}
          >
            Estou aqui!
          </button>
        </div>
      </div>
    </div>
  )
}

export interface AfkDisconnectedModalProps {
  isOpen: boolean
  onClose: () => void
  canReconnect: boolean
  onReconnect: () => void
}

export function AfkDisconnectedModal({ isOpen, onClose, canReconnect, onReconnect }: AfkDisconnectedModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="modal-backdrop" 
      style={{ 
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999, 
        backdropFilter: 'blur(12px)', 
        WebkitBackdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(0, 0, 0, 0.76)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} 
      onClick={onClose}
    >
      <div 
        className="modal-content afk-disconnected-modal" 
        style={{ 
          maxWidth: '460px', 
          width: '90%', 
          textAlign: 'center', 
          padding: '36px 28px', 
          background: 'linear-gradient(145deg, #131722, #0d1017)',
          borderRadius: '20px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(99, 102, 241, 0.2)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0.05) 75%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            boxShadow: '0 0 24px rgba(99, 102, 241, 0.3)'
          }}>
            <ColoredMoonSleepIcon size={36} />
          </div>
        </div>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '22px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
          Desconectado por inatividade
        </h2>

        <p style={{ margin: '0 0 26px 0', fontSize: '14.5px', color: '#94a3b8', lineHeight: 1.55 }}>
          Não detectamos nenhuma atividade sua por um tempo e desconectamos você da chamada de voz e transmissão.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {canReconnect && (
            <button
              type="button"
              className="btn-modal-primary"
              style={{
                padding: '12px 22px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(99, 102, 241, 0.45)',
                transition: 'all 0.15s ease'
              }}
              onClick={onReconnect}
            >
              Reconectar à chamada
            </button>
          )}
          <button
            type="button"
            className="btn-modal-cancel"
            style={{
              padding: '12px 22px',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.07)',
              color: '#cbd5e1',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer'
            }}
            onClick={onClose}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
