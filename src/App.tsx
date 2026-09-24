import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react'
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
import { APP_CURRENT_VERSION } from './lib/version'
import { initAnalytics, identifyUser, resetUser, trackAppOpened } from './lib/analytics'

import { ModalManager } from './components/modals/ModalManager'
import { useSpacesStore } from './stores/useSpacesStore'
import { useUIStore } from './stores/useUIStore'
import { useEchoAfkDetector } from './hooks/useEchoAfkDetector'
import { useEchoToasts } from './hooks/useEchoToasts'
import { useEchoSavedMessages } from './hooks/useEchoSavedMessages'
import { useEchoAudioDevices } from './hooks/useEchoAudioDevices'
import { ToastContainer } from './components/common/ToastContainer'
import { useEchoPtt } from './hooks/useEchoPtt'
import { useEchoGamePresence } from './hooks/useEchoGamePresence'
import { UpdateBanner } from './components/common/UpdateBanner'
import { VoiceReconnectBanner } from './components/voice/VoiceReconnectBanner'
import { ErrorBoundary } from './components/common/ErrorBoundary'

import { TopBar } from './components/navigation/TopBar'
import { WindowControls } from './components/navigation/WindowControls'
import { ChannelsSidebar } from './components/sidebar/ChannelsSidebar'
import { VoiceMiniOverlay } from './components/voice/VoiceMiniOverlay'
import { EchoFloatingMiniPlayer } from './components/streaming/EchoFloatingMiniPlayer'

// Lazy-loaded heavy views and modals for instant initial bundle loading
const VoiceChannelView = lazy(() => import('./views/VoiceChannelView').then(m => ({ default: m.VoiceChannelView })))
const TextChannelView = lazy(() => import('./views/TextChannelView').then(m => ({ default: m.TextChannelView })))
const FriendsView = lazy(() => import('./views/FriendsView').then(m => ({ default: m.FriendsView })))
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })))
const SubscriptionModal = lazy(() => import('./components/modals/SubscriptionModal').then(m => ({ default: m.SubscriptionModal })))
const EchoShop = lazy(() => import('./components/EchoShop').then(m => ({ default: m.EchoShop })))
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
import { useEchoBlockedUsers } from './hooks/useEchoBlockedUsers'
import { useEchoGroupChats } from './hooks/useEchoGroupChats'

import type { Space, Channel, Message, DirectMessage, FriendshipRequest, SavedMessageItem, Page, Toast, RolePermissions, ServerRole, ServerAuditLog, ServerEmoji, PinnedMessage, GroupChat, GroupMessage } from './types'
export type { Space, Channel, Message, DirectMessage, FriendshipRequest, SavedMessageItem, Page, Toast, RolePermissions, ServerRole, ServerAuditLog, ServerEmoji, PinnedMessage, GroupChat, GroupMessage }

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
    initAnalytics()
    trackAppOpened(APP_CURRENT_VERSION)
  }, [])

  useEffect(() => {
    if (isMock || !supabase) return
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false) })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_OUT') {
        resetUser()
      }
    })
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
  useEffect(() => {
    useUIStore.getState().setPage(page)
  }, [page])
  const [error, setError] = useState('')
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(''), 6000)
    return () => clearTimeout(timer)
  }, [error])
  const [addSpaceModalTab, setAddSpaceModalTab] = useState<'options' | 'create' | 'join'>('options')

  const { toasts, showToast, removeToast } = useEchoToasts()
  const [knownProfiles, setKnownProfiles] = useState<Record<string, { id: string; display_name: string; avatar_url?: string }>>({})
  useEffect(() => {
    useSpacesStore.getState().setKnownProfiles(knownProfiles)
  }, [knownProfiles])
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
  const pendingDeepLinkUrlRef = useRef<string | null>(null)

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
    getMyGamePresence: () => myGamePresenceRef.current,
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
  useEffect(() => {
    useSpacesStore.getState().setUnreadChannels(unreadChannels)
  }, [unreadChannels])
  const selectedChannelRef = useRef(selectedChannel)
  const mutedSpacesRef = useRef(mutedSpaces)
  const userRef = useRef(user)
  userRef.current = user
  const presenceChannelRef = useRef<any>(null)
  // Voice Presence Refs for Global Presence synchronization (hoisted above the
  // cosmetics hook so equip actions can include current voice channel state
  // in their presence broadcasts too — see useEchoCosmetics.buildFullPresencePayload)
  const activeVoiceChannelIdRef = useRef<string | null>(null)
  const activeVoiceSpaceIdRef = useRef<string | null>(null)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(() => localStorage.getItem('echo-noise-suppression') !== 'false')
  const [echoCancellationEnabled, setEchoCancellationEnabled] = useState(() => localStorage.getItem('echo-echo-cancellation') !== 'false')
  const [noiseGateEnabled, setNoiseGateEnabled] = useState(() => localStorage.getItem('echo-noise-gate-enabled') !== 'false')
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(() => parseFloat(localStorage.getItem('echo-noise-gate-threshold') || '-45'))
  const [sfxVolume, setSfxVolume] = useState(() => {
    const val = localStorage.getItem('echo-sfx-volume')
    return val !== null ? parseFloat(val) : 0.5
  })
  const sfxVolumeRef = useRef(sfxVolume)
  sfxVolumeRef.current = sfxVolume

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
    setIsPremiumUser,
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
    supabase,
    activeVoiceChannelIdRef,
    activeVoiceSpaceIdRef
  })
  avatarDecorationRef.current = avatarDecoration
  profileEffectRef.current = profileEffect

  async function updatePresenceStatus(status: 'online' | 'idle' | 'dnd' | 'invisible') {
    setPresenceStatus(status)
    // Mantém a store global (useUIStore) sincronizada: TextChannelView e
    // VoiceChannelView usam `props.presenceStatus ?? storePresenceStatus`,
    // e como nenhum dos dois recebe presenceStatus como prop, eles sempre
    // caem no valor da store. Sem esta linha, a store ficava travada no
    // valor lido do localStorage no boot do app e nunca era atualizada,
    // então trocar para "Invisível" não refletia nesses componentes —
    // por exemplo, a barra de membros continuava mostrando "Em chamada"
    // como se o usuário estivesse online.
    useUIStore.getState().setPresenceStatus(status)
    localStorage.setItem('echo-presence-status', status)
    if (presenceChannelRef.current) {
      const savedStatus = status === 'invisible' ? '' : (localStorage.getItem('echo-custom-status') || '')
      const gameData = status === 'invisible' ? null : myGamePresence
      const curDeco = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || avatarDecoration || ''
      const curEff = localStorage.getItem(`echo-profile-effect-${user.id}`) || profileEffect || ''
      const curNameEff = localStorage.getItem(`echo-name-effect-${user.id}`) || nameEffect || 'resonance_cyan'
      const curBadge = localStorage.getItem(`echo-show-badge-${user.id}`) !== 'false' ? (localStorage.getItem(`echo-badge-${user.id}`) || 'owner') : 'none'
      const rawBanner = localStorage.getItem(`echo-banner-custom-${user.id}`) || ''
      const safeBanner = (rawBanner && !rawBanner.startsWith('data:') && rawBanner.length < 2048) ? rawBanner : ''
      const bannerPreset = localStorage.getItem(`echo-banner-preset-${user.id}`) || 'synthwave'
      await presenceChannelRef.current.track({
        user_id: user.id,
        display_name: profileDisplayName,
        avatar_url: profileAvatarUrl,
        online_at: new Date().toISOString(),
        custom_status: savedStatus,
        presence_status: status,
        current_game: gameData,
        game_presence: gameData,
        avatar_decoration: curDeco,
        profile_effect: curEff,
        name_effect: curNameEff,
        badge: curBadge,
        banner_custom: safeBanner,
        banner_preset: bannerPreset,
        banner_url: safeBanner,
        voice_channel_id: activeVoiceChannelIdRef.current,
        voice_space_id: activeVoiceSpaceIdRef.current
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

  // Rich Presence: My active game via custom hook
  const { myGamePresence } = useEchoGamePresence({
    userId: user.id,
    profileDisplayName,
    avatarDecoration,
    profileEffect,
    nameEffect,
    presenceStatus,
    presenceChannelRef,
    activeVoiceChannelIdRef,
    activeVoiceSpaceIdRef
  })
  myGamePresenceRef.current = myGamePresence

  // Global Online Presence Hook (Phase 19)
  const {
    presenceData,
    setPresenceData,
    onlineUsers,
    setOnlineUsers,
    trackMyPresence
  } = useEchoGlobalPresence({
    user,
    profileDisplayName,
    displayName,
    avatarDecoration,
    profileEffect,
    myGamePresence,
    myGamePresenceRef,
    presenceChannelRef,
    supabase,
    activeVoiceChannelIdRef,
    activeVoiceSpaceIdRef
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

  // Blocked Users Hook
  const {
    blockedUserIds,
    blockedProfiles,
    loadBlockedUsers,
    blockUser,
    unblockUser
  } = useEchoBlockedUsers({
    user,
    supabase,
    showToast,
    removeFriendship,
    friendships
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
    supabase,
    blockedUserIds
  })

  // Group Chats Hook
  const {
    groupChats,
    selectedGroupId,
    setSelectedGroupId,
    groupMessages,
    groupDraft,
    setGroupDraft,
    groupTypingUsers,
    unreadGroups,
    loadGroupChats,
    sendGroupMessage,
    createGroupChat,
    leaveGroupChat,
    handleOpenGroup,
    handleGroupMessageBroadcast,
    handleGroupTypingBroadcast,
    notifyGroupTyping,
    deleteGroupMessage
  } = useEchoGroupChats({
    user,
    profileDisplayName,
    supabase,
    socialChannelRef,
    showToast,
    triggerDesktopNotification,
    setKnownProfiles,
    playDmNotificationSound,
    sfxVolume
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
    triggerDesktopNotification,
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

  // Windows Native & Web notification click navigation
  useEffect(() => {
    const handleNotificationPayload = (data: any) => {
      if (!data) return
      if (data.type === 'dm' && data.senderId) {
        handleOpenDirectChat(data.senderId)
        setPage('Amigos')
      } else if (data.type === 'group' && data.groupId) {
        handleOpenGroup(data.groupId)
        setPage('Amigos')
      } else if (data.type === 'channel' && data.channelId) {
        const allChannels = Object.values(spaceChannelsRef.current).flat()
        const targetCh = allChannels.find(c => c.id === data.channelId)
        if (targetCh) {
          if (targetCh.space_id) {
            const sp = spaces.find(s => s.id === targetCh.space_id)
            if (sp) setExpandedSpace(sp.id)
          }
          setSelectedChannel(targetCh)
          setPage('Servidores')
        }
      }
    }

    if ((window as any).electronAPI?.onNotificationClicked) {
      ;(window as any).electronAPI.onNotificationClicked(handleNotificationPayload)
    }

    const handleCustomClick = (e: any) => {
      handleNotificationPayload(e.detail)
    }
    window.addEventListener('echo-notification-clicked', handleCustomClick)

    return () => {
      window.removeEventListener('echo-notification-clicked', handleCustomClick)
    }
  }, [handleOpenDirectChat, handleOpenGroup, spaces])

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
    localCameraStream,
    rtcStats,
    isPttMode,
    isPttActive,
    lastSoundboardEvent,
    isRecordingCall,
    recordingDuration,
    leaveVoice,
    startScreenShare,
    stopScreenShare,
    startCamera,
    stopCamera,
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
    supabase,
    presenceData
  })

  useEffect(() => {
    useSpacesStore.getState().setSpaceVoiceUsers(spaceVoiceUsers)
  }, [spaceVoiceUsers])
  handleJoinVoiceRef.current = handleJoinVoice
  const handleLeaveVoiceRef = useRef(handleLeaveVoice)
  handleLeaveVoiceRef.current = handleLeaveVoice
  const handleToggleMuteRef = useRef(handleToggleMute)
  handleToggleMuteRef.current = handleToggleMute
  const isMutedRef = useRef(isMuted)
  isMutedRef.current = isMuted

  const handleServerMute = useCallback((targetUserId: string) => {
    serverMuteParticipant(targetUserId)
    try {
      socialChannelRef.current?.send({
        type: 'broadcast',
        event: 'voice-moderation',
        payload: {
          type: 'server_mute',
          targetUserId
        }
      })
    } catch (e) {}
  }, [serverMuteParticipant])

  const handleDisconnectParticipant = useCallback((targetUserId: string) => {
    disconnectParticipant(targetUserId)
    try {
      socialChannelRef.current?.send({
        type: 'broadcast',
        event: 'voice-moderation',
        payload: {
          type: 'disconnect_member',
          targetUserId
        }
      })
    } catch (e) {}
  }, [disconnectParticipant])

  const handleMoveParticipant = useCallback((targetUserId: string, targetChannelId: string, targetChannelName?: string) => {
    moveParticipant(targetUserId, targetChannelId, targetChannelName)
    try {
      socialChannelRef.current?.send({
        type: 'broadcast',
        event: 'voice-moderation',
        payload: {
          type: 'move_member',
          targetUserId,
          targetChannelId,
          targetChannelName
        }
      })
    } catch (e) {}
  }, [moveParticipant])

  // Sincroniza canal de voz ativo com a presença global instantaneamente
  useEffect(() => {
    activeVoiceChannelIdRef.current = activeVoiceChannelId
    activeVoiceSpaceIdRef.current = activeVoiceChannel?.space_id || null
    trackMyPresence()
  }, [activeVoiceChannelId, activeVoiceChannel, trackMyPresence])

  // Global In-Game Voice Shortcuts state (Mute / Deafen / AI Denoise)
  const [muteShortcut, setMuteShortcut] = useState<string>(() => localStorage.getItem('echo-shortcut-mute') || 'F8')
  const [deafenShortcut, setDeafenShortcut] = useState<string>(() => localStorage.getItem('echo-shortcut-deafen') || 'F9')
  const [aiDenoiseShortcut, setAiDenoiseShortcut] = useState<string>(() => localStorage.getItem('echo-shortcut-ai-denoise') || 'F7')

  // Global Voice Shortcuts (Mute / Deafen / AI Denoise) via Electron IPC
  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api?.onGlobalVoiceToggle) return

    if (muteShortcut && muteShortcut !== 'none') {
      api.registerGlobalVoiceShortcut?.('toggle-mute', muteShortcut)
    } else {
      api.unregisterGlobalVoiceShortcut?.('toggle-mute')
    }

    if (deafenShortcut && deafenShortcut !== 'none') {
      api.registerGlobalVoiceShortcut?.('toggle-deafen', deafenShortcut)
    } else {
      api.unregisterGlobalVoiceShortcut?.('toggle-deafen')
    }

    if (aiDenoiseShortcut && aiDenoiseShortcut !== 'none') {
      api.registerGlobalVoiceShortcut?.('toggle-ai-denoise', aiDenoiseShortcut)
    } else {
      api.unregisterGlobalVoiceShortcut?.('toggle-ai-denoise')
    }

    const removeListener = api.onGlobalVoiceToggle((action: string) => {
      if (action === 'toggle-mute') {
        handleToggleMute()
      } else if (action === 'toggle-deafen') {
        handleToggleDeafen()
      } else if (action === 'toggle-ai-denoise') {
        toggleAiDenoise()
        const willBeActive = !isAiDenoiseEnabled
        showToast('Filtro de Ruído IA', willBeActive ? 'Supressão por IA Ativada' : 'Supressão por IA Desativada', 'info')
      }
    })

    return () => {
      if (typeof removeListener === 'function') removeListener()
    }
  }, [handleToggleMute, handleToggleDeafen, toggleAiDenoise, isAiDenoiseEnabled, muteShortcut, deafenShortcut, aiDenoiseShortcut, showToast])

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
    if (!(window as any).electronAPI) return

    const handleInviteUrl = (url: string) => {
      if (url && typeof url === 'string' && (url.startsWith('echo://') || url.includes('/invite') || url.includes('space='))) {
        console.log('[DeepLink] Convite recebido via deep-link ou web:', url)
        if (user?.id && processSpaceInviteRef.current) {
          processSpaceInviteRef.current(url)
        } else {
          pendingDeepLinkUrlRef.current = url
        }
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
  }, [])

  // Processa convite pendente recebido antes de o usuário estar autenticado
  useEffect(() => {
    if (user?.id && pendingDeepLinkUrlRef.current && processSpaceInviteRef.current) {
      const url = pendingDeepLinkUrlRef.current
      pendingDeepLinkUrlRef.current = null
      console.log('[DeepLink] Executando convite pendente após login:', url)
      processSpaceInviteRef.current(url)
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
        const { data, error } = await supabase
          .from('profiles')
          .select('display_name, avatar_url, avatar_decoration, profile_effect, is_premium, premium_until, asaas_customer_id, banner_url, banner_preset, bio, pronouns, custom_status')
          .eq('id', user.id)
          .single()

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
          if (data.banner_url) {
            localStorage.setItem(`echo-banner-custom-${user.id}`, data.banner_url)
            localStorage.setItem('echo-banner-custom', data.banner_url)
          }
          if (data.banner_preset) {
            localStorage.setItem(`echo-banner-preset-${user.id}`, data.banner_preset)
            localStorage.setItem('echo-banner-preset', data.banner_preset)
          }
          if (data.bio) {
            localStorage.setItem(`echo-bio-${user.id}`, data.bio)
          }
          if (data.pronouns) {
            localStorage.setItem(`echo-pronouns-${user.id}`, data.pronouns)
          }

          // Validação autoritativa de assinatura diretamente do Supabase
          const hasActivePro = Boolean(
            data.is_premium &&
            (!data.premium_until || new Date(data.premium_until).getTime() > Date.now())
          )

          setIsPremiumUser(hasActivePro)
          if (hasActivePro) {
            localStorage.setItem('echo-premium', 'true')
          } else {
            localStorage.removeItem('echo-premium')
          }
          return
        }
      } catch (e) {}

      const { data } = await supabase.from('profiles').select('display_name, avatar_url').eq('id', user.id).single()
      if (data) {
        if (data.display_name) setProfileDisplayName(data.display_name)
        if (data.avatar_url) setProfileAvatarUrl(data.avatar_url)
      }
      setIsPremiumUser(false)
      localStorage.removeItem('echo-premium')
    }
    loadUserProfile()
  }, [user.id, setIsPremiumUser])

  useEffect(() => {
    if (user?.id) {
      identifyUser({
        id: user.id,
        email: user.email,
        displayName: profileDisplayName || (user.user_metadata?.display_name as string) || ''
      })
    }
  }, [user.id, user.email, profileDisplayName])

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
    setTopbarPinned: _setTopbarPinned,
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

  useEffect(() => {
    useUIStore.getState().setTopbarPinned(topbarPinned)
  }, [topbarPinned])

  const handleWatchUserStream = useCallback((channel: Channel, userId: string) => {
    setSelectedChannel(channel)
    if (activeVoiceChannelId !== channel.id || !isConnected) {
      handleJoinVoice(channel.id, channel.space_id)
    }
    setSelectedScreenSharerUserId(userId)
    setIsWatchingStreams(true)
    setScreenShareViewMode('focus')
    setPage('Servidores')
  }, [activeVoiceChannelId, isConnected, handleJoinVoice, setSelectedChannel, setSelectedScreenSharerUserId, setIsWatchingStreams, setScreenShareViewMode, setPage])

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

  // Chamada de vídeo (câmera) — versão simples: apenas liga/desliga, sem seleção de dispositivo ainda
  const handleToggleCamera = useCallback(() => {
    if (localCameraStream) {
      stopCamera()
    } else {
      startCamera(undefined, (message: string) => setError(message))
    }
  }, [localCameraStream, startCamera, stopCamera, setError])

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
    loadBlockedUsers()
    loadGroupChats()
    loadAudioDevices()

    const client = supabase
    if (!client) return

    // Setup global realtime messages listener to detect unread messages and mentions
    const globalMessagesChannel = client.channel('global-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as any
        if (!newMsg || newMsg.author_id === userRef.current?.id) return

        const isCurrentChannel = newMsg.channel_id === selectedChannelRef.current?.id
        const isAppFocused = typeof document !== 'undefined' && document.hasFocus()

        if (!isCurrentChannel) {
          setUnreadChannels(prev => {
            if (prev.has(newMsg.channel_id)) return prev
            const next = new Set(prev)
            next.add(newMsg.channel_id)
            return next
          })
        }

        const isSpaceMuted = Object.entries(spaceChannelsRef.current).some(([sId, chList]) =>
          mutedSpacesRef.current.has(sId) && chList.some(c => c.id === newMsg.channel_id)
        )

        // Verifica se o usuário foi mencionado
        const myName = (profileDisplayNameRef.current || userRef.current?.user_metadata?.display_name || '').toLowerCase()
        const myId = (userRef.current?.id || '').toLowerCase()
        const bodyLower = (newMsg.body || '').toLowerCase()
        const isMentioned = 
          (myName && bodyLower.includes(`@${myName}`)) ||
          (myId && bodyLower.includes(`@${myId}`)) ||
          bodyLower.includes('@everyone') ||
          bodyLower.includes('@here')

        // Se o app não estiver em foco e (for mencionado OU for mensagem em outro canal não mutado)
        if (!isAppFocused && (isMentioned || (!isSpaceMuted && !isCurrentChannel))) {
          const chObj = Object.values(spaceChannelsRef.current).flat().find(c => c.id === newMsg.channel_id)
          const chName = chObj?.name ? `#${chObj.name}` : 'canal'
          const title = isMentioned ? `Mencionado em ${chName}` : `Nova mensagem em ${chName}`

          triggerDesktopNotification(title, newMsg.body || '', {
            type: 'channel',
            channelId: newMsg.channel_id
          })

          if (typeof (window as any).electronAPI?.flashFrame === 'function') {
            ;(window as any).electronAPI.flashFrame(true)
          }

          if (isMentioned) {
            playDmNotificationSound(sfxVolumeRef.current)
          }
        }
      })
      .subscribe()

    return () => {
      client.removeChannel(globalMessagesChannel)
    }
  }, [])

  // Sincronização do contador de não lidos com o ícone do aplicativo e parada do flash da barra ao focar
  useEffect(() => {
    const unreadDMsCount = Object.values(unreadDMs || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0)
    const unreadGroupsCount = Object.values(unreadGroups || {}).reduce((acc: number, val: any) => acc + (Number(val) || 0), 0)
    const unreadChannelsCount = unreadChannels.size
    const total = unreadDMsCount + unreadGroupsCount + unreadChannelsCount

    if (typeof (window as any).electronAPI?.setBadgeCount === 'function') {
      ;(window as any).electronAPI.setBadgeCount(total)
    }
  }, [unreadDMs, unreadGroups, unreadChannels])

  useEffect(() => {
    const handleFocus = () => {
      if (typeof (window as any).electronAPI?.flashFrame === 'function') {
        ;(window as any).electronAPI.flashFrame(false)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload: any) => {
        handleFriendshipPostgresChanges(payload)
        const updated = payload.new as any
        if (updated && updated.id === user.id) {
          if (updated.avatar_decoration !== undefined) setAvatarDecoration(updated.avatar_decoration || '')
          if (updated.profile_effect !== undefined) setProfileEffect(updated.profile_effect || '')
          if (updated.display_name) setProfileDisplayName(updated.display_name)
          if (updated.avatar_url) setProfileAvatarUrl(updated.avatar_url)
          if (updated.is_premium !== undefined) {
            const hasActivePro = Boolean(
              updated.is_premium &&
              (!updated.premium_until || new Date(updated.premium_until).getTime() > Date.now())
            )
            setIsPremiumUser(hasActivePro)
            if (hasActivePro) {
              localStorage.setItem('echo-premium', 'true')
            } else {
              localStorage.removeItem('echo-premium')
            }
          }
        }
      })
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
      .on('broadcast', { event: 'group-message' }, (payload: any) => {
        handleGroupMessageBroadcast(payload?.payload)
      })
      .on('broadcast', { event: 'group-typing' }, (payload: any) => {
        handleGroupTypingBroadcast(payload?.payload)
      })
      .on('broadcast', { event: 'voice-moderation' }, (payload: any) => {
        const data = payload?.payload
        if (data?.targetUserId === user?.id) {
          if (data.type === 'move_member' && data.targetChannelId) {
            handleLeaveVoiceRef.current?.()
            showToast?.('Movido de Canal', `Você foi movido para o canal ${data.targetChannelName || ''}.`, 'info')
            handleJoinVoiceRef.current?.(data.targetChannelId)
          } else if (data.type === 'disconnect_member') {
            handleLeaveVoiceRef.current?.()
            showToast?.('Desconectado da Chamada', 'Você foi desconectado da chamada por um moderador.', 'info')
          } else if (data.type === 'server_mute') {
            if (!isMutedRef.current) handleToggleMuteRef.current?.()
            showToast?.('Silenciado no Servidor', 'Um moderador silenciou seu microfone.', 'info')
          }
        }
      })
      .subscribe()

    return () => {
      supabase?.removeChannel(liveFriendships)
      supabase?.removeChannel(socialChannel)
    }
  }, [handleFriendshipPostgresChanges, handleFriendEvent, handleDMBroadcast, handleDMDeleteBroadcast, handleCallEvent, handleDMTypingBroadcast, handleGroupMessageBroadcast, handleGroupTypingBroadcast, supabase, user])

  // Resilient background sync interval (every 60 seconds)
  useEffect(() => {
    const syncInterval = setInterval(() => {
      loadFriendships()
      loadGroupChats()
      if (selectedDMUserIdRef.current) {
        loadDirectMessages(selectedDMUserIdRef.current)
      }
    }, 60000)

    return () => {
      clearInterval(syncInterval)
    }
  }, [loadFriendships, loadGroupChats, loadDirectMessages, selectedDMUserIdRef])

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

  const currentSpace = useMemo(() => {
    return spaces.find(s => s.id === expandedSpace) || getSpaceForChannel(selectedChannel) || spaces[0] || null
  }, [spaces, expandedSpace, selectedChannel, getSpaceForChannel])

  const isServerOwner = useMemo(() => {
    return spaces.some(s => s.creator_id === user.id)
  }, [spaces, user.id])

  const handleOpenDM = useCallback((friendId: string) => {
    setSelectedDMUserId(friendId)
    setUnreadDMs(prev => {
      if (!prev[friendId]) return prev
      const next = { ...prev }
      delete next[friendId]
      return next
    })
    loadDirectMessages(friendId)
  }, [setSelectedDMUserId, setUnreadDMs, loadDirectMessages])

  const handleOpenDMAndNavigate = useCallback((targetUserId: string) => {
    handleOpenDM(targetUserId)
    setPage('Amigos')
  }, [handleOpenDM, setPage])

  const handleCloseDM = useCallback(() => {
    setSelectedDMUserId(null)
    setDirectMessages([])
  }, [setSelectedDMUserId, setDirectMessages])

  const handleSendDMForm = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = dmDraft.trim()
    if (!trimmed) return
    await sendDirectMessage(trimmed)
  }, [dmDraft, sendDirectMessage])

  const handleUploadDMFile = useCallback(async (file: File, caption?: string) => {
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
  }, [user.id, dmDraft, sendDirectMessage, setError, setIsUploading])

  const handleRemoveRecentDM = useCallback((dmId: string) => {
    setRecentDMUserIds(prev => prev.filter(id => id !== dmId))
    if (selectedDMUserIdRef.current === dmId) {
      setSelectedDMUserId(null)
      setDirectMessages([])
    }
  }, [setRecentDMUserIds, setSelectedDMUserId, setDirectMessages, selectedDMUserIdRef])

  const handleStartVoiceNoteDM = useCallback(() => {
    startVoiceNoteRecording('dm')
  }, [startVoiceNoteRecording])

  const handleToggleSaveDM = useCallback((msg: any, targetUser: any) => {
    toggleSaveMessage(msg, 'dm', {
      sourceName: `@${targetUser.display_name}`,
      dmUserId: targetUser.id
    })
  }, [toggleSaveMessage])

  const handleSendDMSticker = useCallback((url: string, name?: string) => {
    sendDirectMessage(name ? `[Sticker: ${name}]` : 'Sticker', url, 'sticker')
  }, [sendDirectMessage])

  const handleSignOut = useCallback(() => {
    supabase?.auth.signOut()
  }, [])

  const handleInspectMember = useCallback((member: any) => {
    setInspectedMember(member)
  }, [setInspectedMember])

  const handleOpenWhatsNew = useCallback(() => {
    setShowWhatsNewModal(true)
  }, [setShowWhatsNewModal])

  const handleOpenSubscription = useCallback(() => {
    setShowSubscriptionModal(true)
  }, [setShowSubscriptionModal])

  const handleCloseSubscription = useCallback(() => {
    setShowSubscriptionModal(false)
  }, [setShowSubscriptionModal])

  const handleOpenShopFromSettings = useCallback((targetTab?: any) => {
    if (targetTab) setShopInitialTab(targetTab)
    setPage('Loja')
  }, [setShopInitialTab, setPage])

  const handleProfileUpdate = useCallback((name: string, avatar: string, bannerUrl?: string, bannerPreset?: string) => {
    setProfileDisplayName(name)
    setProfileAvatarUrl(avatar)
    updateLocalProfile(name, avatar)
    if (user) {
      setSpaceMembers(prev => prev.map(m => (m?.user?.id === user.id || m?.id === user.id) ? {
        ...m,
        user: {
          ...(m.user || {}),
          display_name: name,
          avatar_url: avatar,
          banner_url: bannerUrl !== undefined ? bannerUrl : (m.user as any)?.banner_url,
          banner_preset: bannerPreset !== undefined ? bannerPreset : (m.user as any)?.banner_preset
        }
      } : m))
      if (presenceChannelRef.current) {
        const curDeco = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || localStorage.getItem('echo-avatar-decoration') || avatarDecoration || ''
        const curEff = localStorage.getItem(`echo-profile-effect-${user.id}`) || localStorage.getItem('echo-profile-effect') || profileEffect || ''
        const curNameEff = localStorage.getItem(`echo-name-effect-${user.id}`) || nameEffect || 'resonance_cyan'
        const gameData = presenceStatus === 'invisible' ? null : myGamePresence
        const rawBanner = bannerUrl || localStorage.getItem(`echo-banner-custom-${user.id}`) || ''
        const safeBanner = (rawBanner && !rawBanner.startsWith('data:') && rawBanner.length < 2048) ? rawBanner : ''
        const curBadge = localStorage.getItem(`echo-show-badge-${user.id}`) !== 'false' ? (localStorage.getItem(`echo-badge-${user.id}`) || 'owner') : 'none'
        const preset = bannerPreset || localStorage.getItem(`echo-banner-preset-${user.id}`) || 'synthwave'
        presenceChannelRef.current.track({
          user_id: user.id,
          display_name: name,
          avatar_url: avatar,
          online_at: new Date().toISOString(),
          custom_status: customStatus,
          presence_status: presenceStatus,
          current_game: gameData,
          game_presence: gameData,
          avatar_decoration: curDeco,
          profile_effect: curEff,
          name_effect: curNameEff,
          banner_custom: safeBanner,
          banner_preset: preset,
          banner_url: safeBanner,
          badge: curBadge,
          voice_channel_id: activeVoiceChannelIdRef.current,
          voice_space_id: activeVoiceSpaceIdRef.current
        }).catch(() => {})
      }
    }
  }, [user, updateLocalProfile, setSpaceMembers, avatarDecoration, profileEffect, nameEffect, presenceStatus, myGamePresence, customStatus])

  const handleCustomStatusUpdate = useCallback(async (status: string) => {
    setCustomStatus(status)
    localStorage.setItem('echo-custom-status', status)
    if (presenceChannelRef.current) {
      const curDeco = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || localStorage.getItem('echo-avatar-decoration') || avatarDecoration || ''
      const curEff = localStorage.getItem(`echo-profile-effect-${user.id}`) || localStorage.getItem('echo-profile-effect') || profileEffect || ''
      const curNameEff = localStorage.getItem(`echo-name-effect-${user.id}`) || nameEffect || 'resonance_cyan'
      const curBadge = localStorage.getItem(`echo-show-badge-${user.id}`) !== 'false' ? (localStorage.getItem(`echo-badge-${user.id}`) || 'owner') : 'none'
      const rawBanner = localStorage.getItem(`echo-banner-custom-${user.id}`) || ''
      const safeBanner = (rawBanner && !rawBanner.startsWith('data:') && rawBanner.length < 2048) ? rawBanner : ''
      const bannerPreset = localStorage.getItem(`echo-banner-preset-${user.id}`) || 'synthwave'
      const gameData = presenceStatus === 'invisible' ? null : myGamePresence
      await presenceChannelRef.current.track({
        user_id: user.id,
        display_name: profileDisplayName,
        avatar_url: profileAvatarUrl,
        online_at: new Date().toISOString(),
        custom_status: status,
        presence_status: presenceStatus,
        current_game: gameData,
        game_presence: gameData,
        avatar_decoration: curDeco,
        profile_effect: curEff,
        name_effect: curNameEff,
        badge: curBadge,
        banner_custom: safeBanner,
        banner_preset: bannerPreset,
        banner_url: safeBanner,
        voice_channel_id: activeVoiceChannelIdRef.current,
        voice_space_id: activeVoiceSpaceIdRef.current
      })
    }
  }, [user.id, avatarDecoration, profileEffect, nameEffect, presenceStatus, myGamePresence, profileDisplayName])

  const handleNoiseSuppressionChange = useCallback((val: boolean) => {
    setNoiseSuppressionEnabled(val)
    localStorage.setItem('echo-noise-suppression', val ? 'true' : 'false')
    if (activeVoiceChannelId) {
      changeInputDevice(selectedInputId, val, echoCancellationEnabled)
    }
  }, [activeVoiceChannelId, changeInputDevice, selectedInputId, echoCancellationEnabled])

  const handleEchoCancellationChange = useCallback((val: boolean) => {
    setEchoCancellationEnabled(val)
    localStorage.setItem('echo-echo-cancellation', val ? 'true' : 'false')
    if (activeVoiceChannelId) {
      changeInputDevice(selectedInputId, noiseSuppressionEnabled, val)
    }
  }, [activeVoiceChannelId, changeInputDevice, selectedInputId, noiseSuppressionEnabled])

  const handleSfxVolumeChange = useCallback((val: number) => {
    setSfxVolume(val)
    localStorage.setItem('echo-sfx-volume', val.toString())
  }, [])

  const handleNoiseGateEnabledChange = useCallback((val: boolean) => {
    setNoiseGateEnabled(val)
    localStorage.setItem('echo-noise-gate-enabled', val ? 'true' : 'false')
  }, [])

  const handleNoiseGateThresholdChange = useCallback((val: number) => {
    setNoiseGateThreshold(val)
    localStorage.setItem('echo-noise-gate-threshold', val.toString())
  }, [])

  const handleToggleSpatialAudio = useCallback((val: boolean) => {
    setSpatialAudioEnabledState(val)
    localStorage.setItem('echo-spatial-audio-enabled', val ? 'true' : 'false')
  }, [setSpatialAudioEnabledState])

  const handleResetAllPans = useCallback(() => {
    setUserStereoPans({})
    localStorage.removeItem('echo-user-stereo-pans')
    participants.forEach(p => {
      changePeerPan(p.userId, 0)
    })
  }, [setUserStereoPans, participants, changePeerPan])

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
          onClose={handleCloseSubscription}
          onSimulateSubscription={handleSimulateSubscription}
          isPremiumUser={isPremiumUser}
          onResetSubscription={handleResetSubscription}
          userId={user.id}
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
        showTopbar={showTopbar}
        hideTopbar={hideTopbar}
        page={page}
        setPage={setPage}
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
        setTopbarPinned={_setTopbarPinned}
        isTopbarVisible={isTopbarVisible}
        pendingFriendCount={pendingFriendCount}
        unreadDMs={unreadDMs}
        currentUserId={user.id}
      />

      <section
        className="workspace"
        style={{ display: page === 'Servidores' ? undefined : 'none' }}
      >
        {/* 2. CHANNELS SIDEBAR FOR ACTIVE SERVER (240px) */}
        <ErrorBoundary name="Canais">
          <ChannelsSidebar
            spaces={spaces}
            expandedSpace={expandedSpace}
            spaceChannels={spaceChannels}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            spaceMembers={spaceMembers}
            spaceVoiceUsers={spaceVoiceUsers}
            unreadChannels={unreadChannels}
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
            onSignOut={handleSignOut}
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
            isConnected={isConnected}
            showToast={showToast}
            newChannelIsPrivate={newChannelIsPrivate}
            setNewChannelIsPrivate={setNewChannelIsPrivate}
            newChannelAllowedRoles={newChannelAllowedRoles}
            setNewChannelAllowedRoles={setNewChannelAllowedRoles}
            serverRoles={serverRoles}
            memberRoleMap={memberRoleMap}
            onWatchStream={handleWatchUserStream}
            onInspectMember={handleInspectMember}
            onOpenDM={handleOpenDMAndNavigate}
            presenceData={presenceData}
            moveParticipant={handleMoveParticipant}
            serverMuteParticipant={handleServerMute}
            disconnectParticipant={handleDisconnectParticipant}
            isPiPActive={isPiPActive}
            setIsPiPActive={setIsPiPActive}
            activeScreenSharers={activeScreenSharers}
          />
        </ErrorBoundary>

        <section className="main-content">
            {error && <div className="app-error">{error}<button className="dismiss-error" onClick={() => setError('')}>✕</button></div>}

            {selectedChannel && (!expandedSpace || selectedChannel.space_id === expandedSpace) ? (
              selectedChannel.type === 'text' ? (
                <ErrorBoundary name="Chat de Texto">
                  <Suspense fallback={<div className="loading-screen"><div className="loader" /><span>Carregando chat…</span></div>}>
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
                    activeVoiceChannelId={activeVoiceChannelId}
                    participants={participants}
                    myGamePresence={myGamePresence}
                    setSpaceForAddMembers={setSpaceForAddMembers}
                    setInspectedMember={handleInspectMember}
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
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <ErrorBoundary name="Canal de Voz">
                  <Suspense fallback={<div className="loading-screen"><div className="loader" /><span>Carregando canal de voz…</span></div>}>
                    <VoiceChannelView
                    currentSpace={currentSpace}
                    selectedChannel={selectedChannel}
                    user={user}
                    profileDisplayName={profileDisplayName}
                    profileAvatarUrl={profileAvatarUrl}
                    avatarDecoration={avatarDecoration}
                    presenceData={presenceData}
                    onlineUsers={onlineUsers}
                    myGamePresence={myGamePresence}
                    nameEffect={nameEffect}
                    serverRoles={serverRoles}
                    memberRoleMap={memberRoleMap}
                    getUserHighestRole={getUserHighestRole}
                    setSpaceForAddMembers={setSpaceForAddMembers}
                    setInspectedMember={handleInspectMember}
                    setHoveredMemberPopover={setHoveredMemberPopover}
                    hoverTimeoutRef={hoverTimeoutRef}
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
                    localCameraStream={localCameraStream}
                    handleToggleCamera={handleToggleCamera}
                    screenQuality={screenQuality}
                    handleQualityChange={handleQualityChange}
                    screenFps={screenFps}
                    handleFpsChange={handleFpsChange}
                    isPremiumUser={isPremiumUser}
                    onOpenSubscription={handleOpenSubscription}
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
                  </Suspense>
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
          <Suspense fallback={<div className="loading-screen"><div className="loader" /><span>Carregando amigos…</span></div>}>
            <FriendsView
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
            onOpenDM={handleOpenDM}
            onSendDM={handleSendDMForm}
            onCloseDM={handleCloseDM}
            isUploading={isUploading}
            onUploadFile={handleUploadDMFile}
            profileDisplayName={profileDisplayName}
            profileAvatarUrl={profileAvatarUrl}
            myGamePresence={myGamePresence}
            toggleTheme={toggleTheme}
            onSignOut={handleSignOut}
            showStatusMenu={showStatusMenu}
            setShowStatusMenu={setShowStatusMenu}
            updatePresenceStatus={updatePresenceStatus}
            showToast={showToast}
            onInspectMember={handleInspectMember}
            onOpenWhatsNew={handleOpenWhatsNew}
            avatarDecoration={avatarDecoration}
            onStartCall={startDirectCall}
            activeDirectCall={activeDirectCall}
            endDirectCall={endDirectCall}
            isMuted={isMuted}
            isDeafened={isDeafened}
            toggleMute={handleToggleMute}
            toggleDeafen={handleToggleDeafen}
            recentDMUserIds={recentDMUserIds}
            onRemoveRecentDM={handleRemoveRecentDM}
            onAddFriend={sendFriendRequestToUser}
            onStartVoiceNote={handleStartVoiceNoteDM}
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
            onToggleSaveDM={handleToggleSaveDM}
            isMessageSaved={isMessageSaved}
            isFriendTyping={isFriendTyping}
            notifyDMTyping={notifyDMTyping}
            onBlockUser={blockUser}
            onUnblockUser={unblockUser}
            onSendDMSticker={handleSendDMSticker}
            groupChats={groupChats}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            groupMessages={groupMessages}
            groupDraft={groupDraft}
            setGroupDraft={setGroupDraft}
            groupTypingUsers={groupTypingUsers}
            unreadGroups={unreadGroups}
            onCreateGroupChat={createGroupChat}
            onSendGroupMessage={sendGroupMessage}
            onLeaveGroupChat={leaveGroupChat}
            onOpenGroup={handleOpenGroup}
            notifyGroupTyping={notifyGroupTyping}
            onDeleteGroupMessage={deleteGroupMessage}
          />
          </Suspense>
        </ErrorBoundary>
      </div>

      <div style={{ display: page === 'Configurações' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
        <ErrorBoundary name="Configurações">
          <Suspense fallback={null}>
            <SettingsView
              userId={user.id}
            userCreatedAt={user.created_at}
            isServerOwner={isServerOwner}
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
            onOpenShop={handleOpenShopFromSettings}
            customStatus={customStatus}
            onProfileUpdate={handleProfileUpdate}
            onCustomStatusUpdate={handleCustomStatusUpdate}
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
            onOpenWhatsNew={handleOpenWhatsNew}
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
            onSignOut={handleSignOut}
            noiseSuppressionEnabled={noiseSuppressionEnabled}
            echoCancellationEnabled={echoCancellationEnabled}
            onNoiseSuppressionChange={handleNoiseSuppressionChange}
            onEchoCancellationChange={handleEchoCancellationChange}
            sfxVolume={sfxVolume}
            onSfxVolumeChange={handleSfxVolumeChange}
            noiseGateEnabled={noiseGateEnabled}
            noiseGateThreshold={noiseGateThreshold}
            onNoiseGateEnabledChange={handleNoiseGateEnabledChange}
            onNoiseGateThresholdChange={handleNoiseGateThresholdChange}
            spatialAudioEnabled={spatialAudioEnabled}
            onToggleSpatialAudio={handleToggleSpatialAudio}
            onResetAllPans={handleResetAllPans}
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
            muteShortcut={muteShortcut}
            onMuteShortcutChange={setMuteShortcut}
            deafenShortcut={deafenShortcut}
            onDeafenShortcutChange={setDeafenShortcut}
            aiDenoiseShortcut={aiDenoiseShortcut}
            onAiDenoiseShortcutChange={setAiDenoiseShortcut}
            blockedProfiles={blockedProfiles}
            onUnblockUser={unblockUser}
          />
        </Suspense>
      </ErrorBoundary>
    </div>

      <div style={{ display: page === 'Descobrir' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
        <Placeholder page={'Descobrir'} />
      </div>

      <div style={{ display: page === 'Loja' ? 'flex' : 'none', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
        <ErrorBoundary name="Loja">
          <Suspense fallback={<div className="empty-main"><div className="loader" /><span>Carregando Loja…</span></div>}>
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
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Centralized Modal Manager (Discord & Echo Modals) */}
      <ErrorBoundary name="Gerenciador de Modais">
        <ModalManager
        user={user}
        displayName={displayName}
        profileDisplayName={profileDisplayName}
        profileEffect={profileEffect}
        avatarDecoration={avatarDecoration}
        onlineUsers={onlineUsers}
        participants={participants}
        presenceData={presenceData}
        presenceStatus={presenceStatus}
        myGamePresence={myGamePresence}
        spaces={spaces}
        expandedSpace={expandedSpace}
        setExpandedSpace={setExpandedSpace}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        spaceChannels={spaceChannels}
        spaceMembers={spaceMembers}
        activeVoiceChannel={activeVoiceChannel}
        activeVoiceChannelId={activeVoiceChannelId}
        isMuted={isMuted}
        isDeafened={isDeafened}
        handleToggleMute={handleToggleMute}
        handleToggleDeafen={handleToggleDeafen}
        handleJoinVoice={handleJoinVoice}
        showToast={showToast}
        friendships={friendships}
        sendFriendRequestToUser={sendFriendRequestToUser}
        acceptFriendRequest={acceptFriendRequest}
        handleOpenDirectChat={handleOpenDirectChat}
        blockedUserIds={blockedUserIds}
        blockUser={blockUser}
        unblockUser={unblockUser}
        setPage={setPage}
        showAddSpaceModal={showAddSpaceModal}
        setShowAddSpaceModal={setShowAddSpaceModal}
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
        showScreenPicker={showScreenPicker}
        setShowScreenPicker={setShowScreenPicker}
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
        setShowSubscriptionModal={setShowSubscriptionModal}
        showSpaceSettingsModal={showSpaceSettingsModal}
        setShowSpaceSettingsModal={setShowSpaceSettingsModal}
        editingSpace={editingSpace}
        serverRoles={serverRoles}
        serverEmojis={serverEmojis}
        serverAuditLogs={serverAuditLogs}
        editingSpaceMembers={editingSpaceMembers}
        loadingEditingMembers={loadingEditingMembers}
        memberRoleMap={memberRoleMap}
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
        volumeControlUser={volumeControlUser}
        setVolumeControlUser={setVolumeControlUser}
        userVolumes={userVolumes}
        setUserVolumes={setUserVolumes}
        userStereoPans={userStereoPans}
        setUserStereoPans={setUserStereoPans}
        changePeerPan={changePeerPan}
        spatialAudioEnabled={spatialAudioEnabled}
        setSpatialAudioEnabledState={setSpatialAudioEnabledState}
        handleServerMute={handleServerMute}
        handleDisconnectParticipant={handleDisconnectParticipant}
        handleMoveParticipant={handleMoveParticipant}
        confirmModalConfig={confirmModalConfig}
        setConfirmModalConfig={setConfirmModalConfig}
        inspectedMember={inspectedMember}
        setInspectedMember={setInspectedMember}
        hoveredMemberPopover={hoveredMemberPopover}
        setHoveredMemberPopover={setHoveredMemberPopover}
        hoverTimeoutRef={hoverTimeoutRef}
        channelForInvite={channelForInvite}
        setChannelForInvite={setChannelForInvite}
        socialChannelRef={socialChannelRef}
        spaceForAddMembers={spaceForAddMembers}
        setSpaceForAddMembers={setSpaceForAddMembers}
        handleAddMemberToSpace={handleAddMemberToSpace}
        showSoundboardModal={showSoundboardModal}
        setShowSoundboardModal={setShowSoundboardModal}
        playSoundboard={playSoundboard}
        lastSoundboardEvent={lastSoundboardEvent}
        showWhatsNewModal={showWhatsNewModal}
        setShowWhatsNewModal={setShowWhatsNewModal}
        showSavedMessagesModal={showSavedMessagesModal}
        setShowSavedMessagesModal={setShowSavedMessagesModal}
        savedMessages={savedMessages}
        setSavedMessages={setSavedMessages}
        handleJumpToSavedMessage={handleJumpToSavedMessage}
        showAfkPrompt={showAfkPrompt}
        afkCountdown={afkCountdown}
        handleAfkStay={handleAfkStay}
        showAfkDisconnectedModal={showAfkDisconnectedModal}
        setShowAfkDisconnectedModal={setShowAfkDisconnectedModal}
        lastAfkChannelRef={lastAfkChannelRef}
        lastActivityRef={lastActivityRef}
        incomingCall={incomingCall}
        acceptIncomingCall={acceptIncomingCall}
        rejectIncomingCall={rejectIncomingCall}
      />
      </ErrorBoundary>

      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
        onToastClick={(toast) => {
          if (toast.data?.type === 'dm' && toast.data.senderId) {
            handleOpenDirectChat(toast.data.senderId)
            setPage('Amigos')
          } else if (toast.data?.type === 'group' && toast.data.groupId) {
            handleOpenGroup(toast.data.groupId)
            setPage('Amigos')
          } else if (toast.data?.type === 'channel' && toast.data.channelId) {
            const allChannels = Object.values(spaceChannelsRef.current).flat()
            const targetCh = allChannels.find(c => c.id === toast.data.channelId)
            if (targetCh) {
              if (targetCh.space_id) {
                const sp = spaces.find(s => s.id === targetCh.space_id)
                if (sp) setExpandedSpace(sp.id)
              }
              setSelectedChannel(targetCh)
              setPage('Servidores')
            }
          }
        }}
      />

      {/* Floating Picture-in-Picture Mini Player (Always on Top) */}
      {isPiPActive && activeScreenSharer && (
        <ErrorBoundary name="Mini Player">
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
        </ErrorBoundary>
      )}
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

