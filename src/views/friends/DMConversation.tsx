import { memo, useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DirectMessage } from '../../types'
import { AvatarDecoration } from '../../components/AvatarDecoration'
import { ModernVoiceNotePlayer } from '../../components/chat/ModernVoiceNotePlayer'
import { ChatLinkEmbed } from '../../components/chat/ChatLinkEmbed'
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
  UserPlusIcon,
  PhoneIcon,
  BanIcon,
  MicIcon,
  MicOffIcon,
  HeadphonesIcon,
  HeadphonesOffIcon,
  PhoneOffIcon,
  StarIcon,
  TrashIcon,
  ZoomInIcon,
  PaperclipIcon,
  VoiceMessageIcon,
  StickerIcon,
  SmileIcon,
  SendIcon,
  ClockIcon,
  ReplyIcon,
  ForwardIcon,
  CopyIcon
} from '../../components/icons'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '🎮', '💀']

export interface DMConversationProps {
  dmUser: {
    id: string
    display_name: string
    avatar_url?: string
    avatar_decoration?: string
    status?: string
    isFriend?: boolean
  }
  showSidebar: boolean
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>
  onCloseDM: () => void
  onlineUsers: Set<string>
  onAddFriend?: (userId: string, displayName: string) => void
  onStartCall?: (userId: string, displayName: string, avatarUrl?: string) => void
  onBlockUser?: (userId: string, displayName: string) => Promise<void> | void
  onUnblockUser?: (userId: string, displayName: string) => Promise<void> | void
  blockedUserIds?: Set<string>
  activeDirectCall?: any
  isMuted?: boolean
  toggleMute?: () => void
  isDeafened?: boolean
  toggleDeafen?: () => void
  endDirectCall?: () => void
  dmMessagesContainerRef: React.RefObject<HTMLDivElement | null>
  dmMessagesEndRef: React.RefObject<HTMLDivElement | null>
  directMessages: DirectMessage[]
  user: User
  profileDisplayName: string
  profileAvatarUrl?: string
  onToggleSaveDM?: (msg: DirectMessage, dmUser: any) => void
  isMessageSaved?: (msgId: string) => boolean
  onDeleteDM?: (msgId: string) => void
  openLightbox: (url: string) => void
  handleToggleVoicePlay?: (id: string, url: string) => void
  voiceNoteAudioRef?: React.RefObject<HTMLAudioElement | null>
  activePlayingVoiceNote?: string | null
  voiceNotePlaySpeed?: number
  handleChangeVoiceSpeed?: () => void
  isVoiceNoteRecording: boolean
  voiceNoteTarget?: 'channel' | 'dm' | null
  voiceNoteDuration?: number
  onCancelVoiceNote?: () => void
  onStopVoiceNote?: () => void
  isFriendTyping?: boolean
  pendingDMPastedFile: File | null
  pendingDMImagePreview: string | null
  removePendingDMImage: () => void
  handleDMComposeSubmit: (e: React.FormEvent) => void
  dmFileRef: React.RefObject<HTMLInputElement | null>
  isUploading: boolean
  onUploadFile: (file: File, caption?: string) => void
  onStartVoiceNote?: () => void
  showDMStickerPicker: boolean
  setShowDMStickerPicker: React.Dispatch<React.SetStateAction<boolean>>
  dmDraft: string
  setDmDraft: (val: string) => void
  notifyDMTyping?: (userId: string) => void
  handleDMPaste: (e: React.ClipboardEvent | ClipboardEvent) => void
  onSendDMSticker?: (url: string, name?: string) => void
  onSendDirectMessage?: (body: string, attachmentUrl?: string, attachmentType?: string) => Promise<void> | void
  onForwardMessage?: (msg: ForwardableMessage) => void
  messageReactions?: Record<string, Record<string, string[]>>
  onToggleReaction?: (msgId: string, emoji: string) => void
  showToast?: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
}

export const DMConversation = memo(function DMConversation({
  dmUser,
  showSidebar,
  setShowSidebar,
  onCloseDM,
  onlineUsers,
  onAddFriend,
  onStartCall,
  onBlockUser,
  onUnblockUser,
  blockedUserIds,
  activeDirectCall,
  isMuted,
  toggleMute,
  isDeafened,
  toggleDeafen,
  endDirectCall,
  dmMessagesContainerRef,
  dmMessagesEndRef,
  directMessages,
  user,
  profileDisplayName,
  profileAvatarUrl,
  onToggleSaveDM,
  isMessageSaved,
  onDeleteDM,
  openLightbox,
  handleToggleVoicePlay,
  voiceNoteAudioRef,
  activePlayingVoiceNote,
  voiceNotePlaySpeed,
  handleChangeVoiceSpeed,
  isVoiceNoteRecording,
  voiceNoteTarget,
  voiceNoteDuration,
  onCancelVoiceNote,
  onStopVoiceNote,
  isFriendTyping,
  pendingDMPastedFile,
  pendingDMImagePreview,
  removePendingDMImage,
  handleDMComposeSubmit,
  dmFileRef,
  isUploading,
  onUploadFile,
  onStartVoiceNote,
  showDMStickerPicker,
  setShowDMStickerPicker,
  dmDraft,
  setDmDraft,
  notifyDMTyping,
  handleDMPaste,
  onSendDMSticker,
  onSendDirectMessage,
  onForwardMessage,
  messageReactions = {},
  onToggleReaction,
  showToast
}: DMConversationProps) {
  const [replyingToMessage, setReplyingToMessage] = useState<DirectMessage | null>(null)
  const [showDMEmojiPicker, setShowDMEmojiPicker] = useState(false)

  // Limpa resposta pendente ao trocar de conversa
  useEffect(() => {
    setReplyingToMessage(null)
    setShowDMEmojiPicker(false)
  }, [dmUser.id])

  // Esc cancela a resposta pendente ou fecha o seletor de emojis
  useEffect(() => {
    if (!replyingToMessage && !showDMEmojiPicker) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendingDMPastedFile) {
        if (showDMEmojiPicker) {
          setShowDMEmojiPicker(false)
        } else if (replyingToMessage) {
          setReplyingToMessage(null)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [replyingToMessage, showDMEmojiPicker, pendingDMPastedFile])

  const getAuthorName = (m: DirectMessage) =>
    m.sender_id === user.id ? (profileDisplayName || 'Você') : dmUser.display_name

  const getAuthorAvatar = (m: DirectMessage) =>
    m.sender_id === user.id ? profileAvatarUrl : dmUser.avatar_url

  const focusInput = () => {
    const input = document.getElementById('dm-message-input') as HTMLInputElement | null
    input?.focus()
  }

  const handleReplyClick = (msg: DirectMessage) => {
    setReplyingToMessage(msg)
    setTimeout(focusInput, 0)
  }

  const handleCopyText = (text: string) => {
    if (!text.trim()) return
    void navigator.clipboard?.writeText(text)
    showToast?.('Texto copiado!', 'Mensagem copiada para a área de transferência.', 'info')
  }

  const handleSendFilesWithOptionalReply = (files: File[]) => {
    let prefix = ''
    if (replyingToMessage) {
      prefix = buildReplyPrefix(getAuthorName(replyingToMessage), replyingToMessage)
      setReplyingToMessage(null)
    }
    let isFirst = true
    void sendFilesInOrder(files, (f: File) => {
      const caption = isFirst && prefix ? `${prefix}${f.name || 'Arquivo'}` : undefined
      isFirst = false
      return onUploadFile(f, caption)
    })
  }

  const { isDragging, dropProps } = useFileDrop(handleSendFilesWithOptionalReply, !isUploading)

  const onFormSubmit = async (e: React.FormEvent) => {
    if (replyingToMessage) {
      e.preventDefault()
      const prefix = buildReplyPrefix(getAuthorName(replyingToMessage), replyingToMessage)
      setReplyingToMessage(null)

      if (pendingDMPastedFile) {
        const file = pendingDMPastedFile
        const caption = dmDraft.trim()
        removePendingDMImage()
        setDmDraft('')
        await onUploadFile(file, `${prefix}${caption || file.name || 'Imagem'}`)
        return
      }

      const trimmed = dmDraft.trim()
      if (!trimmed) return
      if (onSendDirectMessage) {
        await onSendDirectMessage(`${prefix}${trimmed}`)
      } else {
        setDmDraft(`${prefix}${trimmed}`)
        handleDMComposeSubmit(e)
      }
      return
    }
    handleDMComposeSubmit(e)
  }

  // Mapa de índice de cada mensagem para localizar respostas anteriores
  const messageIndexById = new Map<string, number>()
  directMessages.forEach((m, i) => messageIndexById.set(m.id, i))

  return (
    <section className="dm-full-chat file-drop-host" {...dropProps}>
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
            onClick={onCloseDM}
            title="Voltar para a lista de amigos"
          >
            ←
          </button>

          <div className="dm-header-avatar-wrap">
            <div className="friend-avatar" style={{ width: 36, height: 36, fontSize: 15, position: 'relative' }}>
              {dmUser.avatar_url ? (
                <img src={dmUser.avatar_url} alt={dmUser.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
              ) : (
                dmUser.display_name.slice(0, 1).toUpperCase()
              )}
              {dmUser.avatar_decoration && dmUser.avatar_decoration !== 'none' && (
                <AvatarDecoration decorationId={dmUser.avatar_decoration} />
              )}
            </div>
            <span className={`online-indicator ${onlineUsers.has(dmUser.id) ? 'online' : 'offline'}`} />
          </div>

          <div className="dm-header-user-meta">
            <div className="dm-header-title-row">
              <span className="dm-header-username">{dmUser.display_name}</span>
              {!dmUser.isFriend && (
                <span className="dm-non-friend-badge">Membro do Servidor</span>
              )}
            </div>
            <span className="dm-header-sub">
              {dmUser.status || (onlineUsers.has(dmUser.id) ? 'Online' : 'Offline')}
            </span>
          </div>
        </div>

        <div className="dm-full-header-actions">
          {!dmUser.isFriend && onAddFriend && (
            <button
              type="button"
              className="dm-header-add-friend-btn"
              onClick={() => onAddFriend(dmUser.id, dmUser.display_name)}
              title="Adicionar à lista de amigos"
            >
              <UserPlusIcon style={{ width: '14px', height: '14px' }} />
              <span>Adicionar Amigo</span>
            </button>
          )}

          <button
            type="button"
            className="dm-header-action-btn call"
            onClick={() => onStartCall && onStartCall(dmUser.id, dmUser.display_name, dmUser.avatar_url)}
            title="Iniciar Chamada de Voz 1x1"
          >
            <PhoneIcon style={{ width: '15px', height: '15px' }} />
            <span>Chamada de Voz</span>
          </button>

          {onBlockUser && (
            <button
              type="button"
              className="dm-header-action-btn danger"
              onClick={async () => {
                const isBlocked = blockedUserIds?.has(dmUser.id)
                if (isBlocked) {
                  await onUnblockUser?.(dmUser.id, dmUser.display_name)
                } else {
                  if (window.confirm(`Tem certeza que deseja bloquear @${dmUser.display_name}?`)) {
                    await onBlockUser(dmUser.id, dmUser.display_name)
                    onCloseDM()
                  }
                }
              }}
              title={blockedUserIds?.has(dmUser.id) ? "Desbloquear Usuário" : "Bloquear Usuário"}
            >
              <BanIcon style={{ width: '15px', height: '15px' }} />
            </button>
          )}

          <button
            type="button"
            className="dm-header-action-btn close"
            onClick={onCloseDM}
            title="Fechar Chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Active 1x1 Call Bar (if call is ongoing with this user or in general) */}
      {activeDirectCall && (activeDirectCall.targetUserId === dmUser.id || activeDirectCall.targetUserId === user.id) && (
        <div className="direct-call-active-bar">
          <div className="direct-call-user-meta">
            <span className="direct-call-wave-dot" />
            <div>
              <div className="direct-call-user-title">
                {activeDirectCall.status === 'calling' ? 'Chamando...' : `Em chamada de voz com ${dmUser.display_name}`}
              </div>
            </div>
          </div>
          <div className="direct-call-controls">
            <button 
              type="button" 
              className={`direct-call-ctrl-btn ${isMuted ? 'active' : ''}`} 
              onClick={toggleMute} 
              title={isMuted ? 'Desmutar Microfone' : 'Mutar Microfone'}
            >
              {isMuted ? <MicOffIcon style={{ width: '14px', height: '14px' }} /> : <MicIcon style={{ width: '14px', height: '14px' }} />}
            </button>
            <button 
              type="button" 
              className={`direct-call-ctrl-btn ${isDeafened ? 'active' : ''}`} 
              onClick={toggleDeafen} 
              title={isDeafened ? 'Desativar Ensurdecer' : 'Ensurdecer'}
            >
              {isDeafened ? <HeadphonesOffIcon style={{ width: '14px', height: '14px' }} /> : <HeadphonesIcon style={{ width: '14px', height: '14px' }} />}
            </button>
            <button 
              type="button" 
              className="direct-call-hangup-btn" 
              onClick={endDirectCall} 
              title="Desligar Chamada"
            >
              <PhoneOffIcon style={{ width: '14px', height: '14px' }} />
              <span>Desligar</span>
            </button>
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="dm-full-messages-list" ref={dmMessagesContainerRef}>
        <div className="dm-welcome-hero">
          <div className="friend-avatar" style={{ width: 72, height: 72, fontSize: 28, position: 'relative' }}>
            {dmUser.avatar_url ? (
              <img src={dmUser.avatar_url} alt={dmUser.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
            ) : (
              dmUser.display_name.slice(0, 1).toUpperCase()
            )}
            {dmUser.avatar_decoration && dmUser.avatar_decoration !== 'none' && (
              <AvatarDecoration decorationId={dmUser.avatar_decoration} />
            )}
          </div>
          <h2 className="dm-welcome-name">{dmUser.display_name}</h2>
          <p className="dm-welcome-sub">
            Este é o início da sua conversa privada com <strong>{dmUser.display_name}</strong>.
          </p>
          {!dmUser.isFriend && onAddFriend && (
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                className="dm-welcome-add-btn"
                onClick={() => onAddFriend(dmUser.id, dmUser.display_name)}
              >
                <UserPlusIcon style={{ width: '14px', height: '14px' }} />
                <span>Adicionar Amigo</span>
              </button>
            </div>
          )}
        </div>

        {/* Direct Messages Stream */}
        <div
          className="dm-messages-stream"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            padding: '0 4px 16px 4px',
            boxSizing: 'border-box'
          }}
        >
          {withDayDividers(directMessages).map((entry) => {
            if (entry.kind === 'day') return <ChatDateDivider key={entry.key} date={entry.date} />
            const msg = entry.message
            const msgIndex = messageIndexById.get(msg.id) ?? -1
            const { replyQuoteText, isForwarded, cleanBody } = unwrapMessageBody(msg.body)

            const isSent = msg.sender_id === user.id
            const isImage = Boolean(msg.attachment_url && (msg.attachment_type === 'image' || msg.attachment_type?.startsWith('image')))
            const isAudio = Boolean(msg.attachment_url && msg.attachment_type === 'audio')
            const isSticker = Boolean(msg.attachment_url && msg.attachment_type === 'sticker')
            const isOtherFile = Boolean(msg.attachment_url && !isImage && !isAudio && !isSticker)
            const hasLink = Boolean(!isAudio && !isOtherFile && !isSticker && cleanBody && /(https?:\/\/[^\s]+)/i.test(cleanBody))
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
              ? findRepliedMessage(directMessages, msgIndex, replyQuoteText, getAuthorName)
              : undefined
            const parsedReply = replyQuoteText ? parseReplyQuote(replyQuoteText) : null
            const replyAuthorName = repliedOriginal ? getAuthorName(repliedOriginal) : (parsedReply?.author || 'Membro')
            const replyAuthorAvatar = repliedOriginal ? getAuthorAvatar(repliedOriginal) : undefined
            const replySnippet = replyQuoteText ? getMessageSnippetLabel(repliedOriginal, parsedReply?.snippet || '') : ''
            const reactions = messageReactions[msg.id] || {}

            return (
              <div
                key={msg.id}
                data-message-id={msg.id}
                className={`dm-message-row ${isSent ? 'dm-sent' : 'dm-received'}`}
              >
                <div className="dm-message-container">
                  {/* Barra de ações por mensagem: Responder, Reagir, Encaminhar, Copiar, Salvar e Excluir */}
                  <div className="dm-actions-toolbar" role="toolbar" aria-label="Ações da mensagem">
                    <button
                      type="button"
                      className="dm-action-btn dm-reply-btn"
                      onClick={() => handleReplyClick(msg)}
                      title="Responder a esta mensagem"
                    >
                      <ReplyIcon style={{ width: '13px', height: '13px' }} />
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
                          <SmileIcon style={{ width: '13px', height: '13px' }} />
                        </button>
                        <div className="dm-react-pop">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              className="dm-react-emoji-btn"
                              onClick={() => onToggleReaction(msg.id, emoji)}
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
                            id: msg.id,
                            body: msg.body,
                            attachment_url: msg.attachment_url,
                            attachment_type: msg.attachment_type,
                            authorName: getAuthorName(msg),
                            authorAvatar: getAuthorAvatar(msg)
                          })
                        }
                        title="Encaminhar mensagem"
                      >
                        <ForwardIcon style={{ width: '13px', height: '13px' }} />
                      </button>
                    )}

                    {hasText && (
                      <button
                        type="button"
                        className="dm-action-btn dm-copy-btn"
                        onClick={() => handleCopyText(cleanBody)}
                        title="Copiar texto da mensagem"
                      >
                        <CopyIcon style={{ width: '12px', height: '12px' }} />
                      </button>
                    )}

                    {onToggleSaveDM && (
                      <button 
                        type="button" 
                        className={`dm-action-btn dm-star-btn ${isMessageSaved?.(msg.id) ? 'active' : ''}`}
                        onClick={() => onToggleSaveDM(msg, dmUser)}
                        title={isMessageSaved?.(msg.id) ? 'Remover dos salvos' : 'Salvar mensagem (⭐)'}
                      >
                        <StarIcon style={{ width: '12px', height: '12px' }} />
                      </button>
                    )}
                    {onDeleteDM && isSent && (
                      <button 
                        type="button" 
                        className="dm-action-btn dm-delete-btn"
                        onClick={() => onDeleteDM(msg.id)}
                        title="Excluir mensagem"
                      >
                        <TrashIcon style={{ width: '12px', height: '12px' }} />
                      </button>
                    )}
                  </div>

                  {/* Content Column (Stacked vertically) */}
                  <div className="dm-message-content">
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

                    {/* 0. Sticker Media */}
                    {isSticker && (
                      <div className="dm-sticker-wrap" style={{ padding: '4px 0' }}>
                        <img
                          src={msg.attachment_url}
                          alt="sticker"
                          style={{
                            width: 128,
                            height: 128,
                            objectFit: 'contain',
                            display: 'block',
                            borderRadius: 8
                          }}
                          loading="lazy"
                        />
                        <span className="dm-time" style={{ display: 'block', marginTop: 3, fontSize: '10px', opacity: 0.6 }}>
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* 1. Image Media Card */}
                    {isImage && (
                      <div
                        className="dm-media-card"
                        onClick={() => openLightbox(msg.attachment_url!)}
                      >
                        <div className="dm-media-viewport">
                          <img
                            src={msg.attachment_url}
                            alt="anexo"
                            className="dm-media-img"
                            loading="lazy"
                          />
                          <div className="dm-media-hover-overlay">
                            <div className="dm-media-zoom-pill">
                              <ZoomInIcon style={{ width: '14px', height: '14px' }} />
                              <span>Ampliar Imagem</span>
                            </div>
                          </div>
                          <span className="dm-media-time">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 2. Text / Audio / File Bubble */}
                    {(hasText || isAudio || isOtherFile) && (
                      <div className="dm-bubble">
                        {isAudio && handleToggleVoicePlay && voiceNoteAudioRef ? (
                          <ModernVoiceNotePlayer
                            audioUrl={msg.attachment_url!}
                            messageId={msg.id}
                            activePlayingId={activePlayingVoiceNote ?? null}
                            onTogglePlay={() => handleToggleVoicePlay(msg.id, msg.attachment_url!)}
                            speed={voiceNotePlaySpeed ?? 1}
                            onChangeSpeed={handleChangeVoiceSpeed ?? (() => {})}
                            activeAudioRef={voiceNoteAudioRef}
                          />
                        ) : isOtherFile ? (
                          <>
                            {!isCaptionJustFileName(cleanBody, readFileInfo(msg.attachment_url, cleanBody)) && (
                              <div className="dm-text-body file-card-caption" style={{ wordBreak: 'break-word', lineHeight: 1.45 }}>
                                {formatMessageText(cleanBody, profileDisplayName)}
                              </div>
                            )}
                            <FileAttachmentCard url={msg.attachment_url!} fallbackName={cleanBody} />
                          </>
                        ) : (
                          <div className="dm-text-body" style={{ wordBreak: 'break-word', lineHeight: 1.45 }}>
                            {formatMessageText(cleanBody, profileDisplayName)}
                          </div>
                        )}
                        <span className="dm-time">
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* 3. Embed Card (Stacked neatly underneath) */}
                    {hasLink && (
                      <div className="dm-embed-wrapper">
                        <ChatLinkEmbed content={cleanBody} />
                      </div>
                    )}

                    {/* 4. Reações de Emoji */}
                    {Object.keys(reactions).length > 0 && (
                      <div className="message-reactions-row dm-reactions-row">
                        {Object.entries(reactions).map(([em, userIds]) => {
                          const hasReacted = userIds.includes(user.id)
                          return (
                            <button
                              key={em}
                              type="button"
                              className={`reaction-pill ${hasReacted ? 'reacted' : ''}`}
                              onClick={() => onToggleReaction?.(msg.id, em)}
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
          })}
        </div>
        <div style={{ height: '24px', flexShrink: 0 }} />
        <div ref={dmMessagesEndRef} />
      </div>

      {/* Full Composer */}
      {isVoiceNoteRecording && voiceNoteTarget === 'dm' ? (
        <div style={{ padding: '0 16px 14px 16px', width: '100%', boxSizing: 'border-box' }}>
          <div className="modern-voice-recorder-bar">
            <div className="modern-recording-live-indicator">
              <div className="recording-dot-pulse" />
              <span className="recording-live-text">REC</span>
            </div>
            <div className="modern-recording-wave-preview">
              <div className="record-wave-bar b1" />
              <div className="record-wave-bar b2" />
              <div className="record-wave-bar b3" />
              <div className="record-wave-bar b4" />
              <div className="record-wave-bar b5" />
              <div className="record-wave-bar b6" />
              <div className="record-wave-bar b7" />
              <div className="record-wave-bar b8" />
            </div>
            <span className="modern-recording-timer">
              {Math.floor((voiceNoteDuration ?? 0) / 60)}:{String((voiceNoteDuration ?? 0) % 60).padStart(2, '0')}
            </span>
            <div className="modern-recording-actions">
              <button 
                type="button" 
                className="modern-record-cancel-btn" 
                onClick={onCancelVoiceNote}
                title="Cancelar gravação"
              >
                <TrashIcon style={{ width: '14px', height: '14px' }} />
                <span>Cancelar</span>
              </button>
              <button 
                type="button" 
                className="modern-record-send-btn" 
                onClick={onStopVoiceNote}
                title="Enviar mensagem de voz"
              >
                <SendIcon style={{ width: '14px', height: '14px' }} />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {isFriendTyping && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 20px',
              fontSize: '12px',
              color: '#38bdf8'
            }}>
              <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#38bdf8' }} />
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#38bdf8' }} />
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#38bdf8' }} />
              </span>
              <span><strong>@{dmUser.display_name}</strong> está digitando...</span>
            </div>
          )}

          {/* Barra de resposta ativa acima do campo de digitação */}
          {replyingToMessage && (
            <div className="reply-quote-bar dm-reply-quote-bar">
              <span className="dm-reply-quote-info">
                <ReplyIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
                <span>
                  Respondendo a <strong>@{getAuthorName(replyingToMessage)}</strong>:{' '}
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

          {pendingDMPastedFile && pendingDMImagePreview && (
            <div className="composer-image-staging dm-image-staging">
              <div className="staging-thumb-wrap">
                <img src={pendingDMImagePreview} alt="Screenshot colado" />
              </div>
              <div className="staging-info">
                <div className="staging-title-row">
                  <span className="staging-badge">Print / Clipboard</span>
                  <span className="staging-name">{pendingDMPastedFile.name}</span>
                </div>
                <span className="staging-subtext">
                  {(pendingDMPastedFile.size / 1024).toFixed(1)} KB • Pressione Enter para enviar na DM
                </span>
              </div>
              <button 
                type="button" 
                className="staging-remove-btn" 
                onClick={removePendingDMImage}
                title="Descartar print (Esc)"
              >
                ✕
              </button>
            </div>
          )}
          <form className="dm-full-compose" onSubmit={onFormSubmit}>
            <input
              type="file"
              multiple
              ref={dmFileRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                const chosen = Array.from(e.target.files ?? [])
                e.target.value = ''
                handleSendFilesWithOptionalReply(chosen)
              }}
            />
            <button type="button" className="dm-attach-btn" onClick={() => dmFileRef.current?.click()} disabled={isUploading} title="Enviar arquivo (até 25 MB)">
              {isUploading ? <ClockIcon style={{ width: '16px', height: '16px' }} /> : <PaperclipIcon style={{ width: '16px', height: '16px' }} />}
            </button>
            {onStartVoiceNote && (
              <button 
                type="button" 
                className="dm-attach-btn" 
                onClick={onStartVoiceNote} 
                title="Gravar mensagem de voz"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                <VoiceMessageIcon style={{ width: '16px', height: '16px' }} />
              </button>
            )}
            <button
              type="button"
              className="dm-attach-btn"
              onClick={() => {
                setShowDMEmojiPicker(false)
                setShowDMStickerPicker(prev => !prev)
              }}
              title="Figurinhas (Stickers)"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showDMStickerPicker ? 'var(--accent-color, #00f2fe)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <StickerIcon style={{ width: '16px', height: '16px' }} />
            </button>
            <button
              type="button"
              className="dm-attach-btn"
              onClick={() => {
                setShowDMStickerPicker(false)
                setShowDMEmojiPicker(prev => !prev)
              }}
              title="Emojis"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showDMEmojiPicker ? 'var(--accent-color, #00f2fe)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <SmileIcon style={{ width: '16px', height: '16px' }} />
            </button>
            <input 
              id="dm-message-input"
              value={dmDraft} 
              onChange={(e) => {
                setDmDraft(e.target.value)
                if (notifyDMTyping && dmUser) {
                  notifyDMTyping(dmUser.id)
                }
              }} 
              onPaste={handleDMPaste}
              placeholder={
                replyingToMessage
                  ? `Respondendo a @${getAuthorName(replyingToMessage)}…`
                  : `Conversar com @${dmUser.display_name}…`
              }
              autoFocus
            />
            <button type="submit" disabled={(!dmDraft.trim() && !pendingDMPastedFile) || isUploading} className="dm-send-btn" title="Enviar mensagem">
              <SendIcon style={{ width: '16px', height: '16px' }} />
            </button>
          </form>

          {showDMEmojiPicker && (
            <div className="dm-emoji-picker-popover">
              <div className="dm-emoji-picker-header">
                <span>Emojis</span>
                <button type="button" onClick={() => setShowDMEmojiPicker(false)} title="Fechar">✕</button>
              </div>
              <div className="dm-emoji-picker-grid">
                {DEFAULT_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="dm-emoji-item-btn"
                    onClick={() => {
                      setDmDraft(`${dmDraft}${em}`)
                      focusInput()
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDMStickerPicker && (
            <div style={{ position: 'relative', width: '100%' }}>
              <StickerPicker
                userId={user.id}
                onSelectSticker={(url, name) => {
                  if (replyingToMessage && onSendDirectMessage) {
                    const prefix = buildReplyPrefix(getAuthorName(replyingToMessage), replyingToMessage)
                    setReplyingToMessage(null)
                    void onSendDirectMessage(`${prefix}${name ? `[Sticker: ${name}]` : 'Sticker'}`, url, 'sticker')
                  } else if (onSendDMSticker) {
                    onSendDMSticker(url, name)
                  }
                  setShowDMStickerPicker(false)
                }}
                onClose={() => setShowDMStickerPicker(false)}
              />
            </div>
          )}
        </>
      )}
    </section>
  )
})
