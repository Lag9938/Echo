export interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSimulateSubscription: () => void
}

export function SubscriptionModal({ isOpen, onClose, onSimulateSubscription }: SubscriptionModalProps) {
  if (!isOpen) return null

  return (
    <div className="screen-picker-overlay" onClick={onClose} style={{ zIndex: 10000 }}>
      <div className="screen-picker-modal" style={{ maxWidth: '420px', textAlign: 'center', padding: '32px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>👑</div>
        <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '8px' }}>Echo Premium</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
          Desbloqueie personalização completa! Assinando o Echo Premium você tem acesso a temas exclusivos, transmissões em alta qualidade e muito mais.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            className="voice-join-submit-btn" 
            style={{ width: '100%', padding: '12px', fontWeight: 'bold', margin: 0 }}
            onClick={onSimulateSubscription}
          >
            Simular Assinatura (Grátis para Testes)
          </button>
          <button 
            className="ch-create-btn" 
            style={{ width: '100%', padding: '12px', fontWeight: 'bold', margin: 0, background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            onClick={onClose}
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  )
}
