import { useState, memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { GroupChat, GroupMessage } from '../../types'
import { StickerPicker } from '../../components/StickerPicker'
import { formatMessageText } from '../../lib/messageFormatter'
import { openExternalUrl } from '../../lib/openExternal'
import {
  PanelLeftIcon,
  UsersIcon,
  TrashIcon,
  PaperclipIcon,
  StickerIcon,
  SendIcon,
  LogOutGroupIcon
} from '../../components/icons'

export interface GroupConversationProps {
  currentActiveGroup: GroupChat
  showSidebar: boolean
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>
  onCloseGroup: () => void
  onLeaveGroupChat?: (groupId: string) => void
  groupMessages: Record<string, GroupMessage[]>
  user: User
  profileDisplayName: string
  onDeleteGroupMessage?: (messageId: string, groupId: string) => void
  openLightbox: (url: string) => void
  groupTypingUsers: Record<string, string[]>
  groupDraft: string
  setGroupDraft?: (val: string) => void
  notifyGroupTyping?: (groupId: string) => void
  onSendGroupMessage?: (groupId: string, body: string, attachmentUrl?: string, attachmentType?: string) => void
}

export const GroupConversation = memo(function GroupConversation({
  currentActiveGroup,
  showSidebar,
  setShowSidebar,
  onCloseGroup,
  onLeaveGroupChat,
  groupMessages,
  user,
  profileDisplayName,
  onDeleteGroupMessage,
  openLightbox,
  groupTypingUsers,
  groupDraft,
  setGroupDraft,
  notifyGroupTyping,
  onSendGroupMessage
}: GroupConversationProps) {
  const [showGroupStickerPicker, setShowGroupStickerPicker] = useState(false)

  return (
    <section className="dm-full-chat group-full-chat">
      {/* Header */}
      <div className="dm-full-header">
        <div className="dm-full-header-left">
          {!showSidebar && (
            <button
              type="button"
              className="dm-back-to-friends-btn"
              onClick={() => setShowSidebar(true)}
              title="Mostrar barra de conversas"
              style={{ marginRight: '6px' }}
            >
              <PanelLeftIcon style={{ width: '15px', height: '15px' }} />
            </button>
          )}

          <button
            type="button"
            className="dm-back-to-friends-btn"
            onClick={onCloseGroup}
            title="Voltar para a lista de amigos"
          >
            ←
          </button>

          <div className="dm-header-avatar-wrap">
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-color, #00f2fe) 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: 700
            }}>
              <UsersIcon style={{ width: 17, height: 17 }} />
            </div>
          </div>

          <div className="dm-header-info">
            <div className="dm-header-name-row">
              <span className="dm-header-display-name">{currentActiveGroup.name}</span>
            </div>
            <span className="dm-header-status-text">
              {currentActiveGroup.members?.length || 0} membros
              {currentActiveGroup.members && currentActiveGroup.members.length > 0 && (
                <span> • {currentActiveGroup.members.map(m => m.profile?.display_name || 'Membro').slice(0, 3).join(', ')}{currentActiveGroup.members.length > 3 ? ` +${currentActiveGroup.members.length - 3}` : ''}</span>
              )}
            </span>
          </div>
        </div>

        <div className="dm-full-header-right">
          {onLeaveGroupChat && (
            <button
              type="button"
              className="dm-header-action-btn"
              onClick={() => onLeaveGroupChat(currentActiveGroup.id)}
              title="Sair do Grupo"
              style={{ color: '#f87171' }}
            >
              <LogOutGroupIcon style={{ width: 17, height: 17 }} />
            </button>
          )}
        </div>
      </div>

      {/* Group Messages List */}
      <div
        className="dm-messages-viewport"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {(groupMessages[currentActiveGroup.id] || []).length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <UsersIcon style={{ width: 36, height: 36, opacity: 0.35, marginBottom: 8 }} />
            <h4 style={{ color: '#fff', margin: '0 0 4px 0' }}>{currentActiveGroup.name}</h4>
            <p style={{ fontSize: 13, margin: 0 }}>Este é o início do grupo. Envie uma mensagem!</p>
          </div>
        ) : (
          (groupMessages[currentActiveGroup.id] || []).map((gMsg) => {
            const isSent = gMsg.sender_id === user.id
            const isSticker = Boolean(gMsg.attachment_url && gMsg.attachment_type === 'sticker')
            const isImage = Boolean(gMsg.attachment_url && (gMsg.attachment_type === 'image' || gMsg.attachment_type?.startsWith('image')))
            const isOtherFile = Boolean(gMsg.attachment_url && !isImage && !isSticker)
            const senderName = gMsg.profile?.display_name || (isSent ? profileDisplayName : 'Membro')

            return (
              <div
                key={gMsg.id}
                className={`dm-message-row ${isSent ? 'dm-sent' : 'dm-received'}`}
              >
                <div className="dm-message-container">
                  {isSent && onDeleteGroupMessage && (
                    <div className="dm-actions-toolbar">
                      <button
                        type="button"
                        className="dm-delete-btn"
                        onClick={() => onDeleteGroupMessage(gMsg.id, currentActiveGroup.id)}
                        title="Excluir mensagem"
                      >
                        <TrashIcon style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  )}

                  <div className="dm-message-content">
                    {!isSent && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color, #00f2fe)', marginBottom: 2 }}>
                        {senderName}
                      </span>
                    )}

                    {/* Sticker */}
                    {isSticker && (
                      <div style={{ padding: '4px 0' }}>
                        <img
                          src={gMsg.attachment_url}
                          alt="sticker"
                          style={{ width: 128, height: 128, objectFit: 'contain', display: 'block', borderRadius: 8 }}
                          loading="lazy"
                        />
                        <span className="dm-time" style={{ display: 'block', marginTop: 3, fontSize: 10, opacity: 0.6 }}>
                          {new Date(gMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Image */}
                    {isImage && (
                      <div className="dm-media-card" onClick={() => openLightbox(gMsg.attachment_url!)}>
                        <div className="dm-media-viewport">
                          <img src={gMsg.attachment_url} alt="anexo" className="dm-media-img" loading="lazy" />
                          <span className="dm-media-time">
                            {new Date(gMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Text / File */}
                    {(gMsg.body || isOtherFile) && !isSticker && !isImage && (
                      <div className="dm-bubble">
                        {isOtherFile ? (
                          <a
                            href={gMsg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dm-attachment-file"
                            onClick={(e) => {
                              e.preventDefault()
                              openExternalUrl(gMsg.attachment_url)
                            }}
                          >
                            <PaperclipIcon style={{ width: 12, height: 12, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
                            <span>{gMsg.body || 'Arquivo'}</span>
                          </a>
                        ) : (
                          <div className="dm-text-body" style={{ wordBreak: 'break-word', lineHeight: 1.45 }}>
                            {formatMessageText(gMsg.body, profileDisplayName)}
                          </div>
                        )}
                        <span className="dm-time">
                          {new Date(gMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Group Typing Indicator */}
      {groupTypingUsers[currentActiveGroup.id]?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 20px', fontSize: 12, color: '#38bdf8' }}>
          <span><strong>{groupTypingUsers[currentActiveGroup.id].join(', ')}</strong> digitando...</span>
        </div>
      )}

      {/* Group Compose Form */}
      <form
        className="dm-full-compose"
        onSubmit={(e) => {
          e.preventDefault()
          if (!groupDraft.trim()) return
          onSendGroupMessage?.(currentActiveGroup.id, groupDraft.trim())
          setGroupDraft?.('')
        }}
      >
        <button
          type="button"
          className="dm-attach-btn"
          onClick={() => setShowGroupStickerPicker(prev => !prev)}
          title="Figurinhas (Stickers)"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: showGroupStickerPicker ? 'var(--accent-color, #00f2fe)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <StickerIcon style={{ width: 16, height: 16 }} />
        </button>
        <input
          id="group-message-input"
          value={groupDraft}
          onChange={(e) => {
            setGroupDraft?.(e.target.value)
            notifyGroupTyping?.(currentActiveGroup.id)
          }}
          placeholder={`Mensagem em ${currentActiveGroup.name}…`}
          autoFocus
        />
        <button
          type="button"
          disabled={!groupDraft.trim()}
          className="dm-send-btn"
          title="Enviar mensagem para o grupo"
          onClick={(e) => {
            e.preventDefault()
            if (!groupDraft.trim()) return
            onSendGroupMessage?.(currentActiveGroup.id, groupDraft.trim())
            setGroupDraft?.('')
          }}
        >
          <SendIcon style={{ width: 16, height: 16 }} />
        </button>
      </form>

      {showGroupStickerPicker && (
        <div style={{ position: 'relative', width: '100%' }}>
          <StickerPicker
            userId={user.id}
            onSelectSticker={(url, name) => {
              onSendGroupMessage?.(currentActiveGroup.id, name ? `[Sticker: ${name}]` : 'Sticker', url, 'sticker')
              setShowGroupStickerPicker(false)
            }}
            onClose={() => setShowGroupStickerPicker(false)}
          />
        </div>
      )}
    </section>
  )
})
