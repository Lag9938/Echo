import { memo, useState } from 'react'
import type { Space } from '../../../types'
import { copyToClipboard } from '../../../lib/clipboard'
import { supabase } from '../../../lib/supabase'
import { revokeAllSpaceInvites } from '../../../lib/spaceInvites'
import { useSpaceInviteLink } from '../../../hooks/useSpaceInviteLink'
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
  const { code, url, loading, error, reload } = useSpaceInviteLink(editingSpace.id)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const fieldValue = loading ? 'Gerando link de convite...' : (url || error || 'Não foi possível gerar o link de convite.')

  const handleRevokeAll = async () => {
    if (!supabase) return
    setRevoking(true)
    try {
      const count = await revokeAllSpaceInvites(supabase, editingSpace.id)
      showToast(
        'Links revogados',
        count > 0
          ? `${count} ${count === 1 ? 'link de convite foi revogado' : 'links de convite foram revogados'}. Um novo link foi gerado.`
          : 'Não havia links ativos. Um novo link foi gerado.',
        'info'
      )
      reload()
    } catch (err: any) {
      showToast('Erro ao revogar', err?.message || 'Não foi possível revogar os links.', 'info')
    } finally {
      setRevoking(false)
      setConfirmRevoke(false)
    }
  }

  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header">
        <h2>Convites do Espaço</h2>
        <p>Compartilhe o link de convite para que seus amigos possam entrar no seu espaço com um clique. Só quem recebe o link consegue entrar.</p>
      </div>

      <div className="invites-card-container">
        <label className="invite-field-label">LINK DE CONVITE INSTANTÂNEO</label>
        <div className="invite-input-row">
          <input
            type="text"
            value={fieldValue}
            readOnly
            className="invite-code-input"
          />
          <button
            type="button"
            className="ch-create-btn"
            disabled={!url}
            style={{ padding: '10px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              if (!url) return
              copyToClipboard(url)
              showToast("Link Copiado!", "Link de convite do espaço copiado com sucesso.", "info")
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
          disabled={!url}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => {
            if (!url) return
            const inviteMsg = `Entre no meu espaço "${editingSpace.name}" no Echo!\nLink Direto: ${url}\nCódigo de convite: ${code}`
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
            <strong>Como funciona:</strong> Seus amigos só precisam clicar no link para entrar. Caso prefiram, podem colar o link ou o código na opção <strong>"Entrar em um Espaço"</strong> no menu superior do Echo.
          </p>
        </div>

        <div className="invite-divider" />

        <label className="invite-field-label">SEGURANÇA</label>
        <p style={{ margin: '0 0 10px 0', fontSize: '12.5px', color: 'var(--text-muted, #94a3b8)' }}>
          Se um link foi parar em mãos erradas, revogue todos: os links atuais deixam de funcionar e um novo é gerado.
        </p>
        {confirmRevoke ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="ch-create-btn"
              disabled={revoking}
              style={{ padding: '9px 18px', fontSize: '13px', background: '#ef4444' }}
              onClick={handleRevokeAll}
            >
              {revoking ? 'Revogando...' : 'Sim, revogar todos os links'}
            </button>
            <button
              type="button"
              className="invite-message-btn"
              disabled={revoking}
              onClick={() => setConfirmRevoke(false)}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="invite-message-btn"
            onClick={() => setConfirmRevoke(true)}
          >
            Revogar todos os links de convite
          </button>
        )}
      </div>
    </div>
  )
})
