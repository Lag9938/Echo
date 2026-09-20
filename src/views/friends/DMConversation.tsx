import { memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DirectMessage } from '../../types'
import { AvatarDecoration } from '../../components/AvatarDecoration'
import { ModernVoiceNotePlayer } from '../../components/chat/ModernVoiceNotePlayer'
import { ChatLinkEmbed } from '../../components/chat/ChatLinkEmbed'
import { StickerPicker } from '../../components/StickerPicker'
import { formatMessageText } from '../../lib/messageFormatter'
import { openExternalUrl } from '../../lib/openExternal'
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
  SendIcon,
  ClockIcon
} from '../../components/icons'

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
  onUploadFile: (file: File) => void
  onStartVoiceNote?: () => void
  showDMStickerPicker: boolean
  setShowDMStickerPicker: React.Dispatch<React.SetStateAction<boolean>>
  dmDraft: string
  setDmDraft: (val: string) => void
  notifyDMTyping?: (userId: string) => void
  handleDMPaste: (e: React.ClipboardEvent | ClipboardEvent) => void
  onSendDMSticker?: (url: string, name?: string) => void
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
  onSendDMSticker
}: DMConversationProps) {
  return (
    <section className="dm-full-chat">
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
          {directMessages.map((msg) => {
            const isSent = msg.sender_id === user.id
            const isImage = Boolean(msg.attachment_url && msg.attachment_type === 'image')
            const isAudio = Boolean(msg.attachment_url && msg.attachment_type === 'audio')
            const isSticker = Boolean(msg.attachment_url && msg.attachment_type === 'sticker')
            const isOtherFile = Boolean(msg.attachment_url && !isImage && !isAudio && !isSticker)
            const hasLink = Boolean(!isAudio && !isOtherFile && !isSticker && msg.body && /(https?:\/\/[^\s]+)/i.test(msg.body))
            const hasText = Boolean(
              msg.body &&
              (!isImage || (
                msg.body !== 'Imagem' &&
                !/^screenshot_\d+\./i.test(msg.body) &&
                !/^image_\d+\./i.test(msg.body) &&
                !msg.body.startsWith('http')
              ))
            )

            return (
              <div
                key={msg.id}
                className={`dm-message-row ${isSent ? 'dm-sent' : 'dm-received'}`}
              >
                <div className="dm-message-container">
                  {/* Action buttons (Star / Delete) */}
                  <div className="dm-actions-toolbar">
                    {onToggleSaveDM && (
                      <button 
                        type="button" 
                        className={`dm-star-btn ${isMessageSaved?.(msg.id) ? 'active' : ''}`}
                        onClick={() => onToggleSaveDM(msg, dmUser)}
                      >
                        <StarIcon style={{ width: '12px', height: '12px' }} />
                      </button>
                    )}
                    {onDeleteDM && isSent && (
                      <button 
                        type="button" 
                        className="dm-delete-btn"
                        onClick={() => onDeleteDM(msg.id)}
                      >
                        <TrashIcon style={{ width: '12px', height: '12px' }} />
                      </button>
                    )}
                  </div>

                  {/* Content Column (Stacked vertically) */}
                  <div className="dm-message-content">
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
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dm-attachment-file"
                            onClick={(e) => {
                              e.preventDefault()
                              openExternalUrl(msg.attachment_url)
                            }}
                          >
                            <PaperclipIcon style={{ width: '12px', height: '12px', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }} />
                            <span>{msg.body}</span>
                          </a>
                        ) : (
                          <div className="dm-text-body" style={{ wordBreak: 'break-word', lineHeight: 1.45 }}>
                            {formatMessageText(msg.body, profileDisplayName)}
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
                        <ChatLinkEmbed content={msg.body} />
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
          <form className="dm-full-compose" onSubmit={handleDMComposeSubmit}>
            <input type="file" ref={dmFileRef} style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadFile(f); e.target.value = '' }} />
            <button type="button" className="dm-attach-btn" onClick={() => dmFileRef.current?.click()} disabled={isUploading} title="Anexar arquivo">
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
              onClick={() => setShowDMStickerPicker(prev => !prev)}
              title="Figurinhas (Stickers)"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showDMStickerPicker ? 'var(--accent-color, #00f2fe)' : 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            >
              <StickerIcon style={{ width: '16px', height: '16px' }} />
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
              placeholder={`Conversar com @${dmUser.display_name}…`}
              autoFocus
            />
            <button type="submit" disabled={(!dmDraft.trim() && !pendingDMPastedFile) || isUploading} className="dm-send-btn" title="Enviar mensagem">
              <SendIcon style={{ width: '16px', height: '16px' }} />
            </button>
          </form>
          {showDMStickerPicker && (
            <div style={{ position: 'relative', width: '100%' }}>
              <StickerPicker
                userId={user.id}
                onSelectSticker={(url, name) => {
                  if (onSendDMSticker) onSendDMSticker(url, name)
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
