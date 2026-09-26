import React, { memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel, Message, ServerEmoji, RolePermissions } from '../../types'
import { StickerPicker } from '../StickerPicker'
import {
  ClockIcon,
  MegaphoneIcon,
  PaperclipIcon,
  SendIcon,
  SmileIcon,
  StickerIcon,
  TrashIcon,
  VoiceMessageIcon
} from '../icons'

export const DEFAULT_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😋', '😛',
  '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
  '😞', '😔', '😟', '😕', '🙁', '😣', '😖', '😫', '😩', '🥺',
  '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶',
  '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
  '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲',
  '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧',
  '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡',
  '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
  '👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘',
  '👌', '🤌', '🤏', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚',
  '🖐️', '🖖', '👋', '🤙', '💪', '🦾', '🖕', '✍️', '🙏', '🦶',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '⚡', '💥', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇',
  '🚀', '🛸', '⭐', '🌟', '💫', '👑', '💎', '🎮', '🕹️', '🎧'
]

export const GAMING_GIFS = [
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHp1cnR2ejJtZnlldjB0NWV6cmY2YnJ5OHRhNGtvamE3ZnB6NXRpNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif', title: 'GG Victory' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnZ0c3prdnk4eGpnM3k0a3R3dTBzd2h4eHlhYnBpdWpsODl4NmswMyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/artj92V8o75VPL7AeQ/giphy.gif', title: 'Valorant Clutch' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExc2phM3pnZTNzOHZ0enZ5Y3BocmI2bGVpY2RreDBjOGo1Zmp2dHVhNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlHFRbmaZtBRhXG/giphy.gif', title: 'Hype Dance' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2g2dXp3aTBwbHNlcnk3YnpxZWVyb3J3YnpsYzhsaTZtdWc0cmI0MCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufdipQqU2lhNA4g/giphy.gif', title: 'Mind Blown' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWZ0MXB4eTBuODhkZXBndmV5c3Z3dTVsOTlvNjVkd2s0ZHAxbndmMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2K5jinAlChoCLS/giphy.gif', title: 'Confused' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcXhzbjB6OTN1bnFqOTNxbmtocjB4M2FrcGF3dWRwNGI0NTh4MXpodyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPnAiaMCws8nOsE/giphy.gif', title: 'Anime Rage' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG9yMjFidDZ6N25yMjY2enF6MWZ0a2w3MnA1NGhxMmQ5eXpzc2Y1YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/PUBxelwT57jsQ/giphy.gif', title: 'Cat Jam' },
  { url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeXV5NmlmZnBmb2dtc2s1OXlhZWJ2eXg0dXAwYm11N2s5NzkwdXhveiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11ISwbgGL28Ehy/giphy.gif', title: 'Popcorn' }
]

export interface MessageComposerProps {
  selectedChannel: Channel
  currentSpace: Space | null
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  user: User
  profileDisplayName: string
  spaceMembers?: any[]
  presenceData: Record<string, any>
  replyingToMessage: Message | null
  setReplyingToMessage: (msg: Message | null) => void
  isVoiceNoteRecording: boolean
  voiceNoteTarget?: 'channel' | 'dm' | null
  voiceNoteDuration: number
  startVoiceNoteRecording: (target: 'channel' | 'dm') => void
  stopVoiceNoteRecording: () => void
  cancelVoiceNoteRecording: () => void
  typingUsers: string[]
  pendingPastedFile: File | null
  setPendingPastedFile: React.Dispatch<React.SetStateAction<File | null>>
  pendingImagePreview: string | null
  setPendingImagePreview: React.Dispatch<React.SetStateAction<string | null>>
  pendingImageSize: 'small' | 'medium' | 'large' | 'original'
  setPendingImageSize: React.Dispatch<React.SetStateAction<'small' | 'medium' | 'large' | 'original'>>
  removePendingImage: () => void
  handleComposerSubmit: (e: React.FormEvent) => void
  handleChatFileUpload: (file: File, caption?: string, sizePreference?: string) => void
  isUploading: boolean
  draft: string
  setDraft: React.Dispatch<React.SetStateAction<string>>
  chatInputRef: React.RefObject<HTMLInputElement | null>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  handlePaste: (e: React.ClipboardEvent | ClipboardEvent) => void
  slowmodeCooldown: number
  showMentionPicker: boolean
  mentionCandidates: Array<{ id: string; name: string; avatarUrl?: string; roleName?: string; roleColor?: string; isSpecial?: boolean }>
  selectedMentionIndex: number
  setSelectedMentionIndex: React.Dispatch<React.SetStateAction<number>>
  selectMention: (candidate: { name: string }) => void
  showGifPicker: boolean
  setShowGifPicker: React.Dispatch<React.SetStateAction<boolean>>
  gifSearchQuery: string
  setGifSearchQuery: React.Dispatch<React.SetStateAction<string>>
  showStickerPicker: boolean
  setShowStickerPicker: React.Dispatch<React.SetStateAction<boolean>>
  handleSendSticker: (url: string, name?: string) => Promise<void> | void
  showEmojiPicker: boolean
  setShowEmojiPicker: React.Dispatch<React.SetStateAction<boolean>>
  emojiPickerTab: 'default' | 'server'
  setEmojiPickerTab: React.Dispatch<React.SetStateAction<'default' | 'server'>>
  serverEmojis?: ServerEmoji[]
  supabase: any
  postChannelMessage: (channelId: string, body: string, attachmentUrl?: string, attachmentType?: string, existingTempId?: string) => Promise<any> | void
}

export const MessageComposer = memo(function MessageComposer({
  selectedChannel,
  currentSpace,
  canUserDo,
  user,
  profileDisplayName,
  spaceMembers = [],
  presenceData,
  replyingToMessage,
  setReplyingToMessage,
  isVoiceNoteRecording,
  voiceNoteTarget,
  voiceNoteDuration,
  startVoiceNoteRecording,
  stopVoiceNoteRecording,
  cancelVoiceNoteRecording,
  typingUsers,
  pendingPastedFile,
  setPendingPastedFile,
  pendingImagePreview,
  setPendingImagePreview,
  pendingImageSize,
  setPendingImageSize,
  removePendingImage,
  handleComposerSubmit,
  handleChatFileUpload,
  isUploading,
  draft,
  setDraft,
  chatInputRef,
  handleInputChange,
  handleInputKeyDown,
  handlePaste,
  slowmodeCooldown,
  showMentionPicker,
  mentionCandidates,
  selectedMentionIndex,
  setSelectedMentionIndex,
  selectMention,
  showGifPicker,
  setShowGifPicker,
  gifSearchQuery,
  setGifSearchQuery,
  showStickerPicker,
  setShowStickerPicker,
  handleSendSticker,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerTab,
  setEmojiPickerTab,
  serverEmojis = [],
  supabase,
  postChannelMessage
}: MessageComposerProps) {
  if (currentSpace && !canUserDo(currentSpace.id, user.id, 'sendMessages')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', margin: '0 16px 16px 16px' }}>
        <span>🔒 Você não tem permissão para enviar mensagens neste espaço.</span>
      </div>
    )
  }

  if (selectedChannel.is_announcement && currentSpace && !canUserDo(currentSpace.id, user.id, 'sendInAnnouncementChannels')) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', margin: '0 16px 16px 16px' }}>
        <MegaphoneIcon style={{ color: 'var(--accent-color)' }} />
        <span>📢 Canal de Anúncios — Apenas administradores e moderadores podem enviar mensagens neste canal.</span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Reply Quote Banner */}
      {replyingToMessage && (
        <div className="reply-quote-bar">
          <span>
            ↩️ Respondendo a <strong>@{
              replyingToMessage.author_id === user.id
                ? (profileDisplayName || 'Você')
                : (presenceData[replyingToMessage.author_id]?.display_name || spaceMembers.find(m => (m?.user?.id === replyingToMessage.author_id || m?.id === replyingToMessage.author_id))?.user?.display_name || replyingToMessage.profile?.display_name || 'Membro')
            }</strong>: "{replyingToMessage.body.slice(0, 45)}..."
          </span>
          <button 
            type="button" 
            onClick={() => setReplyingToMessage(null)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '13px' }}
          >
            ✕
          </button>
        </div>
      )}

      {isVoiceNoteRecording && voiceNoteTarget === 'channel' ? (
        <div className="composer" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
              {Math.floor(voiceNoteDuration / 60)}:{String(voiceNoteDuration % 60).padStart(2, '0')}
            </span>
            <div className="modern-recording-actions">
              <button 
                type="button" 
                className="modern-record-cancel-btn" 
                onClick={cancelVoiceNoteRecording}
                title="Cancelar gravação"
              >
                <TrashIcon style={{ width: '14px', height: '14px' }} />
                <span>Cancelar</span>
              </button>
              <button 
                type="button" 
                className="modern-record-send-btn" 
                onClick={stopVoiceNoteRecording}
                title="Enviar áudio"
              >
                <SendIcon style={{ width: '14px', height: '14px' }} />
                <span>Enviar</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {typingUsers && typingUsers.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 20px',
              fontSize: '12px',
              color: '#38bdf8',
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#38bdf8' }} />
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#38bdf8' }} />
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#38bdf8' }} />
              </span>
              <span>
                <strong>{typingUsers.join(', ')}</strong> {typingUsers.length === 1 ? 'está digitando...' : 'estão digitando...'}
              </span>
            </div>
          )}
          {pendingPastedFile && pendingImagePreview && (
            <div className="composer-image-staging" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                <div className="staging-thumb-wrap">
                  <img src={pendingImagePreview} alt="Foto para enviar" />
                </div>
                <div className="staging-info" style={{ flex: 1 }}>
                  <div className="staging-title-row">
                    <span className="staging-badge">Foto / Anexo</span>
                    <span className="staging-name">{pendingPastedFile.name}</span>
                  </div>
                  <span className="staging-subtext">
                    {(pendingPastedFile.size / 1024).toFixed(1)} KB • Pressione Enter para enviar com a mensagem
                  </span>
                </div>
                <button 
                  type="button" 
                  className="staging-remove-btn" 
                  onClick={removePendingImage}
                  title="Descartar foto (Esc)"
                >
                  ✕
                </button>
              </div>

              {/* Seletor de Tamanho da Foto */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Tamanho da foto:
                </span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {[
                    { id: 'small', label: 'Pequeno (240px)' },
                    { id: 'medium', label: 'Médio (440px)' },
                    { id: 'large', label: 'Grande (680px)' },
                    { id: 'original', label: 'Máximo (100%)' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPendingImageSize(opt.id as any)}
                      style={{
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: pendingImageSize === opt.id ? '1px solid #00f2fe' : '1px solid var(--border-color)',
                        background: pendingImageSize === opt.id ? 'rgba(0, 242, 254, 0.2)' : 'var(--bg-secondary)',
                        color: pendingImageSize === opt.id ? '#00f2fe' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <form className="composer" onSubmit={handleComposerSubmit} style={{ position: 'relative' }}>
            <input 
              type="file" 
              id="chat-file-input" 
              style={{ display: 'none' }} 
              onChange={(e) => { 
                const f = e.target.files?.[0]
                if (f) {
                  if (f.type.startsWith('image/')) {
                    setPendingImagePreview(prev => {
                      if (prev) URL.revokeObjectURL(prev)
                      return URL.createObjectURL(f)
                    })
                    setPendingPastedFile(f)
                  } else {
                    handleChatFileUpload(f)
                  }
                }
                e.target.value = '' 
              }} 
            />
            <button type="button" className="composer-action-btn" onClick={() => document.getElementById('chat-file-input')?.click()} disabled={isUploading} title="Anexar arquivo ou imagem">
              <PaperclipIcon style={{ width: '15px', height: '15px' }} />
            </button>

            {/* Voice Note Button */}
            <button 
              type="button" 
              className="composer-action-btn" 
              onClick={() => startVoiceNoteRecording('channel')} 
              title="Gravar Mensagem de Voz"
            >
              <VoiceMessageIcon style={{ width: '15px', height: '15px' }} />
            </button>

            {/* GIF Picker Button */}
            <button 
              type="button" 
              className={`composer-action-btn ${showGifPicker ? 'active' : ''}`} 
              onClick={() => {
                setShowGifPicker(!showGifPicker)
                setShowStickerPicker(false)
                setShowEmojiPicker(false)
              }} 
              title="Escolher GIF Gamer"
              style={{ fontWeight: 800, fontSize: '11px', letterSpacing: '0.5px' }}
            >
              GIF
            </button>

            {/* Sticker Picker Button */}
            <button 
              type="button" 
              className={`composer-action-btn ${showStickerPicker ? 'active' : ''}`} 
              onClick={() => {
                setShowStickerPicker(!showStickerPicker)
                setShowGifPicker(false)
                setShowEmojiPicker(false)
              }} 
              title="Figurinhas (Stickers)"
            >
              <StickerIcon style={{ width: '15px', height: '15px' }} />
            </button>

            {/* Emoji Picker Button */}
            <button 
              type="button" 
              className={`composer-action-btn ${showEmojiPicker ? 'active' : ''}`} 
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker)
                setShowGifPicker(false)
                setShowStickerPicker(false)
              }} 
              title="Escolher Emoji"
            >
              <SmileIcon style={{ width: '15px', height: '15px' }} />
            </button>

            {/* Mention Autocomplete Popover (@) */}
            {showMentionPicker && mentionCandidates.length > 0 && (
              <div className="mention-picker-popover" role="listbox">
                <div className="mention-picker-header">
                  <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
                    Membros correspondentes
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    ↑↓ navegar • ↵ selecionar • Esc fechar
                  </span>
                </div>
                <div className="mention-picker-list">
                  {mentionCandidates.map((cand, idx) => {
                    const isSelected = idx === selectedMentionIndex
                    return (
                      <div
                        key={cand.id}
                        className={`mention-picker-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => selectMention(cand)}
                        onMouseEnter={() => setSelectedMentionIndex(idx)}
                      >
                        <div className="mention-picker-avatar">
                          {cand.avatarUrl ? (
                            <img src={cand.avatarUrl} alt={cand.name} />
                          ) : (
                            <span>{cand.isSpecial ? '@' : cand.name.slice(0, 1).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="mention-picker-info">
                          <span className="mention-picker-name">@{cand.name}</span>
                          {cand.roleName && (
                            <span 
                              className="mention-picker-role"
                              style={cand.roleColor ? { color: cand.roleColor } : undefined}
                            >
                              {cand.roleName}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <input 
              ref={chatInputRef}
              id="chat-input-field"
              value={draft} 
              onChange={handleInputChange} 
              onKeyDown={handleInputKeyDown}
              onPaste={handlePaste}
              placeholder={slowmodeCooldown > 0 ? `Modo Lento ativo: aguarde ${slowmodeCooldown}s para digitar…` : `Mensagem em #${selectedChannel.name}…`} 
              disabled={slowmodeCooldown > 0}
            />

            {slowmodeCooldown > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: '#e0554c', fontWeight: 700, paddingRight: '8px' }}>
                <ClockIcon style={{ width: '12px', height: '12px' }} />
                <span>{slowmodeCooldown}s</span>
              </div>
            ) : (
              <button type="submit" className="send-btn" disabled={(!draft.trim() && !pendingPastedFile) || isUploading} title="Enviar Mensagem">
                <SendIcon style={{ width: '15px', height: '15px' }} />
              </button>
            )}

            {/* GIF Picker Popover */}
            {showGifPicker && (
              <div className="gif-picker-popover">
                <div style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    value={gifSearchQuery} 
                    onChange={(e) => setGifSearchQuery(e.target.value)}
                    placeholder="Buscar GIFs de games..."
                    style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-primary)', outline: 'none', fontSize: '12.5px' }}
                  />
                  <button type="button" onClick={() => setShowGifPicker(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
                </div>
                <div className="gif-picker-grid">
                  {GAMING_GIFS.filter(g => !gifSearchQuery || g.title.toLowerCase().includes(gifSearchQuery.toLowerCase())).map((gif, idx) => (
                    <img 
                      key={idx}
                      src={gif.url} 
                      alt={gif.title} 
                      className="gif-item-thumb"
                      onClick={async () => {
                        if (selectedChannel && supabase) {
                          await postChannelMessage(selectedChannel.id, gif.url, gif.url, 'image')
                          setShowGifPicker(false)
                        }
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Emoji Picker Popover */}
            {showEmojiPicker && (
              <div className="emoji-picker-popover">
                <div className="emoji-picker-tabs">
                  <button 
                    type="button" 
                    className={`emoji-tab-btn ${emojiPickerTab === 'default' ? 'active' : ''}`}
                    onClick={() => setEmojiPickerTab('default')}
                  >
                    😀 Padrão
                  </button>
                  <button 
                    type="button" 
                    className={`emoji-tab-btn ${emojiPickerTab === 'server' ? 'active' : ''}`}
                    onClick={() => setEmojiPickerTab('server')}
                  >
                    🌟 Espaço ({serverEmojis.length})
                  </button>
                </div>

                <div className="emoji-picker-body">
                  {emojiPickerTab === 'default' ? (
                    <div className="emoji-picker-grid">
                      {DEFAULT_EMOJIS.map(em => (
                        <button 
                          key={em} 
                          type="button" 
                          className="emoji-item-btn"
                          onClick={() => { setDraft(prev => prev + em); setShowEmojiPicker(false) }}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="emoji-picker-grid-custom">
                      {serverEmojis.map(em => (
                        <button 
                          key={em.id} 
                          type="button" 
                          className="emoji-custom-item-btn"
                          onClick={() => { setDraft(prev => prev + `:${em.name}: `); setShowEmojiPicker(false) }}
                          title={`:${em.name}:`}
                        >
                          <img src={em.url} alt={em.name} />
                          <span>:{em.name}:</span>
                        </button>
                      ))}
                      {serverEmojis.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          Nenhum emoji personalizado neste espaço.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sticker Picker Popover */}
            {showStickerPicker && (
              <StickerPicker
                userId={user?.id}
                onSelectSticker={handleSendSticker}
                onClose={() => setShowStickerPicker(false)}
              />
            )}
          </form>
        </>
      )}
    </div>
  )
})
