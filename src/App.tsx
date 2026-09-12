import { useEffect, useState, useRef, lazy, Suspense } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { Auth } from './components/auth/Auth'
import { useEchoVoiceSession } from './hooks/useEchoVoiceSession'
import { useEchoPeerAudio } from './hooks/useEchoPeerAudio'
import { useEchoDesktopShell } from './hooks/useEchoDesktopShell'
import { useEchoGlobalPresence } from './hooks/useEchoGlobalPresence'
import './App.css'
import {
  playFriendRequestSound, 
  playFriendAcceptSound, 
  playDmNotificationSound, 
  playLeaveSound, 
  playScreenStartSound, 
  playScreenStopSound
} from './lib/soundEffects'
import { WhatsNewModal } from './components/WhatsNewModal'
import { APP_CURRENT_VERSION } from './lib/changelogData'
import { EchoShop } from './components/EchoShop'

import { ChannelInviteModal } from './components/modals/ChannelInviteModal'
import { SpaceAddMembersModal } from './components/modals/SpaceAddMembersModal'
import { SavedMessagesModal } from './components/modals/SavedMessagesModal'
import { ImageLightboxModal } from './components/modals/ImageLightboxModal'
import { useEchoAfkDetector } from './hooks/useEchoAfkDetector'
import { useEchoToasts } from './hooks/useEchoToasts'
import { useEchoSavedMessages } from './hooks/useEchoSavedMessages'
import { useEchoAudioDevices } from './hooks/useEchoAudioDevices'
import { ToastContainer } from './components/common/ToastContainer'
import { useEchoPtt } from './hooks/useEchoPtt'
import { useEchoGamePresence } from './hooks/useEchoGamePresence'
import { UpdateBanner } from './components/common/UpdateBanner'
import { VoiceReconnectBanner } from './components/voice/VoiceReconnectBanner'
import { MemberProfileModalWrapper } from './components/modals/MemberProfileModalWrapper'
import { ConfirmModal } from './components/modals/ConfirmModal'
import { VolumeControlModal } from './components/modals/VolumeControlModal'
import { AddSpaceModal } from './components/modals/AddSpaceModal'
import { ScreenPickerModal } from './components/modals/ScreenPickerModal'
import { SoundboardModal, SoundboardToast } from './components/modals/SoundboardModal'
import { AfkPromptModal, AfkDisconnectedModal } from './components/modals/AfkModals'
import { IncomingCallModal } from './components/modals/IncomingCallModal'
import { HoveredMemberPopover } from './components/sidebar/HoveredMemberPopover'
import { ErrorBoundary } from './components/common/ErrorBoundary'

import { TopBar } from './components/navigation/TopBar'
import { WindowControls } from './components/navigation/WindowControls'
import { ChannelsSidebar } from './components/sidebar/ChannelsSidebar'
import { VoiceChannelView } from './views/VoiceChannelView'
import { TextChannelView } from './views/TextChannelView'
import { VoiceMiniOverlay } from './components/voice/VoiceMiniOverlay'
import { FriendsView } from './views/FriendsView'
import { EchoFloatingMiniPlayer } from './components/streaming/EchoFloatingMiniPlayer'

// Lazy-loaded heavy views and modals for instant initial bundle loading
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })))
const SpaceStudioModal = lazy(() => import('./components/modals/SpaceStudioModal').then(m => ({ default: m.SpaceStudioModal })))
const SubscriptionModal = lazy(() => import('./components/modals/SubscriptionModal').then(m => ({ default: m.SubscriptionModal })))
const CommandPaletteModal = lazy(() => import('./components/modals/CommandPaletteModal').then(m => ({ default: m.CommandPaletteModal })))
import { useEchoDirectCalls } from './hooks/useEchoDirectCalls'
import { useEchoScreenShare } from './hooks/useEchoScreenShare'
import { useEchoVoiceNotes } from './hooks/useEchoVoiceNotes'
import { useEchoFriendships } from './hooks/useEchoFriendships'
import { useEchoDirectMessages } from './hooks/useEchoDirectMessages'
import { useEchoChannelMessages } from './hooks/useEchoChannelMessages'
import { useEchoSpaces } from './hooks/useEchoSpaces'
import { useEchoCosmetics } from './hooks/useEchoCosmetics'
import { useEchoSpaceSettings } from './hooks/useEchoSpaceSettings'
import { useEchoRolesAndPermissions } from './hooks/useEchoRolesAndPermissions'
import { useEchoServerEmojis } from './hooks/useEchoServerEmojis'
import { useEchoPinnedMessages } from './hooks/useEchoPinnedMessages'

import type { Space, Channel, Message, DirectMessage, FriendshipRequest, SavedMessageItem, Page, Toast, RolePermissions, ServerRole, ServerAuditLog, ServerEmoji, PinnedMessage } from './types'
export type { Space, Channel, Message, DirectMessage, FriendshipRequest, SavedMessageItem, Page, Toast, RolePermissions, ServerRole, ServerAuditLog, ServerEmoji, PinnedMessage }

/* ── Modern SVG Icons for Call Controls ──────────────── */























































import {
  ColoredRocketIcon,
  ColoredWindowsIcon,
  ColoredMonitorIcon,
  ColoredGamepadIcon,
  ColoredRefreshIcon,
  ColoredPauseIcon,
  ColoredShopBagIcon,
  ColoredBackpackIcon,
  ColoredMaskIcon,
  ColoredSparklesIcon,
  ColoredLightningIcon,
  ColoredGemIcon,
  ColoredClockIcon,
  ColoredMoonSleepIcon,
  ColoredTrayIcon,
  ColoredSoundwaveIcon,
  ColoredBrainAiIcon,
  ColoredHeadphonesIcon,
  ColoredMicActiveIcon,
  ColoredPushToTalkIcon,
  ColoredVolumeSpeakerIcon
} from './components/ColoredIcons'

export {
  ColoredRocketIcon,
  ColoredWindowsIcon,
  ColoredMonitorIcon,
  ColoredGamepadIcon,
  ColoredRefreshIcon,
  ColoredPauseIcon,
  ColoredShopBagIcon,
  ColoredBackpackIcon,
  ColoredMaskIcon,
  ColoredSparklesIcon,
  ColoredLightningIcon,
  ColoredGemIcon,
  ColoredClockIcon,
  ColoredMoonSleepIcon,
  ColoredTrayIcon,
  ColoredSoundwaveIcon,
  ColoredBrainAiIcon,
  ColoredHeadphonesIcon,
  ColoredMicActiveIcon,
  ColoredPushToTalkIcon,
  ColoredVolumeSpeakerIcon
}



















function MainApp() {
  const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true')
  const [user, setUser] = useState<User | null>(() => {
    if (isMock) {
      return {
        id: 'mock-user-id-12345',
        email: 'gamer@echo.gg',
        user_metadata: { display_name: 'Lag9938' },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      } as any
    }
    return null
  })
  const [loading, setLoading] = useState(() => !isMock && Boolean(supabase))
  useEffect(() => {
    if (isMock || !supabase) return
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => listener.subscription.unsubscribe()
  }, [isMock])
  if (loading) {
    return (
      <div className="loading-screen">
        <header className="auth-titlebar">
          <div className="auth-titlebar-drag" />
          <WindowControls isQuitOnClose />
        </header>
        <div className="loader" />
        <span>Abrindo o Echo…</span>
      </div>
    )
  }
  if (!isSupabaseConfigured && !isMock) {
    return (
      <div className="loading-screen">
        <header className="auth-titlebar">
          <div className="auth-titlebar-drag" />
          <WindowControls isQuitOnClose />
        </header>
        <span>A conexão com o banco ainda não foi configurada.</span>
      </div>
    )
  }
  return user ? <Echo user={user} /> : <Auth />
}

export default function App() {
  const isOverlayMode = typeof window !== 'undefined' && window.location.search.includes('mode=overlay')
  if (isOverlayMode) {
    return <VoiceMiniOverlay />
  }

  return <MainApp />
}


function Echo({ user }: { user: User }) {
  const displayName = (user.user_metadata.display_name as string | undefined) || user.email?.split('@')[0] || 'Você'
  const [presenceStatus, setPresenceStatus] = useState<'online' | 'idle' | 'dnd' | 'invisible'>(() => (localStorage.getItem('echo-presence-status') as any) || 'online')
  const [page, setPage] = useState<Page>('Servidores')
  const [error, setError] = useState('')
  const [addSpaceModalTab, setAddSpaceModalTab] = useState<'options' | 'create' | 'join'>('options')

  const { toasts, showToast, removeToast } = useEchoToasts()
  const [knownProfiles, setKnownProfiles] = useState<Record<string, { id: string; display_name: string; avatar_url?: string }>>({})
  const [channelForInvite, setChannelForInvite] = useState<{ channel: Channel; space: Space } | null>(null)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    confirmText?: string; 
    cancelText?: string; 
    isDanger?: boolean; 
    onConfirm: () => void 
  } | null>(null)

  const socialChannelRef = useRef<any>(null)
  const profileDisplayNameRef = useRef<string>('')

  // Callback refs for cross-hook integration
  const canUserDoRef = useRef<(spaceId: string, userId: string, perm: any) => boolean>(() => false)
  const loadSpaceRolesRef = useRef<(spaceId: string) => Promise<any>>(() => Promise.resolve([]))
  const loadMemberRolesRef = useRef<(spaceId: string) => Promise<any>>(() => Promise.resolve([]))
  const loadSpaceEmojisRef = useRef<(spaceId: string) => void>(() => {})

  const avatarDecorationRef = useRef<string>('')
  const profileEffectRef = useRef<string>('')
  const profileAvatarUrlRef = useRef<string>('')
  const myGamePresenceRef = useRef<any>(null)
  const addAuditLogRef = useRef<(spaceId: string, action: string) => void>(() => {})
  const handleJoinVoiceRef = useRef<(channelId: string, explicitSpaceId?: string) => Promise<void>>(() => Promise.resolve())
  const setMessagesRef = useRef<(msgs: any[]) => void>(() => {})
  const processSpaceInviteRef = useRef<((url: string) => Promise<void>) | null>(null)

  // Spaces, Channels & Members Hook
  const {
    spaces,
    setSpaces,
    expandedSpace,
    setExpandedSpace,
    spaceChannels,
    setSpaceChannels,
    spaceChannelsRef,
    selectedChannel,
    setSelectedChannel,
    spaceMembers,
    setSpaceMembers,
    newSpace,
    setNewSpace,
    creating,
    showAddSpaceModal,
    setShowAddSpaceModal,
    joinSpaceCode,
    setJoinSpaceCode,
    joining,
    showNewChannel,
    setShowNewChannel,
    newChannelName,
    setNewChannelName,
    newChannelType,
    setNewChannelType,
    setNewChannelTopic,
    newChannelCategory,
    setNewChannelCategory,
    newChannelIsPrivate,
    setNewChannelIsPrivate,
    newChannelAllowedRoles,
    setNewChannelAllowedRoles,
    loadSpaces,
    loadChannelsForSpace,
    loadSpaceMembers,
    createSpace,
    processSpaceInvite,
    joinSpace,
    createChannel,
    getSpaceForChannel
  } = useEchoSpaces({
    user,
    getProfileDisplayName: () => profileDisplayNameRef.current,
    getProfileAvatarUrl: () => profileAvatarUrlRef.current,
    displayName,
    getAvatarDecoration: () => avatarDecorationRef.current,
    getProfileEffect: () => profileEffectRef.current,
    setPage,
    showToast,
    setError,
    handleJoinVoice: (chId, spId) => handleJoinVoiceRef.current(chId, spId),
    addAuditLog: (spId, act) => addAuditLogRef.current(spId, act),
    loadSpaceRoles: (spId) => loadSpaceRolesRef.current(spId),
    loadMemberRoles: (spId) => loadMemberRolesRef.current(spId),
    setMessages: (msgs) => setMessagesRef.current(msgs),
    supabase
  })
  processSpaceInviteRef.current = processSpaceInvite

  // Space Settings & Administration Hook
  const {
    editingSpace,
    editingSpaceName,
    setEditingSpaceName,
    editingSpaceDescription,
    setEditingSpaceDescription,
    editingSpaceIconUrl,
    setEditingSpaceIconUrl,
    editingSpaceBannerUrl,
    setEditingSpaceBannerUrl,
    editingSpaceBannerTheme,
    setEditingSpaceBannerTheme,
    editingSpaceWelcomeChannelId,
    setEditingSpaceWelcomeChannelId,
    uploadingSpaceIcon,
    uploadingSpaceBanner,
    activeSpaceTab,
    setActiveSpaceTab,
    editingSpaceMembers,
    memberSearchQuery,
    setMemberSearchQuery,
    loadingEditingMembers,
    showSpaceSettingsModal,
    setShowSpaceSettingsModal,
    collapsedCategories,
    serverAuditLogs,
    mutedSpaces,
    loadEditingSpaceMembers,
    addAuditLog,
    handleSpaceIconUpload,
    handleRemoveSpaceIcon,
    handleSpaceBannerUpload,
    handleRemoveSpaceBanner,
    toggleCategoryCollapse,
    handleRoleChange,
    handleKickMember,
    moveChannel,
    updateChannelSettings,
    toggleMuteSpace,
    triggerDesktopNotification,
    openSpaceSettings,
    handleSaveSpaceSettings,
    renameChannel,
    deleteChannel,
    handleDeleteSpace,
    handleLeaveSpace,
    handleAddMemberToSpace
  } = useEchoSpaceSettings({
    user,
    getProfileDisplayName: () => profileDisplayNameRef.current,
    displayName,
    spaces,
    setSpaces,
    spaceChannels,
    setSpaceChannels,
    selectedChannel,
    setSelectedChannel,
    expandedSpace,
    setExpandedSpace,
    setSpaceMembers,
    socialChannelRef,
    canUserDo: (spaceId, userId, perm) => canUserDoRef.current(spaceId, userId, perm),
    loadSpaces: () => loadSpaces(),
    loadChannelsForSpace: (id) => loadChannelsForSpace(id),
    loadSpaceMembers: (id) => loadSpaceMembers(id),
    loadSpaceRoles: (id) => loadSpaceRolesRef.current(id),
    loadMemberRoles: (id) => loadMemberRolesRef.current(id),
    loadSpaceEmojis: (id) => loadSpaceEmojisRef.current(id),
    showToast,
    setConfirmModalConfig,
    setError,
    presenceStatus,
    supabase
  })
  addAuditLogRef.current = addAuditLog
  
  // Roles & Permissions Hook
  const {
    serverRoles,
    selectedRoleId,
    setSelectedRoleId,
    memberRoleMap,
    loadSpaceRoles,
    loadMemberRoles,
    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
    moveRole,
    toggleMemberRole,
    getUserHighestRole,
    canUserDo
  } = useEchoRolesAndPermissions({
    editingSpace,
    spaces,
    addAuditLog,
    showToast,
    supabase
  })

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [editingChannelSettingsId, setEditingChannelSettingsId] = useState<string | null>(null)

  // Server Emojis Hook
  const {
    serverEmojis,
    newEmojiName,
    setNewEmojiName,
    uploadingEmoji,
    loadSpaceEmojis,
    handleCreateEmoji,
    handleDeleteEmoji
  } = useEchoServerEmojis({
    editingSpace,
    user,
    addAuditLog,
    showToast,
    supabase
  })

  canUserDoRef.current = canUserDo
  loadSpaceRolesRef.current = loadSpaceRoles
  loadMemberRolesRef.current = loadMemberRoles
  loadSpaceEmojisRef.current = loadSpaceEmojis

  // Search States
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)

  // Slowmode, Categories & Server UI States
  const [channelSearchQuery, setChannelSearchQuery] = useState('')
  const channelSearchInputRef = useRef<HTMLInputElement | null>(null)
  const [showServerDropdown, setShowServerDropdown] = useState(false)

  // Inspected Member Card Modal
  const [inspectedMember, setInspectedMember] = useState<{ user: { id: string; display_name: string; avatar_url?: string }; joined_at?: string; roleName?: string; roleColor?: string; roles?: ServerRole[] } | null>(null)

  // Hover Popover State for Member List
  const [hoveredMemberPopover, setHoveredMemberPopover] = useState<{
    user: { id: string; display_name: string; avatar_url?: string }
    roleName?: string
    roleColor?: string
    roles?: ServerRole[]
    clanTag?: string | null
    clanTagColor?: string
    activeGame?: string | null
    activeGameStartedAt?: number | null
    isVoiceUser?: boolean
    userPresenceStatus: string
    isOnline: boolean
    customStatus?: string | null
    rect: { top: number; left: number; height: number; bottom: number }
  } | null>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Audit Logs States

  // Channel Customization States

  const [spaceForAddMembers, setSpaceForAddMembers] = useState<Space | null>(null)
  const [showMembersList, setShowMembersList] = useState(true)
  const [showVoiceChat, setShowVoiceChat] = useState(false)
  const [customStatus, setCustomStatus] = useState(() => localStorage.getItem('echo-custom-status') || '')
  const [unreadChannels, setUnreadChannels] = useState<Set<string>>(new Set())
  const selectedChannelRef = useRef(selectedChannel)
  const mutedSpacesRef = useRef(mutedSpaces)
  const presenceChannelRef = useRef<any>(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(() => localStorage.getItem('echo-noise-suppression') !== 'false')
  const [echoCancellationEnabled, setEchoCancellationEnabled] = useState(() => localStorage.getItem('echo-echo-cancellation') !== 'false')
  const [noiseGateEnabled, setNoiseGateEnabled] = useState(() => localStorage.getItem('echo-noise-gate-enabled') !== 'false')
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(() => parseFloat(localStorage.getItem('echo-noise-gate-threshold') || '-45'))
  const [sfxVolume, setSfxVolume] = useState(() => {
    const val = localStorage.getItem('echo-sfx-volume')
    return val !== null ? parseFloat(val) : 0.5
  })

  // Auto-update state
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'downloading' | 'ready'>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [updateProgress, setUpdateProgress] = useState(0)

  // Cosmetics, Shop, Appearance & Themes Hook
  const {
    avatarDecoration,
    setAvatarDecoration,
    profileEffect,
    setProfileEffect,
    avatarFrame,
    cardFinish,
    nameEffect,
    shopInitialTab,
    setShopInitialTab,
    settingsInitialTab,
    setSettingsInitialTab,
    theme,
    isPremiumUser,
    showSubscriptionModal,
    setShowSubscriptionModal,
    customAccentColor,
    setCustomAccentColor,
    chatDensity,
    setChatDensity,
    performanceMode,
    setPerformanceMode,
    handleEquipDecoration,
    handleEquipProfileEffect,
    handleEquipAvatarFrame,
    handleEquipCardFinish,
    handleEquipNameEffect,
    selectTheme,
    toggleTheme,
    handleSimulateSubscription,
    handleResetSubscription
  } = useEchoCosmetics({
    user,
    getProfileDisplayName: () => profileDisplayNameRef.current,
    presenceStatus,
    getMyGamePresence: () => myGamePresenceRef.current,
    presenceChannelRef,
    supabase
  })
  avatarDecorationRef.current = avatarDecoration
  profileEffectRef.current = profileEffect

  async function updatePresenceStatus(status: 'online' | 'idle' | 'dnd' | 'invisible') {
    setPresenceStatus(status)
    localStorage.setItem('echo-presence-status', status)
    if (presenceChannelRef.current) {
      const savedStatus = status === 'invisible' ? '' : (localStorage.getItem('echo-custom-status') || '')
      const gameData = status === 'invisible' ? null : myGamePresence
      const curDeco = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || avatarDecoration || ''
      const curEff = localStorage.getItem(`echo-profile-effect-${user.id}`) || profileEffect || ''
      const curNameEff = localStorage.getItem(`echo-name-effect-${user.id}`) || nameEffect || 'resonance_cyan'
      await presenceChannelRef.current.track({
        user_id: user.id,
        display_name: profileDisplayName,
        online_at: new Date().toISOString(),
        custom_status: savedStatus,
        presence_status: status,
        current_game: gameData,
        avatar_decoration: curDeco,
        profile_effect: curEff,
        name_effect: curNameEff
      })
    }
  }

  useEffect(() => {
    selectedChannelRef.current = selectedChannel
    if (selectedChannel) {
      queueMicrotask(() => {
        setUnreadChannels(prev => {
          if (!prev.has(selectedChannel.id)) return prev
          const next = new Set(prev)
          next.delete(selectedChannel.id)
          return next
        })
      })
    }
  }, [selectedChannel])

  // Request desktop notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])


  // Local profile states
  const [profileDisplayName, setProfileDisplayName] = useState(displayName)
  profileDisplayNameRef.current = profileDisplayName
  const [profileAvatarUrl, setProfileAvatarUrl] = useState('')
  profileAvatarUrlRef.current = profileAvatarUrl

  // Pinned Messages Hook
  const {
    pinnedMessages,
    showPinnedMessagesPanel,
    setShowPinnedMessagesPanel,
    loadPinnedMessages,
    togglePinMessage
  } = useEchoPinnedMessages({
    profileDisplayName,
    profileId: user.id,
    supabase,
    addAuditLog,
    showToast
  })

  // Global Online Presence Hook (Phase 19)
  const {
    presenceData,
    setPresenceData,
    onlineUsers,
    setOnlineUsers
  } = useEchoGlobalPresence({
    user,
    profileDisplayName,
    displayName,
    avatarDecoration,
    profileEffect,
    myGamePresenceRef,
    presenceChannelRef,
    supabase
  })

  const [friendTab, setFriendTab] = useState<'online' | 'all' | 'pending' | 'add'>('online')

  // Friendships Hook
  const {
    friendships,
    friendSearchQuery,
    setFriendSearchQuery,
    friendSearchNotice,
    pendingFriendCount,
    loadFriendships,
    sendFriendRequest,
    sendFriendRequestToUser,
    acceptFriendRequest,
    removeFriendship,
    handleFriendshipPostgresChanges,
    handleFriendEvent
  } = useEchoFriendships({
    user,
    profileDisplayName,
    displayName,
    socialChannelRef,
    sfxVolume,
    showToast,
    triggerDesktopNotification,
    setError,
    setOnlineUsers,
    setPresenceData,
    playFriendRequestSound,
    playFriendAcceptSound,
    supabase
  })

  // Direct Messages Hook
  const {
    directMessages,
    setDirectMessages,
    selectedDMUserId,
    setSelectedDMUserId,
    selectedDMUserIdRef,
    unreadDMs,
    setUnreadDMs,
    recentDMUserIds,
    setRecentDMUserIds,
    dmDraft,
    setDmDraft,
    isFriendTyping,
    notifyDMTyping,
    loadDirectMessages,
    sendDirectMessage,
    handleDeleteDM,
    handleOpenDirectChat,
    handleNewDMPostgresChanges,
    handleDMBroadcast,
    handleDMDeleteBroadcast,
    handleDMTypingBroadcast
  } = useEchoDirectMessages({
    user,
    profileDisplayName,
    displayName,
    friendships,
    spaceMembers,
    socialChannelRef,
    sfxVolume,
    showToast,
    triggerDesktopNotification,
    setError,
    setPage,
    setInspectedMember,
    setHoveredMemberPopover,
    setKnownProfiles,
    playDmNotificationSound,
    supabase
  })
  // Channel Messages Hook
  const {
    messages,
    setMessages,
    draft,
    setDraft,
    isUploading,
    setIsUploading,
    replyingToMessage,
    setReplyingToMessage,
    messageReactions,
    slowmodeCooldown,
    hasMoreMessages,
    isLoadingMore,
    messagesEndRef,
    messagesContainerRef,
    loadMoreMessages,
    handleChatFileUpload,
    toggleReaction,
    postChannelMessage,
    retrySendMessage,
    handleDeleteMessage,
    send,
    typingUsers,
    notifyTyping
  } = useEchoChannelMessages({

    user,
    profileDisplayName,
    profileAvatarUrl,
    displayName,
    selectedChannel,
    spaces,
    sfxVolume,
    canUserDo,
    showToast,
    setError,
    playDmNotificationSound,
    supabase
  })
  setMessagesRef.current = setMessages

  // Auto-update listener
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onUpdateAvailable) return
    api.onUpdateAvailable((info: { version: string }) => {
      setUpdateStatus('downloading')
      setUpdateVersion(info.version)
    })
    api.onUpdateProgress((progress: { percent: number }) => {
      setUpdateProgress(progress.percent)
    })
    api.onUpdateReady((info: { version: string }) => {
      setUpdateStatus('ready')
      setUpdateVersion(info.version)
    })
  }, [])

  // Voice Session Refs & Hook (Phase 18)
  const selectedInputIdRef = useRef('')
  const selectedOutputIdRef = useRef('')
  const noiseSuppressionEnabledRef = useRef(true)
  const echoCancellationEnabledRef = useRef(true)
  const activeSharingSourceRef = useRef<any>(null)
  const setActiveSharingSourceRef = useRef<((src: any) => void) | null>(null)

  const { 
    participants, 
    isMuted, 
    isDeafened,
    isConnected, 
    localScreenStream,
    rtcStats,
    isPttMode,
    isPttActive,
    lastSoundboardEvent,
    isRecordingCall,
    recordingDuration,
    leaveVoice, 
    startScreenShare,
    stopScreenShare,
    changeInputDevice,
    changeOutputDevice,
    changeScreenShareSettings,
    changePeerVolume,
    changePeerPan,
    setSpatialAudioEnabled,
    changePeerScreenVolume,
    setPttMode,
    setPttActive,
    playSoundboard,
    startCallRecording,
    stopCallRecording,
    isAiDenoiseEnabled,
    toggleAiDenoise,
    updateScreenSubscriptions,
    updateLocalProfile,
    screenAudioSyncDelayMs,
    changeScreenAudioSyncDelay,
    isVoiceReconnecting,
    voiceReconnectCountdown,
    voiceReconnectAttempt,
    retryVoiceReconnect,
    cancelVoiceReconnect,
    activeVoiceChannelId,
    setActiveVoiceChannelId,
    spaceVoiceUsers,
    activeVoiceChannel,
    handleJoinVoice,
    handleLeaveVoice,
    handleToggleMute,
    handleToggleDeafen,
    serverMuteParticipant,
    disconnectParticipant,
    moveParticipant
  } = useEchoVoiceSession({ 
    user,
    profileDisplayName,
    profileAvatarUrl,
    sfxVolume,
    getSelectedInputId: () => selectedInputIdRef.current,
    getSelectedOutputId: () => selectedOutputIdRef.current,
    getNoiseSuppressionEnabled: () => noiseSuppressionEnabledRef.current,
    getEchoCancellationEnabled: () => echoCancellationEnabledRef.current,
    getActiveSharingSource: () => activeSharingSourceRef.current,
    onBeforeJoinVoice: () => {
      lastActivityRef.current = Date.now()
      setShowAfkPrompt(false)
      setShowAfkDisconnectedModal(false)
    },
    onLeaveVoice: () => {
      if (setActiveSharingSourceRef.current) {
        setActiveSharingSourceRef.current(null)
      }
    },
    spaces,
    spaceChannelsRef,
    selectedChannel,
    spaceChannels,
    showToast,
    supabase
  })
  handleJoinVoiceRef.current = handleJoinVoice

  // Global Voice Shortcuts (Mute / Deafen) via Electron IPC
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onGlobalVoiceToggle) return

    api.registerGlobalVoiceShortcut?.('toggle-mute', 'F8')
    api.registerGlobalVoiceShortcut?.('toggle-deafen', 'F9')

    const removeListener = api.onGlobalVoiceToggle((action: string) => {
      if (action === 'toggle-mute') {
        handleToggleMute()
      } else if (action === 'toggle-deafen') {
        handleToggleDeafen()
      }
    })

    return () => {
      if (typeof removeListener === 'function') removeListener()
    }
  }, [handleToggleMute, handleToggleDeafen])

  // Soundboard & WhatsNew Modals
  const [showSoundboardModal, setShowSoundboardModal] = useState(false)
  const [showWhatsNewModal, setShowWhatsNewModal] = useState<boolean>(() => {
    const seen = localStorage.getItem('echo_last_seen_version')
    return seen !== APP_CURRENT_VERSION
  })


  // In-App & Custom Invite Event Listener (Tratamento interno 100% no app sem abrir navegador)
  useEffect(() => {
    const handleInAppInviteEvent = (e: any) => {
      const input = e.detail?.input
      if (input && processSpaceInviteRef.current) {
        console.log('[InAppInvite] Processando convite internamente:', input)
        processSpaceInviteRef.current(input)
      }
    }
    window.addEventListener('echo-process-invite', handleInAppInviteEvent as EventListener)
    return () => {
      window.removeEventListener('echo-process-invite', handleInAppInviteEvent as EventListener)
    }
  }, [])

  // Deep-Link Protocol Listener (echo://invite/... ou URLs externas)
  useEffect(() => {
    if (!user?.id || !(window as any).electronAPI) return

    const handleInviteUrl = (url: string) => {
      if (url && typeof url === 'string' && (url.startsWith('echo://') || url.includes('/invite') || url.includes('space='))) {
        console.log('[DeepLink] Convite recebido via deep-link ou web:', url)
        processSpaceInviteRef.current?.(url)
      }
    }

    if (typeof (window as any).electronAPI.onDeepLinkInvite === 'function') {
      ;(window as any).electronAPI.onDeepLinkInvite(handleInviteUrl)
    }

    if (typeof (window as any).electronAPI.getInitialInviteUrl === 'function') {
      ;(window as any).electronAPI.getInitialInviteUrl().then((initialUrl: string | null) => {
        if (initialUrl) {
          handleInviteUrl(initialUrl)
        }
      }).catch(() => {})
    }
  }, [user?.id])


  // Push-to-Talk settings via custom hook
  const {
    pttKey,
    setPttKey,
    pttModeSetting,
    setPttModeSetting
  } = useEchoPtt({
    isConnected,
    setPttMode,
    setPttActive
  })

  // Rich Presence: My active game via custom hook
  const { myGamePresence } = useEchoGamePresence({
    userId: user.id,
    profileDisplayName,
    avatarDecoration,
    profileEffect,
    nameEffect,
    presenceStatus,
    presenceChannelRef
  })
  myGamePresenceRef.current = myGamePresence




  // Saved Messages State & Handlers via custom hook
  const {
    savedMessages,
    setSavedMessages,
    showSavedMessagesModal,
    setShowSavedMessagesModal,
    isMessageSaved,
    toggleSaveMessage,
    handleJumpToSavedMessage
  } = useEchoSavedMessages({
    userId: user.id,
    profileDisplayName,
    profileAvatarUrl,
    supabase,
    showToast,
    spaceChannels,
    setExpandedSpace,
    setSelectedChannel,
    setSelectedDMUserId,
    setPage
  })

  // Deep Link: Join space via echo://invite/... or link
  useEffect(() => {
    if ((window as any).electronAPI?.onDeepLinkInvite) {
      (window as any).electronAPI.onDeepLinkInvite((url: string) => {
        if (!url) return
        const spMatch = url.match(/[?&]space=([a-f0-9-]{36}|[a-zA-Z0-9_-]{10,})/i)
        const match = spMatch || url.match(/(?:invite\/|^)([a-f0-9-]{36}|[a-zA-Z0-9_-]{10,})/i)
        if (match && match[1]) {
          setJoinSpaceCode(match[1])
          setAddSpaceModalTab('join')
          setShowAddSpaceModal(true)
        }
      })
    }
  }, [])




  // Chat Features: Reply, Reactions, Voice Notes, GIFs
  
  // Voice Notes Hook
  const {
    isVoiceNoteRecording,
    voiceNoteDuration,
    voiceNoteTarget,
    voiceNotePlaySpeed,
    voiceNoteAudioRef,
    activePlayingVoiceNote,
    handleToggleVoicePlay,
    handleChangeVoiceSpeed,
    startVoiceNoteRecording,
    stopVoiceNoteRecording,
    cancelVoiceNoteRecording
  } = useEchoVoiceNotes({
    user,
    selectedChannel,
    selectedDMUserId,
    supabase,
    showToast,
    postChannelMessage,
    sendDirectMessage
  })

  useEffect(() => {
    async function loadUserProfile() {
      if (!supabase) return
      try {
        const { data, error } = await supabase.from('profiles').select('display_name, avatar_url, avatar_decoration, profile_effect').eq('id', user.id).single()
        if (!error && data) {
          if (data.display_name) setProfileDisplayName(data.display_name)
          if (data.avatar_url) setProfileAvatarUrl(data.avatar_url)
          if (data.avatar_decoration) {
            setAvatarDecoration(data.avatar_decoration)
            localStorage.setItem(`echo-avatar-decoration-${user.id}`, data.avatar_decoration)
            localStorage.setItem('echo-avatar-decoration', data.avatar_decoration)
          }
          if (data.profile_effect) {
            setProfileEffect(data.profile_effect)
            localStorage.setItem(`echo-profile-effect-${user.id}`, data.profile_effect)
            localStorage.setItem('echo-profile-effect', data.profile_effect)
          }
          return
        }
      } catch (e) {}

      const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single()
      if (data) {
        if (data.display_name) setProfileDisplayName(data.display_name)
        if (data.avatar_url) setProfileAvatarUrl(data.avatar_url)
      }
    }
    loadUserProfile()
  }, [user.id])

  // Peer Audio Configuration Hook (Phase 19)
  const {
    userVolumes,
    setUserVolumes,
    volumeControlUser,
    setVolumeControlUser,
    spatialAudioEnabled,
    setSpatialAudioEnabledState,
    userStereoPans,
    setUserStereoPans,
    peerScreenVolumes,
    setPeerScreenVolumes
  } = useEchoPeerAudio({
    userId: user.id,
    participants,
    changePeerVolume,
    changePeerPan,
    setSpatialAudioEnabled,
    changePeerScreenVolume
  })

  // Desktop Shell, Fullscreen & Stream Viewing Hook (Phase 19)
  const {
    handleToggleOverlay,
    topbarPinned,
    setTopbarPinned,
    showTopbar,
    hideTopbar,
    isTopbarVisible,
    setSelectedScreenSharerUserId,
    screenShareViewMode,
    setScreenShareViewMode,
    isWatchingStreams,
    setIsWatchingStreams,
    isPiPActive,
    setIsPiPActive,
    activeScreenSharers,
    activeScreenSharer,
    isScreenFullScreen,
    toggleScreenFullScreen
  } = useEchoDesktopShell({
    channelSearchInputRef,
    showSpaceSettingsModal,
    setShowSpaceSettingsModal,
    showToast,
    participants,
    isConnected,
    selectedChannel,
    activeVoiceChannelId,
    page,
    updateScreenSubscriptions
  })


  // Screen Share Hook
  const {
    screenQuality,
    setScreenQuality,
    screenFps,
    setScreenFps,
    screenSources,
    setScreenSources,
    showScreenPicker,
    setShowScreenPicker,
    screenPickerTab,
    setScreenPickerTab,
    showScreenMenu,
    setShowScreenMenu,
    selectedPickerSourceId,
    setSelectedPickerSourceId,
    activeSharingSource,
    setActiveSharingSource,
    handleQualityChange,
    handleFpsChange,
    forceOpenScreenPicker,
    handleStopScreenShare,
    openScreenPicker,
    selectScreenSource
  } = useEchoScreenShare({
    user,
    localScreenStream,
    sfxVolume,
    startScreenShare,
    stopScreenShare,
    changeScreenShareSettings,
    setIsWatchingStreams,
    setSelectedScreenSharerUserId,
    setScreenShareViewMode,
    setError,
    playScreenStartSound,
    playScreenStopSound
  })
  activeSharingSourceRef.current = activeSharingSource
  setActiveSharingSourceRef.current = setActiveSharingSource


  // ── Inactivity / AFK Tracker via custom hook ──
  const {
    showAfkPrompt,
    setShowAfkPrompt,
    afkCountdown,
    showAfkDisconnectedModal,
    setShowAfkDisconnectedModal,
    lastActivityRef,
    lastAfkChannelRef,
    handleAfkStay
  } = useEchoAfkDetector({
    isConnected,
    participants,
    userId: user?.id,
    activeVoiceChannelId,
    spaceId: selectedChannel?.space_id,
    spaceChannels,
    handleLeaveVoice
  })

  // Audio settings configuration via custom hook
  const {
    audioInputs,
    audioOutputs,
    selectedInputId,
    selectedOutputId,
    audioError,
    loadAudioDevices,
    handleInputDeviceChange,
    handleOutputDeviceChange
  } = useEchoAudioDevices({
    page,
    noiseSuppressionEnabled,
    echoCancellationEnabled,
    changeInputDevice,
    changeOutputDevice
  })
  selectedInputIdRef.current = selectedInputId
  selectedOutputIdRef.current = selectedOutputId
  noiseSuppressionEnabledRef.current = noiseSuppressionEnabled
  echoCancellationEnabledRef.current = echoCancellationEnabled


  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null)
  const screenShareContainerRef = useRef<HTMLDivElement | null>(null)

  // Re-attach screen stream to video element whenever the page changes or the stream updates
  useEffect(() => {
    if (screenShareVideoRef.current) {
      const stream = activeScreenSharer?.screenStream || null
      if (screenShareVideoRef.current.srcObject !== stream) {
        screenShareVideoRef.current.srcObject = stream
      }
      // Force play in case browser paused it when hidden
      if (stream && screenShareVideoRef.current.paused) {
        screenShareVideoRef.current.play().catch(() => {})
      }
    }
  }, [activeScreenSharer?.screenStream, selectedChannel, page])





  // 1v1 Direct Voice Calling Hook
  const {
    activeDirectCall,
    incomingCall,
    startDirectCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endDirectCall,
    handleCallEvent
  } = useEchoDirectCalls({
    user,
    profileDisplayName,
    displayName,
    profileAvatarUrl,
    socialChannelRef,
    sfxVolume,
    handleJoinVoice,
    leaveVoice,
    setActiveVoiceChannelId,
    showToast,
    triggerDesktopNotification,
    playLeaveSound
  })


  useEffect(() => {
    loadSpaces()
    loadFriendships()
    loadAudioDevices()

    const client = supabase
    if (!client) return
    
    // Setup global realtime messages listener to detect unread messages
    const globalMessagesChannel = client.channel('global-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any
        if (newMsg && newMsg.channel_id !== selectedChannelRef.current?.id) {
          setUnreadChannels(prev => {
            if (prev.has(newMsg.channel_id)) return prev
            const next = new Set(prev)
            next.add(newMsg.channel_id)
            return next
          })
          
          const isSpaceMuted = Object.entries(spaceChannelsRef.current).some(([sId, chList]) => 
            mutedSpacesRef.current.has(sId) && chList.some(c => c.id === newMsg.channel_id)
          )

          if (!document.hasFocus() && !isSpaceMuted) {
            triggerDesktopNotification('Nova mensagem', newMsg.body || '')
          }
        }
      })
      .subscribe()

    return () => {
      client.removeChannel(globalMessagesChannel)
    }
  }, [])

  useEffect(() => {
    selectedChannelRef.current = selectedChannel
  }, [selectedChannel])

  useEffect(() => {
    mutedSpacesRef.current = mutedSpaces
  }, [mutedSpaces])


  // Listen for realtime direct messages and show notifications (Realtime Broadcast + Database)
  useEffect(() => {
    if (!supabase || !user) return

    const liveDMs = supabase
      .channel('public-direct-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, handleNewDMPostgresChanges)
      .subscribe()

    return () => {
      supabase?.removeChannel(liveDMs)
    }
  }, [handleNewDMPostgresChanges, supabase, user])

  // Global Social Broadcast Channel for 0ms instant friend and DM delivery
  useEffect(() => {
    if (!supabase || !user) return

    const liveFriendships = supabase
      .channel('public-friendships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, handleFriendshipPostgresChanges)
      .subscribe()

    // Dedicated Realtime WebSockets Broadcast Channel
    const socialChannel = supabase.channel('echo-social-events')
    socialChannelRef.current = socialChannel

    socialChannel
      .on('broadcast', { event: 'friend-event' }, (payload: any) => {
        handleFriendEvent(payload?.payload)
      })
      .on('broadcast', { event: 'dm-event' }, (payload: any) => {
        handleDMBroadcast(payload?.payload)
      })
      .on('broadcast', { event: 'dm-delete' }, (payload: any) => {
        handleDMDeleteBroadcast(payload?.payload)
      })
      .on('broadcast', { event: 'call-event' }, (payload: any) => {
        handleCallEvent(payload?.payload)
      })
      .on('broadcast', { event: 'dm-typing' }, (payload: any) => {
        handleDMTypingBroadcast(payload?.payload)
      })
      .subscribe()

    return () => {
      supabase?.removeChannel(liveFriendships)
      supabase?.removeChannel(socialChannel)
    }
  }, [handleFriendshipPostgresChanges, handleFriendEvent, handleDMBroadcast, handleDMDeleteBroadcast, handleCallEvent, handleDMTypingBroadcast, supabase, user])

  // Resilient background sync interval (every 60 seconds)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      loadFriendships()
      if (selectedDMUserIdRef.current) {
        loadDirectMessages(selectedDMUserIdRef.current)
      }
    }, 60000)

    return () => {
      clearInterval(syncInterval)
    }
  }, [loadFriendships, loadDirectMessages, selectedDMUserIdRef])

  useEffect(() => {
    if (selectedChannel) {
      loadPinnedMessages(selectedChannel.id)
      if (selectedChannel.space_id) {
        loadSpaceEmojis(selectedChannel.space_id)
      }
    }
  }, [selectedChannel?.id])


  useEffect(() => {
    ;(window as any).__resetEchoPro = handleResetSubscription
  }, [handleResetSubscription])

  const currentSpace = spaces.find(s => s.id === expandedSpace) || getSpaceForChannel(selectedChannel) || spaces[0] || null


  return (
    <main className="echo-app">
      <UpdateBanner
        updateStatus={updateStatus}
        updateVersion={updateVersion}
        updateProgress={updateProgress}
        onRestart={() => (window as any).electronAPI?.installUpdate()}
      />

      <Suspense fallback={null}>
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          onSimulateSubscription={handleSimulateSubscription}
          isPremiumUser={isPremiumUser}
          onResetSubscription={handleResetSubscription}
          userEmail={user.email}
          userName={profileDisplayName || user.email}
          onSubscriptionSuccess={handleSimulateSubscription}
        />
      </Suspense>

      {/* Sensor de proximidade no topo da tela para disparar a abertura suave da barra */}
      {!topbarPinned && !isTopbarVisible && !showSpaceSettingsModal && (
        <div 
          className="topbar-hover-sensor"
          onMouseEnter={showTopbar}
        />
      )}

      {/* Barra Discreta de Reconexão Automática de Voz */}
      <VoiceReconnectBanner
        isVoiceReconnecting={isVoiceReconnecting}
        voiceReconnectCountdown={voiceReconnectCountdown}
        voiceReconnectAttempt={voiceReconnectAttempt}
        onRetry={retryVoiceReconnect}
        onCancel={cancelVoiceReconnect}
      />

      <TopBar
        isTopbarVisible={isTopbarVisible}
        showTopbar={showTopbar}
        hideTopbar={hideTopbar}
        page={page}
        setPage={setPage}
        pendingFriendCount={pendingFriendCount}
        unreadDMs={unreadDMs}
        spaces={spaces}
        expandedSpace={expandedSpace}
        setExpandedSpace={setExpandedSpace}
        spaceChannels={spaceChannels}
        loadChannelsForSpace={loadChannelsForSpace}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        unreadChannels={unreadChannels}
        spaceVoiceUsers={spaceVoiceUsers}
        activeVoiceChannelId={activeVoiceChannelId}
        participants={participants}
        setAddSpaceModalTab={setAddSpaceModalTab}
        setShowAddSpaceModal={setShowAddSpaceModal}
        savedMessages={savedMessages}
        setShowSavedMessagesModal={setShowSavedMessagesModal}
        topbarPinned={topbarPinned}
        setTopbarPinned={setTopbarPinned}
        currentUserId={user.id}
      />

      <section 
        key={expandedSpace || 'default'} 
        className="workspace server-view-enter" 
        style={{ display: page === 'Servidores' ? undefined : 'none' }}
      >
        {/* 2. CHANNELS SIDEBAR FOR ACTIVE SERVER (240px) */}
        <ErrorBoundary name="Canais">
          <ChannelsSidebar
            spaces={spaces}
            expandedSpace={expandedSpace}
            user={user}
            profileDisplayName={profileDisplayName}
            profileAvatarUrl={profileAvatarUrl}
            presenceStatus={presenceStatus}
            showStatusMenu={showStatusMenu}
            setShowStatusMenu={setShowStatusMenu}
            updatePresenceStatus={updatePresenceStatus}
            theme={theme}
            toggleTheme={toggleTheme}
            setPage={setPage}
            setShowWhatsNewModal={setShowWhatsNewModal}
            onSignOut={() => supabase?.auth.signOut()}
            myGamePresence={myGamePresence}
            avatarDecoration={avatarDecoration}
            setAddSpaceModalTab={setAddSpaceModalTab}
            setShowAddSpaceModal={setShowAddSpaceModal}
            showServerDropdown={showServerDropdown}
            setShowServerDropdown={setShowServerDropdown}
            openSpaceSettings={openSpaceSettings}
            setChannelForInvite={setChannelForInvite}
            setSpaceForAddMembers={setSpaceForAddMembers}
            showNewChannel={showNewChannel}
            setShowNewChannel={setShowNewChannel}
            newChannelName={newChannelName}
            setNewChannelName={setNewChannelName}
            newChannelType={newChannelType}
            setNewChannelType={setNewChannelType}
            newChannelCategory={newChannelCategory}
            setNewChannelCategory={setNewChannelCategory}
            createChannel={createChannel}
            mutedSpaces={mutedSpaces}
            toggleMuteSpace={toggleMuteSpace}
            handleLeaveSpace={handleLeaveSpace}
            channelSearchQuery={channelSearchQuery}
            setChannelSearchQuery={setChannelSearchQuery}
            channelSearchInputRef={channelSearchInputRef}
            collapsedCategories={collapsedCategories}
            toggleCategoryCollapse={toggleCategoryCollapse}
            spaceChannels={spaceChannels}
            unreadChannels={unreadChannels}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            spaceVoiceUsers={spaceVoiceUsers}
            activeVoiceChannelId={activeVoiceChannelId}
            participants={participants}
            handleJoinVoice={handleJoinVoice}
            handleLeaveVoice={handleLeaveVoice}
            isPttMode={isPttMode}
            pttKey={pttKey}
            isPttActive={isPttActive}
            isVoiceReconnecting={isVoiceReconnecting}
            activeVoiceChannel={activeVoiceChannel}
            currentSpace={currentSpace}
            rtcStats={rtcStats}
            isMuted={isMuted}
            handleToggleMute={handleToggleMute}
            isDeafened={isDeafened}
            handleToggleDeafen={handleToggleDeafen}
            setShowSoundboardModal={setShowSoundboardModal}
            isRecordingCall={isRecordingCall}
            startCallRecording={startCallRecording}
            stopCallRecording={stopCallRecording}
            recordingDuration={recordingDuration}
            canUserDo={canUserDo}
            setVolumeControlUser={setVolumeControlUser}
            spaceMembers={spaceMembers}
            isConnected={isConnected}
            showToast={showToast}
            newChannelIsPrivate={newChannelIsPrivate}
            setNewChannelIsPrivate={setNewChannelIsPrivate}
            newChannelAllowedRoles={newChannelAllowedRoles}
            setNewChannelAllowedRoles={setNewChannelAllowedRoles}
            serverRoles={serverRoles}
            memberRoleMap={memberRoleMap}
          />
        </ErrorBoundary>

        <section className="main-content">
            {error && <div className="app-error">{error}<button className="dismiss-error" onClick={() => setError('')}>✕</button></div>}

            {selectedChannel && (!expandedSpace || selectedChannel.space_id === expandedSpace) ? (
              selectedChannel.type === 'text' ? (
                <ErrorBoundary name="Chat de Texto">
                  <TextChannelView
                    currentSpace={currentSpace}
                    selectedChannel={selectedChannel}
                    messages={messages}
                    hasMoreMessages={hasMoreMessages}
                    isLoadingMore={isLoadingMore}
                    loadMoreMessages={loadMoreMessages}
                    messagesContainerRef={messagesContainerRef}
                    messagesEndRef={messagesEndRef}
                    user={user}
                    profileDisplayName={profileDisplayName}
                    profileAvatarUrl={profileAvatarUrl}
                    avatarDecoration={avatarDecoration}
                    nameEffect={nameEffect}
                    presenceData={presenceData}
                    onlineUsers={onlineUsers}
                    serverRoles={serverRoles}
                    memberRoleMap={memberRoleMap}
                    serverEmojis={serverEmojis}
                    canUserDo={canUserDo}
                    getUserHighestRole={getUserHighestRole}
                    isMessageSaved={isMessageSaved}
                    toggleSaveMessage={toggleSaveMessage}
                    handleDeleteMessage={handleDeleteMessage}
                    retrySendMessage={retrySendMessage}
                    replyingToMessage={replyingToMessage}
                    setReplyingToMessage={setReplyingToMessage}
                    messageReactions={messageReactions}
                    toggleReaction={toggleReaction}
                    activePlayingVoiceNote={activePlayingVoiceNote}
                    handleToggleVoicePlay={handleToggleVoicePlay}
                    voiceNotePlaySpeed={voiceNotePlaySpeed}
                    handleChangeVoiceSpeed={handleChangeVoiceSpeed}
                    voiceNoteAudioRef={voiceNoteAudioRef}
                    draft={draft}
                    setDraft={setDraft}
                    send={send}
                    isUploading={isUploading}
                    handleChatFileUpload={handleChatFileUpload}
                    isVoiceNoteRecording={isVoiceNoteRecording}
                    voiceNoteDuration={voiceNoteDuration}
                    startVoiceNoteRecording={startVoiceNoteRecording}
                    stopVoiceNoteRecording={stopVoiceNoteRecording}
                    cancelVoiceNoteRecording={cancelVoiceNoteRecording}
                    slowmodeCooldown={slowmodeCooldown}
                    showSearchInput={showSearchInput}
                    setShowSearchInput={setShowSearchInput}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showPinnedMessagesPanel={showPinnedMessagesPanel}
                    setShowPinnedMessagesPanel={setShowPinnedMessagesPanel}
                    showMembersList={showMembersList}
                    setShowMembersList={setShowMembersList}
                    pinnedMessages={pinnedMessages}
                    togglePinMessage={togglePinMessage}
                    spaceMembers={spaceMembers}
                    spaceChannels={spaceChannels}
                    activeVoiceChannelId={activeVoiceChannelId}
                    participants={participants}
                    spaceVoiceUsers={spaceVoiceUsers}
                    presenceStatus={presenceStatus}
                    myGamePresence={myGamePresence}
                    setSpaceForAddMembers={setSpaceForAddMembers}
                    setInspectedMember={setInspectedMember}
                    setHoveredMemberPopover={setHoveredMemberPopover}
                    hoverTimeoutRef={hoverTimeoutRef}
                    postChannelMessage={postChannelMessage}
                    supabase={supabase}
                    activeScreenSharers={activeScreenSharers}
                    isWatchingStreams={isWatchingStreams}
                    setIsWatchingStreams={setIsWatchingStreams}
                    voiceNoteTarget={voiceNoteTarget}
                    typingUsers={typingUsers}
                    notifyTyping={notifyTyping}
                  />
                </ErrorBoundary>
              ) : (
                <ErrorBoundary name="Canal de Voz">
                  <VoiceChannelView
                    currentSpace={currentSpace}
                    selectedChannel={selectedChannel}
                    spaceChannels={spaceChannels}
                    spaceVoiceUsers={spaceVoiceUsers}
                    user={user}
                    profileDisplayName={profileDisplayName}
                    profileAvatarUrl={profileAvatarUrl}
                    avatarDecoration={avatarDecoration}
                    presenceData={presenceData}
                    onlineUsers={onlineUsers}
                    presenceStatus={presenceStatus}
                    myGamePresence={myGamePresence}
                    nameEffect={nameEffect}
                    serverRoles={serverRoles}
                    memberRoleMap={memberRoleMap}
                    getUserHighestRole={getUserHighestRole}
                    setSpaceForAddMembers={setSpaceForAddMembers}
                    setInspectedMember={setInspectedMember}
                    setHoveredMemberPopover={setHoveredMemberPopover}
                    hoverTimeoutRef={hoverTimeoutRef}
                    spaceMembers={spaceMembers}
                    activeVoiceChannelId={activeVoiceChannelId}
                    isConnected={isConnected}
                    participants={participants}
                    handleJoinVoice={handleJoinVoice}
                    handleLeaveVoice={handleLeaveVoice}
                    isMuted={isMuted}
                    handleToggleMute={handleToggleMute}
                    isDeafened={isDeafened}
                    handleToggleDeafen={handleToggleDeafen}
                    isAiDenoiseEnabled={isAiDenoiseEnabled}
                    toggleAiDenoise={toggleAiDenoise}
                    isPttMode={isPttMode}
                    isPttActive={isPttActive}
                    pttKey={pttKey}
                    setShowSoundboardModal={setShowSoundboardModal}
                    isRecordingCall={isRecordingCall}
                    startCallRecording={startCallRecording}
                    stopCallRecording={stopCallRecording}
                    recordingDuration={recordingDuration}
                    setVolumeControlUser={setVolumeControlUser}
                    activeScreenSharers={activeScreenSharers}
                    activeScreenSharer={activeScreenSharer}
                    setSelectedScreenSharerUserId={setSelectedScreenSharerUserId}
                    screenShareViewMode={screenShareViewMode}
                    setScreenShareViewMode={setScreenShareViewMode}
                    isWatchingStreams={isWatchingStreams}
                    setIsWatchingStreams={setIsWatchingStreams}
                    isPiPActive={isPiPActive}
                    setIsPiPActive={setIsPiPActive}
                    localScreenStream={localScreenStream}
                    handleStopScreenShare={handleStopScreenShare}
                    openScreenPicker={openScreenPicker}
                    forceOpenScreenPicker={forceOpenScreenPicker}
                    screenQuality={screenQuality}
                    handleQualityChange={handleQualityChange}
                    screenFps={screenFps}
                    handleFpsChange={handleFpsChange}
                    isPremiumUser={isPremiumUser}
                    onOpenSubscription={() => setShowSubscriptionModal(true)}
                    activeSharingSource={activeSharingSource}
                    peerScreenVolumes={peerScreenVolumes}
                    setPeerScreenVolumes={setPeerScreenVolumes}
                    screenAudioSyncDelayMs={screenAudioSyncDelayMs}
                    changeScreenAudioSyncDelay={changeScreenAudioSyncDelay}
                    screenShareContainerRef={screenShareContainerRef}
                    isScreenFullScreen={isScreenFullScreen}
                    toggleScreenFullScreen={toggleScreenFullScreen}
                    messages={messages}
                    send={send}
                    draft={draft}
                    setDraft={setDraft}
                    handleChatFileUpload={handleChatFileUpload}
                    isUploading={isUploading}
                    canUserDo={canUserDo}
                    isMessageSaved={isMessageSaved}
                    toggleSaveMessage={toggleSaveMessage}
                    handleDeleteMessage={handleDeleteMessage}
                    activePlayingVoiceNote={activePlayingVoiceNote}
                    handleToggleVoicePlay={handleToggleVoicePlay}
                    voiceNotePlaySpeed={voiceNotePlaySpeed}
                    handleChangeVoiceSpeed={handleChangeVoiceSpeed}
                    voiceNoteAudioRef={voiceNoteAudioRef}
                    serverEmojis={serverEmojis}
                    pinnedMessages={pinnedMessages}
                    togglePinMessage={togglePinMessage}
                    messagesEndRef={messagesEndRef}
                    showVoiceChat={showVoiceChat}
                    setShowVoiceChat={setShowVoiceChat}
                    showMembersList={showMembersList}
                    setShowMembersList={setShowMembersList}
                    showPinnedMessagesPanel={showPinnedMessagesPanel}
                    setShowPinnedMessagesPanel={setShowPinnedMessagesPanel}
                    showSearchInput={showSearchInput}
                    setShowSearchInput={setShowSearchInput}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    showScreenMenu={showScreenMenu}
                    setShowScreenMenu={setShowScreenMenu}
                  />
                </ErrorBoundary>
              )
            ) : (
              <div className="empty-main">
                <div className="empty-icon">✦</div>
                <h2>Selecione um canal</h2>
                <p>Escolha um espaço e canal na barra lateral para começar a conversar.</p>
              </div>
            )}
          </section>
        </section>

      <div style={{ display: page === 'Amigos' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
        <ErrorBoundary name="Amigos">
          <FriendsView 
            friendships={friendships}
            friendTab={friendTab}
            setFriendTab={setFriendTab}
            friendSearchQuery={friendSearchQuery}
            setFriendSearchQuery={setFriendSearchQuery}
            friendSearchNotice={friendSearchNotice}
            sendFriendRequest={sendFriendRequest}
            acceptFriendRequest={acceptFriendRequest}
            removeFriendship={removeFriendship}
            onlineUsers={onlineUsers}
            presenceData={presenceData}
            user={user}
            selectedDMUserId={selectedDMUserId}
            directMessages={directMessages}
            dmDraft={dmDraft}
            setDmDraft={setDmDraft}
            unreadDMs={unreadDMs}
            onOpenDM={(friendId: string) => {
              setSelectedDMUserId(friendId)
              setUnreadDMs(prev => { const next = { ...prev }; delete next[friendId]; return next })
              loadDirectMessages(friendId)
            }}
            onSendDM={async (e: FormEvent) => {
              e.preventDefault()
              if (!dmDraft.trim()) return
              await sendDirectMessage(dmDraft.trim())
            }}
            onCloseDM={() => { setSelectedDMUserId(null); setDirectMessages([]) }}
            isUploading={isUploading}
            onUploadFile={async (file: File, caption?: string) => {
              if (!supabase) return
              setIsUploading(true)
              const rawExt = file.name && file.name.includes('.') ? file.name.split('.').pop() : (file.type.split('/')[1] || 'png')
              const ext = (rawExt || 'png').replace(/[^a-zA-Z0-9]/g, '')
              const path = `dm/${user.id}/${Date.now()}.${ext}`
              const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
              if (uploadError) { setError(uploadError.message); setIsUploading(false); return }
              const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
              const fileType = file.type.startsWith('image/') ? 'image' : 'file'
              const messageText = caption && caption.trim() ? caption.trim() : (dmDraft.trim() || file.name || 'Imagem')
              await sendDirectMessage(messageText, urlData.publicUrl, fileType)
              setIsUploading(false)
            }}
            profileDisplayName={profileDisplayName}
            profileAvatarUrl={profileAvatarUrl}
            myGamePresence={myGamePresence}
            theme={theme}
            toggleTheme={toggleTheme}
            setPage={setPage}
            onSignOut={() => supabase?.auth.signOut()}
            presenceStatus={presenceStatus}
            showStatusMenu={showStatusMenu}
            setShowStatusMenu={setShowStatusMenu}
            updatePresenceStatus={updatePresenceStatus}
            spaceMembers={spaceMembers}
            showToast={showToast}
            onInspectMember={(member) => setInspectedMember(member)}
            onOpenWhatsNew={() => setShowWhatsNewModal(true)}
            avatarDecoration={avatarDecoration}
            onStartCall={startDirectCall}
            activeDirectCall={activeDirectCall}
            endDirectCall={endDirectCall}
            isMuted={isMuted}
            isDeafened={isDeafened}
            toggleMute={handleToggleMute}
            toggleDeafen={handleToggleDeafen}
            knownProfiles={knownProfiles}
            recentDMUserIds={recentDMUserIds}
            onRemoveRecentDM={(dmId) => {
              setRecentDMUserIds(prev => prev.filter(id => id !== dmId))
              if (selectedDMUserId === dmId) {
                setSelectedDMUserId(null)
                setDirectMessages([])
              }
            }}
            onAddFriend={sendFriendRequestToUser}
            onStartVoiceNote={() => startVoiceNoteRecording('dm')}
            onStopVoiceNote={stopVoiceNoteRecording}
            onCancelVoiceNote={cancelVoiceNoteRecording}
            isVoiceNoteRecording={isVoiceNoteRecording}
            voiceNoteDuration={voiceNoteDuration}
            voiceNoteTarget={voiceNoteTarget}
            activePlayingVoiceNote={activePlayingVoiceNote}
            voiceNotePlaySpeed={voiceNotePlaySpeed}
            voiceNoteAudioRef={voiceNoteAudioRef}
            handleToggleVoicePlay={handleToggleVoicePlay}
            onDeleteDM={handleDeleteDM}
            onToggleSaveDM={(msg, targetUser) => {
              toggleSaveMessage(msg, 'dm', {
                sourceName: `@${targetUser.display_name}`,
                dmUserId: targetUser.id
              })
            }}
            isMessageSaved={isMessageSaved}
            isFriendTyping={isFriendTyping}
            notifyDMTyping={notifyDMTyping}
          />
        </ErrorBoundary>
      </div>

      <div style={{ display: page === 'Configurações' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
        <ErrorBoundary name="Configurações">
          <Suspense fallback={null}>
            <SettingsView 
              userId={user.id}
            userCreatedAt={user.created_at}
            isServerOwner={spaces.some(s => s.creator_id === user.id)}
            currentDisplayName={profileDisplayName}
            currentAvatarUrl={profileAvatarUrl}
            avatarDecoration={avatarDecoration}
            profileEffect={profileEffect}
            avatarFrame={avatarFrame}
            cardFinish={cardFinish}
            nameEffect={nameEffect}
            onEquipDecoration={handleEquipDecoration}
            onEquipProfileEffect={handleEquipProfileEffect}
            onEquipAvatarFrame={handleEquipAvatarFrame}
            onEquipCardFinish={handleEquipCardFinish}
            onEquipNameEffect={handleEquipNameEffect}
            initialTab={settingsInitialTab}
            onOpenShop={(targetTab) => {
              if (targetTab) setShopInitialTab(targetTab)
              setPage('Loja')
            }}
            customStatus={customStatus}
            onProfileUpdate={(name, avatar) => {
              setProfileDisplayName(name)
              setProfileAvatarUrl(avatar)
              updateLocalProfile(name, avatar)
              if (user) {
                setSpaceMembers(prev => prev.map(m => (m?.user?.id === user.id || m?.id === user.id) ? { ...m, user: { ...(m.user || {}), display_name: name, avatar_url: avatar } } : m))
                if (presenceChannelRef.current) {
                  const curDeco = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || localStorage.getItem('echo-avatar-decoration') || avatarDecoration || ''
                  const curEff = localStorage.getItem(`echo-profile-effect-${user.id}`) || localStorage.getItem('echo-profile-effect') || profileEffect || ''
                  const gameData = presenceStatus === 'invisible' ? null : myGamePresence
                  presenceChannelRef.current.track({
                    user_id: user.id,
                    display_name: name,
                    avatar_url: avatar,
                    online_at: new Date().toISOString(),
                    custom_status: customStatus,
                    presence_status: presenceStatus,
                    current_game: gameData,
                    avatar_decoration: curDeco,
                    profile_effect: curEff
                  }).catch(() => {})
                }
              }
            }}
            onCustomStatusUpdate={async (status) => {
              setCustomStatus(status)
              localStorage.setItem('echo-custom-status', status)
              if (presenceChannelRef.current) {
                const curDeco = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || localStorage.getItem('echo-avatar-decoration') || avatarDecoration || ''
                const curEff = localStorage.getItem(`echo-profile-effect-${user.id}`) || localStorage.getItem('echo-profile-effect') || profileEffect || ''
                const gameData = presenceStatus === 'invisible' ? null : myGamePresence
                await presenceChannelRef.current.track({
                  user_id: user.id,
                  display_name: profileDisplayName,
                  online_at: new Date().toISOString(),
                  custom_status: status,
                  presence_status: presenceStatus,
                  current_game: gameData,
                  avatar_decoration: curDeco,
                  profile_effect: curEff
                })
              }
            }}
            audioInputs={audioInputs}
            audioOutputs={audioOutputs}
            selectedInputId={selectedInputId}
            selectedOutputId={selectedOutputId}
            onInputDeviceChange={handleInputDeviceChange}
            onOutputDeviceChange={handleOutputDeviceChange}
            audioError={audioError}
            onRefreshDevices={loadAudioDevices}
            profileDisplayName={profileDisplayName}
            profileAvatarUrl={profileAvatarUrl}
            presenceStatus={presenceStatus}
            showStatusMenu={showStatusMenu}
            setShowStatusMenu={setShowStatusMenu}
            updatePresenceStatus={updatePresenceStatus}
            onOpenWhatsNew={() => setShowWhatsNewModal(true)}
            myGamePresence={myGamePresence}
            theme={theme}
            toggleTheme={toggleTheme}
            selectTheme={selectTheme}
            isPremiumUser={isPremiumUser}
            onSimulateSubscription={handleSimulateSubscription}
            onResetSubscription={handleResetSubscription}
            userEmail={user?.email || ''}
            onSubscriptionSuccess={handleSimulateSubscription}
            setPage={setPage}
            onSignOut={() => supabase?.auth.signOut()}
            noiseSuppressionEnabled={noiseSuppressionEnabled}
            echoCancellationEnabled={echoCancellationEnabled}
            onNoiseSuppressionChange={(val) => {
              setNoiseSuppressionEnabled(val)
              localStorage.setItem('echo-noise-suppression', val ? 'true' : 'false')
              if (activeVoiceChannelId) {
                changeInputDevice(selectedInputId, val, echoCancellationEnabled)
              }
            }}
            onEchoCancellationChange={(val) => {
              setEchoCancellationEnabled(val)
              localStorage.setItem('echo-echo-cancellation', val ? 'true' : 'false')
              if (activeVoiceChannelId) {
                changeInputDevice(selectedInputId, noiseSuppressionEnabled, val)
              }
            }}
            sfxVolume={sfxVolume}
            onSfxVolumeChange={(val) => {
              setSfxVolume(val)
              localStorage.setItem('echo-sfx-volume', val.toString())
            }}
            noiseGateEnabled={noiseGateEnabled}
            noiseGateThreshold={noiseGateThreshold}
            onNoiseGateEnabledChange={(val) => {
              setNoiseGateEnabled(val)
              localStorage.setItem('echo-noise-gate-enabled', val ? 'true' : 'false')
            }}
            onNoiseGateThresholdChange={(val) => {
              setNoiseGateThreshold(val)
              localStorage.setItem('echo-noise-gate-threshold', val.toString())
            }}
            spatialAudioEnabled={spatialAudioEnabled}
            onToggleSpatialAudio={(val) => {
              setSpatialAudioEnabledState(val)
              localStorage.setItem('echo-spatial-audio-enabled', val ? 'true' : 'false')
            }}
            onResetAllPans={() => {
              setUserStereoPans({})
              localStorage.removeItem('echo-user-stereo-pans')
              participants.forEach(p => {
                changePeerPan(p.userId, 0)
              })
            }}
            isAiDenoiseEnabled={isAiDenoiseEnabled}
            onToggleAiDenoise={toggleAiDenoise}
            customAccentColor={customAccentColor}
            onCustomAccentColorChange={setCustomAccentColor}
            chatDensity={chatDensity}
            onChatDensityChange={setChatDensity}
            performanceMode={performanceMode}
            onPerformanceModeChange={setPerformanceMode}
            pttModeSetting={pttModeSetting}
            onPttModeChange={setPttModeSetting}
            pttKey={pttKey}
            onPttKeyChange={setPttKey}
            onToggleOverlay={handleToggleOverlay}
          />
        </Suspense>
      </ErrorBoundary>
    </div>

      <div style={{ display: page === 'Descobrir' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
        <Placeholder page={'Descobrir'} />
      </div>

      <div style={{ display: page === 'Loja' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
        <EchoShop
          userId={user.id}
          displayName={profileDisplayName || displayName}
          avatarUrl={profileAvatarUrl}
          currentDecoration={avatarDecoration}
          currentProfileEffect={profileEffect}
          currentAvatarFrame={avatarFrame}
          currentCardFinish={cardFinish}
          currentNameEffect={nameEffect}
          onEquipDecoration={handleEquipDecoration}
          onEquipProfileEffect={handleEquipProfileEffect}
          onEquipAvatarFrame={handleEquipAvatarFrame}
          onEquipCardFinish={handleEquipCardFinish}
          onEquipNameEffect={handleEquipNameEffect}
          initialTab={shopInitialTab}
          onOpenInventory={() => {
            setSettingsInitialTab('inventory')
            setPage('Configurações')
          }}
          onClose={() => setPage('Servidores')}
        />
      </div>



      {/* Create/Join Space Modal (Discord-Style) */}
      <AddSpaceModal
        isOpen={showAddSpaceModal}
        onClose={() => setShowAddSpaceModal(false)}
        addSpaceModalTab={addSpaceModalTab}
        setAddSpaceModalTab={setAddSpaceModalTab}
        newSpace={newSpace}
        setNewSpace={setNewSpace}
        creating={creating}
        createSpace={createSpace}
        joinSpaceCode={joinSpaceCode}
        setJoinSpaceCode={setJoinSpaceCode}
        joining={joining}
        joinSpace={joinSpace}
      />

      {/* Discord-Style Go Live 2.0 Screen Selection Modal */}
      <ScreenPickerModal
        isOpen={showScreenPicker}
        onClose={() => setShowScreenPicker(false)}
        screenSources={screenSources}
        setScreenSources={setScreenSources}
        screenPickerTab={screenPickerTab}
        setScreenPickerTab={setScreenPickerTab}
        selectedPickerSourceId={selectedPickerSourceId}
        setSelectedPickerSourceId={setSelectedPickerSourceId}
        selectScreenSource={selectScreenSource}
        screenQuality={screenQuality}
        setScreenQuality={setScreenQuality}
        screenFps={screenFps}
        setScreenFps={setScreenFps}
        isPremiumUser={isPremiumUser}
        onOpenSubscription={() => setShowSubscriptionModal(true)}
      />

      {/* Echo Space Studio Deck (Modern Non-Discord Settings Architecture) */}
      <Suspense fallback={null}>
        <SpaceStudioModal
          isOpen={showSpaceSettingsModal}
          onClose={() => setShowSpaceSettingsModal(false)}
          editingSpace={editingSpace}
          user={user}
          profileDisplayName={profileDisplayName}
          displayName={displayName}
          serverRoles={serverRoles}
          serverEmojis={serverEmojis}
          serverAuditLogs={serverAuditLogs}
          editingSpaceMembers={editingSpaceMembers}
          loadingEditingMembers={loadingEditingMembers}
          memberRoleMap={memberRoleMap}
          spaceChannels={spaceChannels}
          mutedSpaces={mutedSpaces}
          toggleMuteSpace={toggleMuteSpace}
          activeSpaceTab={activeSpaceTab}
          setActiveSpaceTab={setActiveSpaceTab}
          editingSpaceName={editingSpaceName}
          setEditingSpaceName={setEditingSpaceName}
          editingSpaceDescription={editingSpaceDescription}
          setEditingSpaceDescription={setEditingSpaceDescription}
          editingSpaceIconUrl={editingSpaceIconUrl}
          setEditingSpaceIconUrl={setEditingSpaceIconUrl}
          editingSpaceBannerUrl={editingSpaceBannerUrl}
          setEditingSpaceBannerUrl={setEditingSpaceBannerUrl}
          editingSpaceBannerTheme={editingSpaceBannerTheme}
          setEditingSpaceBannerTheme={setEditingSpaceBannerTheme}
          editingSpaceWelcomeChannelId={editingSpaceWelcomeChannelId}
          setEditingSpaceWelcomeChannelId={setEditingSpaceWelcomeChannelId}
          uploadingSpaceIcon={uploadingSpaceIcon}
          uploadingSpaceBanner={uploadingSpaceBanner}
          memberSearchQuery={memberSearchQuery}
          setMemberSearchQuery={setMemberSearchQuery}
          selectedRoleId={selectedRoleId}
          setSelectedRoleId={setSelectedRoleId}
          selectedMemberId={selectedMemberId}
          setSelectedMemberId={setSelectedMemberId}
          newEmojiName={newEmojiName}
          setNewEmojiName={setNewEmojiName}
          uploadingEmoji={uploadingEmoji}
          editingChannelSettingsId={editingChannelSettingsId}
          setEditingChannelSettingsId={setEditingChannelSettingsId}
          setShowNewChannel={setShowNewChannel}
          setNewChannelCategory={setNewChannelCategory}
          setNewChannelName={setNewChannelName}
          setNewChannelTopic={setNewChannelTopic}
          handleSpaceIconUpload={handleSpaceIconUpload}
          handleRemoveSpaceIcon={handleRemoveSpaceIcon}
          handleSpaceBannerUpload={handleSpaceBannerUpload}
          handleRemoveSpaceBanner={handleRemoveSpaceBanner}
          handleSaveSpaceSettings={handleSaveSpaceSettings}
          handleCreateRole={handleCreateRole}
          handleUpdateRole={handleUpdateRole}
          handleDeleteRole={handleDeleteRole}
          moveRole={moveRole}
          handleCreateEmoji={handleCreateEmoji}
          handleDeleteEmoji={handleDeleteEmoji}
          moveChannel={moveChannel}
          updateChannelSettings={updateChannelSettings}
          renameChannel={renameChannel}
          deleteChannel={deleteChannel}
          getUserHighestRole={getUserHighestRole}
          canUserDo={canUserDo}
          toggleMemberRole={toggleMemberRole}
          handleRoleChange={handleRoleChange}
          handleKickMember={handleKickMember}
          handleDeleteSpace={handleDeleteSpace}
          loadSpaceEmojis={loadSpaceEmojis}
          loadEditingSpaceMembers={loadEditingSpaceMembers}
          showToast={showToast}
        />
      </Suspense>

      {/* User Volume & 3D Spatial Audio Positioning Modal */}
      {(() => {
        const currentSpaceId = activeVoiceChannel?.space_id || selectedChannel?.space_id || expandedSpace || undefined
        const currentSpace = spaces.find(s => s.id === currentSpaceId)
        const isSpaceOwner = currentSpace ? currentSpace.creator_id === user.id : false
        const availableVoiceChannels = currentSpaceId && spaceChannels[currentSpaceId]
          ? spaceChannels[currentSpaceId].filter(c => c.type === 'voice' && c.id !== activeVoiceChannelId)
          : []

        return (
          <VolumeControlModal
            volumeControlUser={volumeControlUser}
            onClose={() => setVolumeControlUser(null)}
            userVolumes={userVolumes}
            setUserVolumes={setUserVolumes}
            userStereoPans={userStereoPans}
            setUserStereoPans={setUserStereoPans}
            changePeerPan={changePeerPan}
            spatialAudioEnabled={spatialAudioEnabled}
            setSpatialAudioEnabledState={setSpatialAudioEnabledState}
            participants={participants}
            currentUserId={user.id}
            spaceId={currentSpaceId}
            isSpaceOwner={isSpaceOwner}
            canUserDo={canUserDo}
            availableVoiceChannels={availableVoiceChannels}
            serverMuteParticipant={serverMuteParticipant}
            disconnectParticipant={disconnectParticipant}
            moveParticipant={moveParticipant}
          />
        )
      })()}

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        config={confirmModalConfig}
        onClose={() => setConfirmModalConfig(null)}
      />

      {/* Member Profile Card Modal */}
      <MemberProfileModalWrapper
        inspectedMember={inspectedMember}
        onClose={() => setInspectedMember(null)}
        user={user}
        onlineUsers={onlineUsers}
        participants={participants}
        presenceData={presenceData}
        presenceStatus={presenceStatus}
        myGamePresence={myGamePresence}
        spaces={spaces}
        expandedSpace={expandedSpace}
        avatarDecoration={avatarDecoration}
        profileEffect={profileEffect}
        activeVoiceChannel={activeVoiceChannel}
        showToast={showToast}
        friendships={friendships}
        onAddFriend={sendFriendRequestToUser}
        onAcceptFriend={acceptFriendRequest}
        handleOpenDirectChat={handleOpenDirectChat}
        setVolumeControlUser={setVolumeControlUser}
      />

      {/* Member Hover Popover Card */}
      <HoveredMemberPopover
        hoveredMemberPopover={hoveredMemberPopover}
        setHoveredMemberPopover={setHoveredMemberPopover}
        setInspectedMember={setInspectedMember}
        hoverTimeoutRef={hoverTimeoutRef}
        currentUserId={user.id}
        currentUserProfileEffect={profileEffect}
        currentUserAvatarDecoration={avatarDecoration}
        presenceData={presenceData}
      />

      {/* Canal / Voice Channel Invite Modal (Discord-style) */}
      {channelForInvite && (
        <ChannelInviteModal
          channel={channelForInvite.channel}
          space={channelForInvite.space}
          onClose={() => setChannelForInvite(null)}
          friendships={friendships}
          onSendDMInvite={async (friendUserId, inviteMessage) => {
            if (!supabase || !user) return
            await supabase.from('direct_messages').insert({
              sender_id: user.id,
              receiver_id: friendUserId,
              body: inviteMessage
            })
            socialChannelRef.current?.send({
              type: 'broadcast',
              event: 'dm-event',
              payload: {
                receiverId: friendUserId,
                senderId: user.id,
                senderName: profileDisplayName || displayName || 'Amigo',
                body: inviteMessage
              }
            })
          }}
          showToast={showToast}
        />
      )}

      {/* Modal de Convidar / Adicionar Amigos ao Espaço */}
      {spaceForAddMembers && (
        <SpaceAddMembersModal
          space={spaceForAddMembers}
          onClose={() => setSpaceForAddMembers(null)}
          friendships={friendships}
          spaceMembers={spaceMembers}
          onlineUsers={onlineUsers}
          onAddMember={async (friend) => {
            return await handleAddMemberToSpace(spaceForAddMembers.id, friend)
          }}
          showToast={showToast}
        />
      )}

      {/* Soundboard Modal & Toast */}
      <SoundboardModal
        isOpen={showSoundboardModal}
        onClose={() => setShowSoundboardModal(false)}
        onPlaySound={playSoundboard}
      />
      <SoundboardToast lastEvent={lastSoundboardEvent} />

      {/* O que há de novo / Novidades das Versões Modal */}
      <WhatsNewModal 
        isOpen={showWhatsNewModal} 
        onClose={() => setShowWhatsNewModal(false)} 
      />

      {/* Mensagens Salvas com Estrela Modal */}
      <SavedMessagesModal 
        isOpen={showSavedMessagesModal}
        onClose={() => setShowSavedMessagesModal(false)}
        savedMessages={savedMessages}
        onUnstar={(msgId) => {
          setSavedMessages(prev => prev.filter(m => m.id !== msgId))
          showToast('Estrela removida', 'Mensagem removida dos seus itens salvos.', 'info')
        }}
        onJumpToMessage={handleJumpToSavedMessage}
      />

      {/* Visualizador de Imagens em Tela Cheia (Lightbox) */}
      <ImageLightboxModal />

      {/* AFK Modals */}
      <AfkPromptModal
        isOpen={showAfkPrompt}
        afkCountdown={afkCountdown}
        onStay={handleAfkStay}
      />
      <AfkDisconnectedModal
        isOpen={showAfkDisconnectedModal}
        onClose={() => setShowAfkDisconnectedModal(false)}
        canReconnect={!!lastAfkChannelRef.current?.channelId}
        onReconnect={() => {
          if (lastAfkChannelRef.current?.channelId) {
            handleJoinVoice(lastAfkChannelRef.current.channelId, lastAfkChannelRef.current.spaceId)
          }
          setShowAfkDisconnectedModal(false)
          lastActivityRef.current = Date.now()
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* Floating Picture-in-Picture Mini Player (Always on Top) */}
      {isPiPActive && activeScreenSharer && (
        <EchoFloatingMiniPlayer
          activeScreenSharers={activeScreenSharers}
          activeScreenSharer={activeScreenSharer}
          onSelectSharer={(uid) => {
            setSelectedScreenSharerUserId(uid)
          }}
          peerScreenVolumes={peerScreenVolumes}
          setPeerScreenVolumes={setPeerScreenVolumes}
          onClose={() => setIsPiPActive(false)}
          onExpand={() => {
            setIsPiPActive(false)
            if (activeVoiceChannelId) {
              const allChannels = Object.values(spaceChannels).flat()
              const ch = allChannels.find(c => c.id === activeVoiceChannelId)
              if (ch) {
                setSelectedChannel(ch)
                setPage('Servidores')
                setIsWatchingStreams(true)
                setScreenShareViewMode('focus')
              }
            }
          }}
        />
      )}

      {/* 1v1 Incoming Direct Call Modal */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAccept={acceptIncomingCall}
        onReject={rejectIncomingCall}
      />

      {/* Global Command Palette (Ctrl+K / Cmd+K Spotlight) */}
      <Suspense fallback={null}>
        <CommandPaletteModal
          spaces={spaces}
          channels={Object.values(spaceChannels).flat()}
          friendships={friendships}
          isMuted={isMuted}
          isDeafened={isDeafened}
          toggleMute={handleToggleMute}
          toggleDeafen={handleToggleDeafen}
          onSelectSpace={(spaceId) => {
            setExpandedSpace(spaceId)
            setPage('Servidores')
          }}
          onSelectChannel={(ch) => {
            setSelectedChannel(ch)
            setExpandedSpace(ch.space_id)
            setPage('Servidores')
            if (ch.type === 'voice') {
              handleJoinVoice(ch.id, ch.space_id)
            }
          }}
          onSelectFriend={(friendId) => {
            handleOpenDirectChat(friendId)
            setPage('Amigos')
          }}
          setPage={setPage}
          setShowSpaceStudio={setShowSpaceSettingsModal}
          setShowSoundboard={setShowSoundboardModal}
        />
      </Suspense>
    </main>
  )
}

function Placeholder({ page }: { page: Exclude<Page, 'Servidores' | 'Amigos' | 'Configurações'> }) {
  return (
    <section className="empty-page">
      <div className="empty-symbol">✦</div>
      <h1>{page}</h1>
      <p>Esta área estará disponível em breve.</p>
    </section>
  )
}
