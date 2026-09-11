export interface ConfirmModalConfig {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDanger?: boolean
  onConfirm: () => void
}

export function ConfirmModal({
  config,
  onClose
}: {
  config: ConfirmModalConfig | null
  onClose: () => void
}) {
  if (!config || !config.isOpen) return null

  return (
    <div className="screen-picker-overlay confirm-modal-overlay" onClick={onClose}>
      <div className="screen-picker-modal confirm-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-modal-title">{config.title}</h2>
        <p className="confirm-modal-message" style={{ margin: '12px 0 20px', fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {config.message}
        </p>
        <div className="confirm-modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            type="button" 
            className="ch-create-btn" 
            style={{ background: 'none', border: '1.5px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 20px', borderRadius: '10px', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer' }} 
            onClick={onClose}
          >
            {config.cancelText || 'Cancelar'}
          </button>
          <button 
            type="button" 
            className={`dropdown-action-btn ${config.isDanger !== false ? 'danger' : 'primary'}`} 
            style={{ 
              width: 'auto', 
              padding: '10px 20px', 
              borderRadius: '10px', 
              fontSize: '13.5px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              background: config.isDanger === false ? 'var(--accent-color, #00f2fe)' : undefined,
              color: config.isDanger === false ? '#041018' : '#fff'
            }} 
            onClick={config.onConfirm}
          >
            {config.confirmText || (config.isDanger !== false ? 'Excluir' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>
  )
}
