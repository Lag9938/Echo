import { useState, useRef, useEffect, memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { GroupChat, GroupMessage } from '../../types'
import { StickerPicker } from '../../components/StickerPicker'
import { DEFAULT_EMOJIS } from '../../components/chat/MessageComposer'
import { jumpToMessage } from '../../components/chat/MessageList'
import { formatMessageText } from '../../lib/messageFormatter'
import { FileAttachmentCard } from '../../components/chat/FileAttachmentCard'
import { ChatDateDivider, withDayDividers } from '../../components/chat/ChatDateDivider'
import { isCaptionJustFileName, readFileInfo, sendFilesInOrder } from '../../lib/attachments'
import {
  unwrapMessageBody,
  parseReplyQuote,
  getMessageSnippetLabel,
  buildReplyPrefix,
  findRepliedMessage,
  type ForwardableMessage
} from '../../lib/messageActions'
import { useFileDrop } from '../../hooks/useFileDrop'
import {
  PanelLeftIcon,
  UsersIcon,
  TrashIcon,
  PaperclipIcon,
  StickerIcon,
  SmileIcon,
  SendIcon,
  LogOutGroupIcon,
  ReplyIcon,
  ForwardIcon,
  CopyIcon
} from '../../components/icons'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎮', '💀']

export interface GroupConversationProps {
  currentActiveGroup: GroupChat
  showSidebar: boolean
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>
  onCloseGroup: () => void
  onLeaveGroupChat?: (groupId: string) => void
  groupMessages: Record<string, GroupMessage[]>
  user: User
  profileDisplayName: string
  profileAvatarUrl?: string
  onDeleteGroupMessage?: (messageId: string, groupId: string) => void
  openLightbox: (url: string) => void
  groupTypingUsers: Record<string, string[]>
  groupDraft: string
  setGroupDraft?: (val: string) => void
  notifyGroupTyping?: (groupId: string) => void
  onSendGroupMessage?: (groupId: string, body: string, attachmentUrl?: string, attachmentType?: string) => void
  onUploadGroupFile?: (groupId: string, file: File) => unknown
  isUploading?: boolean
  onForwardMessage?: (msg: ForwardableMessage) => void
  messageReactions?: Record<string, Record<string, string[]>>
  onToggleReaction?: (msgId: string, emoji: string) => void
  showToast?: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
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
  profileAvatarUrl,
  onDeleteGroupMessage,
  openLightbox,
  groupTypingUsers,
  groupDraft,
  setGroupDraft,
  notifyGroupTyping,
  onSendGroupMessage,
  onUploadGroupFile,
  isUploading = false,
  onForwardMessage,
  messageReactions = {},
  onToggleReaction,
  showToast
}: GroupConversationProps) {
  const [showGroupStickerPicker, setShowGroupStickerPicker] = useState(false)
  const [showGroupEmojiPicker, setShowGroupEmojiPicker] = useState(false)
  const [replyingToMessage, setReplyingToMessage] = useState<GroupMessage | null>(null)
  const groupFileRef = useRef<HTMLInputElement>(null)
  const groupId = currentActiveGroup.id
  const currentGroupMessages = groupMessages[groupId] || []

  useEffect(() => {
    setReplyingToMessage(null)
    setShowGroupEmojiPicker(false)
    setShowGroupStickerPicker(false)
  }, [groupId])

  useEffect(() => {
    if (!replyingToMessage && !showGroupEmojiPicker) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGroupEmojiPicker) {
          setShowGroupEmojiPicker(false)
        } else if (replyingToMessage) {
          setReplyingToMessage(null)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [replyingToMessage, showGroupEmojiPicker])

  const getSenderName = (m: GroupMessage) =>
    m.profile?.display_name || (m.sender_id === user.id ? (profileDisplayName || 'Você') : 'Membro')

  const getSenderAvatar = (m: GroupMessage) =>
    m.sender_id === user.id ? (profileAvatarUrl || m.profile?.avatar_url) : m.profile?.avatar_url

  const focusInput = () => {
    const input = document.getElementById('group-message-input') as HTMLInputElement | null
    input?.focus()
  }

  const handleReplyClick = (msg: GroupMessage) => {
    setReplyingToMessage(msg)
    setTimeout(focusInput, 0)
  }

  const handleCopyText = (text: string) => {
    if (!text.trim()) return
    void navigator.clipboard?.writeText(text)
    showToast?.('Texto copiado!', 'Mensagem copiada para a área de transferência.', 'info')
  }

  const handleSendGroupText = () => {
    if (!groupDraft.trim()) return
    let body = groupDraft.trim()
    if (replyingToMessage) {
      const prefix = buildReplyPrefix(getSenderName(replyingToMessage), replyingToMessage)
      body = `${prefix}${body}`
      setReplyingToMessage(null)
    }
    onSendGroupMessage?.(currentActiveGroup.id, body)
    setGroupDraft?.('')
  }

  const sendFiles = (files: File[]) => { void sendFilesInOrder(files, (f) => onUploadGroupFile?.(groupId, f)) }
  const { isDragging, dropProps } = useFileDrop(sendFiles, Boolean(onUploadGroupFile) && !isUploading)

  const messageIndexById = new Map<string, number>()
  currentGroupMessages.forEach((m, i) => messageIndexById.set(m.id, i))

  return (
    <section className="dm-full-chat group-full-chat file-drop-host" {...dropProps}>
      {isDragging && (
        <div className="file-drop-overlay">
          Solte para enviar
          <span>Até 25 MB por arquivo</span>
        </div>
      )}
      {/* Header */}
      <div className="dm-full-header">
        <div className="dm-full-header-left">
          {!showSidebar && (
            <button
              type="button"
              className="dm-back-to-friends-btn dm-show-sidebar-btn"
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
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {currentGroupMessages.length === 0 ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
            <UsersIcon style={{ width: 36, height: 36, opacity: 0.35, marginBottom: 8 }} />
            <h4 style={{ color: '#fff', margin: '0 0 4px 0' }}>{currentActiveGroup.name}</h4>
            <p style={{ fontSize: 13, margin: 0 }}>Este é o início do grupo. Envie uma mensagem!</p>
          </div>
        ) : (
          withDayDividers(currentGroupMessages).map((entry) => {
            if (entry.kind === 'day') return <ChatDateDivider key={entry.key} date={entry.date} />
            const gMsg = entry.message
            const msgIndex = messageIndexById.get(gMsg.id) ?? -1
            const { replyQuoteText, isForwarded, cleanBody } = unwrapMessageBody(gMsg.body)
            const isSent = gMsg.sender_id === user.id
            const isSticker = Boolean(gMsg.attachment_url && gMsg.attachment_type === 'sticker')
            const isImage = Boolean(gMsg.attachment_url && (gMsg.attachment_type === 'image' || gMsg.attachment_type?.startsWith('image')))
            const isOtherFile = Boolean(gMsg.attachment_url && !isImage && !isSticker)
            const senderName = getSenderName(gMsg)
            const hasText = Boolean(
              cleanBody &&
              !isSticker &&
              (!isImage || (
                cleanBody !== 'Imagem' &&
                !/^screenshot_\d+\./i.test(cleanBody) &&
                !/^image_\d+\./i.test(cleanBody) &&
                !cleanBody.startsWith('http')
              ))
            )

            const repliedOriginal = replyQuoteText
              ? findRepliedMessage(currentGroupMessages, msgIndex, replyQuoteText, getSenderName)
              : undefined
            const parsedReply = replyQuoteText ? parseReplyQuote(replyQuoteText) : null
            const replyAuthorName = repliedOriginal ? getSenderName(repliedOriginal) : (parsedReply?.author || 'Membro')
            const replyAuthorAvatar = repliedOriginal ? getSenderAvatar(repliedOriginal) : undefined
            const replySnippet = replyQuoteText ? getMessageSnippetLabel(repliedOriginal, parsedReply?.snippet || '') : ''
            const reactions = messageReactions[gMsg.id] || {}

            return (
              <div
                key={gMsg.id}
                data-message-id={gMsg.id}
                className={`dm-message-row ${isSent ? 'dm-sent' : 'dm-received'}`}
              >
                <div className="dm-message-container">
                  <div className="dm-actions-toolbar" role="toolbar" aria-label="Ações da mensagem">
                    <button
                      type="button"
                      className="dm-action-btn dm-reply-btn"
                      onClick={() => handleReplyClick(gMsg)}
                      title="Responder a esta mensagem"
                    >
                      <ReplyIcon style={{ width: 13, height: 13 }} />
                      <span className="dm-action-btn-label">Responder</span>
                    </button>

                    {onToggleReaction && (
                      <div className="dm-react-wrap">
                        <button
                          type="button"
                          className="dm-action-btn"
                          title="Reagir com emoji"
                          aria-haspopup="true"
                        >
                          <SmileIcon style={{ width: 13, height: 13 }} />
                        </button>
                        <div className="dm-react-pop">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="dm-react-emoji-btn"
                              onClick={() => onToggleReaction(gMsg.id, emoji)}
                              title={`Reagir com ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {onForwardMessage && (
                      <button
                        type="button"
                        className="dm-action-btn dm-forward-btn"
                        onClick={() =>
                          onForwardMessage({
                            id: gMsg.id,
                            body: gMsg.body,
                            attachment_url: gMsg.attachment_url,
                            attachment_type: gMsg.attachment_type,
                            authorName: senderName,
                            authorAvatar: getSenderAvatar(gMsg)
                          })
                        }
                        title="Encaminhar mensagem"
                      >
                        <ForwardIcon style={{ width: 13, height: 13 }} />
                      </button>
                    )}

                    {hasText && (
                      <button
                        type="button"
                        className="dm-action-btn dm-copy-btn"
                        onClick={() => handleCopyText(cleanBody)}
                        title="Copiar texto da mensagem"
                      >
                        <CopyIcon style={{ width: 12, height: 12 }} />
                      </button>
                    )}

                    {isSent && onDeleteGroupMessage && (
                      <button
                        type="button"
                        className="dm-action-btn dm-delete-btn"
                        onClick={() => onDeleteGroupMessage(gMsg.id, currentActiveGroup.id)}
                        title="Excluir mensagem"
                      >
                        <TrashIcon style={{ width: 12, height: 12 }} />
                      </button>
                    )}
                  </div>

                  <div className="dm-message-content">
                    {!isSent && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-color, #00f2fe)', marginBottom: 2 }}>
                        {senderName}
                      </span>
                    )}

                    {/* Citação de resposta no topo da mensagem */}
                    {replyQuoteText && (
                      <div
                        className={`reply-reference dm-reply-reference ${repliedOriginal ? 'is-interactive' : ''}`}
                        role={repliedOriginal ? 'button' : undefined}
                        tabIndex={repliedOriginal ? 0 : undefined}
                        title={repliedOriginal ? 'Ir para a mensagem original' : 'Mensagem respondida'}
                        onClick={repliedOriginal ? () => jumpToMessage(repliedOriginal.id) : undefined}
                        onKeyDown={
                          repliedOriginal
                            ? (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  jumpToMessage(repliedOriginal.id)
                                }
                              }
                            : undefined
                        }
                      >
                        <span className="reply-reference-curve" aria-hidden="true" />
                        <span className="reply-reference-avatar" aria-hidden="true">
                          {replyAuthorAvatar ? (
                            <img src={replyAuthorAvatar} alt="" />
                          ) : (
                            replyAuthorName.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <span className="reply-reference-name">@{replyAuthorName}</span>
                        <span className="reply-reference-text">{replySnippet}</span>
                        {repliedOriginal && <span className="reply-reference-go" aria-hidden="true">↗</span>}
                      </div>
                    )}

                    {/* Selo de mensagem encaminhada */}
                    {isForwarded && (
                      <div className="dm-forwarded-badge">
                        <ForwardIcon style={{ width: 12, height: 12 }} />
                        <span>Mensagem encaminhada</span>
                      </div>
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
                    {(hasText || isOtherFile) && (
                      <div className="dm-bubble">
                        {isOtherFile ? (
                          <>
                            {!isCaptionJustFileName(cleanBody, readFileInfo(gMsg.attachment_url, cleanBody)) && (
                              <div className="dm-text-body file-card-caption" style={{ wordBreak: 'break-word', lineHeight: 1.45 }}>
                                {formatMessageText(cleanBody, profileDisplayName)}
                              </div>
                            )}
                            <FileAttachmentCard url={gMsg.attachment_url!} fallbackName={cleanBody} />
                          </>
                        ) : (
                          <div className="dm-text-body" style={{ wordBreak: 'break-word', lineHeight: 1.45 }}>
                            {formatMessageText(cleanBody, profileDisplayName)}
                          </div>
                        )}
                        <span className="dm-time">
                          {new Date(gMsg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Reações de Emoji */}
                    {Object.keys(reactions).length > 0 && (
                      <div className="message-reactions-row dm-reactions-row">
                        {Object.entries(reactions).map(([em, userIds]) => {
                          const hasReacted = userIds.includes(user.id)
                          return (
                            <button
                              key={em}
                              type="button"
                              className={`reaction-pill ${hasReacted ? 'reacted' : ''}`}
                              onClick={() => onToggleReaction?.(gMsg.id, em)}
                              title={hasReacted ? 'Remover sua reação' : 'Adicionar reação'}
                            >
                              <span>{em}</span>
                              <span>{userIds.length}</span>
                            </button>
                          )
                        })}
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

      {/* Barra de resposta ativa acima do campo de digitação */}
      {replyingToMessage && (
        <div className="reply-quote-bar dm-reply-quote-bar">
          <span className="dm-reply-quote-info">
            <ReplyIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
            <span>
              Respondendo a <strong>@{getSenderName(replyingToMessage)}</strong>:{' '}
              "{getMessageSnippetLabel(replyingToMessage)}"
            </span>
          </span>
          <button
            type="button"
            className="dm-reply-cancel-btn"
            onClick={() => setReplyingToMessage(null)}
            title="Cancelar resposta (Esc)"
          >
            ✕
          </button>
        </div>
      )}

      {/* Group Compose Form */}
      <form
        className="dm-full-compose"
        onSubmit={(e) => {
          e.preventDefault()
          handleSendGroupText()
        }}
      >
        <button
          type="button"
          className="dm-attach-btn"
          onClick={() => {
            setShowGroupEmojiPicker(false)
            setShowGroupStickerPicker(prev => !prev)
          }}
          title="Figurinhas (Stickers)"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: showGroupStickerPicker ? 'var(--accent-color, #00f2fe)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <StickerIcon style={{ width: 16, height: 16 }} />
        </button>
        <button
          type="button"
          className="dm-attach-btn"
          onClick={() => {
            setShowGroupStickerPicker(false)
            setShowGroupEmojiPicker(prev => !prev)
          }}
          title="Emojis"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: showGroupEmojiPicker ? 'var(--accent-color, #00f2fe)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <SmileIcon style={{ width: 16, height: 16 }} />
        </button>
        {onUploadGroupFile && (
          <>
            <input type="file" multiple ref={groupFileRef} style={{ display: 'none' }} onChange={(e) => { const chosen = Array.from(e.target.files ?? []); e.target.value = ''; sendFiles(chosen) }} />
            <button
              type="button"
              className="dm-attach-btn"
              onClick={() => groupFileRef.current?.click()}
              disabled={isUploading}
              title="Enviar arquivo (até 25 MB)"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', opacity: isUploading ? 0.5 : 1 }}
            >
              <PaperclipIcon style={{ width: 16, height: 16 }} />
            </button>
          </>
        )}
        <input
          id="group-message-input"
          value={groupDraft}
          onChange={(e) => {
            setGroupDraft?.(e.target.value)
            notifyGroupTyping?.(currentActiveGroup.id)
          }}
          placeholder={
            replyingToMessage
              ? `Respondendo a @${getSenderName(replyingToMessage)}…`
              : `Mensagem em ${currentActiveGroup.name}…`
          }
          autoFocus
        />
        <button
          type="button"
          disabled={!groupDraft.trim()}
          className="dm-send-btn"
          title="Enviar mensagem para o grupo"
          onClick={(e) => {
            e.preventDefault()
            handleSendGroupText()
          }}
        >
          <SendIcon style={{ width: 16, height: 16 }} />
        </button>
      </form>

      {showGroupEmojiPicker && (
        <div className="dm-emoji-picker-popover">
          <div className="dm-emoji-picker-header">
            <span>Emojis</span>
            <button type="button" onClick={() => setShowGroupEmojiPicker(false)} title="Fechar">✕</button>
          </div>
          <div className="dm-emoji-picker-grid">
            {DEFAULT_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                className="dm-emoji-item-btn"
                onClick={() => {
                  setGroupDraft?.(`${groupDraft}${em}`)
                  focusInput()
                }}
              >
                {em}
              </button>
            ))}
          </div>
        </div>
      )}

      {showGroupStickerPicker && (
        <div style={{ position: 'relative', width: '100%' }}>
          <StickerPicker
            userId={user.id}
            onSelectSticker={(url, name) => {
              let body = name ? `[Sticker: ${name}]` : 'Sticker'
              if (replyingToMessage) {
                const prefix = buildReplyPrefix(getSenderName(replyingToMessage), replyingToMessage)
                body = `${prefix}${body}`
                setReplyingToMessage(null)
              }
              onSendGroupMessage?.(currentActiveGroup.id, body, url, 'sticker')
              setShowGroupStickerPicker(false)
            }}
            onClose={() => setShowGroupStickerPicker(false)}
          />
        </div>
      )}
    </section>
  )
})
