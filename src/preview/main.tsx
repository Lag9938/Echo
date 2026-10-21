// Prévia do Aurora: monta telas REAIS do Echo (barra do topo, barra de canais, chat, amigos, sala de voz,
// configurações, loja, janelas…) com dados de exemplo, para ver o tema claro, o escuro e o Eclipse lado a lado sem
// entrar na conta. O pacote gerado (npm run preview:build) é um .js e um .css estáticos; nada aqui fala com o banco.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import '../App.css'
import './preview.css'
import { TopBar } from '../components/navigation/TopBar'
import { ChannelsSidebar } from '../components/sidebar/ChannelsSidebar'
import { TextChannelView } from '../views/TextChannelView'
import { VoiceChannelView } from '../views/VoiceChannelView'
import { FriendsView } from '../views/FriendsView'
import { SettingsView } from '../views/SettingsView'
import { EchoShop } from '../components/EchoShop'
import { UpdateBanner } from '../components/common/UpdateBanner'
import { DecoratedAvatar } from '../components/DecoratedAvatar'
import { AVATAR_DECORATIONS } from '../components/AvatarDecoration'
import { ShopNewsModal } from '../components/ShopNewsModal'
import { CURRENT_SHOP_DROP } from '../lib/shopDrops'
import { useKeyboardActivation } from '../hooks/useKeyboardActivation'
import { useModalAccessibility } from '../hooks/useModalAccessibility'
import { FloatingCallPanel } from '../components/voice/FloatingCallPanel'
import { CosmeticsInventory } from '../components/CosmeticsInventory'
import { SpaceStudioModal } from '../components/modals/SpaceStudioModal'
import { MemberProfileModalWrapper } from '../components/modals/MemberProfileModalWrapper'
import { SoundboardModal } from '../components/modals/SoundboardModal'
import { AddFriendModal } from '../components/modals/AddFriendModal'
import { StickerPicker } from '../components/StickerPicker'
import { useSpacesStore } from '../stores/useSpacesStore'
import { useUIStore } from '../stores/useUIStore'
import {
  ME,
  SPACES,
  CHANNELS,
  ROLES,
  MEMBER_ROLE_MAP,
  MEMBERS,
  ONLINE,
  PRESENCE,
  VOICE_USERS,
  MESSAGES,
  REACTIONS,
  FRIENDS,
  DIRECT_MESSAGES,
  AUDIT_LOGS
} from './fixtures'

type ThemeKey = 'light' | 'dark'
type ScreenKey = 'servidor' | 'voz' | 'amigos' | 'config' | 'loja' | 'inventario' | 'espaco' | 'perfil' | 'janelas' | 'atualizacao' | 'decoracoes' | 'novidades' | 'transmissao'

const SCREENS: Array<[ScreenKey, string]> = [
  ['servidor', 'Servidor'],
  ['voz', 'Sala de voz'],
  ['amigos', 'Amigos'],
  ['config', 'Configurações'],
  ['loja', 'Loja'],
  ['inventario', 'Inventário'],
  ['espaco', 'Config. do espaço'],
  ['perfil', 'Perfil'],
  ['janelas', 'Janelas'],
  ['atualizacao', 'Atualização'],
  ['decoracoes', 'Decorações'],
  ['novidades', 'Novo na loja'],
  ['transmissao', 'Transmissão + câmeras']
]

const THEME_BODY: Record<ThemeKey, string> = {
  light: 'echo-layout-glass light-theme theme-aurora',
  dark: 'echo-layout-glass theme-aurora-dark theme-aurora'
}
const THEME_LABEL: Record<ThemeKey, string> = { light: 'Aurora Claro', dark: 'Aurora Escuro' }

const noop = () => {}
const asyncNoop = async () => true

function seedStores() {
  useSpacesStore.setState({
    spaces: SPACES,
    expandedSpace: 's1',
    spaceChannels: { s1: CHANNELS },
    selectedChannel: CHANNELS.find(c => c.id === 't1') ?? null,
    unreadChannels: new Set<string>(['t2']),
    spaceVoiceUsers: VOICE_USERS,
    spaceMembers: MEMBERS,
    spaceMembersMap: { s1: MEMBERS }
  } as any)
  useUIStore.setState({ page: 'Servidores', isTopbarVisible: true, topbarPinned: true, presenceStatus: 'online' } as any)
}

const GETROLE = (_spaceId: string, userId: string) => {
  const id = (MEMBER_ROLE_MAP[userId] ?? [])[0]
  return ROLES.find(r => r.id === id) ?? null
}

/** Barra do topo + área de conteúdo, como o App monta cada tela. */
function Frame({ page, selected, children }: { page: string; selected?: any; children: ReactNode }) {
  return (
    <div className="echo-app">
      <TopBar
        currentUserId="me"
        page={page as any}
        setPage={noop}
        spaces={SPACES}
        expandedSpace="s1"
        setExpandedSpace={noop}
        spaceChannels={{ s1: CHANNELS }}
        selectedChannel={selected ?? CHANNELS[3]}
        setSelectedChannel={noop}
        unreadChannels={new Set(['t2'])}
        spaceVoiceUsers={VOICE_USERS}
        isTopbarVisible
        topbarPinned
        pendingFriendCount={1}
        unreadDMs={{ u2: 2 }}
        savedMessages={[{}] as any}
      />
      <div className="topbar-spacer" />
      {children}
    </div>
  )
}

function useServerShell(initial: string) {
  const [selected, setSelected] = useState(CHANNELS.find(c => c.id === initial)!)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showServerDropdown, setShowServerDropdown] = useState(false)
  const [channelSearch, setChannelSearch] = useState('')
  const [collapsedCategories] = useState<Set<string>>(new Set())
  const space = SPACES[0]

  useEffect(() => {
    useSpacesStore.setState({ selectedChannel: selected } as any)
  }, [selected])

  const inVoiceCall = selected.type === 'voice'
  const sidebarProps: any = useMemo(
    () => ({
      spaces: SPACES,
      expandedSpace: 's1',
      user: ME,
      profileDisplayName: 'teste',
      profileAvatarUrl: '',
      presenceStatus: 'online',
      showStatusMenu,
      setShowStatusMenu,
      updatePresenceStatus: noop,
      theme: 'light',
      toggleTheme: noop,
      setPage: noop,
      setShowWhatsNewModal: noop,
      onSignOut: noop,
      setAddSpaceModalTab: noop,
      setShowAddSpaceModal: noop,
      showServerDropdown,
      setShowServerDropdown,
      openSpaceSettings: noop,
      setChannelForInvite: noop,
      setSpaceForAddMembers: noop,
      showNewChannel: null,
      setShowNewChannel: noop,
      newChannelName: '',
      setNewChannelName: noop,
      newChannelType: 'text',
      setNewChannelType: noop,
      newChannelCategory: '',
      setNewChannelCategory: noop,
      createChannel: noop,
      mutedSpaces: new Set<string>(),
      toggleMuteSpace: noop,
      handleLeaveSpace: noop,
      channelSearchQuery: channelSearch,
      setChannelSearchQuery: setChannelSearch,
      collapsedCategories,
      toggleCategoryCollapse: noop,
      spaceChannels: { s1: CHANNELS },
      unreadChannels: new Set(['t2']),
      selectedChannel: selected,
      setSelectedChannel: (ch: any) => ch && setSelected(ch),
      spaceVoiceUsers: VOICE_USERS,
      activeVoiceChannelId: inVoiceCall ? selected.id : null,
      activeVoiceChannel: inVoiceCall ? selected : null,
      participants: inVoiceCall ? VOICE_USERS.v1 : [],
      handleJoinVoice: noop,
      handleLeaveVoice: noop,
      isPttMode: false,
      pttKey: 'V',
      isPttActive: false,
      isVoiceReconnecting: false,
      currentSpace: space,
      isMuted: false,
      handleToggleMute: noop,
      isDeafened: false,
      handleToggleDeafen: noop,
      setShowSoundboardModal: noop,
      isRecordingCall: false,
      startCallRecording: noop,
      stopCallRecording: noop,
      recordingDuration: 0,
      canUserDo: () => true,
      setVolumeControlUser: noop,
      spaceMembers: MEMBERS,
      isConnected: inVoiceCall,
      showToast: noop,
      serverRoles: ROLES,
      memberRoleMap: MEMBER_ROLE_MAP,
      presenceData: PRESENCE,
      moveParticipant: asyncNoop,
      serverMuteParticipant: asyncNoop,
      disconnectParticipant: asyncNoop,
      sidebarLayout: 'glass'
    }),
    [channelSearch, collapsedCategories, inVoiceCall, selected, showServerDropdown, showStatusMenu, space]
  )
  return { selected, setSelected, sidebarProps, space }
}

function ServerScreen() {
  const { selected, sidebarProps, space } = useServerShell('t1')
  const [draft, setDraft] = useState('')
  const [showMembers, setShowMembers] = useState(false)
  const [replying, setReplying] = useState<any>(null)
  const [callMuted, setCallMuted] = useState(false)
  const [callDeaf, setCallDeaf] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hoverRef = useRef<any>(null)
  const messages = useMemo(() => MESSAGES.map(m => ({ ...m, channel_id: selected.id })), [selected.id])

  const textProps: any = {
    currentSpace: space,
    selectedChannel: selected,
    messages: selected.type === 'text' ? messages : [],
    hasMoreMessages: false,
    isLoadingMore: false,
    loadMoreMessages: noop,
    messagesContainerRef: containerRef,
    messagesEndRef: endRef,
    user: ME,
    profileDisplayName: 'teste',
    profileAvatarUrl: '',
    nameEffect: 'celestial_gold',
    presenceData: PRESENCE,
    onlineUsers: ONLINE,
    serverRoles: ROLES,
    memberRoleMap: MEMBER_ROLE_MAP,
    canUserDo: () => true,
    getUserHighestRole: GETROLE,
    isMessageSaved: () => false,
    toggleSaveMessage: noop,
    handleDeleteMessage: noop,
    retrySendMessage: noop,
    replyingToMessage: replying,
    setReplyingToMessage: setReplying,
    messageReactions: REACTIONS,
    toggleReaction: noop,
    activePlayingVoiceNote: null,
    handleToggleVoicePlay: noop,
    voiceNotePlaySpeed: 1,
    handleChangeVoiceSpeed: noop,
    voiceNoteAudioRef: audioRef,
    draft,
    setDraft,
    send: (e: any) => e?.preventDefault?.(),
    isUploading: false,
    handleChatFileUpload: noop,
    isVoiceNoteRecording: false,
    voiceNoteDuration: 0,
    startVoiceNoteRecording: noop,
    stopVoiceNoteRecording: noop,
    cancelVoiceNoteRecording: noop,
    slowmodeCooldown: 0,
    showSearchInput: false,
    setShowSearchInput: noop,
    searchQuery: '',
    setSearchQuery: noop,
    showPinnedMessagesPanel: false,
    setShowPinnedMessagesPanel: noop,
    showMembersList: showMembers,
    setShowMembersList: setShowMembers,
    pinnedMessages: {},
    togglePinMessage: noop,
    spaceMembers: MEMBERS,
    spaceChannels: { s1: CHANNELS },
    activeVoiceChannelId: null,
    participants: [],
    spaceVoiceUsers: VOICE_USERS,
    setSpaceForAddMembers: noop,
    setInspectedMember: noop,
    setHoveredMemberPopover: noop,
    hoverTimeoutRef: hoverRef,
    postChannelMessage: noop,
    supabase: null
  }

  return (
    <Frame page="Servidores" selected={selected}>
      <section className="workspace">
        <ChannelsSidebar {...sidebarProps} />
        <section className="main-content">
          <TextChannelView {...textProps} />
        </section>
      </section>
      <FloatingCallPanel
        channelName="Sala principal"
        spaceName="Amigos da Madrugada"
        participants={[
          { userId: 'me', displayName: 'teste', isSpeaking: false, isMuted: callMuted },
          { userId: 'u2', displayName: 'Kauê', isSpeaking: true, isMuted: false },
          { userId: 'u3', displayName: 'Bia', isSpeaking: false, isMuted: true },
          { userId: 'u4', displayName: 'Duda', isSpeaking: false, isMuted: false }
        ]}
        currentUserId="me"
        isMuted={callMuted}
        isDeafened={callDeaf}
        onToggleMute={() => setCallMuted(m => !m)}
        onToggleDeafen={() => setCallDeaf(d => !d)}
        onLeave={noop}
        onReturn={noop}
      />
    </Frame>
  )
}

// Vídeo de mentira para a prévia (transmissão e câmeras): um canvas animado virando MediaStream
function fakeVideoStream(label: string, hue: number, width: number, height: number): MediaStream {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  const draw = (t: number) => {
    ctx.fillStyle = `hsl(${hue} 45% 22%)`
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = `hsl(${hue} 70% 55%)`
    ctx.beginPath()
    ctx.arc(width / 2 + Math.sin(t / 900) * width * 0.2, height / 2, height * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `700 ${Math.round(height / 9)}px Inter, sans-serif`
    ctx.fillText(label, 16, height - 18)
    requestAnimationFrame(draw)
  }
  requestAnimationFrame(draw)
  return canvas.captureStream(15)
}

function VoiceScreen({ withStream = false }: { withStream?: boolean }) {
  const { selected, sidebarProps, space } = useServerShell('v1')
  const streams = useMemo(() => withStream ? {
    screen: fakeVideoStream('Tela do Kauê — VALORANT', 220, 1280, 720),
    camKaue: fakeVideoStream('Kauê', 30, 320, 180),
    camBia: fakeVideoStream('Bia', 300, 320, 180),
    camMe: fakeVideoStream('Você', 150, 320, 180)
  } : null, [withStream])
  const [showChat, setShowChat] = useState(true)
  const [showMembers, setShowMembers] = useState(false)
  const [muted, setMuted] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hoverRef = useRef<any>(null)
  const screenRef = useRef<HTMLDivElement | null>(null)

  const participants: any[] = [
    { userId: 'me', displayName: 'teste', isSpeaking: false, isMuted: muted, ...(streams ? { cameraStream: streams.camMe, isCameraOn: true } : {}) },
    { userId: 'u2', displayName: 'Kauê', isSpeaking: true, isMuted: false, ...(streams ? { screenStream: streams.screen, isScreenSharing: true, screenFps: 60, cameraStream: streams.camKaue, isCameraOn: true } : {}) },
    { userId: 'u3', displayName: 'Bia', isSpeaking: false, isMuted: true, ...(streams ? { cameraStream: streams.camBia, isCameraOn: true } : {}) },
    { userId: 'u4', displayName: 'Duda', isSpeaking: false, isMuted: false }
  ]
  const sharer = streams ? participants[1] : null

  const props: any = {
    currentSpace: space,
    selectedChannel: selected.type === 'voice' ? selected : CHANNELS[0],
    spaceChannels: { s1: CHANNELS },
    spaceVoiceUsers: VOICE_USERS,
    user: ME,
    profileDisplayName: 'teste',
    profileAvatarUrl: '',
    presenceData: PRESENCE,
    onlineUsers: ONLINE,
    presenceStatus: 'online',
    serverRoles: ROLES,
    memberRoleMap: MEMBER_ROLE_MAP,
    getUserHighestRole: GETROLE,
    setSpaceForAddMembers: noop,
    setInspectedMember: noop,
    setHoveredMemberPopover: noop,
    hoverTimeoutRef: hoverRef,
    spaceMembers: MEMBERS,
    activeVoiceChannelId: 'v1',
    isConnected: true,
    participants,
    handleJoinVoice: noop,
    handleLeaveVoice: noop,
    isMuted: muted,
    handleToggleMute: () => setMuted(m => !m),
    isDeafened: false,
    handleToggleDeafen: noop,
    isAiDenoiseEnabled: true,
    toggleAiDenoise: noop,
    isPttMode: false,
    isPttActive: false,
    pttKey: 'V',
    setShowSoundboardModal: noop,
    isRecordingCall: false,
    startCallRecording: noop,
    stopCallRecording: noop,
    recordingDuration: 0,
    setVolumeControlUser: noop,
    activeScreenSharers: sharer ? [sharer] : [],
    activeScreenSharer: sharer,
    setSelectedScreenSharerUserId: noop,
    screenShareViewMode: 'focus',
    setScreenShareViewMode: noop,
    isWatchingStreams: Boolean(sharer),
    setIsWatchingStreams: noop,
    isPiPActive: false,
    setIsPiPActive: noop,
    localScreenStream: null,
    handleStopScreenShare: noop,
    openScreenPicker: noop,
    forceOpenScreenPicker: noop,
    localCameraStream: streams ? streams.camMe : null,
    handleToggleCamera: noop,
    screenQuality: '1080p',
    handleQualityChange: noop,
    screenFps: 60,
    handleFpsChange: noop,
    activeSharingSource: null,
    peerScreenVolumes: {},
    setPeerScreenVolumes: noop,
    screenAudioSyncDelayMs: 0,
    changeScreenAudioSyncDelay: noop,
    screenShareContainerRef: screenRef,
    isScreenFullScreen: false,
    toggleScreenFullScreen: noop,
    messages: MESSAGES.slice(-4).map(m => ({ ...m, channel_id: 'v1' })),
    send: (e: any) => e?.preventDefault?.(),
    draft: '',
    setDraft: noop,
    handleChatFileUpload: noop,
    isUploading: false,
    canUserDo: () => true,
    isMessageSaved: () => false,
    toggleSaveMessage: noop,
    handleDeleteMessage: noop,
    activePlayingVoiceNote: null,
    handleToggleVoicePlay: noop,
    voiceNotePlaySpeed: 1,
    handleChangeVoiceSpeed: noop,
    voiceNoteAudioRef: audioRef,
    pinnedMessages: {},
    togglePinMessage: noop,
    messagesEndRef: endRef,
    showVoiceChat: showChat,
    setShowVoiceChat: setShowChat,
    showMembersList: showMembers,
    setShowMembersList: setShowMembers,
    showPinnedMessagesPanel: false,
    setShowPinnedMessagesPanel: noop,
    showSearchInput: false,
    setShowSearchInput: noop,
    searchQuery: '',
    setSearchQuery: noop,
    showScreenMenu: false,
    setShowScreenMenu: noop,
    sidebarLayout: 'glass'
  }

  return (
    <Frame page="Servidores" selected={CHANNELS[0]}>
      <section className="workspace">
        <ChannelsSidebar {...sidebarProps} />
        <section className="main-content">
          <VoiceChannelView {...props} />
        </section>
      </section>
    </Frame>
  )
}

function FriendsScreen() {
  const [tab, setTab] = useState<'online' | 'all' | 'pending' | 'add'>('online')
  const [query, setQuery] = useState('')
  const [dm, setDm] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [statusMenu, setStatusMenu] = useState(false)

  const props: any = {
    friendships: [
      ...FRIENDS,
      { id: 'f9', user: { id: 'u8', display_name: 'Marina' }, status: 'pending', initiatorId: 'u8' }
    ],
    friendTab: tab,
    setFriendTab: setTab,
    friendSearchQuery: query,
    setFriendSearchQuery: setQuery,
    friendSearchNotice: '',
    sendFriendRequest: (e: any) => e?.preventDefault?.(),
    acceptFriendRequest: noop,
    removeFriendship: noop,
    onlineUsers: ONLINE,
    presenceData: PRESENCE,
    user: ME,
    selectedDMUserId: dm,
    directMessages: dm ? DIRECT_MESSAGES : [],
    dmDraft: draft,
    setDmDraft: setDraft,
    unreadDMs: { u2: 2 },
    onOpenDM: (id: string) => setDm(id),
    onSendDM: (e: any) => e?.preventDefault?.(),
    onCloseDM: () => setDm(null),
    isUploading: false,
    onUploadFile: noop,
    profileDisplayName: 'teste',
    profileAvatarUrl: '',
    toggleTheme: noop,
    onSignOut: noop,
    presenceStatus: 'online',
    showStatusMenu: statusMenu,
    setShowStatusMenu: setStatusMenu,
    updatePresenceStatus: noop,
    spaceMembers: MEMBERS,
    showToast: noop,
    recentDMUserIds: ['u3'],
    knownProfiles: {},
    groupChats: [],
    blockedUserIds: new Set<string>()
  }

  return (
    <Frame page="Amigos">
      <div className="preview-page">
        <FriendsView {...props} />
      </div>
    </Frame>
  )
}

function SettingsScreen() {
  const props: any = {
    userId: 'me',
    userCreatedAt: new Date(Date.now() - 90 * 86400_000).toISOString(),
    isServerOwner: true,
    currentDisplayName: 'teste',
    currentAvatarUrl: '',
    customStatus: 'Pronto para a próxima rodada',
    avatarDecoration: 'none',
    nameEffect: 'celestial_gold',
    onProfileUpdate: noop,
    onCustomStatusUpdate: noop,
    audioInputs: [],
    audioOutputs: [],
    selectedInputId: '',
    selectedOutputId: '',
    onInputDeviceChange: noop,
    onOutputDeviceChange: noop,
    audioError: null,
    onRefreshDevices: noop,
    profileDisplayName: 'teste',
    profileAvatarUrl: '',
    theme: 'light',
    toggleTheme: noop,
    selectTheme: noop,
    isPremiumUser: false,
    setPage: noop,
    onSignOut: noop,
    presenceStatus: 'online',
    noiseSuppressionEnabled: true,
    echoCancellationEnabled: true,
    onNoiseSuppressionChange: noop,
    onEchoCancellationChange: noop,
    sfxVolume: 0.6,
    onSfxVolumeChange: noop,
    sidebarLayout: 'glass',
    chatDensity: 'cozy'
  }
  return (
    <Frame page="Configurações">
      <div className="preview-page">
        <SettingsView {...props} />
      </div>
    </Frame>
  )
}

function ShopScreen() {
  return (
    <Frame page="Loja">
      <div className="preview-page">
        <EchoShop
          userId="me"
          displayName="teste"
          avatarUrl={null}
          currentDecoration="none"
          onEquipDecoration={noop}
          onEquipProfileEffect={noop}
          onEquipCardFinish={noop}
          onEquipNameEffect={noop}
          onOpenInventory={noop}
        />
      </div>
    </Frame>
  )
}

function InventoryScreen() {
  return (
    <Frame page="Inventário">
      <div className="preview-page">
        <CosmeticsInventory
          userId="me"
          displayName="teste"
          avatarUrl={null}
          currentDecoration="none"
          currentProfileEffect="none"
          currentCardFinish="none"
          currentNameEffect="celestial_gold"
          bio="Jogador ativo no Echo • Pronto para squad e clutch."
          onEquipDecoration={noop}
          onEquipProfileEffect={noop}
          onEquipCardFinish={noop}
          onEquipNameEffect={noop}
          onOpenShop={noop}
        />
      </div>
    </Frame>
  )
}

function SpaceStudioScreen() {
  const [tab, setTab] = useState<'geral' | 'roles' | 'emojis' | 'channels' | 'members' | 'audit' | 'invites' | 'danger'>('geral')
  const [name, setName] = useState('Amigos da Madrugada')
  const [desc, setDesc] = useState('Onde tudo acontece depois das 22h')
  const [memberQuery, setMemberQuery] = useState('')
  const [role, setRole] = useState<string | null>(null)
  const [member, setMember] = useState<string | null>(null)
  const [channelEdit, setChannelEdit] = useState<string | null>(null)
  const [welcome, setWelcome] = useState('')

  const props: any = {
    isOpen: true,
    onClose: noop,
    editingSpace: SPACES[0],
    user: ME,
    profileDisplayName: 'teste',
    displayName: 'teste',
    serverRoles: ROLES,
    serverEmojis: [],
    serverAuditLogs: AUDIT_LOGS,
    editingSpaceMembers: MEMBERS,
    loadingEditingMembers: false,
    memberRoleMap: MEMBER_ROLE_MAP,
    spaceChannels: { s1: CHANNELS },
    mutedSpaces: new Set<string>(),
    toggleMuteSpace: noop,
    activeSpaceTab: tab,
    setActiveSpaceTab: setTab,
    editingSpaceName: name,
    setEditingSpaceName: setName,
    editingSpaceDescription: desc,
    setEditingSpaceDescription: setDesc,
    editingSpaceIconUrl: '',
    setEditingSpaceIconUrl: noop,
    editingSpaceBannerUrl: '',
    setEditingSpaceBannerUrl: noop,
    editingSpaceBannerTheme: 'dark',
    setEditingSpaceBannerTheme: noop,
    editingSpaceWelcomeChannelId: welcome,
    setEditingSpaceWelcomeChannelId: setWelcome,
    uploadingSpaceIcon: false,
    uploadingSpaceBanner: false,
    memberSearchQuery: memberQuery,
    setMemberSearchQuery: setMemberQuery,
    selectedRoleId: role,
    setSelectedRoleId: setRole,
    selectedMemberId: member,
    setSelectedMemberId: setMember,
    newEmojiName: '',
    setNewEmojiName: noop,
    uploadingEmoji: false,
    editingChannelSettingsId: channelEdit,
    setEditingChannelSettingsId: setChannelEdit,
    setShowNewChannel: noop,
    setNewChannelCategory: noop,
    setNewChannelName: noop,
    setNewChannelTopic: noop,
    handleSpaceIconUpload: noop,
    handleRemoveSpaceIcon: noop,
    handleSpaceBannerUpload: noop,
    handleRemoveSpaceBanner: noop,
    handleSaveSpaceSettings: noop,
    handleCreateRole: async () => null,
    handleUpdateRole: asyncNoop,
    handleDeleteRole: asyncNoop,
    moveRole: noop,
    handleCreateEmoji: noop,
    handleDeleteEmoji: noop,
    moveChannel: noop,
    updateChannelSettings: noop,
    renameChannel: noop,
    deleteChannel: noop,
    getUserHighestRole: GETROLE,
    getMemberPermissions: () => new Proxy({}, { get: () => true }),
    canManageRole: () => true,
    canManageMember: () => true,
    canKickMember: () => true,
    toggleMemberRole: noop,
    handleRoleChange: noop,
    handleKickMember: noop
  }
  return (
    <Frame page="Servidores">
      <SpaceStudioModal {...props} />
    </Frame>
  )
}

function ProfileScreen() {
  const [open, setOpen] = useState(true)
  const [fx, setFx] = useState(true)
  return (
    <Frame page="Servidores">
      <div className="preview-windows">
        <div className="preview-windows-actions">
          <button type="button" onClick={() => setOpen(true)}>Abrir perfil de membro</button>
          <button type="button" onClick={() => setFx(v => !v)}>Jardim de Sakura: {fx ? 'ligado' : 'desligado'}</button>
        </div>
      </div>
      {open && (
        <MemberProfileModalWrapper
          inspectedMember={{ user: { id: 'u2', display_name: 'Kauê', avatar_url: undefined }, roleName: 'Moderador', roleColor: '#3b82f6', roles: [ROLES[1]] }}
          onClose={() => setOpen(false)}
          user={ME}
          onlineUsers={ONLINE}
          participants={[]}
          presenceData={{ ...PRESENCE, u2: { ...PRESENCE.u2, profile_effect: fx ? 'sakura_garden' : null } }}
          presenceStatus="online"
          spaces={SPACES}
          expandedSpace="s1"
          showToast={noop}
          friendships={FRIENDS}
          onAddFriend={async () => {}}
          onAcceptFriend={async () => {}}
          handleOpenDirectChat={noop}
          setVolumeControlUser={noop}
        />
      )}
    </Frame>
  )
}

function WindowsScreen() {
  const [open, setOpen] = useState<'soundboard' | 'addfriend' | null>(null)
  const [query, setQuery] = useState('')
  return (
    <div className="preview-windows">
      <div className="preview-windows-actions">
        <button type="button" onClick={() => setOpen('soundboard')}>Soundboard</button>
        <button type="button" onClick={() => setOpen('addfriend')}>Adicionar amigo</button>
      </div>
      <div className="preview-windows-grid">
        <div className="composer" style={{ position: 'relative', minHeight: 440, margin: 0, background: 'transparent', border: 0, boxShadow: 'none', padding: 0 } as CSSProperties}>
          <StickerPicker onSelectSticker={noop} onClose={noop} userId="preview" />
        </div>
      </div>
      {open === 'soundboard' && <SoundboardModal isOpen onClose={() => setOpen(null)} onPlaySound={noop} />}
      {open === 'addfriend' && (
        <AddFriendModal
          onClose={() => setOpen(null)}
          profileDisplayName="teste"
          copyFriendLink={noop}
          friendSearchQuery={query}
          setFriendSearchQuery={setQuery}
          sendFriendRequest={(e) => e.preventDefault()}
          friendSearchNotice=""
          suggestedMembers={MEMBERS.slice(3, 6)}
        />
      )}
    </div>
  )
}

function UpdateScreen() {
  const [mode, setMode] = useState<'downloading' | 'ready'>('downloading')
  const [progress, setProgress] = useState(62)
  return (
    <Frame page="Amigos">
      <div className="preview-page" style={{ padding: 24 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button type="button" className="echo-btn-secondary" onClick={() => { setMode('downloading'); setProgress(62) }}>Baixando</button>
          <button type="button" className="echo-btn-secondary" onClick={() => setMode('ready')}>Pronta</button>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, alignSelf: 'center' }}>Clique em "Reiniciar para atualizar" para ver a tela de atualização.</span>
        </div>
        <UpdateBanner updateStatus={mode} updateVersion="0.54.0" updateProgress={progress} onRestart={noop} />
      </div>
    </Frame>
  )
}

// Galeria das decorações de avatar: as seis novas do pacote (marcadas) e as que já existiam, em quatro tamanhos
const NEW_DECORATIONS = new Set(['bunny_moon', 'sakura_bloom', 'arcane_circle', 'crystal_wings', 'pumpkin_night', 'frost_crystal'])
function DecorationsScreen() {
  const [only, setOnly] = useState<'novas' | 'antigas' | 'todas'>('novas')
  const [big, setBig] = useState(false)
  const list = AVATAR_DECORATIONS.filter(d => only === 'todas' || (only === 'novas') === NEW_DECORATIONS.has(d.id))
  return (
    <Frame page="Loja">
      <div className="preview-page preview-decos">
        <div className="preview-decos-head">
          <h2>Decorações de avatar</h2>
          <div className="preview-decos-filter" role="group" aria-label="Mostrar">
            <button type="button" className={only === 'novas' ? 'on' : ''} onClick={() => setOnly('novas')}>Só as novas</button>
            <button type="button" className={only === 'antigas' ? 'on' : ''} onClick={() => setOnly('antigas')}>As que já existiam</button>
            <button type="button" className={only === 'todas' ? 'on' : ''} onClick={() => setOnly('todas')}>Todas</button>
            <button type="button" className={big ? 'on' : ''} onClick={() => setBig(b => !b)}>Ampliado</button>
          </div>
        </div>
        <div className="preview-decos-grid">
          {list.map(d => (
            <article key={d.id} className="preview-deco-card">
              <header>
                <strong>{d.name}</strong>
                <span>{NEW_DECORATIONS.has(d.id) ? 'NOVA · ' : ''}{d.category}</span>
              </header>
              <div className="preview-deco-row">
                {(big ? [210] : [32, 48, 72, 112]).map(size => (
                  <div key={size} className="preview-deco-cell" style={{ width: size * 1.7, height: size * 1.7 }}>
                    <DecoratedAvatar displayName="teste" decorationId={d.id} size={size} status={size >= 48 ? 'online' : undefined} />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Frame>
  )
}

// Janela "Novo na Loja" por cima da tela de amigos (onde o app abre). Fechar ou "Ver na loja" só reabre aqui.
function ShopNewsScreen() {
  const [open, setOpen] = useState(true)
  return (
    <>
      <FriendsScreen />
      {open && CURRENT_SHOP_DROP ? (
        <ShopNewsModal drop={CURRENT_SHOP_DROP} displayName="teste" onDismiss={() => setOpen(false)} onOpenShop={() => setOpen(false)} />
      ) : (
        <button type="button" className="echo-btn-secondary" style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 5 }} onClick={() => setOpen(true)}>
          Mostrar de novo
        </button>
      )}
    </>
  )
}

function Preview() {
  const [theme, setTheme] = useState<ThemeKey>(() => {
    const hash = window.location.hash.replace('#', '').split('/')[0]
    return hash === 'light' ? 'light' : 'dark'
  })
  const [screen, setScreen] = useState<ScreenKey>(() => {
    const part = window.location.hash.replace('#', '').split('/')[1]
    return (SCREENS.map(s => s[0]) as string[]).includes(part) ? (part as ScreenKey) : 'servidor'
  })

  useKeyboardActivation()
  useModalAccessibility()
  useEffect(() => {
    seedStores()
  }, [])
  useEffect(() => {
    document.body.className = THEME_BODY[theme]
  }, [theme])

  const body =
    screen === 'servidor' ? <ServerScreen /> :
    screen === 'voz' ? <VoiceScreen /> :
    screen === 'amigos' ? <FriendsScreen /> :
    screen === 'config' ? <SettingsScreen /> :
    screen === 'loja' ? <ShopScreen /> :
    screen === 'inventario' ? <InventoryScreen /> :
    screen === 'espaco' ? <SpaceStudioScreen /> :
    screen === 'perfil' ? <ProfileScreen /> :
    screen === 'atualizacao' ? <UpdateScreen /> :
    screen === 'decoracoes' ? <DecorationsScreen /> :
    screen === 'novidades' ? <ShopNewsScreen /> :
    screen === 'transmissao' ? <VoiceScreen withStream /> :
    <WindowsScreen />

  return (
    <div className="preview-shell">
      <header className="preview-bar">
        <div className="preview-title">
          <strong>Echo</strong>
          <span>prévia do Aurora</span>
        </div>
        <nav className="preview-tabs preview-screens" aria-label="Tela">
          {SCREENS.map(([key, label]) => (
            <button key={key} type="button" className={screen === key ? 'on' : ''} onClick={() => setScreen(key)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="preview-tabs" role="group" aria-label="Tema">
          {(Object.keys(THEME_LABEL) as ThemeKey[]).map(t => (
            <button key={t} type="button" className={theme === t ? 'on' : ''} onClick={() => setTheme(t)}>
              {THEME_LABEL[t]}
            </button>
          ))}
        </div>
      </header>
      <main className="preview-stage" key={screen}>{body}</main>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
