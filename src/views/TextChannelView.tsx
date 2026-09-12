import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel, Message, PinnedMessage, ServerEmoji, RolePermissions, ServerRole } from '../types'
import { MembersSidebar } from '../components/sidebar/MembersSidebar'
import { PinnedMessagesDrawer } from '../components/chat/PinnedMessagesDrawer'
import { AvatarDecoration } from '../components/AvatarDecoration'
import { ModernVoiceNotePlayer } from '../components/chat/ModernVoiceNotePlayer'
import { ChatLinkEmbed } from '../components/chat/ChatLinkEmbed'
import { formatChatDateDivider, formatMessageText } from '../lib/messageFormatter'
import { NAME_EFFECTS } from '../lib/cosmeticsData'
import {
  ClockIcon,
  HashtagIcon,
  MegaphoneIcon,
  PaperclipIcon,
  PinIcon,
  SearchIcon,
  SendIcon,
  SmileIcon,
  StarIcon,
  TrashIcon,
  UsersIcon,
  VoiceMessageIcon
} from '../components/icons'
import { openExternalUrl } from '../lib/openExternal'
import { useUIStore } from '../stores/useUIStore'

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

function renderRichEmbed(body: string) {
  return <ChatLinkEmbed content={body} />
}

export interface TextChannelViewProps {
  currentSpace: Space | null
  selectedChannel: Channel
  messages: Message[]
  hasMoreMessages: boolean
  isLoadingMore: boolean
  loadMoreMessages: (channelId: string) => Promise<void> | void
  activeScreenSharers?: any[]
  isWatchingStreams?: boolean
  setIsWatchingStreams?: (val: boolean) => void
  voiceNoteTarget?: 'channel' | 'dm' | null
  messagesContainerRef: React.RefObject<HTMLDivElement | null>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  user: User
  profileDisplayName: string
  avatarDecoration?: string | null
  nameEffect?: string | null
  presenceData: Record<string, any>
  onlineUsers: Set<string>
  serverRoles: ServerRole[]
  memberRoleMap: Record<string, string[]>
  serverEmojis?: ServerEmoji[]
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  isMessageSaved: (msgId: string) => boolean
  toggleSaveMessage: (msg: Message, type: 'channel' | 'dm', extra?: any) => void
  handleDeleteMessage: (msgId: string) => void
  retrySendMessage: (msg: any) => void
  replyingToMessage: Message | null
  setReplyingToMessage: (msg: Message | null) => void
  messageReactions: Record<string, Record<string, string[]>>
  toggleReaction: (msgId: string, emoji: string) => void
  activePlayingVoiceNote: string | null
  handleToggleVoicePlay: (id: string, url: string) => void
  voiceNotePlaySpeed: number
  handleChangeVoiceSpeed: () => void
  voiceNoteAudioRef: React.RefObject<HTMLAudioElement | null>
  draft: string
  setDraft: React.Dispatch<React.SetStateAction<string>>
  send: (e: React.FormEvent) => void
  isUploading: boolean
  handleChatFileUpload: (file: File, caption?: string) => void
  isVoiceNoteRecording: boolean
  voiceNoteDuration: number
  startVoiceNoteRecording: (target: 'channel' | 'dm') => void
  stopVoiceNoteRecording: () => void
  cancelVoiceNoteRecording: () => void
  slowmodeCooldown: number
  showSearchInput: boolean
  setShowSearchInput: React.Dispatch<React.SetStateAction<boolean>>
  searchQuery: string
  setSearchQuery: (q: string) => void
  showPinnedMessagesPanel: boolean
  setShowPinnedMessagesPanel: React.Dispatch<React.SetStateAction<boolean>>
  showMembersList: boolean
  setShowMembersList: React.Dispatch<React.SetStateAction<boolean>>
  pinnedMessages: Record<string, PinnedMessage[]>
  togglePinMessage: (msg: Message, spaceId: string, channelId: string) => void
  spaceMembers: any[]
  spaceChannels: Record<string, Channel[]>
  activeVoiceChannelId: string | null
  participants: any[]
  spaceVoiceUsers: Record<string, any[]>
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  setSpaceForAddMembers: (space: Space) => void
  setInspectedMember: (val: any) => void
  setHoveredMemberPopover: (val: any) => void
  hoverTimeoutRef: React.MutableRefObject<any>
  postChannelMessage: (channelId: string, body: string, attachmentUrl?: string, attachmentType?: string, existingTempId?: string) => Promise<any> | void
  supabase: any
  typingUsers?: string[]
  notifyTyping?: () => void
}

export function TextChannelView({
  currentSpace,
  selectedChannel,
  messages,
  hasMoreMessages,
  isLoadingMore,
  loadMoreMessages,
  activeScreenSharers = [],
  isWatchingStreams = false,
  setIsWatchingStreams = () => {},
  voiceNoteTarget = null,
  messagesContainerRef,
  messagesEndRef,
  user,
  profileDisplayName,
  avatarDecoration,
  nameEffect,
  presenceData,
  onlineUsers,
  serverRoles,
  memberRoleMap,
  serverEmojis = [],
  canUserDo,
  getUserHighestRole,
  isMessageSaved,
  toggleSaveMessage,
  handleDeleteMessage,
  retrySendMessage,
  replyingToMessage,
  setReplyingToMessage,
  messageReactions,
  toggleReaction,
  activePlayingVoiceNote,
  handleToggleVoicePlay,
  voiceNotePlaySpeed,
  handleChangeVoiceSpeed,
  voiceNoteAudioRef,
  draft,
  setDraft,
  send,
  isUploading,
  handleChatFileUpload,
  isVoiceNoteRecording,
  voiceNoteDuration,
  startVoiceNoteRecording,
  stopVoiceNoteRecording,
  cancelVoiceNoteRecording,
  slowmodeCooldown,
  showSearchInput,
  setShowSearchInput,
  searchQuery,
  setSearchQuery,
  showPinnedMessagesPanel,
  setShowPinnedMessagesPanel,
  showMembersList,
  setShowMembersList,
  pinnedMessages,
  togglePinMessage,
  spaceMembers,
  spaceChannels,
  activeVoiceChannelId,
  participants,
  spaceVoiceUsers,
  presenceStatus,
  myGamePresence,
  setSpaceForAddMembers,
  setInspectedMember,
  setHoveredMemberPopover,
  hoverTimeoutRef,
  postChannelMessage,
  supabase,
  typingUsers = [],
  notifyTyping
}: TextChannelViewProps) {
  const openLightbox = useUIStore((s) => s.openLightbox)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerTab, setEmojiPickerTab] = useState<'default' | 'server'>('default')
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState('')

  // Staged clipboard paste image state
  const [pendingPastedFile, setPendingPastedFile] = useState<File | null>(null)
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null)

  const removePendingImage = useCallback(() => {
    setPendingPastedFile(null)
    setPendingImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
    const clipboardData = ('clipboardData' in e ? e.clipboardData : null)
    const items = clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          const rawExt = file.type.split('/')[1] || 'png'
          const ext = rawExt.replace(/[^a-zA-Z0-9]/g, '')
          const renamedFile = new File([file], `screenshot_${Date.now()}.${ext}`, { type: file.type })

          setPendingImagePreview(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(renamedFile)
          })
          setPendingPastedFile(renamedFile)
          return
        }
      }
    }
  }, [])

  // Global window paste handler when channel is active
  useEffect(() => {
    const onWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === 'INPUT' && target.id !== 'chat-input-field') {
        return
      }
      if (target && target.tagName === 'TEXTAREA') {
        return
      }
      handlePaste(e)
    }
    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [handlePaste])

  // Esc key cancels pending image
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingPastedFile) {
        removePendingImage()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingPastedFile, removePendingImage])

  const handleComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pendingPastedFile) {
      const file = pendingPastedFile
      const caption = draft.trim()
      removePendingImage()
      setDraft('')
      await handleChatFileUpload(file, caption)
      return
    }
    send(e)
  }

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      if (q.startsWith('de:') || q.startsWith('from:')) {
        const authorQ = q.slice(3).trim().replace('@', '')
        return (m.profile?.display_name || '').toLowerCase().includes(authorQ)
      }
      return m.body.toLowerCase().includes(q) || (m.profile?.display_name || '').toLowerCase().includes(q)
    })
  }, [messages, searchQuery])

  const channelVirtualizer = useVirtualizer({
    count: filteredMessages.length,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: () => 64,
    overscan: 8,
    paddingEnd: 32
  })

  // Garante que o chat role suavemente para o fim e mantenha a última mensagem sempre acima da caixa de digitação
  useEffect(() => {
    if (filteredMessages.length > 0) {
      channelVirtualizer.scrollToIndex(filteredMessages.length - 1, { align: 'end' })
      const t1 = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 50)
      const t2 = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 160)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [filteredMessages.length, channelVirtualizer])

  return (
<>
                <header className="content-header">
                  <div className="header-info">
                    {currentSpace && <span className="header-space">{currentSpace.name}</span>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h1>
                        <span className="header-icon">
                          {selectedChannel.is_announcement ? <MegaphoneIcon style={{ color: 'var(--accent-color)' }} /> : <HashtagIcon />}
                        </span> 
                        {selectedChannel.name}
                      </h1>
                      {selectedChannel.topic && (
                        <>
                          <span style={{ color: 'var(--border-color)', margin: '0 4px' }}>|</span>
                          <span className="channel-topic-header-text" title={selectedChannel.topic}>
                            {selectedChannel.topic}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                    {selectedChannel.slowmode_seconds && selectedChannel.slowmode_seconds > 0 ? (
                      <span className="channel-slowmode-badge" title={`Modo lento: ${selectedChannel.slowmode_seconds}s por mensagem`}>
                        <ClockIcon style={{ width: '12px', height: '12px' }} />
                        <span>{selectedChannel.slowmode_seconds}s</span>
                      </span>
                    ) : null}

                    {/* Search messages in channel */}
                    <div className="channel-search-box-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      {showSearchInput ? (
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px 8px' }}>
                          <SearchIcon style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                          <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar mensagens ou de:@autor..."
                            autoFocus
                            style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '12px', padding: '4px 6px', outline: 'none', width: '160px' }}
                          />
                          {searchQuery && (
                            <button type="button" onClick={() => setSearchQuery('')} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px', padding: '0 2px' }}>✕</button>
                          )}
                          <button type="button" onClick={() => { setShowSearchInput(false); setSearchQuery('') }} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px', marginLeft: '4px' }}>✕</button>
                        </div>
                      ) : (
                        <button 
                          type="button" 
                          className="channel-header-action-btn" 
                          onClick={() => setShowSearchInput(true)} 
                          title="Buscar no canal"
                        >
                          <SearchIcon style={{ width: '15px', height: '15px' }} />
                        </button>
                      )}
                    </div>

                    {/* Pinned Messages Button */}
                    <button 
                      type="button" 
                      className={`channel-header-action-btn ${showPinnedMessagesPanel || (pinnedMessages[selectedChannel.id]?.length || 0) > 0 ? 'active' : ''}`}
                      onClick={() => setShowPinnedMessagesPanel(!showPinnedMessagesPanel)}
                      title="Mensagens Fixadas"
                    >
                      <PinIcon style={{ width: '15px', height: '15px' }} />
                      {(pinnedMessages[selectedChannel.id]?.length || 0) > 0 && (
                        <span className="channel-header-badge">
                          {pinnedMessages[selectedChannel.id]?.length}
                        </span>
                      )}
                    </button>

                    {activeScreenSharers.length > 0 && (
                      <button 
                        type="button"
                        onClick={() => setIsWatchingStreams(!isWatchingStreams)}
                        className="live-badge" 
                        style={{ cursor: 'pointer', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        title="Transmissão de tela em andamento (clique para alternar visualização)"
                      >
                        ● {isWatchingStreams ? 'Fechar Vídeo' : 'Assistir Transmissão'}
                      </button>
                    )}

                    <button 
                      type="button"
                      className={`channel-header-action-btn ${showMembersList ? 'active' : ''}`} 
                      onClick={() => setShowMembersList(!showMembersList)}
                      title={showMembersList ? "Ocultar Lista de Membros" : "Mostrar Lista de Membros"}
                    >
                      <UsersIcon style={{ width: '15px', height: '15px' }} />
                    </button>
                  </div>
                </header>
                <div className="chat-workspace-wrapper" style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%', position: 'relative', overflow: 'hidden' }}>
                  <div className="chat-area-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, height: '100%', overflow: 'hidden' }}>
                      <div 
                        className="messages-area"
                        ref={messagesContainerRef}
                        onScroll={(e) => {
                          const target = e.currentTarget
                          if (target.scrollTop <= 40 && hasMoreMessages && !isLoadingMore && selectedChannel) {
                            loadMoreMessages(selectedChannel.id)
                          }
                        }}
                      >
                        {/* Indicador de carregamento de mensagens anteriores */}
                        {isLoadingMore && (
                          <div className="loading-more-messages">
                            <span className="loading-spinner-circle" />
                            <span>Carregando mensagens anteriores...</span>
                          </div>
                        )}

                        {/* Channel Welcome Hero (visível apenas ao alcançar o início histórico do canal) */}
                        {!searchQuery.trim() && !hasMoreMessages && (
                          <div className="channel-welcome-hero">
                            <div className="channel-welcome-icon-box">
                              {selectedChannel.is_announcement ? <MegaphoneIcon /> : <HashtagIcon />}
                            </div>
                            <h2 className="channel-welcome-title">Bem-vindo ao canal #{selectedChannel.name}!</h2>
                            <p className="channel-welcome-desc">
                              {selectedChannel.topic || `Este é o início do canal #${selectedChannel.name} da comunidade ${currentSpace?.name || 'Echo'}. Envie uma mensagem para iniciar o papo!`}
                            </p>
                            <div className="channel-welcome-meta">
                              <span>🔒 Canal seguro</span>
                              <span>•</span>
                              <span>💬 Início do canal</span>
                            </div>
                          </div>
                        )}

                        {filteredMessages.length === 0 && searchQuery && (
                          <div className="no-messages">
                            <span className="no-msg-icon">🔍</span>
                            <p>{`Nenhuma mensagem encontrada para "${searchQuery}"`}</p>
                          </div>
                        )}

                        <div
                          style={{
                            height: `${channelVirtualizer.getTotalSize()}px`,
                            width: '100%',
                            position: 'relative'
                          }}
                        >
                          {channelVirtualizer.getVirtualItems().map((virtualRow) => {
                            const index = virtualRow.index
                            const message = filteredMessages[index]
                            const prevMessage = index > 0 ? filteredMessages[index - 1] : null
                            const msgDate = new Date(message.created_at)
                            const prevDate = prevMessage ? new Date(prevMessage.created_at) : null
                            const isDifferentDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString()

                            // Parse reply quote if present
                            let displayedBody = message.body
                            let replyQuoteText: string | null = null
                            if (displayedBody.startsWith('> @')) {
                              const firstLineEnd = displayedBody.indexOf('\n')
                              if (firstLineEnd !== -1) {
                                replyQuoteText = displayedBody.slice(2, firstLineEnd)
                                displayedBody = displayedBody.slice(firstLineEnd + 1)
                              }
                            }

                            // Consecutive Message Grouping (Same author within 5 min, same calendar day, not a reply, and not voice note)
                            const isSameAuthor = prevMessage && prevMessage.author_id === message.author_id
                            const isWithinWindow = prevMessage && (msgDate.getTime() - prevDate!.getTime() < 5 * 60 * 1000)
                            const isAudioNote = message.attachment_type === 'audio' || prevMessage?.attachment_type === 'audio'
                            const isConsecutive = !isDifferentDay && isSameAuthor && isWithinWindow && !replyQuoteText && !isAudioNote

                            const isMentioned = message.author_id !== user.id && message.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)
                            const msgRole = currentSpace ? getUserHighestRole(currentSpace.id, message.author_id) : null
                            const isPinned = (pinnedMessages[selectedChannel.id] || []).some(p => p.message_id === message.id)
                            const canManagePins = currentSpace && (canUserDo(currentSpace.id, user.id, 'manageMessages') || currentSpace.creator_id === user.id)
                            const reactions = messageReactions[message.id] || {}

                            const authorClanTag = localStorage.getItem(`echo-clan-tag-${message.author_id}`) || (message.author_id === user.id ? localStorage.getItem(`echo-clan-tag-${user.id}`) : null)
                            const authorClanTagColor = localStorage.getItem(`echo-clan-tag-color-${message.author_id}`) || (message.author_id === user.id ? localStorage.getItem(`echo-clan-tag-color-${user.id}`) : '#00f2fe') || '#00f2fe'

                            return (
                              <div
                                key={message.id || virtualRow.key}
                                data-index={virtualRow.index}
                                ref={channelVirtualizer.measureElement}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  transform: `translateY(${virtualRow.start}px)`
                                }}
                              >
                                {isDifferentDay && (
                                  <div className="chat-date-divider">
                                    <div className="chat-date-line" />
                                    <span className="chat-date-pill">
                                      {formatChatDateDivider(msgDate)}
                                    </span>
                                    <div className="chat-date-line" />
                                  </div>
                                )}

                                <article 
                                  className={`msg-card ${isConsecutive ? 'msg-consecutive' : ''} ${message.attachment_type === 'audio' ? 'has-voice-note' : ''} ${message.author_id === user.id ? 'msg-own' : ''} ${isMentioned ? 'mention-highlight' : ''} ${message.status === 'sending' ? 'msg-sending' : ''} ${message.status === 'failed' ? 'msg-failed' : ''}`} 
                                  style={{ position: 'relative' }}
                                >
                                      {/* Message Hover Action Bar */}
                                      <div className="message-hover-actions">
                                        {['👍', '❤️', '😂', '🔥', '🎮', '💀'].map(emoji => (
                                          <button 
                                            key={emoji}
                                            type="button" 
                                            className="hover-action-btn"
                                            onClick={() => toggleReaction(message.id, emoji)}
                                            title={`Reagir com ${emoji}`}
                                          >
                                            {emoji}
                                          </button>
                                        ))}
                                        <button 
                                          type="button" 
                                          className="hover-action-btn"
                                          onClick={() => setReplyingToMessage(message)}
                                          title="Responder a esta mensagem"
                                        >
                                          ↩️
                                        </button>
                                        <button 
                                          type="button" 
                                          className={`hover-action-btn star-btn ${isMessageSaved(message.id) ? 'active' : ''}`}
                                          onClick={() => toggleSaveMessage(message, 'channel', {
                                            sourceName: `#${selectedChannel.name} • ${currentSpace?.name || 'Servidor'}`,
                                            spaceId: currentSpace?.id,
                                            channelId: selectedChannel.id
                                          })}
                                          title={isMessageSaved(message.id) ? "Remover dos favoritos" : "Salvar mensagem com estrela (⭐)"}
                                        >
                                          <StarIcon style={{ width: '13px', height: '13px', color: isMessageSaved(message.id) ? '#ffc107' : 'inherit', fill: isMessageSaved(message.id) ? '#ffc107' : 'none' }} />
                                        </button>
                                        {canManagePins && (
                                          <button 
                                            type="button" 
                                            className="hover-action-btn"
                                            onClick={() => togglePinMessage(message, currentSpace.id, selectedChannel.id)}
                                            title={isPinned ? "Desafixar Mensagem" : "Fixar Mensagem no Canal"}
                                          >
                                            <PinIcon style={{ width: '13px', height: '13px', color: isPinned ? 'var(--accent-color)' : 'inherit' }} />
                                          </button>
                                        )}
                                        {(message.author_id === user.id || canManagePins) && (
                                          <button 
                                            type="button" 
                                            className="hover-action-btn delete-btn"
                                            onClick={() => handleDeleteMessage(message.id)}
                                            title="Excluir mensagem"
                                          >
                                            <TrashIcon style={{ width: '13px', height: '13px' }} />
                                          </button>
                                        )}
                                      </div>

                                      {isConsecutive ? (
                                        <div className="msg-consecutive-gutter">
                                          <time className="consecutive-time" title={msgDate.toLocaleTimeString('pt-BR')}>
                                            {msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </time>
                                        </div>
                                      ) : (
                                        <div 
                                          className={`msg-avatar ${message.author_id === user.id ? 'avatar-self' : 'avatar-other'}`} 
                                          style={{ position: 'relative', overflow: 'visible', cursor: 'pointer' }}
                                          onClick={() => {
                                            if (currentSpace) {
                                              const memRoles = memberRoleMap[message.author_id] || []
                                              const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                              setInspectedMember({
                                                user: {
                                                  id: message.author_id,
                                                  display_name: message.profile?.display_name || 'Membro',
                                                  avatar_url: message.profile?.avatar_url
                                                },
                                                roleName: msgRole?.name,
                                                roleColor: msgRole?.color,
                                                roles: matchingRoles
                                              })
                                            }
                                          }}
                                          title="Ver perfil do membro"
                                        >
                                          <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {message.profile?.avatar_url ? (
                                              <img src={message.profile.avatar_url} alt={message.profile.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                              (message.profile?.display_name ?? 'E').slice(0, 1).toUpperCase()
                                            )}
                                          </div>
                                          {(() => {
                                            const deco = message.author_id === user.id ? (avatarDecoration || null) : (presenceData[message.author_id]?.avatar_decoration || null)
                                            return deco && deco !== 'none' ? <AvatarDecoration decorationId={deco} /> : null
                                          })()}
                                        </div>
                                      )}

                                      <div className="msg-body">
                                        {!isConsecutive && (
                                          <>
                                            {replyQuoteText && (
                                              <div className="reply-preview-in-message">
                                                <span>↩️</span>
                                                <em>{replyQuoteText}</em>
                                              </div>
                                            )}

                                            <div className="msg-meta">
                                              {(() => {
                                                const authorNameEffect = message.author_id === user.id ? (nameEffect || 'resonance_cyan') : (presenceData[message.author_id]?.name_effect || localStorage.getItem(`echo-name-effect-${message.author_id}`) || 'none')
                                                const authorNameMeta = NAME_EFFECTS.find(n => n.id === authorNameEffect)
                                                return (
                                                  <>
                                                    <strong 
                                                      className={authorNameEffect && authorNameEffect !== 'none' ? `name-effect-${authorNameEffect}` : ''}
                                                      style={{ color: (authorNameEffect && authorNameEffect !== 'none') ? undefined : (msgRole?.color || 'var(--text-primary)'), cursor: 'pointer' }}
                                                      onClick={() => {
                                                        if (currentSpace) {
                                                          const memRoles = memberRoleMap[message.author_id] || []
                                                          const matchingRoles = serverRoles.filter(r => memRoles.includes(r.id))
                                                          setInspectedMember({
                                                            user: {
                                                              id: message.author_id,
                                                              display_name: message.profile?.display_name || 'Membro',
                                                              avatar_url: message.profile?.avatar_url
                                                            },
                                                            roleName: msgRole?.name,
                                                            roleColor: msgRole?.color,
                                                            roles: matchingRoles
                                                          })
                                                        }
                                                      }}
                                                    >
                                                      {message.profile?.display_name ?? 'Membro'}
                                                    </strong>
                                                    {authorNameEffect && authorNameEffect !== 'none' && (
                                                      <span className="name-soundwave-indicator" title={authorNameMeta?.name || 'Aura Sonora'}>
                                                        <span className="name-soundwave-bar" style={{ background: authorNameMeta?.themeColor || '#00f2fe' }} />
                                                        <span className="name-soundwave-bar" style={{ background: authorNameMeta?.themeColor || '#00f2fe' }} />
                                                        <span className="name-soundwave-bar" style={{ background: authorNameMeta?.themeColor || '#00f2fe' }} />
                                                      </span>
                                                    )}
                                                  </>
                                                )
                                              })()}

                                              {authorClanTag && (
                                                <span 
                                                  className="echo-clan-tag" 
                                                  style={{ 
                                                    color: authorClanTagColor, 
                                                    borderColor: `${authorClanTagColor}66`, 
                                                    background: `${authorClanTagColor}15`, 
                                                    fontSize: '9.5px', 
                                                    padding: '1px 5px', 
                                                    borderRadius: '4px' 
                                                  }}
                                                >
                                                  [{authorClanTag}]
                                                </span>
                                              )}

                                              {msgRole && (
                                                <span 
                                                  style={{ 
                                                    fontSize: '10px', 
                                                    fontWeight: 700, 
                                                    padding: '1px 6px', 
                                                    borderRadius: '4px', 
                                                    color: msgRole.color, 
                                                    background: `${msgRole.color}18`, 
                                                    border: `1px solid ${msgRole.color}44` 
                                                  }}
                                                >
                                                  {msgRole.name}
                                                </span>
                                              )}

                                              <time>{msgDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</time>
                                              
                                               {isPinned && (
                                                 <span title="Mensagem Fixada" style={{ fontSize: '11px', color: 'var(--accent-color)', marginLeft: '4px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                   📌 <span style={{ fontSize: '10px', fontWeight: 700 }}>Fixada</span>
                                                 </span>
                                               )}
                                             </div>
                                          </>
                                        )}

                                        {/* Message content */}
                                        {message.attachment_url && message.attachment_type === 'image' ? (
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            <img
                                              src={message.attachment_url}
                                              alt="anexo"
                                              className="msg-attachment-img"
                                              onClick={() => openLightbox(message.attachment_url!)}
                                            />
                                            {displayedBody && displayedBody !== 'Imagem' && !displayedBody.startsWith('http') && (
                                              <p>{formatMessageText(displayedBody, profileDisplayName, serverEmojis)}</p>
                                            )}
                                          </div>
                                        ) : message.attachment_url && message.attachment_type === 'audio' ? (
                                          <ModernVoiceNotePlayer
                                            audioUrl={message.attachment_url}
                                            messageId={message.id}
                                            activePlayingId={activePlayingVoiceNote}
                                            onTogglePlay={() => handleToggleVoicePlay(message.id, message.attachment_url!)}
                                            speed={voiceNotePlaySpeed}
                                            onChangeSpeed={handleChangeVoiceSpeed}
                                            activeAudioRef={voiceNoteAudioRef}
                                          />
                                        ) : message.attachment_url && message.attachment_type !== 'image' ? (
                                          <a
                                            href={message.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="msg-attachment-file"
                                            onClick={(e) => {
                                              e.preventDefault()
                                              openExternalUrl(message.attachment_url)
                                            }}
                                          >
                                            <PaperclipIcon style={{ width: '13px', height: '13px', display: 'inline-block', verticalAlign: 'middle', marginRight: '5px' }} />
                                            <span>{displayedBody}</span>
                                          </a>
                                        ) : (
                                          <>
                                            <p>{formatMessageText(displayedBody, profileDisplayName, serverEmojis)}</p>
                                            {renderRichEmbed(displayedBody)}
                                          </>
                                        )}

                                        {/* Emoji Reactions Pills */}
                                        {Object.keys(reactions).length > 0 && (
                                          <div className="message-reactions-row">
                                            {Object.entries(reactions).map(([em, userIds]) => {
                                              const hasReacted = userIds.includes(user.id)
                                              return (
                                                <button
                                                  key={em}
                                                  type="button"
                                                  className={`reaction-pill ${hasReacted ? 'reacted' : ''}`}
                                                  onClick={() => toggleReaction(message.id, em)}
                                                  title={hasReacted ? "Remover sua reação" : "Adicionar reação"}
                                                >
                                                  <span>{em}</span>
                                                  <span>{userIds.length}</span>
                                                </button>
                                              )
                                            })}
                                          </div>
                                        )}

                                        {/* Status do envio em tempo real */}
                                        {message.status === 'sending' && (
                                          <div className="msg-status-indicator sending">
                                            <span className="msg-sending-dot" />
                                            <span>Enviando...</span>
                                          </div>
                                        )}
                                        {message.status === 'failed' && (
                                          <div className="msg-status-indicator failed">
                                            <span className="msg-failed-badge">⚠️ Falha ao enviar</span>
                                            <button 
                                              type="button" 
                                              className="msg-retry-btn" 
                                              onClick={() => retrySendMessage(message)}
                                              title="Tentar enviar esta mensagem novamente"
                                            >
                                              Tentar novamente
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </article>
                                  </div>
                                  )
                                })}
                              </div>
                              <div style={{ height: '24px', flexShrink: 0 }} />
                              <div ref={messagesEndRef} />
                      </div>

                      {/* Announcement / Read-only Channel check */}
                      {selectedChannel.is_announcement && currentSpace && !canUserDo(currentSpace.id, user.id, 'sendInAnnouncementChannels') ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px 20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '13px', margin: '0 16px 16px 16px' }}>
                          <MegaphoneIcon style={{ color: 'var(--accent-color)' }} />
                          <span>📢 Canal de Anúncios — Apenas administradores e moderadores podem enviar mensagens neste canal.</span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                          {/* Reply Quote Banner */}
                          {replyingToMessage && (
                            <div className="reply-quote-bar">
                              <span>
                                ↩️ Respondendo a <strong>@{replyingToMessage.profile?.display_name || 'Membro'}</strong>: "{replyingToMessage.body.slice(0, 45)}..."
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
                                <div className="composer-image-staging">
                                  <div className="staging-thumb-wrap">
                                    <img src={pendingImagePreview} alt="Screenshot colado" />
                                  </div>
                                  <div className="staging-info">
                                    <div className="staging-title-row">
                                      <span className="staging-badge">Print / Clipboard</span>
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
                                    title="Descartar print (Esc)"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                              <form className="composer" onSubmit={handleComposerSubmit} style={{ position: 'relative' }}>
                                <input type="file" id="chat-file-input" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleChatFileUpload(f); e.target.value = '' }} />
                                <button type="button" className="dm-attach-btn" onClick={() => document.getElementById('chat-file-input')?.click()} disabled={isUploading} title="Anexar arquivo ou imagem" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 8px 0 0', display: 'flex', alignItems: 'center' }}>
                                  <PaperclipIcon />
                                </button>

                                {/* Voice Note Button */}
                                <button 
                                  type="button" 
                                  className="dm-attach-btn" 
                                  onClick={() => startVoiceNoteRecording('channel')} 
                                  title="Gravar Mensagem de Voz"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 6px 0 0', display: 'flex', alignItems: 'center' }}
                                >
                                  <VoiceMessageIcon />
                                </button>

                                {/* GIF Picker Button */}
                                <button 
                                  type="button" 
                                  className="dm-attach-btn" 
                                  onClick={() => setShowGifPicker(!showGifPicker)} 
                                  title="Escolher GIF Gamer"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: showGifPicker ? 'var(--accent-color)' : 'var(--text-muted)', padding: '0 6px 0 0', display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: '11px', letterSpacing: '0.5px' }}
                                >
                                  GIF
                                </button>

                                {/* Emoji Picker Button */}
                                <button 
                                  type="button" 
                                  className="dm-attach-btn" 
                                  onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                                  title="Escolher Emoji"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: showEmojiPicker ? 'var(--accent-color)' : 'var(--text-muted)', padding: '0 6px 0 0', display: 'flex', alignItems: 'center' }}
                                >
                                  <SmileIcon />
                                </button>

                                <input 
                                  id="chat-input-field"
                                  value={draft} 
                                  onChange={(e) => {
                                    setDraft(e.target.value)
                                    if (notifyTyping) notifyTyping()
                                  }} 
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
                                <button type="submit" className="send-btn" disabled={(!draft.trim() && !pendingPastedFile) || isUploading}>
                                  <span>↑</span>
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
                              </form>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pinned Messages Drawer */}
                    <PinnedMessagesDrawer
                      isOpen={showPinnedMessagesPanel}
                      onClose={() => setShowPinnedMessagesPanel(false)}
                      channelId={selectedChannel.id}
                      pinnedMessages={pinnedMessages}
                      currentSpace={currentSpace}
                      canUserDo={canUserDo}
                      userId={user.id}
                      messages={messages}
                      togglePinMessage={togglePinMessage}
                      profileDisplayName={profileDisplayName}
                      serverEmojis={serverEmojis}
                    />

                    <MembersSidebar
                      isVisible={showMembersList}
                      currentSpace={currentSpace}
                      spaceMembers={spaceMembers}
                      spaceChannels={spaceChannels}
                      activeVoiceChannelId={activeVoiceChannelId}
                      participants={participants}
                      spaceVoiceUsers={spaceVoiceUsers}
                      onlineUsers={onlineUsers}
                      presenceData={presenceData}
                      user={user}
                      presenceStatus={presenceStatus}
                      myGamePresence={myGamePresence}
                      avatarDecoration={avatarDecoration}
                      nameEffect={nameEffect}
                      serverRoles={serverRoles}
                      memberRoleMap={memberRoleMap}
                      getUserHighestRole={getUserHighestRole}
                      setSpaceForAddMembers={setSpaceForAddMembers}
                      setInspectedMember={setInspectedMember}
                      setHoveredMemberPopover={setHoveredMemberPopover}
                      hoverTimeoutRef={hoverTimeoutRef}
                    />
                  </div>
                </>
  )
}
