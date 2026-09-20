import { memo } from 'react'
import type { ServerAuditLog } from '../../../types'
import { FileTextIcon } from '../../icons'

export interface SpaceAuditTabProps {
  serverAuditLogs: ServerAuditLog[]
}

export const SpaceAuditTab = memo(function SpaceAuditTab({
  serverAuditLogs
}: SpaceAuditTabProps) {
  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header">
        <h2>Registro de Ações do Espaço</h2>
        <p>Histórico cronológico em tempo real de eventos de moderação e alterações realizadas no espaço.</p>
      </div>

      <div className="audit-logs-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
        {serverAuditLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <FileTextIcon style={{ width: '32px', height: '32px', margin: '0 auto 12px auto', opacity: 0.5 }} />
            <p style={{ margin: 0, fontSize: '14px' }}>Nenhum evento registrado recentemente neste espaço.</p>
          </div>
        ) : (
          serverAuditLogs.map(log => (
            <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'grid', placeItems: 'center', color: 'var(--accent-color)' }}>
                  <FileTextIcon style={{ width: '16px', height: '16px' }} />
                </div>
                <div>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                    <strong>{log.author_name}</strong> {log.action}
                  </span>
                  {log.details && (
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{log.details}</span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(log.timestamp).toLocaleString('pt-BR')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
})
