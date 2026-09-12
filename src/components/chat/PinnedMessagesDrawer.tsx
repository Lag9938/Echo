import type { Space, Message, PinnedMessage, ServerEmoji, RolePermissions } from '../../types'
import { PinIcon } from '../icons'
import { formatMessageText } from '../../lib/messageFormatter'
import { useUIStore } from '../../stores/useUIStore'

export interface PinnedMessagesDrawerProps {
  isOpen: boolean
  onClose: () => void
  channelId: string
  pinnedMessages: Record<string, PinnedMessage[]>
  currentSpace: Space | null
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  userId: string
  messages: Message[]
  togglePinMessage: (msg: Message, spaceId: string, channelId: string) => void
  profileDisplayName: string
  serverEmojis?: ServerEmoji[]
}

export function PinnedMessagesDrawer({
  isOpen,
  onClose,
  channelId,
  pinnedMessages,
  currentSpace,
  canUserDo,
  userId,
  messages,
  togglePinMessage,
  profileDisplayName,
  serverEmojis = []
}: PinnedMessagesDrawerProps) {
  const openLightbox = useUIStore((s) => s.openLightbox)
  if (!isOpen) return null

  const channelPinned = pinnedMessages[channelId] || []

  return (
    <aside className="pinned-messages-drawer">
      <div className="pinned-drawer-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <PinIcon style={{ color: 'var(--accent-color)' }} />
          <h3>Mensagens Fixadas</h3>
        </div>
        <button type="button" className="settings-close-btn" onClick={onClose}>✕</button>
      </div>
      <div className="pinned-messages-list">
        {channelPinned.length === 0 ? (
          <div className="no-pinned-messages">
            <PinIcon style={{ width: '32px', height: '32px', opacity: 0.3, margin: '0 auto 8px auto' }} />
            <p>Nenhuma mensagem fixada neste canal.</p>
          </div>
        ) : (
          channelPinned.map(pin => (
            <div key={pin.id} className="pinned-msg-item">
              <div className="pinned-msg-author-row">
                <div className="pinned-avatar">
                  {pin.author_avatar ? (
                    <img src={pin.author_avatar} alt={pin.author_name} />
                  ) : (
                    pin.author_name.slice(0, 1).toUpperCase()
                  )}
                </div>
                <strong className="pinned-author-name">{pin.author_name}</strong>
                <time className="pinned-time">{new Date(pin.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                {currentSpace && (canUserDo(currentSpace.id, userId, 'manageMessages') || currentSpace.creator_id === userId) && (
                  <button 
                    type="button" 
                    className="unpin-action-btn"
                    onClick={() => {
                      const originalMsg = messages.find(m => m.id === pin.message_id) || ({ id: pin.message_id, body: pin.body, author_id: '', channel_id: channelId, created_at: pin.created_at } as Message)
                      togglePinMessage(originalMsg, currentSpace.id, channelId)
                    }}
                    title="Desafixar mensagem"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="pinned-msg-content">
                {pin.attachment_url && pin.attachment_type === 'image' ? (
                  <img
                    src={pin.attachment_url}
                    alt="anexo fixado"
                    onClick={() => openLightbox(pin.attachment_url!)}
                    title="Clique para ampliar"
                    style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '6px', objectFit: 'contain', cursor: 'pointer', background: 'rgba(0,0,0,0.3)' }}
                  />
                ) : null}
                <p>{formatMessageText(pin.body, profileDisplayName, serverEmojis)}</p>
              </div>
              <div className="pinned-by-meta">
                Fixado por {pin.pinned_by_name || 'Moderador'}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
