import { useState, useEffect, useRef, useMemo, useCallback, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DirectMessage, FriendshipRequest, Page } from '../types'
import { formatGameDuration } from '../lib/formatters'
import { AvatarDecoration } from '../components/AvatarDecoration'
import { GameLogo } from '../components/GameLogos'
import { ModernVoiceNotePlayer } from '../components/chat/ModernVoiceNotePlayer'
import { ChatLinkEmbed } from '../components/chat/ChatLinkEmbed'
import { UnifiedUserProfileFooter } from '../components/sidebar/UnifiedUserProfileFooter'
import {
  ActivityIcon,
  ClockIcon,
  CopyIcon,
  GamepadIcon,
  HeadphonesIcon,
  HeadphonesOffIcon,
  InboxIcon,
  LinkIcon,
  MessageSquareIcon,
  MicIcon,
  MicOffIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PaperclipIcon,
  PhoneIcon,
  PhoneOffIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  StarIcon,
  TrashIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  VoiceMessageIcon,
  ZoomInIcon
} from '../components/icons'
import { openExternalUrl } from '../lib/openExternal'
import { useUIStore } from '../stores/useUIStore'
import { formatMessageText } from '../lib/messageFormatter'

export function FriendsView({
  friendships,
  friendTab,
  setFriendTab,
  friendSearchQuery,
  setFriendSearchQuery,
  friendSearchNotice,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  onlineUsers,
  presenceData,
  user,
  selectedDMUserId,
  directMessages,
  dmDraft,
  setDmDraft,
  unreadDMs,
  onOpenDM,
  onSendDM,
  onCloseDM,
  isUploading,
  onUploadFile,
  profileDisplayName,
  profileAvatarUrl,
  myGamePresence,
  theme,
  toggleTheme,
  setPage,
  onSignOut,
  presenceStatus,
  showStatusMenu,
  setShowStatusMenu,
  updatePresenceStatus,
  spaceMembers = [],
  showToast,
  onInspectMember,
  onOpenWhatsNew,
  avatarDecoration,
  onStartCall,
  activeDirectCall,
  endDirectCall,
  isMuted = false,
  isDeafened = false,
  toggleMute,
  toggleDeafen,
  knownProfiles = {},
  recentDMUserIds: _recentDMUserIds = [],
  onRemoveRecentDM: _onRemoveRecentDM,
  onAddFriend,
  onStartVoiceNote,
  onStopVoiceNote,
  onCancelVoiceNote,
  isVoiceNoteRecording = false,
  voiceNoteDuration = 0,
  voiceNoteTarget = 'channel',
  activePlayingVoiceNote = null,
  voiceNotePlaySpeed = 1,
  voiceNoteAudioRef,
  handleToggleVoicePlay,
  handleChangeVoiceSpeed,
  onDeleteDM,
  onToggleSaveDM,
  isMessageSaved,
  isFriendTyping = false,
  notifyDMTyping
}: {
  friendships: FriendshipRequest[]
  friendTab: 'online' | 'all' | 'pending' | 'add'
  setFriendTab: (tab: 'online' | 'all' | 'pending' | 'add') => void
  friendSearchQuery: string
  setFriendSearchQuery: (val: string) => void
  friendSearchNotice: string
  sendFriendRequest: (event: FormEvent) => void
  acceptFriendRequest: (id: string) => void
  removeFriendship: (id: string) => void
  onlineUsers: Set<string>
  presenceData: Record<string, any>
  user: User
  selectedDMUserId: string | null
  directMessages: DirectMessage[]
  dmDraft: string
  setDmDraft: (val: string) => void
  unreadDMs: Record<string, number>
  onOpenDM: (friendId: string) => void
  onSendDM: (event: FormEvent) => void
  onCloseDM: () => void
  isUploading: boolean
  onUploadFile: (file: File, caption?: string) => void
  profileDisplayName: string
  profileAvatarUrl: string
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  theme: string
  toggleTheme: () => void
  setPage: (page: Page) => void
  onSignOut: () => void
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  showStatusMenu: boolean
  setShowStatusMenu: (val: boolean) => void
  updatePresenceStatus: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  spaceMembers?: any[]
  showToast?: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  onInspectMember?: (member: any) => void
  onOpenWhatsNew?: () => void
  avatarDecoration?: string | null
  onStartCall?: (userId: string, name: string, avatar?: string) => void
  activeDirectCall?: any
  endDirectCall?: () => void
  isMuted?: boolean
  isDeafened?: boolean
  toggleMute?: () => void
  toggleDeafen?: () => void
  knownProfiles?: Record<string, { id: string; display_name: string; avatar_url?: string; custom_status?: string; avatar_decoration?: string | null }>
  recentDMUserIds?: string[]
  onRemoveRecentDM?: (userId: string) => void
  onAddFriend?: (targetUserId: string, targetName: string) => Promise<void> | void
  onStartVoiceNote?: () => void
  onStopVoiceNote?: () => void
  onCancelVoiceNote?: () => void
  isVoiceNoteRecording?: boolean
  voiceNoteDuration?: number
  voiceNoteTarget?: 'channel' | 'dm'
  activePlayingVoiceNote?: string | null
  voiceNotePlaySpeed?: number
  voiceNoteAudioRef?: React.MutableRefObject<HTMLAudioElement | null>
  handleToggleVoicePlay?: (messageId: string, audioUrl: string) => void
  handleChangeVoiceSpeed?: () => void
  onDeleteDM?: (messageId: string) => void
  onToggleSaveDM?: (msg: DirectMessage, targetUser: any) => void
  isMessageSaved?: (msgId: string) => boolean
  isFriendTyping?: boolean
  notifyDMTyping?: (targetFriendId: string) => void
}) {
  const openLightbox = useUIStore((s) => s.openLightbox)
  const dmFileRef = useRef<HTMLInputElement>(null)
  const dmMessagesEndRef = useRef<HTMLDivElement>(null)
  const dmMessagesContainerRef = useRef<HTMLDivElement>(null)
  const friendsSearchRef = useRef<HTMLInputElement>(null)
  const [localSearch, setLocalSearch] = useState('')
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    return localStorage.getItem('echo-friends-sidebar-open') !== 'false'
  })

  // Staged clipboard paste image for DMs
  const [pendingDMPastedFile, setPendingDMPastedFile] = useState<File | null>(null)
  const [pendingDMImagePreview, setPendingDMImagePreview] = useState<string | null>(null)

  const removePendingDMImage = useCallback(() => {
    setPendingDMPastedFile(null)
    setPendingDMImagePreview(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  const handleDMPaste = useCallback((e: React.ClipboardEvent | ClipboardEvent) => {
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

          setPendingDMImagePreview(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(renamedFile)
          })
          setPendingDMPastedFile(renamedFile)
          return
        }
      }
    }
  }, [])

  // Window paste listener when DM is open
  useEffect(() => {
    if (!selectedDMUserId) return
    const onWindowPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && target.tagName === 'INPUT' && target.id !== 'dm-message-input') {
        return
      }
      if (target && target.tagName === 'TEXTAREA') {
        return
      }
      handleDMPaste(e)
    }
    window.addEventListener('paste', onWindowPaste)
    return () => window.removeEventListener('paste', onWindowPaste)
  }, [selectedDMUserId, handleDMPaste])

  // Esc key cancels pending DM image
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && pendingDMPastedFile) {
        removePendingDMImage()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pendingDMPastedFile, removePendingDMImage])

  const handleDMComposeSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pendingDMPastedFile) {
      const file = pendingDMPastedFile
      const caption = dmDraft.trim()
      removePendingDMImage()
      setDmDraft('')
      await onUploadFile(file, caption)
      return
    }
    onSendDM(e)
  }

  // Garante que o chat de DMs role até o final com a mensagem perfeitamente acima da caixa de digitação
  useEffect(() => {
    if (directMessages.length > 0) {
      const scrollToBottom = () => {
        if (dmMessagesContainerRef.current) {
          dmMessagesContainerRef.current.scrollTop = dmMessagesContainerRef.current.scrollHeight
        }
      }
      scrollToBottom()
      const t1 = setTimeout(scrollToBottom, 50)
      const t2 = setTimeout(scrollToBottom, 160)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
  }, [directMessages.length])

  useEffect(() => {
    localStorage.setItem('echo-friends-sidebar-open', String(showSidebar))
  }, [showSidebar])

  // Global Ctrl+K / Cmd+K listener to focus friends search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        friendsSearchRef.current?.focus()
        friendsSearchRef.current?.select()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const acceptedFriends = friendships.filter(f => f.status === 'accepted')
  const onlineFriends = acceptedFriends.filter(f => onlineUsers.has(f.user.id))
  const pendingRequests = friendships.filter(f => f.status === 'pending')

  // Helper to check if friend is gaming
  const isFriendGaming = (friendUserId: string) => {
    const pres = presenceData[friendUserId]
    if (!pres) return false
    if (pres.current_game && (pres.current_game as any).name) return true
    const s = pres.custom_status?.toLowerCase() || ''
    return s.includes('jogando') || s.includes('playing') || s.startsWith('game:')
  }

  // Filter friends list by local search
  const filterList = (list: FriendshipRequest[]) => {
    if (!localSearch.trim()) return list
    const q = localSearch.toLowerCase()
    return list.filter(f => f.user.display_name.toLowerCase().includes(q))
  }


  // Activity Feed Friends (strictly friends with active game or custom status)
  const activeFeedFriends = acceptedFriends.filter(f => {
    const isOnline = onlineUsers.has(f.user.id)
    if (!isOnline) return false
    const pres = presenceData[f.user.id]
    const hasGame = isFriendGaming(f.user.id)
    const rawStatus = pres?.custom_status?.trim().toLowerCase() || ''
    const hasRealStatus = rawStatus.length > 0 && !['disponível', 'disponivel', 'online', 'offline'].includes(rawStatus)
    return hasGame || hasRealStatus
  })

  // Friend suggestions from shared spaces
  const friendUserIds = new Set([user.id, ...friendships.map(f => f.user.id)])
  const suggestedMembers = spaceMembers
    .filter(m => m.user && !friendUserIds.has(m.user.id))
    .slice(0, 4)

  const copyFriendLink = () => {
    const link = `https://echo.lobby/add/@${profileDisplayName || 'gamer'}`
    navigator.clipboard.writeText(link)
    if (showToast) {
      showToast('Link Copiado!', 'Seu link de amizade foi copiado para a área de transferência.', 'friend')
    }
  }

  // Scroll to bottom of DM messages automatically when opened or when messages change
  useEffect(() => {
    if (selectedDMUserId && directMessages.length > 0) {
      dmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [selectedDMUserId, directMessages.length])

  // Resolve active DM target user info across friendships, knownProfiles, and spaceMembers
  const dmUser = useMemo(() => {
    if (!selectedDMUserId) return null
    const formatStatusWithGame = (pres: any) => {
      if (pres?.current_game?.name) {
        const dur = formatGameDuration(pres.current_game.startedAt || pres.game_presence?.startedAt)
        return `Jogando ${pres.current_game.name}${dur ? ` • ${dur}` : ''}`
      }
      return pres?.custom_status || null
    }
    const friend = friendships.find(f => f.user.id === selectedDMUserId)
    if (friend) {
      const pres = presenceData[friend.user.id]
      return {
        id: friend.user.id,
        display_name: friend.user.display_name,
        avatar_url: friend.user.avatar_url,
        avatar_decoration: pres?.avatar_decoration || (friend.user as any).avatar_decoration || null,
        isFriend: true,
        status: formatStatusWithGame(pres)
      }
    }
    const known = knownProfiles[selectedDMUserId]
    if (known) {
      const pres = presenceData[known.id]
      return {
        id: known.id,
        display_name: known.display_name || 'Usuário',
        avatar_url: known.avatar_url,
        avatar_decoration: pres?.avatar_decoration || known.avatar_decoration || null,
        isFriend: false,
        status: formatStatusWithGame(pres)
      }
    }
    const member = spaceMembers.find(m => m.user?.id === selectedDMUserId)?.user
    if (member) {
      const pres = presenceData[member.id]
      return {
        id: member.id,
        display_name: member.display_name || 'Usuário',
        avatar_url: member.avatar_url,
        avatar_decoration: pres?.avatar_decoration || (member as any).avatar_decoration || null,
        isFriend: false,
        status: formatStatusWithGame(pres)
      }
    }
    return {
      id: selectedDMUserId,
      display_name: 'Usuário',
      avatar_url: undefined,
      avatar_decoration: null,
      isFriend: false,
      status: null
    }
  }, [selectedDMUserId, friendships, knownProfiles, spaceMembers, presenceData])

  return (
    <section className={`friends-workspace ${selectedDMUserId ? 'has-dm-open' : ''} ${!showSidebar ? 'sidebar-collapsed' : ''}`}>
      {/* 1. Left Sidebar: Navigation, Ativo Agora Activities, and User Profile */}
      <aside className={`friends-sidebar ${!showSidebar ? 'collapsed' : ''}`}>
        {/* Sidebar Header: Ativo Agora + Collapse Button */}
        <div className="friends-sidebar-top" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ActivityIcon style={{ width: '15px', height: '15px', color: 'var(--accent-color)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', color: 'var(--text-muted)' }}>
              Ativo Agora
            </span>
            {activeFeedFriends.length > 0 && (
              <span className="activity-live-badge">
                <span className="live-dot" />
                {activeFeedFriends.length} ao vivo
              </span>
            )}
          </div>
          <button 
            type="button" 
            className="sidebar-collapse-btn" 
            onClick={() => setShowSidebar(false)}
            title="Ocultar barra lateral"
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
          >
            <PanelLeftCloseIcon style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        <div className="friends-sidebar-scrollable" style={{ paddingTop: '8px' }}>

          {activeFeedFriends.length > 0 ? (
            <div className="activity-feed-list" style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeFeedFriends.map(friend => {
                const pres = presenceData[friend.user.id]
                const isGaming = isFriendGaming(friend.user.id)
                const gameName = pres?.current_game?.name || pres?.custom_status?.replace(/^jogando\s+/i, '') || 'Jogo'
                const friendDeco = pres?.avatar_decoration || (friend.user as any).avatar_decoration || null
                const gameStartedAt = pres?.current_game?.startedAt || pres?.game_presence?.startedAt
                const gameDur = formatGameDuration(gameStartedAt)
                return (
                  <div key={friend.id} className="activity-card" onClick={() => onOpenDM(friend.user.id)}>
                    <div className="activity-user-header">
                      <div className="activity-user-avatar">
                        {friend.user.avatar_url ? (
                          <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                        ) : (
                          friend.user.display_name.slice(0, 1).toUpperCase()
                        )}
                        {friendDeco && friendDeco !== 'none' && (
                          <AvatarDecoration decorationId={friendDeco} />
                        )}
                        <span className="online-indicator online" />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                        <span className="activity-user-name">{friend.user.display_name}</span>
                        <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>
                          {isGaming ? 'Jogando agora' : 'Atividade ativa'}
                        </span>
                      </div>
                    </div>

                    <div className="activity-game-body">
                      <div className="activity-game-icon">
                        {isGaming ? (
                          <GameLogo gameName={gameName} size={18} />
                        ) : (
                          <GamepadIcon style={{ width: '15px', height: '15px', color: '#00f2fe' }} />
                        )}
                      </div>
                      <div className="activity-game-info">
                        <span className="activity-game-title" title={gameName}>{gameName}</span>
                        {gameDur && (
                          <span className="activity-game-time">
                            <ClockIcon style={{ width: '11px', height: '11px' }} />
                            <span>{gameDur}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <button 
                      type="button" 
                      className="activity-action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenDM(friend.user.id)
                      }}
                    >
                      <MessageSquareIcon style={{ width: '13px', height: '13px' }} />
                      <span>Conversar</span>
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="friends-radar-card" style={{ margin: '8px 10px', padding: '22px 14px' }}>
              <div className="friends-radar-graphic" style={{ width: '60px', height: '60px' }}>
                <div className="friends-radar-wave-1" style={{ width: '26px', height: '26px' }} />
                <div className="friends-radar-wave-2" style={{ width: '26px', height: '26px' }} />
                <div className="friends-radar-center" style={{ width: '30px', height: '30px' }}>
                  <GamepadIcon style={{ width: '15px', height: '15px' }} />
                </div>
              </div>
              <div className="friends-radar-title" style={{ fontSize: '13px' }}>Tudo calmo por aqui</div>
              <div className="friends-radar-desc" style={{ fontSize: '11px' }}>
                Quando seus amigos estiverem jogando ou ativos, as atividades aparecerão aqui.
              </div>
            </div>
          )}
        </div>

        <UnifiedUserProfileFooter
          displayName={profileDisplayName}
          avatarUrl={profileAvatarUrl}
          presenceStatus={presenceStatus}
          showStatusMenu={showStatusMenu}
          setShowStatusMenu={setShowStatusMenu}
          updatePresenceStatus={updatePresenceStatus}
          theme={theme as 'light' | 'dark'}
          toggleTheme={toggleTheme}
          onOpenSettings={() => setPage('Configurações')}
          onOpenWhatsNew={onOpenWhatsNew}
          onSignOut={onSignOut}
          myGamePresence={myGamePresence}
          avatarDecoration={avatarDecoration}
        />
      </aside>

      {/* 2. Center Content Area: Full DM Chat if active, otherwise Friends Hub */}
      {selectedDMUserId && dmUser ? (
        <section className="dm-full-chat">
          {/* Header */}
          <div className="dm-full-header">
            <div className="dm-full-header-left">
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
                const isOtherFile = Boolean(msg.attachment_url && !isImage && !isAudio)
                const hasLink = Boolean(!isAudio && !isOtherFile && msg.body && /(https?:\/\/[^\s]+)/i.test(msg.body))
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
            </>
          )}
        </section>
      ) : (
        <section className="friends-content">
        {/* Discord-inspired Top Navigation Bar with Echo DNA */}
        <div className="friends-header-toolbar">
          <div className="friends-header-nav-left">
            <button 
              type="button" 
              className={`friends-sidebar-toggle-btn ${showSidebar ? 'active' : 'collapsed'}`} 
              onClick={() => setShowSidebar(prev => !prev)}
              title={showSidebar ? "Ocultar barra lateral de atividades" : "Mostrar barra lateral de atividades"}
            >
              <PanelLeftIcon style={{ width: '16px', height: '16px' }} />
              {!showSidebar && activeFeedFriends.length > 0 && (
                <span className="toggle-live-dot" title={`${activeFeedFriends.length} amigo(s) com atividade ao vivo`} />
              )}
            </button>

            <div className="friends-header-brand-title">
              <UsersIcon style={{ width: '18px', height: '18px', color: 'var(--accent-color)' }} />
              <span>Amigos</span>
            </div>

            <div className="friends-header-divider" />

            <div className="friends-header-tabs">
              <button 
                type="button" 
                className={`friends-tab-pill ${friendTab === 'online' ? 'active' : ''}`}
                onClick={() => setFriendTab('online')}
              >
                <span>Online</span>
                {onlineFriends.length > 0 && <span className="tab-pill-badge">{onlineFriends.length}</span>}
              </button>

              <button 
                type="button" 
                className={`friends-tab-pill ${friendTab === 'all' ? 'active' : ''}`}
                onClick={() => setFriendTab('all')}
              >
                <span>Todos</span>
                {acceptedFriends.length > 0 && <span className="tab-pill-badge">{acceptedFriends.length}</span>}
              </button>

              <button 
                type="button" 
                className={`friends-tab-pill ${friendTab === 'pending' ? 'active' : ''}`}
                onClick={() => setFriendTab('pending')}
              >
                <span>Pendentes</span>
                {pendingRequests.length > 0 && <span className="tab-pill-badge pending">{pendingRequests.length}</span>}
              </button>

              <button 
                type="button" 
                className={`friends-tab-pill add-friend ${friendTab === 'add' ? 'active' : ''}`}
                onClick={() => setFriendTab('add')}
              >
                <PlusIcon style={{ width: '13px', height: '13px' }} />
                <span>Adicionar Amigo</span>
              </button>
            </div>
          </div>

          <div className="friends-search-row">
            <SearchIcon style={{ width: '14px', height: '14px', color: '#00f2fe', flexShrink: 0 }} />
            <input 
              ref={friendsSearchRef}
              type="text" 
              className="friends-search-input" 
              placeholder="Buscar amigos... (Ctrl K)" 
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
            />
            {localSearch ? (
              <button 
                type="button" 
                className="friends-search-clear-btn"
                onClick={() => setLocalSearch('')} 
                title="Limpar pesquisa"
              >
                ✕
              </button>
            ) : (
              <span 
                className="friends-search-kbd"
                onClick={() => { friendsSearchRef.current?.focus(); friendsSearchRef.current?.select(); }}
                style={{ cursor: 'pointer' }}
                title="Pressione Ctrl+K para pesquisar"
              >
                Ctrl K
              </span>
            )}
          </div>
        </div>

        {/* Tab: Online */}
        {friendTab === 'online' && (
          <div className="friends-list-container" style={{ maxWidth: '100%' }}>
            {filterList(onlineFriends).length === 0 ? (
              <div className="friends-empty-calm">
                <div className="friends-empty-calm-icon">
                  <UsersIcon style={{ width: '28px', height: '28px' }} />
                </div>
                <h3 className="friends-empty-calm-title">Nenhum amigo online no momento</h3>
                <p className="friends-empty-calm-desc">
                  Quando seus amigos entrarem no Echo, eles aparecerão aqui.
                </p>
                {acceptedFriends.length > 0 && (
                  <button 
                    type="button" 
                    className="friends-empty-calm-btn"
                    onClick={() => setFriendTab('all')}
                  >
                    Ver Todos os Amigos ({acceptedFriends.length})
                  </button>
                )}
              </div>
            ) : (
              <div className="friends-list-modern">
                {filterList(onlineFriends).map(friend => {
                  const pres = presenceData[friend.user.id]
                  const statusType = pres?.presence_status || 'online'
                  const gameStartedAt = pres?.current_game?.startedAt || pres?.game_presence?.startedAt
                  const gameDur = formatGameDuration(gameStartedAt)
                  let customText = pres?.custom_status || (pres?.current_game ? `Jogando ${pres.current_game.name}` : 'Disponível')
                  if ((pres?.current_game || customText.toLowerCase().includes('jogando')) && gameDur && !customText.includes('•')) {
                    customText = `${customText} • ${gameDur}`
                  }
                  const friendDeco = pres?.avatar_decoration || (friend.user as any).avatar_decoration || null
                  return (
                    <div key={friend.id} className="friend-card-modern" onClick={() => onOpenDM(friend.user.id)}>
                      <div className="friend-card-left">
                        <div className="friend-avatar-modern">
                          {friend.user.avatar_url ? (
                            <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                          ) : (
                            friend.user.display_name.slice(0, 1).toUpperCase()
                          )}
                          {friendDeco && friendDeco !== 'none' && (
                            <AvatarDecoration decorationId={friendDeco} />
                          )}
                          <span className={`online-indicator ${statusType}`} />
                        </div>
                        <div className="friend-meta-modern">
                          <span className="friend-name-modern">{friend.user.display_name}</span>
                          <span className="friend-status-modern" title={customText}>
                            {customText.toLowerCase().includes('jogando') ? (
                              <span className="game-presence-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                                <GameLogo gameName={customText.replace(/^jogando\s+/i, '')} size={13} style={{ flexShrink: 0 }} />
                                <span>{customText}</span>
                              </span>
                            ) : (
                              customText
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="friend-card-right">
                        {unreadDMs[friend.user.id] > 0 && (
                          <span 
                            className="friend-unread-whatsapp-badge" 
                            title={`${unreadDMs[friend.user.id]} ${unreadDMs[friend.user.id] === 1 ? 'mensagem nova' : 'mensagens novas'}`}
                          >
                            {unreadDMs[friend.user.id]}
                          </span>
                        )}

                        <div className="friend-card-actions" onClick={e => e.stopPropagation()}>
                          <button 
                            type="button" 
                            className="friend-quick-btn msg" 
                            onClick={() => onOpenDM(friend.user.id)} 
                            title="Enviar Mensagem Direta"
                          >
                            <MessageSquareIcon style={{ width: '16px', height: '16px' }} />
                          </button>
                          <button 
                            type="button" 
                            className="friend-quick-btn call" 
                            onClick={() => onStartCall ? onStartCall(friend.user.id, friend.user.display_name, friend.user.avatar_url) : onOpenDM(friend.user.id)} 
                            title="Iniciar Chamada Direta 1v1"
                          >
                            <PhoneIcon style={{ width: '16px', height: '16px' }} />
                          </button>
                          {onInspectMember && (
                            <button 
                              type="button" 
                              className="friend-quick-btn profile" 
                              onClick={() => onInspectMember({ user: friend.user, role: 'Amigo' })} 
                              title="Ver Perfil Completo"
                            >
                              <UserIcon style={{ width: '16px', height: '16px' }} />
                            </button>
                          )}
                          <button 
                            type="button" 
                            className="friend-quick-btn danger" 
                            onClick={() => removeFriendship(friend.id)} 
                            title="Desfazer Amizade"
                          >
                            <span className="friend-btn-close-icon">✕</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Todos */}
        {friendTab === 'all' && (
          <div className="friends-list-container" style={{ maxWidth: '100%' }}>
            {filterList(acceptedFriends).length === 0 ? (
              <div className="friends-empty-calm">
                <div className="friends-empty-calm-icon">
                  <UsersIcon style={{ width: '28px', height: '28px' }} />
                </div>
                <h3 className="friends-empty-calm-title">Você ainda não tem amigos adicionados</h3>
                <p className="friends-empty-calm-desc">
                  Adicione amigos para conversar por mensagens diretas, fazer chamadas e jogar juntos.
                </p>
                <button 
                  type="button" 
                  className="friends-empty-calm-btn primary" 
                  onClick={() => setFriendTab('add')}
                >
                  <UserPlusIcon style={{ width: '15px', height: '15px' }} />
                  <span>Adicionar Amigos</span>
                </button>
              </div>
            ) : (
              <div className="friends-list-modern">
                {filterList(acceptedFriends).map(friend => {
                  const isOnline = onlineUsers.has(friend.user.id)
                  const pres = presenceData[friend.user.id]
                  const statusType = isOnline ? (pres?.presence_status || 'online') : 'offline'
                  const gameStartedAt = pres?.current_game?.startedAt || pres?.game_presence?.startedAt
                  const gameDur = formatGameDuration(gameStartedAt)
                  let customText = isOnline ? (pres?.custom_status || (pres?.current_game ? `Jogando ${pres.current_game.name}` : 'Online')) : 'Offline'
                  if (isOnline && (pres?.current_game || customText.toLowerCase().includes('jogando')) && gameDur && !customText.includes('•')) {
                    customText = `${customText} • ${gameDur}`
                  }
                  const friendDeco = pres?.avatar_decoration || (friend.user as any).avatar_decoration || null
                  return (
                    <div key={friend.id} className="friend-card-modern" onClick={() => onOpenDM(friend.user.id)}>
                      <div className="friend-card-left">
                        <div className="friend-avatar-modern">
                          {friend.user.avatar_url ? (
                            <img src={friend.user.avatar_url} alt={friend.user.display_name} />
                          ) : (
                            friend.user.display_name.slice(0, 1).toUpperCase()
                          )}
                          {friendDeco && friendDeco !== 'none' && (
                            <AvatarDecoration decorationId={friendDeco} />
                          )}
                          <span className={`online-indicator ${statusType}`} />
                        </div>
                        <div className="friend-meta-modern">
                          <span className="friend-name-modern">{friend.user.display_name}</span>
                          <span className="friend-status-modern" title={customText}>
                            {customText.toLowerCase().includes('jogando') ? (
                              <span className="game-presence-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>
                                <GameLogo gameName={customText.replace(/^jogando\s+/i, '')} size={13} style={{ flexShrink: 0 }} />
                                <span>{customText}</span>
                              </span>
                            ) : (
                              customText
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="friend-card-right">
                        {unreadDMs[friend.user.id] > 0 && (
                          <span 
                            className="friend-unread-whatsapp-badge" 
                            title={`${unreadDMs[friend.user.id]} ${unreadDMs[friend.user.id] === 1 ? 'mensagem nova' : 'mensagens novas'}`}
                          >
                            {unreadDMs[friend.user.id]}
                          </span>
                        )}

                        <div className="friend-card-actions" onClick={e => e.stopPropagation()}>
                          <button 
                            type="button" 
                            className="friend-quick-btn msg" 
                            onClick={() => onOpenDM(friend.user.id)} 
                            title="Enviar Mensagem Direta"
                          >
                            <MessageSquareIcon style={{ width: '16px', height: '16px' }} />
                          </button>
                          <button 
                            type="button" 
                            className="friend-quick-btn call" 
                            onClick={() => onStartCall ? onStartCall(friend.user.id, friend.user.display_name, friend.user.avatar_url) : onOpenDM(friend.user.id)} 
                            title="Iniciar Chamada Direta 1v1"
                          >
                            <PhoneIcon style={{ width: '16px', height: '16px' }} />
                          </button>
                          {onInspectMember && (
                            <button 
                              type="button" 
                              className="friend-quick-btn profile" 
                              onClick={() => onInspectMember({ user: friend.user, role: 'Amigo' })} 
                              title="Ver Perfil Completo"
                            >
                              <UserIcon style={{ width: '16px', height: '16px' }} />
                            </button>
                          )}
                          <button 
                            type="button" 
                            className="friend-quick-btn danger" 
                            onClick={() => removeFriendship(friend.id)} 
                            title="Desfazer Amizade"
                          >
                            <span className="friend-btn-close-icon">✕</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Pendentes */}
        {friendTab === 'pending' && (
          <div className="friends-list-container" style={{ maxWidth: '100%' }}>
            {filterList(pendingRequests).length === 0 ? (
              <div className="friends-hero-empty-card">
                <div className="echo-orbital-beacon">
                  <div className="echo-orbital-ring">
                    <div className="echo-orbital-satellite" />
                  </div>
                  <div className="echo-orbital-core">
                    <ClockIcon style={{ width: '22px', height: '22px' }} />
                  </div>
                </div>
                <h2 className="friends-hero-title">Nenhuma solicitação pendente</h2>
                <p className="friends-hero-desc">
                  Você não possui convites pendentes de envio ou recebimento no momento. Quando alguém te convidar, você verá o alerta aqui.
                </p>
                <div className="friends-hero-actions">
                  <button 
                    type="button" 
                    className="friends-hero-btn-primary" 
                    onClick={() => setFriendTab('add')}
                  >
                    <UserPlusIcon style={{ width: '15px', height: '15px' }} />
                    <span>Convidar Novos Amigos</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="friends-list-modern">
                {filterList(pendingRequests).map(req => {
                  const isReceived = req.initiatorId !== user.id
                  return (
                    <div key={req.id} className="friend-card-modern">
                      <div className="friend-card-left">
                        <div className="friend-avatar-modern">
                          {req.user.avatar_url ? (
                            <img src={req.user.avatar_url} alt={req.user.display_name} />
                          ) : (
                            req.user.display_name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <div className="friend-meta-modern">
                          <span className="friend-name-modern">{req.user.display_name}</span>
                          <span className="friend-status-modern" style={{ color: isReceived ? '#10b981' : 'var(--text-muted)' }}>
                            {isReceived ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <InboxIcon style={{ width: '12px', height: '12px' }} />
                                <span>Quer ser seu amigo</span>
                              </span>
                            ) : (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <SendIcon style={{ width: '12px', height: '12px' }} />
                                <span>Solicitação enviada</span>
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="friend-card-actions">
                        {isReceived ? (
                          <>
                            <button className="friend-quick-btn" onClick={() => acceptFriendRequest(req.id)} title="Aceitar Solicitação" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)' }}>
                              ✓
                            </button>
                            <button className="friend-quick-btn danger" onClick={() => removeFriendship(req.id)} title="Recusar Solicitação">
                              ✕
                            </button>
                          </>
                        ) : (
                          <button className="friend-action-btn cancel-btn" onClick={() => removeFriendship(req.id)} title="Cancelar solicitação">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: Adicionar Amigo */}
        {friendTab === 'add' && (
          <div className="add-friend-container" style={{ maxWidth: '640px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Share My Link Banner */}
            <div className="add-friend-hero-card">
              <div className="add-friend-hero-title">
                <LinkIcon style={{ width: '16px', height: '16px', color: 'var(--accent-color)' }} />
                <span>Compartilhe seu Link de Amigo</span>
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Envie seu link direto no WhatsApp, redes sociais ou chat do jogo para seus amigos adicionarem você com 1 clique.
              </p>
              <div className="add-friend-link-row">
                <span className="add-friend-link-text">echo.lobby/add/@{profileDisplayName || 'gamer'}</span>
                <button type="button" className="add-friend-copy-btn" onClick={copyFriendLink} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <CopyIcon style={{ width: '12px', height: '12px' }} />
                  <span>Copiar Link</span>
                </button>
              </div>
            </div>

            {/* Direct Username Form */}
            <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>Adicionar por Nome de Exibição</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Digite o nome exato do jogador para enviar um pedido de amizade.
              </p>
              <form onSubmit={sendFriendRequest} className="add-friend-form">
                <input 
                  value={friendSearchQuery} 
                  onChange={e => setFriendSearchQuery(e.target.value)} 
                  placeholder="Ex: Lag9938, CyberNinja, ProGamer..." 
                  required 
                  minLength={2}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                />
                <button 
                  type="submit" 
                  style={{ padding: '12px 24px', borderRadius: '10px', background: 'var(--accent-color)', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                >
                  Enviar Pedido
                </button>
              </form>
              {friendSearchNotice && (
                <div className={`friend-search-notice ${friendSearchNotice.includes('sucesso') ? 'success' : 'error'}`} style={{ marginTop: '12px' }}>
                  {friendSearchNotice}
                </div>
              )}
            </div>

            {/* Friend Suggestions */}
            {suggestedMembers.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UsersIcon style={{ width: '15px', height: '15px', color: 'var(--accent-color)' }} />
                  <span>Sugestões de Jogadores dos seus Espaços</span>
                </h4>
                <div className="friend-suggestions-grid">
                  {suggestedMembers.map(m => (
                    <div key={m.user.id} className="friend-suggestion-card">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div className="friend-avatar-modern" style={{ width: 34, height: 34, fontSize: 12 }}>
                          {m.user.avatar_url ? (
                            <img src={m.user.avatar_url} alt={m.user.display_name} />
                          ) : (
                            m.user.display_name.slice(0, 1).toUpperCase()
                          )}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.user.display_name}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        className="activity-action-btn" 
                        onClick={() => {
                          setFriendSearchQuery(m.user.display_name)
                        }}
                        style={{ padding: '5px 10px', fontSize: '11px', width: 'auto' }}
                        title="Adicionar"
                      >
                        + Convidar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
      )}

    </section>
  )
}
