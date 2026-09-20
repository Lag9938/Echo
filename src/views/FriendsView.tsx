import { useState, useEffect, useRef, useMemo, useCallback, memo, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DirectMessage, FriendshipRequest, Page, GroupChat, GroupMessage } from '../types'
import { formatGameDuration } from '../lib/formatters'
import { AvatarDecoration } from '../components/AvatarDecoration'
import { GameLogo } from '../components/GameLogos'
import { UnifiedUserProfileFooter } from '../components/sidebar/UnifiedUserProfileFooter'
import {
  PanelLeftCloseIcon,
  PanelLeftIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon
} from '../components/icons'
import { useUIStore } from '../stores/useUIStore'
import { useSpacesStore } from '../stores/useSpacesStore'
import { CreateGroupChatModal } from '../components/modals/CreateGroupChatModal'
import { DMConversation } from './friends/DMConversation'
import { GroupConversation } from './friends/GroupConversation'
import { FriendsList } from './friends/FriendsList'
import { FriendRequests } from './friends/FriendRequests'

export interface FriendsViewProps {
  friendships?: FriendshipRequest[]
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
  theme?: string
  toggleTheme: () => void
  setPage?: (page: Page) => void
  onSignOut: () => void
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'invisible'
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
  blockedUserIds?: Set<string>
  onBlockUser?: (targetId: string, targetName: string) => Promise<void> | void
  onUnblockUser?: (targetId: string, targetName: string) => Promise<void> | void
  onSendDMSticker?: (url: string, name?: string) => void
  groupChats?: GroupChat[]
  selectedGroupId?: string | null
  setSelectedGroupId?: (id: string | null) => void
  groupMessages?: Record<string, GroupMessage[]>
  groupDraft?: string
  setGroupDraft?: (val: string) => void
  groupTypingUsers?: Record<string, string[]>
  unreadGroups?: Record<string, number>
  onCreateGroupChat?: (name: string, memberIds: string[]) => Promise<string | null>
  onSendGroupMessage?: (groupId: string, body: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>
  onLeaveGroupChat?: (groupId: string) => Promise<void>
  onOpenGroup?: (groupId: string) => void
  notifyGroupTyping?: (groupId: string) => void
  onDeleteGroupMessage?: (messageId: string, groupId: string) => Promise<void>
}

export const FriendsView = memo(function FriendsView(props: FriendsViewProps) {
  const storeFriendships = useUIStore((s) => s.friendships)
  const storePresenceStatus = useUIStore((s) => s.presenceStatus)
  const storeTheme = useUIStore((s) => s.theme)
  const storeBlockedUserIds = useUIStore((s) => s.blockedUserIds)
  const storeSetPage = useUIStore((s) => s.setPage)
  const storeKnownProfiles = useSpacesStore((s) => s.knownProfiles)
  const storeSpaceMembers = useSpacesStore((s) => s.spaceMembers)

  const friendships = props.friendships ?? storeFriendships
  const presenceStatus = props.presenceStatus ?? storePresenceStatus
  const theme = props.theme ?? storeTheme
  const blockedUserIds = props.blockedUserIds ?? storeBlockedUserIds
  const setPage = props.setPage ?? storeSetPage
  const knownProfiles = props.knownProfiles ?? (storeKnownProfiles as any)
  const spaceMembers = props.spaceMembers ?? storeSpaceMembers

  const {
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
    toggleTheme,
    onSignOut,
    showStatusMenu,
    setShowStatusMenu,
    updatePresenceStatus,
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
    recentDMUserIds = [],
    onRemoveRecentDM,
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
    notifyDMTyping,
    onBlockUser,
    onUnblockUser,
    onSendDMSticker,
    groupChats = [],
    selectedGroupId = null,
    setSelectedGroupId,
    groupMessages = {},
    groupDraft = '',
    setGroupDraft,
    groupTypingUsers = {},
    unreadGroups = {},
    onCreateGroupChat,
    onSendGroupMessage,
    onLeaveGroupChat,
    onOpenGroup,
    notifyGroupTyping,
    onDeleteGroupMessage
  } = props

  const openLightbox = useUIStore((s) => s.openLightbox)
  const dmFileRef = useRef<HTMLInputElement>(null)
  const dmMessagesEndRef = useRef<HTMLDivElement>(null)
  const dmMessagesContainerRef = useRef<HTMLDivElement>(null)
  const friendsSearchRef = useRef<HTMLInputElement>(null)
  const [localSearch, setLocalSearch] = useState('')
  const [dmSearchQuery, setDmSearchQuery] = useState('')
  const [showSidebar, setShowSidebar] = useState<boolean>(() => {
    return localStorage.getItem('echo-friends-sidebar-open') !== 'false'
  })

  // Staged clipboard paste image for DMs
  const [pendingDMPastedFile, setPendingDMPastedFile] = useState<File | null>(null)
  const [pendingDMImagePreview, setPendingDMImagePreview] = useState<string | null>(null)

  // Stickers & Groups Modal States
  const [showDMStickerPicker, setShowDMStickerPicker] = useState(false)
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false)

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

  const nonBlockedFriendships = useMemo(() => {
    if (!blockedUserIds || blockedUserIds.size === 0) return friendships
    return friendships.filter(f => !blockedUserIds.has(f.user.id))
  }, [friendships, blockedUserIds])

  const acceptedFriends = nonBlockedFriendships.filter(f => f.status === 'accepted')
  const onlineFriends = acceptedFriends.filter(f => onlineUsers.has(f.user.id))
  const pendingRequests = nonBlockedFriendships.filter(f => f.status === 'pending')

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

  // Resolve active group info
  const currentActiveGroup = useMemo(() => {
    if (!selectedGroupId) return null
    return groupChats.find(g => g.id === selectedGroupId) || null
  }, [selectedGroupId, groupChats])

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

  // Lista de conversas diretas ativas e contatos para o menu lateral
  const dmConversations = useMemo(() => {
    const list: Array<{
      id: string
      display_name: string
      avatar_url?: string
      avatar_decoration?: string | null
      status: string
      presence_status: 'online' | 'idle' | 'dnd' | 'offline'
      isOnline: boolean
      unreadCount: number
      isFriend: boolean
      activeGame?: string | null
    }> = []

    const addedIds = new Set<string>()

    const resolveUserData = (userId: string) => {
      if (!userId || addedIds.has(userId) || userId === user.id || blockedUserIds?.has(userId)) return
      addedIds.add(userId)

      const friend = friendships.find(f => f.user.id === userId && f.status === 'accepted')
      const known = knownProfiles[userId]
      const member = spaceMembers.find(m => (m.user?.id || m.id) === userId)

      const dName = friend?.user.display_name || known?.display_name || member?.user?.display_name || member?.display_name || 'Usuário'
      const aUrl = friend?.user.avatar_url || known?.avatar_url || member?.user?.avatar_url || member?.avatar_url
      const pres = presenceData[userId]
      const isOnline = onlineUsers.has(userId)
      const pStatus: 'online' | 'idle' | 'dnd' | 'offline' = isOnline ? (pres?.presence_status || 'online') : 'offline'
      const deco = pres?.avatar_decoration || known?.avatar_decoration || (friend?.user as any)?.avatar_decoration || (member?.user as any)?.avatar_decoration || null

      let activeGame: string | null = null
      if (isOnline) {
        if (pres?.current_game?.name) {
          activeGame = pres.current_game.name
        } else if (pres?.game_presence?.name) {
          activeGame = pres.game_presence.name
        }
      }

      let statusText = 'Offline'
      if (isOnline) {
        if (activeGame) {
          statusText = `Jogando ${activeGame}`
        } else {
          statusText = pres?.custom_status || 'Disponível'
        }
      }

      list.push({
        id: userId,
        display_name: dName,
        avatar_url: aUrl,
        avatar_decoration: deco,
        status: statusText,
        presence_status: pStatus,
        isOnline,
        unreadCount: unreadDMs[userId] || 0,
        isFriend: Boolean(friend),
        activeGame
      })
    }

    if (selectedDMUserId) {
      resolveUserData(selectedDMUserId)
    }

    recentDMUserIds.forEach(id => resolveUserData(id))
    Object.keys(unreadDMs).forEach(id => resolveUserData(id))

    acceptedFriends.forEach(f => {
      resolveUserData(f.user.id)
    })

    return list
  }, [selectedDMUserId, recentDMUserIds, unreadDMs, acceptedFriends, knownProfiles, spaceMembers, presenceData, onlineUsers, user.id, blockedUserIds])

  const filteredDMConversations = useMemo(() => {
    if (!dmSearchQuery.trim()) return dmConversations
    const q = dmSearchQuery.toLowerCase()
    return dmConversations.filter(c => c.display_name.toLowerCase().includes(q))
  }, [dmConversations, dmSearchQuery])

  return (
    <section className={`friends-workspace ${selectedDMUserId ? 'has-dm-open' : ''} ${!showSidebar ? 'sidebar-collapsed' : ''}`}>
      {/* 1. Left Sidebar: Navegação, Conversas Diretas (DMs) e Perfil */}
      <aside className={`friends-sidebar ${!showSidebar ? 'collapsed' : ''}`}>
        {/* Top Header: Botão Amigos com badge de pendentes + Botão Colapsar */}
        <div className="friends-sidebar-top" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 10px 8px 10px' }}>
          <button
            type="button"
            className={`friends-sidebar-home-btn ${!selectedDMUserId && !selectedGroupId ? 'active' : ''}`}
            onClick={() => {
              onCloseDM()
              setSelectedGroupId?.(null)
            }}
            title="Ver hub de amigos"
          >
            <div className="home-btn-left">
              <UsersIcon style={{ width: '17px', height: '17px' }} />
              <span>Amigos</span>
            </div>
            {pendingRequests.length > 0 && (
              <span className="home-pending-badge" title={`${pendingRequests.length} solicitações pendentes`}>
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setShowSidebar(false)}
            title="Ocultar barra de conversas"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0
            }}
          >
            <PanelLeftCloseIcon style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        {/* Busca Rápida de Conversas */}
        <div style={{ padding: '6px 10px 4px 10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-tertiary)',
            padding: '5px 8px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)'
          }}>
            <SearchIcon style={{ width: '13px', height: '13px', color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={dmSearchQuery}
              onChange={e => setDmSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                width: '100%'
              }}
            />
            {dmSearchQuery && (
              <button
                type="button"
                onClick={() => setDmSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  padding: '0 2px'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lista de Conversas com Scroll */}
        <div className="friends-sidebar-scrollable" style={{ flex: 1, overflowY: 'auto', padding: '4px 6px 12px 6px' }}>
          {/* Seção: Grupos */}
          <div className="dm-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 4px 8px' }}>
            <span>Grupos</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {groupChats.length}
              </span>
              {onCreateGroupChat && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowCreateGroupModal(true)
                  }}
                  title="Criar novo grupo"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-color, #00f2fe)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <PlusIcon style={{ width: '13px', height: '13px' }} />
                </button>
              )}
            </div>
          </div>

          {groupChats.length > 0 && (
            <div className="dm-sidebar-list" style={{ marginBottom: '10px' }}>
              {groupChats.map(group => {
                const isSelected = selectedGroupId === group.id
                const unreadCount = unreadGroups[group.id] || 0
                const typingUsers = groupTypingUsers[group.id] || []
                return (
                  <div
                    key={group.id}
                    className={`dm-list-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      onCloseDM()
                      onOpenGroup ? onOpenGroup(group.id) : setSelectedGroupId?.(group.id)
                    }}
                    title={`Abrir grupo ${group.name}`}
                  >
                    <div className="dm-item-avatar-wrapper">
                      {group.avatar_url ? (
                        <img src={group.avatar_url} alt={group.name} />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--accent-color, #00f2fe) 0%, #3b82f6 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: '#000'
                        }}>
                          <UsersIcon style={{ width: '13px', height: '13px' }} />
                        </div>
                      )}
                    </div>

                    <div className="dm-item-text">
                      <span className="dm-item-name">{group.name}</span>
                      <span className="dm-item-sub">
                        {typingUsers.length > 0 ? (
                          <span style={{ color: '#00f2fe', fontWeight: 600 }}>Digitando...</span>
                        ) : (
                          `${group.members?.length || 0} membros`
                        )}
                      </span>
                    </div>

                    {unreadCount > 0 && (
                      <span className="dm-unread-badge">{unreadCount}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Título da Seção: Mensagens Diretas */}
          <div className="dm-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px 4px 8px' }}>
            <span>Mensagens Diretas</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>
              {filteredDMConversations.length}
            </span>
          </div>
          {filteredDMConversations.length > 0 ? (
            <div className="dm-sidebar-list">
              {filteredDMConversations.map(conv => {
                const isSelected = selectedDMUserId === conv.id
                const isRecentOnly = !conv.isFriend && recentDMUserIds.includes(conv.id)
                return (
                  <div
                    key={conv.id}
                    className={`dm-list-item ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedGroupId?.(null)
                      onOpenDM(conv.id)
                    }}
                    title={`Abrir conversa com ${conv.display_name}`}
                  >
                    <div className="dm-item-avatar-wrapper">
                      <div className="friend-avatar" style={{ width: '100%', height: '100%', fontSize: 13, position: 'relative' }}>
                        {conv.avatar_url ? (
                          <img src={conv.avatar_url} alt={conv.display_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} />
                        ) : (
                          conv.display_name.slice(0, 1).toUpperCase()
                        )}
                        {conv.avatar_decoration && conv.avatar_decoration !== 'none' && (
                          <AvatarDecoration decorationId={conv.avatar_decoration} />
                        )}
                      </div>
                      <span className={`online-indicator ${conv.presence_status}`} />
                    </div>

                    <div className="dm-item-text">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span className="dm-item-name">{conv.display_name}</span>
                        {isRecentOnly && (
                          <span className="dm-tag-badge" title="Membro não está na sua lista de amigos">servidor</span>
                        )}
                      </div>
                      <span className="dm-item-sub">
                        {isFriendTyping && isSelected ? (
                          <span style={{ color: '#00f2fe', fontWeight: 600 }}>Digitando...</span>
                        ) : conv.activeGame ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <GameLogo gameName={conv.activeGame} size={13} />
                            <span>{conv.activeGame}</span>
                          </span>
                        ) : (
                          conv.status
                        )}
                      </span>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="dm-unread-badge">{conv.unreadCount}</span>
                    )}

                    {isRecentOnly && onRemoveRecentDM && (
                      <button
                        type="button"
                        className="dm-dismiss-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveRecentDM(conv.id)
                        }}
                        title="Fechar conversa recente"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="dm-sidebar-empty">
              {dmSearchQuery ? 'Nenhuma conversa encontrada.' : 'Nenhum chat aberto. Inicie uma conversa com seus amigos!'}
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

      {/* 2. Center Content Area: Full Group Chat if active, otherwise DM Chat or Friends Hub */}
      {selectedGroupId && currentActiveGroup ? (
        <GroupConversation
          currentActiveGroup={currentActiveGroup}
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          onCloseGroup={() => setSelectedGroupId?.(null)}
          onLeaveGroupChat={onLeaveGroupChat}
          groupMessages={groupMessages}
          user={user}
          profileDisplayName={profileDisplayName}
          onDeleteGroupMessage={onDeleteGroupMessage}
          openLightbox={openLightbox}
          groupTypingUsers={groupTypingUsers}
          groupDraft={groupDraft}
          setGroupDraft={setGroupDraft}
          notifyGroupTyping={notifyGroupTyping}
          onSendGroupMessage={onSendGroupMessage}
        />
      ) : selectedDMUserId && dmUser ? (
        <DMConversation
          dmUser={dmUser}
          showSidebar={showSidebar}
          setShowSidebar={setShowSidebar}
          onCloseDM={onCloseDM}
          onlineUsers={onlineUsers}
          onAddFriend={onAddFriend}
          onStartCall={onStartCall}
          onBlockUser={onBlockUser}
          onUnblockUser={onUnblockUser}
          blockedUserIds={blockedUserIds}
          activeDirectCall={activeDirectCall}
          isMuted={isMuted}
          toggleMute={toggleMute}
          isDeafened={isDeafened}
          toggleDeafen={toggleDeafen}
          endDirectCall={endDirectCall}
          dmMessagesContainerRef={dmMessagesContainerRef}
          dmMessagesEndRef={dmMessagesEndRef}
          directMessages={directMessages}
          user={user}
          profileDisplayName={profileDisplayName}
          onToggleSaveDM={onToggleSaveDM}
          isMessageSaved={isMessageSaved}
          onDeleteDM={onDeleteDM}
          openLightbox={openLightbox}
          handleToggleVoicePlay={handleToggleVoicePlay}
          voiceNoteAudioRef={voiceNoteAudioRef}
          activePlayingVoiceNote={activePlayingVoiceNote}
          voiceNotePlaySpeed={voiceNotePlaySpeed}
          handleChangeVoiceSpeed={handleChangeVoiceSpeed}
          isVoiceNoteRecording={isVoiceNoteRecording}
          voiceNoteTarget={voiceNoteTarget}
          voiceNoteDuration={voiceNoteDuration}
          onCancelVoiceNote={onCancelVoiceNote}
          onStopVoiceNote={onStopVoiceNote}
          isFriendTyping={isFriendTyping}
          pendingDMPastedFile={pendingDMPastedFile}
          pendingDMImagePreview={pendingDMImagePreview}
          removePendingDMImage={removePendingDMImage}
          handleDMComposeSubmit={handleDMComposeSubmit}
          dmFileRef={dmFileRef}
          isUploading={isUploading}
          onUploadFile={onUploadFile}
          onStartVoiceNote={onStartVoiceNote}
          showDMStickerPicker={showDMStickerPicker}
          setShowDMStickerPicker={setShowDMStickerPicker}
          dmDraft={dmDraft}
          setDmDraft={setDmDraft}
          notifyDMTyping={notifyDMTyping}
          handleDMPaste={handleDMPaste}
          onSendDMSticker={onSendDMSticker}
        />
      ) : (
        <section className="friends-content">
          {/* Top Navigation Bar */}
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

          {(friendTab === 'online' || friendTab === 'all') && (
            <FriendsList
              friendTab={friendTab}
              setFriendTab={setFriendTab}
              friendsList={filterList(friendTab === 'online' ? onlineFriends : acceptedFriends)}
              acceptedFriendsCount={acceptedFriends.length}
              onlineUsers={onlineUsers}
              presenceData={presenceData}
              unreadDMs={unreadDMs}
              onOpenDM={onOpenDM}
              onStartCall={onStartCall}
              onInspectMember={onInspectMember}
              onBlockUser={onBlockUser}
              removeFriendship={removeFriendship}
            />
          )}

          {(friendTab === 'pending' || friendTab === 'add') && (
            <FriendRequests
              friendTab={friendTab}
              setFriendTab={setFriendTab}
              pendingRequests={filterList(pendingRequests)}
              acceptFriendRequest={acceptFriendRequest}
              removeFriendship={removeFriendship}
              user={user}
              profileDisplayName={profileDisplayName}
              copyFriendLink={copyFriendLink}
              friendSearchQuery={friendSearchQuery}
              setFriendSearchQuery={setFriendSearchQuery}
              sendFriendRequest={sendFriendRequest}
              friendSearchNotice={friendSearchNotice}
              suggestedMembers={suggestedMembers}
            />
          )}
        </section>
      )}

      {showCreateGroupModal && onCreateGroupChat && (
        <CreateGroupChatModal
          onClose={() => setShowCreateGroupModal(false)}
          onCreateGroup={onCreateGroupChat}
          acceptedFriends={acceptedFriends}
        />
      )}
    </section>
  )
})
