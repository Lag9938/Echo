import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { VoiceParticipant } from '../lib/useVoiceChannel'
import type { Space, Channel, Message, PinnedMessage, ServerEmoji, RolePermissions, ServerRole } from '../types'
import { MembersSidebar } from '../components/sidebar/MembersSidebar'
import { useHoverPeek } from '../hooks/useHoverPeek'
import { PinnedMessagesDrawer } from '../components/chat/PinnedMessagesDrawer'
import { MessageList } from '../components/chat/MessageList'
import { MessageComposer } from '../components/chat/MessageComposer'
import { StreamTile } from '../components/streaming/StreamTile'
import {
  BrainIcon,
  GridIcon,
  HeadphonesIcon,
  HeadphonesOffIcon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  MusicIcon,
  PinIcon,
  PipIcon,
  PlayIcon,
  ScreenIcon,
  SearchIcon,
  SoundboardIcon,
  StopSquareIcon,
  UsersIcon,
  VideoCallIcon,
  VideoOffIcon,
  VolumeIcon
} from '../components/icons'
import { useUIStore } from '../stores/useUIStore'
import { useSpacesStore } from '../stores/useSpacesStore'
import { useMusicBotStore } from '../stores/useMusicBotStore'
import { isMusicBotIdentity } from '../lib/musicBotState'
import { isSixtyFpsAllowed } from '../lib/screenShareQuality'
import { resolveMusicBotAvatarUrl } from '../lib/musicBotAvatars'
import { MusicBotParticipantCard } from '../components/voice/MusicBotParticipantCard'
import { MusicBotAvatarPickerModal } from '../components/modals/MusicBotAvatarPickerModal'

// Tile de vídeo de câmera (chamada de vídeo estilo Discord — versão simples).
// MediaStream não pode ser passado como atributo JSX (precisa de srcObject via ref/efeito).
const CameraVideoTile = memo(function CameraVideoTile({ stream, mirrored }: { stream: MediaStream; mirrored?: boolean }) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const el = videoRef.current
    if (el && el.srcObject !== stream) {
      el.srcObject = stream
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        borderRadius: 'inherit',
        transform: mirrored ? 'scaleX(-1)' : undefined,
        background: '#000'
      }}
    />
  )
})

export interface VoiceChannelViewProps {
  currentSpace: Space | null
  selectedChannel: Channel
  spaceChannels?: Record<string, Channel[]>
  spaceVoiceUsers?: Record<string, any[]>
  user: User
  profileDisplayName: string
  profileAvatarUrl: string
  avatarDecoration?: string | null
  presenceData: Record<string, any>
  onlineUsers: Set<string>
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'invisible'
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  nameEffect?: string | null
  serverRoles: ServerRole[]
  memberRoleMap: Record<string, string[]>
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  setSpaceForAddMembers: (space: Space) => void
  setInspectedMember: (val: any) => void
  setHoveredMemberPopover: (val: any) => void
  hoverTimeoutRef: React.MutableRefObject<any>
  spaceMembers?: any[]
  activeVoiceChannelId: string | null
  isConnected: boolean
  participants: VoiceParticipant[]
  handleJoinVoice: (channelId: string, spaceId?: string) => void
  handleLeaveVoice: () => void
  isMuted: boolean
  handleToggleMute: () => void
  isDeafened: boolean
  handleToggleDeafen: () => void
  isAiDenoiseEnabled: boolean
  toggleAiDenoise: () => void
  isPttMode: boolean
  isPttActive: boolean
  pttKey: string
  setShowSoundboardModal: (val: boolean) => void
  isRecordingCall: boolean
  startCallRecording: () => void
  stopCallRecording: () => void
  recordingDuration: number
  setVolumeControlUser: (user: any) => void
  activeScreenSharers: VoiceParticipant[]
  activeScreenSharer: VoiceParticipant | null
  _selectedScreenSharerUserId?: string | null
  setSelectedScreenSharerUserId: (id: string | null) => void
  screenShareViewMode: 'focus' | 'grid'
  setScreenShareViewMode: (mode: 'focus' | 'grid') => void
  isWatchingStreams: boolean
  setIsWatchingStreams: (val: boolean) => void
  isPiPActive: boolean
  setIsPiPActive: (val: boolean) => void
  localScreenStream: MediaStream | null
  handleStopScreenShare: () => void
  openScreenPicker: () => void
  forceOpenScreenPicker: () => void
  localCameraStream: MediaStream | null
  handleToggleCamera: () => void
  screenQuality: string
  handleQualityChange: (q: any) => void | Promise<void>
  screenFps: number
  handleFpsChange: (fps: any) => void | Promise<void>
  isPremiumUser?: boolean
  onOpenSubscription?: () => void
  _isCurrentStreamGameOrScreen?: boolean
  activeSharingSource: any
  _is60DisabledInCall?: boolean
  peerScreenVolumes: Record<string, number>
  setPeerScreenVolumes: React.Dispatch<React.SetStateAction<Record<string, number>>>
  _localScreenFps?: number
  screenAudioSyncDelayMs: number
  changeScreenAudioSyncDelay: (val: number) => void
  screenShareContainerRef: React.RefObject<HTMLDivElement | null>
  isScreenFullScreen: boolean
  toggleScreenFullScreen: (force?: boolean) => void
  messages: Message[]
  hasMoreMessages?: boolean
  isLoadingMore?: boolean
  isLoadingMessages?: boolean
  loadMoreMessages?: (channelId: string) => Promise<void> | void
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>
  retrySendMessage?: (msg: any) => void
  replyingToMessage?: Message | null
  setReplyingToMessage?: (msg: Message | null) => void
  messageReactions?: Record<string, Record<string, string[]>>
  toggleReaction?: (msgId: string, emoji: string) => void
  slowmodeCooldown?: number
  postChannelMessage?: (channelId: string, body: string, attachmentUrl?: string, attachmentType?: string, existingTempId?: string) => Promise<any> | void
  supabase?: any
  typingUsers?: string[]
  notifyTyping?: () => void
  send: (e: React.FormEvent) => void
  draft: string
  setDraft: (val: string) => void
  handleChatFileUpload: (file: File, caption?: string, sizePreference?: string) => void
  isUploading: boolean
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  isMessageSaved: (msgId: string) => boolean
  toggleSaveMessage: (msg: Message, type: 'channel' | 'dm', extra?: any) => void
  handleDeleteMessage: (msgId: string) => void
  activePlayingVoiceNote: string | null
  handleToggleVoicePlay: (id: string, url: string) => void
  voiceNotePlaySpeed: number
  handleChangeVoiceSpeed: () => void
  voiceNoteAudioRef: React.RefObject<HTMLAudioElement | null>
  serverEmojis?: ServerEmoji[]
  pinnedMessages: Record<string, PinnedMessage[]>
  togglePinMessage: (msg: Message, spaceId: string, channelId: string) => void
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  showVoiceChat: boolean
  setShowVoiceChat: React.Dispatch<React.SetStateAction<boolean>>
  showMembersList: boolean
  setShowMembersList: React.Dispatch<React.SetStateAction<boolean>>
  showPinnedMessagesPanel: boolean
  setShowPinnedMessagesPanel: React.Dispatch<React.SetStateAction<boolean>>
  showSearchInput: boolean
  setShowSearchInput: React.Dispatch<React.SetStateAction<boolean>>
  searchQuery: string
  setSearchQuery: (val: string) => void
  showScreenMenu: boolean
  setShowScreenMenu: React.Dispatch<React.SetStateAction<boolean>>
  sidebarLayout?: 'glass' | 'classic'
}

export const VoiceChannelView = memo(function VoiceChannelView(props: VoiceChannelViewProps) {
  const storeSpaceMembers = useSpacesStore((s) => s.spaceMembers)
  const storeSpaceChannels = useSpacesStore((s) => s.spaceChannels)
  const storeSpaceVoiceUsers = useSpacesStore((s) => s.spaceVoiceUsers)
  const storePresenceStatus = useUIStore((s) => s.presenceStatus)

  const spaceMembers = props.spaceMembers ?? storeSpaceMembers
  const spaceChannels = props.spaceChannels ?? storeSpaceChannels
  const spaceVoiceUsers = props.spaceVoiceUsers ?? storeSpaceVoiceUsers
  const presenceStatus = props.presenceStatus ?? storePresenceStatus

  const {
    sidebarLayout = 'glass',
    currentSpace,
    selectedChannel,
    user,
    profileDisplayName,
    profileAvatarUrl = '',
    avatarDecoration,
    presenceData,
    onlineUsers,
    myGamePresence,
    nameEffect,
    serverRoles,
    memberRoleMap,
    getUserHighestRole,
    setSpaceForAddMembers,
    setInspectedMember,
    setHoveredMemberPopover,
    hoverTimeoutRef,
    activeVoiceChannelId,
    isConnected,
    participants,
    handleJoinVoice,
    handleLeaveVoice,
    isMuted,
    handleToggleMute,
    isDeafened,
    handleToggleDeafen,
    isAiDenoiseEnabled,
    toggleAiDenoise,
    isPttMode,
    isPttActive,
    pttKey,
    setShowSoundboardModal,
    setVolumeControlUser,
    activeScreenSharers,
    activeScreenSharer,
    setSelectedScreenSharerUserId,
    screenShareViewMode,
    setScreenShareViewMode,
    isWatchingStreams,
    setIsWatchingStreams,
    isPiPActive,
    setIsPiPActive,
    localScreenStream,
    handleStopScreenShare,
    openScreenPicker,
    forceOpenScreenPicker,
    localCameraStream,
    handleToggleCamera,
    screenQuality,
    handleQualityChange,
    screenFps,
    handleFpsChange,
    isPremiumUser: _isPremiumUser = false,
    onOpenSubscription: _onOpenSubscription,
    activeSharingSource,
    peerScreenVolumes,
    setPeerScreenVolumes,
    screenAudioSyncDelayMs,
    changeScreenAudioSyncDelay,
    screenShareContainerRef,
    isScreenFullScreen,
    toggleScreenFullScreen,
    messages,
    hasMoreMessages = false,
    isLoadingMore = false,
    isLoadingMessages = false,
    loadMoreMessages,
    messagesContainerRef,
    retrySendMessage,
    replyingToMessage: propReplyingToMessage,
    setReplyingToMessage: propSetReplyingToMessage,
    messageReactions = {},
    toggleReaction,
    slowmodeCooldown = 0,
    postChannelMessage,
    supabase,
    typingUsers = [],
    notifyTyping,
    send,
    draft,
    setDraft,
    handleChatFileUpload,
    isUploading,
    canUserDo,
    isMessageSaved,
    toggleSaveMessage,
    handleDeleteMessage,
    activePlayingVoiceNote,
    handleToggleVoicePlay,
    voiceNotePlaySpeed,
    handleChangeVoiceSpeed,
    voiceNoteAudioRef,
    serverEmojis = [],
    pinnedMessages,
    togglePinMessage,
    messagesEndRef,
    showVoiceChat,
    setShowVoiceChat,
    showMembersList,
    setShowMembersList,
    showPinnedMessagesPanel,
    setShowPinnedMessagesPanel,
    showSearchInput,
    setShowSearchInput,
    searchQuery,
    setSearchQuery,
    showScreenMenu,
    setShowScreenMenu
  } = props
  const openLightbox = useUIStore((s) => s.openLightbox)
  const setShowMusicBotModal = useUIStore((s) => s.setShowMusicBotModal)
  const myBotAvatar = useMusicBotStore((s) => s.myAvatar)
  const [isMusicBotAvatarPickerOpen, setIsMusicBotAvatarPickerOpen] = useState(false)
  const [pendingVoicePastedFile, setPendingVoicePastedFile] = useState<File | null>(null)
  const [pendingVoiceImagePreview, setPendingVoiceImagePreview] = useState<string | null>(null)
  const [pendingVoiceImageSize, setPendingVoiceImageSize] = useState<'small' | 'medium' | 'large' | 'original'>('medium')

  const [localReplyingToMessage, setLocalReplyingToMessage] = useState<Message | null>(null)
  const replyingToMessage = propReplyingToMessage !== undefined ? propReplyingToMessage : localReplyingToMessage
  const setReplyingToMessage = propSetReplyingToMessage ?? setLocalReplyingToMessage

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiPickerTab, setEmojiPickerTab] = useState<'default' | 'server'>('default')
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifSearchQuery, setGifSearchQuery] = useState('')
  const [showStickerPicker, setShowStickerPicker] = useState(false)

  const handleSendSticker = async (url: string, name?: string) => {
    if (selectedChannel && postChannelMessage) {
      await postChannelMessage(selectedChannel.id, name ? `[Sticker: ${name}]` : 'Sticker', url, 'sticker')
      setShowStickerPicker(false)
    }
  }

  // Mention Autocomplete State (@)
  const [showMentionPicker, setShowMentionPicker] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const chatInputRef = useRef<HTMLInputElement | null>(null)

  const mentionCandidates = useMemo(() => {
    const list: { id: string; name: string; avatarUrl?: string; roleName?: string; roleColor?: string; isSpecial?: boolean }[] = []
    const q = mentionQuery.toLowerCase().trim()

    if (!q || 'todos'.includes(q) || 'everyone'.includes(q)) {
      list.push({
        id: 'everyone-mention',
        name: 'todos',
        roleName: 'Notificar todos no canal',
        roleColor: '#f59e0b',
        isSpecial: true
      })
    }

    const seen = new Set<string>()
    ;(spaceMembers || []).forEach(m => {
      const u = m.user || m
      if (!u || !u.id || seen.has(u.id)) return
      seen.add(u.id)
      const dName = u.display_name || u.name || 'Membro'
      if (!q || dName.toLowerCase().includes(q)) {
        const role = getUserHighestRole?.(currentSpace?.id || '', u.id)
        list.push({
          id: u.id,
          name: dName,
          avatarUrl: u.avatar_url,
          roleName: role?.name,
          roleColor: role?.color
        })
      }
    })

    return list.slice(0, 8)
  }, [mentionQuery, spaceMembers, currentSpace?.id, getUserHighestRole])

  const selectMention = useCallback((candidate: { name: string }) => {
    if (!candidate || mentionStartIndex === -1) return
    const input = chatInputRef.current
    const cursorPos = input?.selectionStart ?? draft.length
    const beforeAt = draft.slice(0, mentionStartIndex)
    const afterCursor = draft.slice(cursorPos)
    const mentionText = `@${candidate.name} `
    const newDraft = beforeAt + mentionText + afterCursor
    setDraft(newDraft)
    setShowMentionPicker(false)
    setMentionStartIndex(-1)

    setTimeout(() => {
      if (input) {
        input.focus()
        const newPos = beforeAt.length + mentionText.length
        input.setSelectionRange(newPos, newPos)
      }
    }, 10)
  }, [draft, mentionStartIndex, setDraft])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setDraft(val)
    if (notifyTyping) notifyTyping()

    const cursorPos = e.target.selectionStart ?? val.length
    const textBeforeCursor = val.slice(0, cursorPos)
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\u00C0-\u017F]*)$/)

    if (match) {
      const q = match[1]
      const atIdx = textBeforeCursor.lastIndexOf('@')
      setMentionQuery(q)
      setMentionStartIndex(atIdx)
      setSelectedMentionIndex(0)
      setShowMentionPicker(true)
    } else {
      setShowMentionPicker(false)
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentionPicker && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedMentionIndex(prev => (prev + 1) % mentionCandidates.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedMentionIndex(prev => (prev - 1 + mentionCandidates.length) % mentionCandidates.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        selectMention(mentionCandidates[selectedMentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentionPicker(false)
        return
      }
    }
  }

  const removePendingVoiceImage = useCallback(() => {
    setPendingVoicePastedFile(null)
    setPendingVoiceImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const handleVoicePaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
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

          setPendingVoiceImagePreview(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(renamedFile)
          })
          setPendingVoicePastedFile(renamedFile)
          return
        }
      }
    }
  }, [])

  // Chat de texto da chamada: abre no fim e acompanha as mensagens novas. Só rola sozinho se a pessoa já
  // estava perto do fim (quem subiu para ler o histórico não é puxado de volta).
  const lastVoiceChatMessageId = messages[messages.length - 1]?.id
  // Passar o mouse nos botões de chat e de membros espia a janela; o clique a fixa
  const chatPeek = useHoverPeek(showVoiceChat, setShowVoiceChat)
  const membersPeek = useHoverPeek(showMembersList, setShowMembersList)
  const voiceChatOpen = chatPeek.visible
  const voiceChatAtBottomRef = useRef(true)
  useEffect(() => { voiceChatAtBottomRef.current = true }, [selectedChannel.id, voiceChatOpen])
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement
    if (!voiceChatOpen || !container) return
    if (voiceChatAtBottomRef.current) container.scrollTop = container.scrollHeight
    const onScroll = () => {
      voiceChatAtBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 160
    }
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => container.removeEventListener('scroll', onScroll)
  }, [lastVoiceChatMessageId, voiceChatOpen, selectedChannel.id, messagesEndRef])

  // Window paste listener when voice chat drawer is visible
  useEffect(() => {
    if (!voiceChatOpen) return
    const onWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === 'INPUT' && target.id !== 'voice-chat-input') {
        return
      }
      if (target && target.tagName === 'TEXTAREA') {
        return
      }
      handleVoicePaste(e)
    }
    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [voiceChatOpen, handleVoicePaste])

  // Esc key cancels pending voice chat image
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingVoicePastedFile) {
        removePendingVoiceImage()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingVoicePastedFile, removePendingVoiceImage])

  const handleVoiceComposerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pendingVoicePastedFile) {
      const file = pendingVoicePastedFile
      const caption = draft.trim()
      const sizePref = pendingVoiceImageSize
      removePendingVoiceImage()
      setDraft('')
      await handleChatFileUpload(file, caption, sizePref)
      return
    }
    send(e)
  }

  return (
                <div className="voice-room">
                  <header className="content-header">
                    <div className="header-info voice-header-info">
                      <h1><span className="header-icon"><VolumeIcon /></span> {selectedChannel.name}</h1>
                      <span className="header-sub">
                        {currentSpace?.name}
                      </span>
                    </div>
                    <div className="channel-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

                      {/* Search messages in channel */}
                      <div className="channel-search-box-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        {showSearchInput ? (
                          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '2px 8px' }}>
                            <SearchIcon style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                            <input 
                              type="text" 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Buscar mensagens..."
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
                            onClick={() => {
                              setShowSearchInput(true)
                              setShowVoiceChat(true)
                            }} 
                            title="Buscar mensagens no chat da call"
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

                      {/* Voice Text Chat Toggle Button */}
                      <button 
                        type="button"
                        className={`channel-header-action-btn ${showVoiceChat ? 'active' : ''}${chatPeek.peek ? ' peeking' : ''}`}
                        title={showVoiceChat ? "Ocultar Chat de Texto" : "Mostrar Chat de Texto"}
                        {...chatPeek.triggerProps}
                      >
                        <MessageSquareIcon style={{ width: '15px', height: '15px' }} />
                      </button>

                      {/* Members List Button */}
                      <button 
                        type="button"
                        className={`channel-header-action-btn ${showMembersList ? 'active' : ''}${membersPeek.peek ? ' peeking' : ''}`}
                        title={showMembersList ? "Ocultar Lista de Membros" : "Mostrar Lista de Membros"}
                        {...membersPeek.triggerProps}
                      >
                        <UsersIcon style={{ width: '15px', height: '15px' }} />
                      </button>
                    </div>
                  </header>

                  <div className="voice-workspace-wrapper" style={{ display: 'flex', flex: 1, minHeight: 0, width: '100%' }}>
                    <div className="voice-content" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0', minWidth: 0 }}>
                      <div className="voice-split-layout" style={!voiceChatOpen ? { gridTemplateColumns: '1fr' } : undefined}>
                          {/* Media pane (Left) */}
                          <div className="voice-media-pane">
                            {(() => {
                              const callMembersMap = new Map<string, VoiceParticipant>()
                              if (activeVoiceChannelId === selectedChannel.id && isConnected) {
                                participants.forEach(p => { if (p?.userId) callMembersMap.set(p.userId, p) })
                              }
                              const spUsers = spaceVoiceUsers[selectedChannel.id] || []
                              spUsers.forEach(p => {
                                if (p?.userId && !callMembersMap.has(p.userId)) {
                                  callMembersMap.set(p.userId, p)
                                }
                              })
                              if (activeVoiceChannelId === selectedChannel.id && user?.id && !callMembersMap.has(user.id)) {
                                callMembersMap.set(user.id, {
                                  userId: user.id,
                                  displayName: profileDisplayName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Você',
                                  avatarUrl: profileAvatarUrl || user.user_metadata?.avatar_url,
                                  isSpeaking: false,
                                  isMuted,
                                  isDeafened,
                                  screenStream: localScreenStream || undefined,
                                  isScreenSharing: !!(localScreenStream && localScreenStream.getVideoTracks().length > 0),
                                  cameraStream: localCameraStream || undefined,
                                  isCameraOn: !!(localCameraStream && localCameraStream.getVideoTracks().length > 0)
                                })
                              }
                              const callMembersList = Array.from(callMembersMap.values())

                              return (
                                <>
                                  {activeScreenSharers.length > 0 && isWatchingStreams ? (
                                    <div className="voice-streams-container">

                                {screenShareViewMode === 'grid' && activeScreenSharers.length > 1 ? (
                                  <div className="streams-multi-grid" style={{ gridTemplateColumns: `repeat(${Math.min(activeScreenSharers.length, 2)}, 1fr)` }}>
                                    {activeScreenSharers.map(sharer => (
                                      <StreamTile
                                        key={sharer.userId}
                                        participant={sharer}
                                        user={user}
                                        peerScreenVolumes={peerScreenVolumes}
                                        setPeerScreenVolumes={setPeerScreenVolumes}
                                        isGrid={true}
                                        isPiPActive={isPiPActive}
                                        onToggleFloatingPiP={() => setIsPiPActive(!isPiPActive)}
                                        onSelectFocus={() => {
                                          setSelectedScreenSharerUserId(sharer.userId)
                                          setScreenShareViewMode('focus')
                                        }}
                                        onCloseStream={() => setIsWatchingStreams(false)}
                                        localScreenFps={screenFps}
                                        screenAudioSyncDelayMs={screenAudioSyncDelayMs}
                                        onChangeScreenAudioSyncDelay={changeScreenAudioSyncDelay}
                                        isDeafened={isDeafened}
                                      />
                                    ))}
                                  </div>
                                ) : activeScreenSharer ? (
                                  <div className="stream-single-focus-wrap" ref={screenShareContainerRef}>
                                    <StreamTile
                                      participant={activeScreenSharer}
                                      user={user}
                                      peerScreenVolumes={peerScreenVolumes}
                                      setPeerScreenVolumes={setPeerScreenVolumes}
                                      isFullScreen={isScreenFullScreen}
                                      onToggleFullScreen={() => toggleScreenFullScreen()}
                                      isPiPActive={isPiPActive}
                                      onToggleFloatingPiP={() => setIsPiPActive(!isPiPActive)}
                                      onCloseStream={() => {
                                        if (isScreenFullScreen) toggleScreenFullScreen(false)
                                        setIsWatchingStreams(false)
                                      }}
                                      localScreenFps={screenFps}
                                      screenAudioSyncDelayMs={screenAudioSyncDelayMs}
                                      onChangeScreenAudioSyncDelay={changeScreenAudioSyncDelay}
                                      isDeafened={isDeafened}
                                    />
                                  </div>
                                ) : null}

                                {/* Dock flutuante centralizado de participantes & controles na transmissão */}
                                <div className="stream-participants-strip-wrap">
                                  <div className={`stream-participants-strip ${sidebarLayout === 'classic' ? 'classic-strip' : 'glass-dock'}`}>
                                    {/* Membros na chamada */}
                                    {callMembersList.map(p => {
                                      const isMusicBot = isMusicBotIdentity(p.userId)
                                      const isSharer = !isMusicBot && Boolean(p.isScreenSharing || (p.screenStream && p.screenStream.getVideoTracks().length > 0))
                                      const isCurrentStreamer = activeScreenSharer?.userId === p.userId
                                      const botAvatarUrl = isMusicBot ? resolveMusicBotAvatarUrl(myBotAvatar) : null
                                      return (
                                        <div
                                          key={p.userId}
                                          className={`stream-strip-card ${p.isSpeaking ? 'speaking' : ''} ${isSharer ? 'is-sharer' : ''} ${isCurrentStreamer ? 'active-streamer' : ''} ${isMusicBot ? 'music-bot-strip' : ''}`}
                                          data-user-id={p.userId}
                                          onClick={() => {
                                            if (isMusicBot) {
                                              setShowMusicBotModal(true)
                                            } else if (isSharer && !isCurrentStreamer) {
                                              setSelectedScreenSharerUserId(p.userId)
                                              setIsWatchingStreams(true)
                                              setScreenShareViewMode('focus')
                                            } else if (p.userId !== user.id) {
                                              setVolumeControlUser(p)
                                            }
                                          }}
                                          title={isMusicBot ? 'Echo Music Bot (Clique para abrir painel)' : (isSharer ? (isCurrentStreamer ? `Transmissão de ${p.displayName} na tela` : `Clique para assistir à transmissão de ${p.displayName}`) : (p.userId !== user.id ? `Ajustar volume de áudio` : p.displayName))}
                                        >
                                          <div className="stream-strip-avatar">
                                            {isMusicBot ? (
                                              myBotAvatar === 'letter-e' ? (
                                                <span style={{ fontWeight: 900, background: 'linear-gradient(135deg, #06b6d4, #f97316)', color: '#fff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>E</span>
                                              ) : (
                                                <img src={botAvatarUrl!} alt="Echo Music Bot" />
                                              )
                                            ) : p.avatarUrl ? (
                                              <img src={p.avatarUrl} alt={p.displayName} />
                                            ) : (
                                              <span>{(p.displayName || 'M').slice(0, 1).toUpperCase()}</span>
                                            )}
                                            {p.isMuted ? (
                                              <span className="stream-strip-badge" title="Mutado">
                                                <MicOffIcon />
                                              </span>
                                            ) : isSharer ? (
                                              <span className="stream-strip-badge live" title={isCurrentStreamer ? 'Ao vivo (na tela)' : 'Transmitindo a tela'}>
                                                <ScreenIcon />
                                              </span>
                                            ) : isMusicBot ? (
                                              <span className="stream-strip-badge live" style={{ background: '#00f2fe', color: '#071320' }} title="Bot de Música">
                                                <MusicIcon style={{ width: '10px', height: '10px' }} />
                                              </span>
                                            ) : null}
                                          </div>
                                          <span className="stream-strip-name">{isMusicBot ? 'Echo Music Bot' : p.displayName}{p.userId === user.id ? ' (Você)' : ''}</span>
                                        </div>
                                      )
                                    })}

                                    {/* Divisor elegante */}
                                    <div className="stream-dock-divider" />

                                    {/* Ações Rápidas: Modo Grade/Foco, Mini Player & Ocultar Vídeo */}
                                    <div className="stream-dock-actions">
                                      <div className="stream-dock-seg" role="group" aria-label="Modo de exibição">
                                        {activeScreenSharers.length > 1 && (
                                          <button
                                            type="button"
                                            className={screenShareViewMode === 'grid' ? 'on' : ''}
                                            aria-pressed={screenShareViewMode === 'grid'}
                                            onClick={() => setScreenShareViewMode(screenShareViewMode === 'grid' ? 'focus' : 'grid')}
                                            title={screenShareViewMode === 'grid' ? "Modo Foco (Uma tela)" : "Modo Grade (Ver todas as telas)"}
                                          >
                                            <GridIcon style={{ width: '15px', height: '15px' }} />
                                            <span>Grade</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          className={isPiPActive ? 'on' : ''}
                                          aria-pressed={isPiPActive}
                                          onClick={() => setIsPiPActive(!isPiPActive)}
                                          title={isPiPActive ? "Fechar Mini Player Flutuante" : "Ativar Mini Player Flutuante (Always-on-Top)"}
                                        >
                                          <PipIcon style={{ width: '15px', height: '15px' }} />
                                          <span>Mini Player</span>
                                        </button>
                                      </div>

                                      {localScreenStream && (
                                        <button
                                          type="button"
                                          className="stream-dock-btn stop-btn"
                                          onClick={handleStopScreenShare}
                                          title="Parar de transmitir minha tela"
                                        >
                                          <StopSquareIcon style={{ width: '13px', height: '13px' }} />
                                          <span>Parar</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className={`participants-grid ${callMembersList.some(m => m.isCameraOn && m.cameraStream) ? 'has-cameras' : ''}`}>
                                {(() => {
                                  const displayList = callMembersList

                                  if (displayList.length === 0) {
                                    return (
                                      <div className="voice-empty-state" style={{
                                        gridColumn: '1 / -1',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '60px 20px',
                                        color: 'var(--text-muted)',
                                        gap: '12px'
                                      }}>
                                        <div style={{
                                          width: '68px',
                                          height: '68px',
                                          borderRadius: '50%',
                                          background: 'rgba(255, 255, 255, 0.05)',
                                          border: '1.5px solid rgba(255, 255, 255, 0.1)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'var(--text-secondary, #b5bac1)',
                                          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                                          marginBottom: '4px'
                                        }}>
                                          <MicIcon style={{ width: '34px', height: '34px' }} />
                                        </div>
                                        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Ninguém está nesta chamada agora</div>
                                        <p style={{ fontSize: '13px', margin: 0, textAlign: 'center', maxWidth: '360px' }}>Conecte-se para conversar ou transmitir a tela para seus amigos.</p>
                                        {activeVoiceChannelId !== selectedChannel.id && (
                                          <button 
                                            type="button" 
                                            className="voice-join-submit-btn" 
                                            style={{
                                              marginTop: '8px',
                                              padding: '10px 24px',
                                              borderRadius: '20px',
                                              background: '#23a55a',
                                              color: '#fff',
                                              border: 'none',
                                              fontWeight: 600,
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '8px',
                                              fontSize: '13px'
                                            }}
                                            onClick={() => handleJoinVoice(selectedChannel.id, selectedChannel.space_id)}
                                          >
                                            <VolumeIcon style={{ width: '16px', height: '16px' }} />
                                            <span>Entrar na chamada</span>
                                          </button>
                                        )}
                                      </div>
                                    )
                                  }

                                  return displayList.map(p => {
                                    if (isMusicBotIdentity(p.userId)) {
                                      return (
                                        <MusicBotParticipantCard
                                          key={p.userId}
                                          participant={p}
                                          channelId={selectedChannel.id}
                                          userId={user.id}
                                          onOpenModal={() => setShowMusicBotModal(true)}
                                          onOpenAvatarPicker={() => setIsMusicBotAvatarPickerOpen(true)}
                                        />
                                      )
                                    }
                                    const isSharer = Boolean(p.isScreenSharing || (p.screenStream && p.screenStream.getVideoTracks().length > 0))
                                  const hasCam = Boolean(p.isCameraOn && p.cameraStream)
                                  return (
                                    <div
                                      key={p.userId}
                                      className={`participant-card ${p.isSpeaking ? 'speaking' : ''} ${isSharer ? 'has-live-screen' : ''} ${hasCam ? 'has-camera' : ''} ${p.isMuted ? 'is-muted' : ''}`}
                                      onClick={() => {
                                        if (isSharer) {
                                          setSelectedScreenSharerUserId(p.userId)
                                          setIsWatchingStreams(true)
                                          setScreenShareViewMode('focus')
                                        } else if (p.userId !== user.id) {
                                          setVolumeControlUser(p)
                                        }
                                      }}
                                      style={{
                                        cursor: 'pointer',
                                        position: 'relative',
                                        // Fundo desfocado do cartão: a própria foto da pessoa (sem foto, a cor de destaque)
                                        ...(p.avatarUrl ? { ['--pc-bg' as any]: `url(${JSON.stringify(p.avatarUrl)})` } : {})
                                      }}
                                      title={isSharer ? `Clique para assistir a tela de ${p.displayName}` : (p.userId !== user.id ? "Ajustar volume de áudio" : "")}
                                    >
                                      {!hasCam && <span className="participant-card-backdrop" aria-hidden="true" />}
                                      {isSharer && (
                                        <div className="participant-live-badge">
                                          <span className="live-dot-pulse" /> AO VIVO
                                        </div>
                                      )}
                                      {hasCam && p.cameraStream && (
                                        <>
                                          <div className="participant-card-video">
                                            <CameraVideoTile stream={p.cameraStream} mirrored={p.userId === user.id} />
                                          </div>
                                          {(p.isDeafened || p.isMuted) && (
                                            <div className="participant-camera-status">
                                              {p.isMuted && <MicOffIcon style={{ width: '13px', height: '13px' }} />}
                                              {p.isDeafened && <HeadphonesOffIcon style={{ width: '13px', height: '13px' }} />}
                                            </div>
                                          )}
                                        </>
                                      )}
                                      <div
                                        className="participant-avatar-large"
                                        style={hasCam ? { display: 'none' } : { position: 'relative' }}
                                      >
                                        {p.avatarUrl ? (
                                          <img src={p.avatarUrl} alt={p.displayName} className="round-avatar-img-large" />
                                        ) : (
                                          <span className="avatar-initial-large">
                                            {p.displayName.slice(0, 1).toUpperCase()}
                                          </span>
                                        )}
                                        {/* Sem decoração de avatar no cartão da chamada: é animação (às vezes vídeo) a mais
                                            para cada pessoa na sala, e a chamada é onde o processador mais precisa sobrar */}
                                      </div>
                                      <div className="participant-card-bottom-info">
                                        <span className="participant-name">
                                          {/* Mutado/ensurdecido ficam no rótulo do nome (com câmera, o selo do topo já mostra) */}
                                          {!hasCam && p.isMuted && <MicOffIcon className="participant-name-state" />}
                                          {!hasCam && p.isDeafened && <HeadphonesOffIcon className="participant-name-state" />}
                                          <span className="participant-name-text">
                                            {p.displayName}
                                            {p.userId === user.id && " (Você)"}
                                          </span>
                                        </span>
                                        {isSharer && (
                                          <button
                                            type="button"
                                            className="watch-stream-badge-btn"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedScreenSharerUserId(p.userId)
                                              setIsWatchingStreams(true)
                                              setScreenShareViewMode('focus')
                                            }}
                                            title={`Assistir transmissão de ${p.displayName}`}
                                          >
                                            <PlayIcon style={{ width: "11px", height: "11px" }} />
                                            <span>Assistir Transmissão</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })
                              })()}
                              </div>
                            )}
                          </>
                        )
                      })()}

                            {/* Push-to-Talk Indicator */}
                            {isPttMode && (
                              <div style={{ textAlign: 'center', padding: '6px 12px', background: isPttActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', margin: '0 16px 12px', border: isPttActive ? '1px solid #10b981' : '1px solid rgba(255,255,255,0.1)', fontSize: '12px', fontWeight: 800, color: isPttActive ? '#10b981' : 'var(--text-secondary)' }}>
                                {isPttActive ? '🟢 Microfone Aberto (Transmitindo Voz)' : `🔊 PTT Ativo: Segure [${pttKey.replace('Key', '')}] para falar`}
                              </div>
                            )}

                            {/* Controls bottom bar */}
                            {activeVoiceChannelId === selectedChannel.id && isConnected ? (
                              <div className="voice-controls-bar">
                                <div className="voice-controls-capsule">
                                  {/* Cluster 1: Áudio Principal (Mic + Fone) */}
                                  <div className="voice-dock-cluster">
                                    <button
                                      className={`control-btn mic-btn ${isMuted ? 'muted' : ''}`}
                                      onClick={handleToggleMute}
                                      title={isMuted ? "Desmutar microfone" : "Mutar microfone"}
                                    >
                                      {isMuted ? <MicOffIcon style={{ width: 20, height: 20 }} /> : <MicIcon style={{ width: 20, height: 20 }} />}
                                    </button>

                                    <button
                                      className={`control-btn deafen-btn ${isDeafened ? 'muted' : ''}`}
                                      onClick={handleToggleDeafen}
                                      title={isDeafened ? "Desensurdecer" : "Ensurdecer (Silenciar chamada)"}
                                    >
                                      {isDeafened ? <HeadphonesOffIcon style={{ width: 20, height: 20 }} /> : <HeadphonesIcon style={{ width: 20, height: 20 }} />}
                                    </button>
                                  </div>

                                  {/* Cluster 2: Echo Studio AI (Destaque Central Squircle) */}
                                  <button
                                    type="button"
                                    className={`control-btn ai-btn ${isAiDenoiseEnabled ? 'active' : ''}`}
                                    onClick={() => toggleAiDenoise()}
                                    title={isAiDenoiseEnabled ? "Supressão de Ruído Echo AI: ATIVADA (Clique para desligar)" : "Supressão de Ruído Echo AI: DESATIVADA (Clique para ligar)"}
                                  >
                                    <BrainIcon style={{ width: 20, height: 20 }} />
                                    {isAiDenoiseEnabled && <span className="control-btn-active-dot" />}
                                  </button>

                                  {/* Cluster 3: Transmissão & Vídeo (Câmera + Tela) */}
                                  <div className="voice-dock-cluster">
                                    <button
                                      type="button"
                                      className={`control-btn camera-btn ${localCameraStream ? 'sharing' : ''}`}
                                      onClick={handleToggleCamera}
                                      title={localCameraStream ? "Desligar Câmera" : "Ligar Câmera"}
                                    >
                                      {localCameraStream ? (
                                        <VideoOffIcon style={{ width: 20, height: 20 }} />
                                      ) : (
                                        <VideoCallIcon style={{ width: 20, height: 20 }} />
                                      )}
                                    </button>

                                    <div className="screen-control-wrapper" style={{ position: 'relative' }}>
                                      <button 
                                        className={`control-btn screen-btn ${localScreenStream ? 'sharing' : ''}`} 
                                        onClick={() => {
                                          if (localScreenStream) {
                                            setShowScreenMenu(!showScreenMenu)
                                          } else {
                                            openScreenPicker()
                                          }
                                        }}
                                        title={localScreenStream ? "Opções de Transmissão" : "Transmitir Tela"}
                                      >
                                        <ScreenIcon style={{ width: 20, height: 20 }} />
                                      </button>
                                      {showScreenMenu && localScreenStream && (
                                        <div className="screen-share-dropdown">
                                          <div className="dropdown-section">
                                            <button className="dropdown-action-btn danger" onClick={async () => { setShowScreenMenu(false); await handleStopScreenShare() }}>
                                              Parar Transmissão
                                            </button>
                                            <button className="dropdown-action-btn" onClick={forceOpenScreenPicker}>
                                              Mudar de Janela
                                            </button>
                                          </div>
                                          <div className="dropdown-divider" />
                                          <div className="dropdown-section">
                                            <span className="section-title">Resolução</span>
                                            {([720, 1080, 'native'] as const).map(q => {
                                              const label = q === 720 ? '720p' : q === 1080 ? '1080p' : 'native'
                                              const keyVal = q === 720 ? '720p' : q === 1080 ? '1080p' : 'native'
                                              return (
                                                <button 
                                                  key={keyVal} 
                                                  className={`dropdown-option ${screenQuality === keyVal ? 'selected' : ''}`}
                                                  onClick={() => handleQualityChange(keyVal)}
                                                >
                                                  {q === 'native' ? 'Nativa / Fonte' : label}
                                                </button>
                                              )
                                            })}
                                          </div>
                                          <div className="dropdown-divider" />
                                          <div className="dropdown-section">
                                            <span className="section-title">FPS</span>
                                            {([15, 30, 60] as const).map(fps => {
                                              // 60 FPS só para jogos e telas inteiras, como na tela de escolher o que transmitir
                                              const isLocked = fps === 60 && Boolean(activeSharingSource) && !isSixtyFpsAllowed(activeSharingSource)
                                              return (
                                                <button
                                                  key={fps}
                                                  className={`dropdown-option ${screenFps === fps ? 'selected' : ''}`}
                                                  disabled={isLocked}
                                                  title={isLocked ? '60 FPS é restrito a jogos e telas inteiras' : undefined}
                                                  style={isLocked ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                                                  onClick={() => handleFpsChange(fps)}
                                                >
                                                  <span>{fps} FPS{isLocked ? ' 🔒' : ''}</span>
                                                </button>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Cluster 4: Entretenimento (Soundboard + Música) */}
                                  <div className="voice-dock-cluster">
                                    <button
                                      className="control-btn soundboard-btn"
                                      onClick={() => setShowSoundboardModal(true)}
                                      title="Mesa de Efeitos Sonoros (Soundboard)"
                                    >
                                      <SoundboardIcon style={{ width: 20, height: 20 }} />
                                    </button>

                                    <button
                                      className="control-btn music-btn"
                                      onClick={() => setShowMusicBotModal(true)}
                                      title="Bot de Música"
                                    >
                                      <MusicIcon style={{ width: 20, height: 20 }} />
                                    </button>
                                  </div>

                                  {/* Cluster 5: Desconectar (Squircle Red) */}
                                  <button
                                    className="control-btn leave-btn"
                                    onClick={handleLeaveVoice}
                                    title="Sair da chamada"
                                  >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-6-6 19.8 19.8 0 0 1-3.12-8.69A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/>
                                      <line x1="22" y1="2" x2="2" y2="22"/>
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* Chat pane (Right) */}
                          <div
                            className={`voice-chat-pane${chatPeek.peek ? ' is-peek' : ''}`}
                            style={!voiceChatOpen ? { display: 'none' } : undefined}
                            {...chatPeek.panelProps}
                          >
                            <MessageList
                              variant="voice"
                              messagesContainerRef={messagesContainerRef}
                              messagesEndRef={messagesEndRef}
                              selectedChannel={selectedChannel}
                              currentSpace={currentSpace}
                              filteredMessages={messages}
                              hasMoreMessages={hasMoreMessages}
                              isLoadingMore={isLoadingMore}
                              isLoadingMessages={isLoadingMessages}
                              loadMoreMessages={loadMoreMessages}
                              searchQuery={searchQuery}
                              user={user}
                              profileDisplayName={profileDisplayName}
                              profileAvatarUrl={profileAvatarUrl}
                              avatarDecoration={avatarDecoration}
                              nameEffect={nameEffect}
                              presenceData={presenceData}
                              serverRoles={serverRoles}
                              memberRoleMap={memberRoleMap}
                              serverEmojis={serverEmojis}
                              spaceMembers={spaceMembers}
                              canUserDo={canUserDo}
                              getUserHighestRole={getUserHighestRole}
                              setInspectedMember={setInspectedMember}
                              toggleReaction={toggleReaction}
                              setReplyingToMessage={setReplyingToMessage}
                              isMessageSaved={isMessageSaved}
                              toggleSaveMessage={toggleSaveMessage}
                              pinnedMessages={pinnedMessages}
                              togglePinMessage={togglePinMessage}
                              handleDeleteMessage={handleDeleteMessage}
                              openLightbox={openLightbox}
                              activePlayingVoiceNote={activePlayingVoiceNote}
                              handleToggleVoicePlay={handleToggleVoicePlay}
                              voiceNotePlaySpeed={voiceNotePlaySpeed}
                              handleChangeVoiceSpeed={handleChangeVoiceSpeed}
                              voiceNoteAudioRef={voiceNoteAudioRef}
                              retrySendMessage={retrySendMessage}
                              messageReactions={messageReactions}
                            />

                            <MessageComposer
                              variant="voice"
                              selectedChannel={selectedChannel}
                              currentSpace={currentSpace}
                              canUserDo={canUserDo}
                              user={user}
                              profileDisplayName={profileDisplayName}
                              spaceMembers={spaceMembers}
                              presenceData={presenceData}
                              replyingToMessage={replyingToMessage}
                              setReplyingToMessage={setReplyingToMessage}
                              typingUsers={typingUsers}
                              pendingPastedFile={pendingVoicePastedFile}
                              setPendingPastedFile={setPendingVoicePastedFile}
                              pendingImagePreview={pendingVoiceImagePreview}
                              setPendingImagePreview={setPendingVoiceImagePreview}
                              pendingImageSize={pendingVoiceImageSize}
                              setPendingImageSize={setPendingVoiceImageSize}
                              removePendingImage={removePendingVoiceImage}
                              handleComposerSubmit={handleVoiceComposerSubmit}
                              handleChatFileUpload={handleChatFileUpload}
                              isUploading={isUploading}
                              draft={draft}
                              setDraft={setDraft}
                              chatInputRef={chatInputRef}
                              handleInputChange={handleInputChange}
                              handleInputKeyDown={handleInputKeyDown}
                              handlePaste={handleVoicePaste}
                              slowmodeCooldown={slowmodeCooldown}
                              showMentionPicker={showMentionPicker}
                              mentionCandidates={mentionCandidates}
                              selectedMentionIndex={selectedMentionIndex}
                              setSelectedMentionIndex={setSelectedMentionIndex}
                              selectMention={selectMention}
                              showGifPicker={showGifPicker}
                              setShowGifPicker={setShowGifPicker}
                              gifSearchQuery={gifSearchQuery}
                              setGifSearchQuery={setGifSearchQuery}
                              showStickerPicker={showStickerPicker}
                              setShowStickerPicker={setShowStickerPicker}
                              handleSendSticker={handleSendSticker}
                              showEmojiPicker={showEmojiPicker}
                              setShowEmojiPicker={setShowEmojiPicker}
                              emojiPickerTab={emojiPickerTab}
                              setEmojiPickerTab={setEmojiPickerTab}
                              serverEmojis={serverEmojis}
                              supabase={supabase}
                              postChannelMessage={postChannelMessage}
                            />
                          </div>
                        </div>
                    </div>
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
                      isVisible={membersPeek.visible}
                      isPeek={membersPeek.peek}
                      onPeekEnter={membersPeek.panelProps.onMouseEnter}
                      onPeekLeave={membersPeek.panelProps.onMouseLeave}
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
                    <MusicBotAvatarPickerModal
                      isOpen={isMusicBotAvatarPickerOpen}
                      onClose={() => setIsMusicBotAvatarPickerOpen(false)}
                    />
                  </div>
  )
})
