import { memo } from 'react'
import type { Space } from '../../../types'
import { copyToClipboard } from '../../../lib/clipboard'
import { getPublicInviteUrl } from '../../../lib/invite'
import {
  CopyIcon,
  LinkIcon,
  SparklesIcon
} from '../../icons'

export interface SpaceInvitesTabProps {
  editingSpace: Space
  showToast: (title: string, message: string, type?: any) => void
}

export const SpaceInvitesTab = memo(function SpaceInvitesTab({
  editingSpace,
  showToast
}: SpaceInvitesTabProps) {
  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header">
        <h2>Convites do Espaço</h2>
        <p>Compartilhe o link direto de convite para que seus amigos possam acessar e entrar no seu espaço com um clique.</p>
      </div>

      <div className="invites-card-container">
        <label className="invite-field-label">LINK DE CONVITE INSTANTÂNEO</label>
        <div className="invite-input-row">
          <input 
            type="text" 
            value={getPublicInviteUrl(editingSpace.id)} 
            readOnly 
            className="invite-code-input"
          />
          <button 
            type="button" 
            className="ch-create-btn" 
            style={{ padding: '10px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              const link = getPublicInviteUrl(editingSpace.id)
              copyToClipboard(link)
              showToast("Link Copiado!", "Link de convite direto do espaço copiado com sucesso.", "info")
            }}
          >
            <LinkIcon style={{ width: '14px', height: '14px' }} />
            Copiar Link
          </button>
        </div>

        <div className="invite-divider" />

        <label className="invite-field-label">MENSAGEM DE CONVITE PRONTA</label>
        <button 
          type="button" 
          className="invite-message-btn"
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => {
            const directUrl = getPublicInviteUrl(editingSpace.id)
            const inviteMsg = `Entre no meu espaço "${editingSpace.name}" no Echo!\nLink Direto: ${directUrl}\nCódigo do Espaço: ${editingSpace.id}`
            copyToClipboard(inviteMsg)
            showToast("Mensagem Copiada!", "Texto de convite com link e código copiado para a área de transferência.", "info")
          }}
        >
          <CopyIcon style={{ width: '14px', height: '14px' }} />
          <span>Copiar Mensagem de Convite Pronta</span>
        </button>

        <div className="invite-help-box" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <SparklesIcon style={{ width: '16px', height: '16px', color: '#00f2fe', flexShrink: 0, marginTop: '2px' }} />
          <p>
            <strong>Como funciona:</strong> Seus amigos só precisam clicar no link para entrar. Caso prefiram, podem colar esse mesmo link na opção <strong>"Entrar em um Espaço"</strong> no menu superior do Echo.
          </p>
        </div>
      </div>
    </div>
  )
})
