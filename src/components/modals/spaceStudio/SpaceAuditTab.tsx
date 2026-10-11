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

      <div className="audit-logs-container">
        {serverAuditLogs.length === 0 ? (
          <div className="audit-logs-empty">
            <FileTextIcon className="audit-logs-empty-icon" />
            <p>Nenhum evento registrado recentemente neste espaço.</p>
          </div>
        ) : (
          serverAuditLogs.map(log => (
            <div key={log.id} className="audit-log-item">
              <div className="audit-log-main">
                <div className="audit-log-icon-bubble">
                  <FileTextIcon />
                </div>
                <div className="audit-log-info">
                  <span className="audit-log-author-action">
                    <strong>{log.author_name}</strong> {log.action}
                  </span>
                  {log.details && (
                    <span className="audit-log-details">{log.details}</span>
                  )}
                </div>
              </div>
              <span className="audit-log-timestamp">
                {new Date(log.timestamp).toLocaleString('pt-BR')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
})
