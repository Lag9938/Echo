import { memo } from 'react'

export interface SpaceDangerTabProps {
  handleDeleteSpace: () => void
}

export const SpaceDangerTab = memo(function SpaceDangerTab({
  handleDeleteSpace
}: SpaceDangerTabProps) {
  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header">
        <h2 style={{ color: '#e0554c' }}>Encerrar Espaço</h2>
        <p>Ações irreversíveis para este espaço e comunidade.</p>
      </div>

      <div className="danger-zone-full">
        <div className="danger-zone-header">
          <h3>Encerrar Espaço Definitivamente</h3>
          <p>Ao encerrar este espaço, todos os canais, mensagens, cargos e participantes associados a ele serão deletados permanentemente. Esta ação não pode ser desfeita.</p>
        </div>
        <button 
          type="button" 
          className="dropdown-action-btn danger" 
          style={{ width: 'auto', padding: '12px 24px', fontWeight: 'bold', fontSize: '14px' }} 
          onClick={handleDeleteSpace}
        >
          Encerrar Espaço Permanentemente
        </button>
      </div>
    </div>
  )
})
