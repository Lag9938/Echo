import React, { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { WhatsNewModal } from '../components/WhatsNewModal'
import { AvatarDecoration } from '../components/AvatarDecoration'
import { ProfileEffect } from '../components/ProfileEffect'
import { CosmeticsInventory } from '../components/CosmeticsInventory'
import { UnifiedUserProfileFooter } from '../components/sidebar/UnifiedUserProfileFooter'
import type { Page } from '../types'
import {
  MicIcon, LockIcon, SparklesIcon, UserIcon,
  BadgeCrownIcon, BadgeFounderIcon, BadgeStreamerIcon, BadgeVeteranIcon,
  BadgeVipIcon, CameraIcon, FolderIcon, KickIcon,
  PaletteIcon, SaveIcon, SteamIcon,
  TwitchIcon, WindowsIcon, YoutubeIcon
} from '../components/icons'
import {
  ColoredBackpackIcon
} from '../components/ColoredIcons'
import { AppearanceTab } from './settings/AppearanceTab'
import { WindowsTab } from './settings/WindowsTab'
import { AudioVideoTab } from './settings/AudioVideoTab'
import { SubscriptionTab } from './settings/SubscriptionTab'

export function SettingsView({
  userId,
  userCreatedAt,
  isServerOwner,
  currentDisplayName,
  currentAvatarUrl,
  customStatus,
  onProfileUpdate,
  onCustomStatusUpdate,
  audioInputs,
  audioOutputs,
  selectedInputId,
  selectedOutputId,
  onInputDeviceChange,
  onOutputDeviceChange,
  audioError,
  onRefreshDevices,
  profileDisplayName,
  profileAvatarUrl,
  theme,
  toggleTheme,
  selectTheme,
  isPremiumUser,
  setPage,
  onSignOut,
  presenceStatus = 'online',
  showStatusMenu = false,
  setShowStatusMenu,
  updatePresenceStatus,
  onOpenWhatsNew,
  myGamePresence,
  noiseSuppressionEnabled,
  echoCancellationEnabled,
  onNoiseSuppressionChange,
  onEchoCancellationChange,
  sfxVolume,
  onSfxVolumeChange,
  noiseGateEnabled,
  noiseGateThreshold,
  onNoiseGateEnabledChange,
  onNoiseGateThresholdChange,
  spatialAudioEnabled,
  onToggleSpatialAudio,
  onResetAllPans,
  isAiDenoiseEnabled,
  onToggleAiDenoise,
  customAccentColor = '',
  onCustomAccentColorChange,
  chatDensity = 'cozy',
  onChatDensityChange,
  performanceMode = false,
  onPerformanceModeChange,
  avatarDecoration,
  profileEffect,
  avatarFrame = 'aura-cyan',
  cardFinish = 'none',
  nameEffect = 'resonance_cyan',
  onEquipDecoration,
  onEquipProfileEffect,
  onEquipAvatarFrame,
  onEquipCardFinish,
  onEquipNameEffect,
  initialTab,
  onOpenShop,
  pttModeSetting,
  onPttModeChange,
  pttKey,
  onPttKeyChange,
  onToggleOverlay,
  onSimulateSubscription,
  onResetSubscription,
  userEmail,
  onSubscriptionSuccess
}: {
  userId: string
  userCreatedAt?: string
  isServerOwner?: boolean
  currentDisplayName: string
  currentAvatarUrl: string
  customStatus: string
  avatarDecoration?: string | null
  profileEffect?: string | null
  avatarFrame?: string
  cardFinish?: 'none' | 'holographic' | 'glass' | 'carbon'
  nameEffect?: string
  onEquipDecoration?: (id: string) => Promise<void> | void
  onEquipProfileEffect?: (id: string) => Promise<void> | void
  onEquipAvatarFrame?: (id: string) => void
  onEquipCardFinish?: (id: string) => void
  onEquipNameEffect?: (id: string) => void
  initialTab?: 'profile' | 'subscription' | 'inventory' | 'audio' | 'appearance' | 'windows' | 'changelog'
  onOpenShop?: (targetTab?: 'decorations' | 'profile_effects' | 'auras' | 'finishes' | 'name_effects') => void
  onProfileUpdate: (name: string, avatar: string) => void
  onCustomStatusUpdate: (status: string) => void
  audioInputs: MediaDeviceInfo[]
  audioOutputs: MediaDeviceInfo[]
  selectedInputId: string
  selectedOutputId: string
  onInputDeviceChange: (id: string) => void
  onOutputDeviceChange: (id: string) => void
  audioError: string | null
  onRefreshDevices: () => void
  profileDisplayName: string
  profileAvatarUrl: string
  theme: string
  toggleTheme: () => void
  selectTheme: (themeId: string) => void
  isPremiumUser: boolean
  setPage: (page: Page) => void
  onSignOut: () => void
  presenceStatus?: 'online' | 'idle' | 'dnd' | 'invisible'
  showStatusMenu?: boolean
  setShowStatusMenu?: (val: boolean) => void
  updatePresenceStatus?: (status: 'online' | 'idle' | 'dnd' | 'invisible') => void
  onOpenWhatsNew?: () => void
  myGamePresence?: { name: string; icon: string; startedAt: number } | null
  noiseSuppressionEnabled: boolean
  echoCancellationEnabled: boolean
  onNoiseSuppressionChange: (val: boolean) => void
  onEchoCancellationChange: (val: boolean) => void
  sfxVolume: number
  onSfxVolumeChange: (val: number) => void
  noiseGateEnabled: boolean
  noiseGateThreshold: number
  onNoiseGateEnabledChange: (val: boolean) => void
  onNoiseGateThresholdChange: (val: number) => void
  spatialAudioEnabled: boolean
  onToggleSpatialAudio: (val: boolean) => void
  onResetAllPans: () => void
  isAiDenoiseEnabled: boolean
  onToggleAiDenoise: (val: boolean) => void
  customAccentColor?: string
  onCustomAccentColorChange?: (color: string) => void
  chatDensity?: 'cozy' | 'compact'
  onChatDensityChange?: (density: 'cozy' | 'compact') => void
  performanceMode?: boolean
  onPerformanceModeChange?: (val: boolean) => void
  pttModeSetting?: boolean
  onPttModeChange?: (val: boolean) => void
  pttKey?: string
  onPttKeyChange?: (val: string) => void
  onToggleOverlay?: () => void
  onSimulateSubscription?: () => void
  onResetSubscription?: () => void
  userEmail?: string
  onSubscriptionSuccess?: () => void
}) {
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab)
  const [activeSettingsTab, setActiveSettingsTab] = useState<'profile' | 'subscription' | 'inventory' | 'audio' | 'appearance' | 'windows' | 'changelog'>(initialTab || 'profile')

  if (initialTab && initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab)
    setActiveSettingsTab(initialTab)
  }

  // Profile settings state & Echo Player Identity
  const [profileSubTab, setProfileSubTab] = useState<'identity' | 'appearance' | 'badges'>('identity')
  const [localDisplayName, setLocalDisplayName] = useState(currentDisplayName)
  const [localAvatarUrl, setLocalAvatarUrl] = useState(currentAvatarUrl)
  const [localCustomStatus, setLocalCustomStatus] = useState(customStatus)
  const [localBio, setLocalBio] = useState(() => localStorage.getItem(`echo-bio-${userId}`) || '🎮 Jogador ativo no Echo • Pronto para squad e clutch.')
  const [localPronouns, setLocalPronouns] = useState(() => localStorage.getItem(`echo-pronouns-${userId}`) || 'ele/dele')
  const [localBannerPreset, setLocalBannerPreset] = useState(() => localStorage.getItem(`echo-banner-preset-${userId}`) || 'synthwave')
  const [localBannerCustom, setLocalBannerCustom] = useState(() => localStorage.getItem(`echo-banner-custom-${userId}`) || '')
  const [localAvatarFrame, setLocalAvatarFrame] = useState(() => localStorage.getItem(`echo-avatar-frame-${userId}`) || 'aura-cyan')
  const [localBadge, setLocalBadge] = useState(() => localStorage.getItem(`echo-badge-${userId}`) || 'owner')
  const [localPresenceStatus, setLocalPresenceStatus] = useState<'online' | 'idle' | 'dnd' | 'offline'>(() => (localStorage.getItem(`echo-presence-status-${userId}`) as any) || 'online')
  const [localShowBadge, setLocalShowBadge] = useState<boolean>(() => localStorage.getItem(`echo-show-badge-${userId}`) !== 'false')
  
  // Advanced Profile Appearance states
  const [localCardFinish, setLocalCardFinish] = useState<'none' | 'holographic' | 'glass' | 'carbon'>(() => (localStorage.getItem(`echo-card-finish-${userId}`) as any) || 'none')
  const [localClanTag, setLocalClanTag] = useState(() => localStorage.getItem(`echo-clan-tag-${userId}`) || '')
  const [localClanTagColor, setLocalClanTagColor] = useState(() => localStorage.getItem(`echo-clan-tag-color-${userId}`) || '#00f2fe')
  const [localSocialSteam, setLocalSocialSteam] = useState(() => localStorage.getItem(`echo-social-steam-${userId}`) || '')
  const [localSocialTwitch, setLocalSocialTwitch] = useState(() => localStorage.getItem(`echo-social-twitch-${userId}`) || '')
  const [localSocialYoutube, setLocalSocialYoutube] = useState(() => localStorage.getItem(`echo-social-youtube-${userId}`) || '')
  const [localSocialKick, setLocalSocialKick] = useState(() => localStorage.getItem(`echo-social-kick-${userId}`) || '')

  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [devUnlockBadges, setDevUnlockBadges] = useState(false)
  const [profileSavedToast, setProfileSavedToast] = useState(false)

  // Unconditional file input references for Avatar and Banner
  const avatarFileInputRef = useRef<HTMLInputElement>(null)
  const bannerFileInputRef = useRef<HTMLInputElement>(null)

  // Account age and tenure calculation for Badge unlocks
  const [accountDays] = useState(() =>
    userCreatedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(userCreatedAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 0
  )
  const [accountCreatedYear] = useState(() =>
    userCreatedAt ? new Date(userCreatedAt).getFullYear() : 2026
  )

  const badgesList = [
    { 
      id: 'owner', 
      label: 'Líder de Espaço', 
      icon: <BadgeCrownIcon />, 
      unlocked: Boolean(isServerOwner) || devUnlockBadges,
      requirement: 'Requer ser proprietário/criador de espaço',
      desc: 'Fundadores de comunidade e construtores de espaços no Echo' 
    },
    { 
      id: 'vip', 
      label: 'Echo VIP', 
      icon: <BadgeVipIcon />, 
      unlocked: Boolean(isPremiumUser) || devUnlockBadges,
      requirement: 'Requer assinatura Echo Pass ativa',
      desc: 'Membros apoiadores com acesso prioritário e suporte VIP' 
    },
    { 
      id: 'early', 
      label: 'Fundador 2026', 
      icon: <BadgeFounderIcon />, 
      unlocked: accountCreatedYear <= 2026 || devUnlockBadges,
      requirement: 'Conta criada na fase de lançamento (2026)',
      desc: 'Pioneiros presentes no nascimento e lançamento da plataforma' 
    },
    { 
      id: 'gamer', 
      label: 'Membro Veterano', 
      icon: <BadgeVeteranIcon />, 
      unlocked: accountDays >= 7 || devUnlockBadges,
      requirement: `Requer no mínimo 7 dias de conta ativa (${accountDays} ${accountDays === 1 ? 'dia' : 'dias'} de conta)`,
      desc: 'Membros com presença contínua em canais e salas de voz' 
    },
    { 
      id: 'podcaster', 
      label: 'Streamer Oficial', 
      icon: <BadgeStreamerIcon />, 
      unlocked: devUnlockBadges,
      requirement: 'Requer parceria verificada de transmissão ao vivo',
      desc: 'Criadores de conteúdo e transmissores parceiros no Echo' 
    },
    { 
      id: 'none', 
      label: 'Sem Insígnia', 
      icon: <span style={{ fontSize: '18px', opacity: 0.4 }}>✕</span>, 
      unlocked: true,
      requirement: 'Livre',
      desc: 'Ocultar insígnias do perfil' 
    }
  ]

  const [savedValues, setSavedValues] = useState(() => ({
    displayName: currentDisplayName,
    avatarUrl: currentAvatarUrl,
    customStatus: customStatus,
    bio: localStorage.getItem(`echo-bio-${userId}`) || '🎮 Jogador ativo no Echo • Pronto para squad e clutch.',
    pronouns: localStorage.getItem(`echo-pronouns-${userId}`) || 'ele/dele',
    bannerPreset: localStorage.getItem(`echo-banner-preset-${userId}`) || 'synthwave',
    bannerCustom: localStorage.getItem(`echo-banner-custom-${userId}`) || '',
    avatarFrame: localStorage.getItem(`echo-avatar-frame-${userId}`) || 'aura-cyan',
    badge: localStorage.getItem(`echo-badge-${userId}`) || 'owner',
    presenceStatus: (localStorage.getItem(`echo-presence-status-${userId}`) as any) || 'online',
    showBadge: localStorage.getItem(`echo-show-badge-${userId}`) !== 'false',
    cardFinish: (localStorage.getItem(`echo-card-finish-${userId}`) as any) || 'none',
    clanTag: localStorage.getItem(`echo-clan-tag-${userId}`) || '',
    clanTagColor: localStorage.getItem(`echo-clan-tag-color-${userId}`) || '#00f2fe',
    socialSteam: localStorage.getItem(`echo-social-steam-${userId}`) || '',
    socialTwitch: localStorage.getItem(`echo-social-twitch-${userId}`) || '',
    socialYoutube: localStorage.getItem(`echo-social-youtube-${userId}`) || '',
    socialKick: localStorage.getItem(`echo-social-kick-${userId}`) || '',
  }))

  const hasChanges = (
    localDisplayName !== savedValues.displayName ||
    localAvatarUrl !== savedValues.avatarUrl ||
    localCustomStatus !== savedValues.customStatus ||
    localBio !== savedValues.bio ||
    localPronouns !== savedValues.pronouns ||
    localBannerPreset !== savedValues.bannerPreset ||
    localBannerCustom !== savedValues.bannerCustom ||
    localAvatarFrame !== savedValues.avatarFrame ||
    localBadge !== savedValues.badge ||
    localPresenceStatus !== savedValues.presenceStatus ||
    localShowBadge !== savedValues.showBadge ||
    localCardFinish !== savedValues.cardFinish ||
    localClanTag !== savedValues.clanTag ||
    localClanTagColor !== savedValues.clanTagColor ||
    localSocialSteam !== savedValues.socialSteam ||
    localSocialTwitch !== savedValues.socialTwitch ||
    localSocialYoutube !== savedValues.socialYoutube ||
    localSocialKick !== savedValues.socialKick
  )

  function handleDiscardChanges() {
    setLocalDisplayName(savedValues.displayName)
    setLocalAvatarUrl(savedValues.avatarUrl)
    setLocalCustomStatus(savedValues.customStatus)
    setLocalBio(savedValues.bio)
    setLocalPronouns(savedValues.pronouns)
    setLocalBannerPreset(savedValues.bannerPreset)
    setLocalBannerCustom(savedValues.bannerCustom)
    setLocalAvatarFrame(savedValues.avatarFrame)
    setLocalBadge(savedValues.badge)
    setLocalPresenceStatus(savedValues.presenceStatus)
    setLocalShowBadge(savedValues.showBadge)
    setLocalCardFinish(savedValues.cardFinish)
    setLocalClanTag(savedValues.clanTag)
    setLocalClanTagColor(savedValues.clanTagColor)
    setLocalSocialSteam(savedValues.socialSteam)
    setLocalSocialTwitch(savedValues.socialTwitch)
    setLocalSocialYoutube(savedValues.socialYoutube)
    setLocalSocialKick(savedValues.socialKick)
  }

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLocalAvatarUrl(reader.result)
        }
      }
      reader.readAsDataURL(file)

      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `avatars/${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          if (urlData?.publicUrl) {
            setLocalAvatarUrl(urlData.publicUrl)
          }
        }
      }
    } catch (err: any) {
      console.warn('Avatar upload fallback to local data URL:', err)
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleBannerUpload(file: File) {
    setUploadingBanner(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setLocalBannerCustom(reader.result)
        }
      }
      reader.readAsDataURL(file)

      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `banners/${userId}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          if (urlData?.publicUrl) {
            setLocalBannerCustom(urlData.publicUrl)
          }
        }
      }
    } catch (err: any) {
      console.warn('Banner upload fallback to local data URL:', err)
    } finally {
      setUploadingBanner(false)
    }
  }


  // Public/free avatars gallery
  const defaultAvatars = [
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo1',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo5',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Robot-Echo6'
  ]

  async function handleSaveProfile(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (!supabase) return
    setSavingProfile(true)
    try {
      localStorage.setItem(`echo-bio-${userId}`, localBio)
      localStorage.setItem(`echo-pronouns-${userId}`, localPronouns)
      localStorage.setItem(`echo-banner-preset-${userId}`, localBannerPreset)
      localStorage.setItem(`echo-banner-custom-${userId}`, localBannerCustom)
      localStorage.setItem(`echo-avatar-frame-${userId}`, localAvatarFrame)
      localStorage.setItem(`echo-badge-${userId}`, localBadge)
      localStorage.setItem(`echo-presence-status-${userId}`, localPresenceStatus)
      localStorage.setItem(`echo-show-badge-${userId}`, JSON.stringify(localShowBadge))
      localStorage.setItem(`echo-card-finish-${userId}`, localCardFinish)
      localStorage.setItem(`echo-clan-tag-${userId}`, localClanTag)
      localStorage.setItem(`echo-clan-tag-color-${userId}`, localClanTagColor)
      localStorage.setItem(`echo-social-steam-${userId}`, localSocialSteam)
      localStorage.setItem(`echo-social-twitch-${userId}`, localSocialTwitch)
      localStorage.setItem(`echo-social-youtube-${userId}`, localSocialYoutube)
      localStorage.setItem(`echo-social-kick-${userId}`, localSocialKick)

      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        display_name: localDisplayName,
        avatar_url: localAvatarUrl
      })
      if (error) throw error

      setSavedValues({
        displayName: localDisplayName,
        avatarUrl: localAvatarUrl,
        customStatus: localCustomStatus,
        bio: localBio,
        pronouns: localPronouns,
        bannerPreset: localBannerPreset,
        bannerCustom: localBannerCustom,
        avatarFrame: localAvatarFrame,
        badge: localBadge,
        presenceStatus: localPresenceStatus,
        showBadge: localShowBadge,
        cardFinish: localCardFinish,
        clanTag: localClanTag,
        clanTagColor: localClanTagColor,
        socialSteam: localSocialSteam,
        socialTwitch: localSocialTwitch,
        socialYoutube: localSocialYoutube,
        socialKick: localSocialKick,
      })

      onProfileUpdate(localDisplayName, localAvatarUrl)
      onCustomStatusUpdate(localCustomStatus)
      setProfileSavedToast(true)
      setTimeout(() => setProfileSavedToast(false), 3000)
    } catch (err: any) {
      alert('Erro ao salvar perfil: ' + err.message)
    } finally {
      setSavingProfile(false)
    }
  }


  return (
    <section className="settings-workspace">
      <aside className="settings-sidebar">
        <div className="settings-sidebar-scrollable">
          <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 14px 8px 14px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Configurações</span>
            <button 
              type="button" 
              onClick={() => setPage('Servidores')} 
              style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              title="Voltar para os espaços"
            >
              ✕
            </button>
          </div>
          <div className="settings-menu">
            <span className="settings-menu-category">Sua Conta</span>
            <button 
              className={`menu-item ${activeSettingsTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('profile')}
            >
              <UserIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Meu Perfil</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'subscription' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('subscription')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: 'middle', flexShrink: 0 }}>
                  <defs>
                    <linearGradient id="menuProCrownGrad" x1="2" y1="3" x2="22" y2="21" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="100%" stopColor="#d97706" />
                    </linearGradient>
                  </defs>
                  <path d="M3 6L6.5 16H17.5L21 6L15.5 11L12 4L8.5 11L3 6Z" fill="url(#menuProCrownGrad)" stroke="#f59e0b" strokeWidth="1.2" strokeLinejoin="round" />
                  <circle cx="3" cy="6" r="1.5" fill="#fef08a" />
                  <circle cx="12" cy="4" r="1.5" fill="#fef08a" />
                  <circle cx="21" cy="6" r="1.5" fill="#fef08a" />
                  <rect x="6.5" y="17.5" width="11" height="2" rx="1" fill="url(#menuProCrownGrad)" stroke="#f59e0b" strokeWidth="0.8" />
                </svg>
                <span>Assinatura</span>
              </div>
              <span style={{
                fontSize: '9px',
                fontWeight: '800',
                padding: '1px 6px',
                borderRadius: '5px',
                background: isPremiumUser ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                border: isPremiumUser ? '1px solid #10b981' : '1px solid #f59e0b',
                color: isPremiumUser ? '#34d399' : '#fbbf24',
                letterSpacing: '0.04em'
              }}>
                {isPremiumUser ? 'ATIVO' : 'PRO'}
              </span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('inventory')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ColoredBackpackIcon size={17} style={{ verticalAlign: 'middle' }} />
                <span>Inventário</span>
              </div>
              <span className="echo-inv-menu-badge">NOVO</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('appearance')}
            >
              <PaletteIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Aparência</span>
            </button>

            <span className="settings-menu-category" style={{ marginTop: '8px' }}>Aplicativo & Sistema</span>
            <button 
              className={`menu-item ${activeSettingsTab === 'audio' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('audio')}
            >
              <MicIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Voz e Áudio</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'windows' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('windows')}
            >
              <WindowsIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Windows & Overlay</span>
            </button>
            <button 
              className={`menu-item ${activeSettingsTab === 'changelog' ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab('changelog')}
            >
              <SparklesIcon className="menu-icon" style={{ width: '17px', height: '17px' }} />
              <span>Novidades & Versões</span>
            </button>

            {onSignOut && (
              <button 
                type="button" 
                className="settings-signout-btn" 
                onClick={onSignOut}
                title="Desconectar do Echo"
              >
                <span>Sair da Conta</span>
              </button>
            )}
          </div>
        </div>

        <UnifiedUserProfileFooter
          displayName={profileDisplayName}
          avatarUrl={profileAvatarUrl}
          presenceStatus={presenceStatus}
          showStatusMenu={showStatusMenu}
          setShowStatusMenu={setShowStatusMenu || (() => {})}
          updatePresenceStatus={updatePresenceStatus || (() => {})}
          theme={theme as 'light' | 'dark'}
          toggleTheme={toggleTheme}
          onOpenSettings={() => setPage('Configurações')}
          onOpenWhatsNew={onOpenWhatsNew}
          onSignOut={onSignOut}
          myGamePresence={myGamePresence}
          avatarDecoration={avatarDecoration}
        />
      </aside>

      <section className="settings-content">
        {activeSettingsTab === 'profile' && (
          <div className="settings-container echo-profile-page" style={{ maxWidth: '960px' }}>
            {/* Permanent hidden file inputs for Avatar and Banner */}
            <input 
              ref={avatarFileInputRef}
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => { 
                const f = e.target.files?.[0]
                if (f) handleAvatarUpload(f)
                e.target.value = '' 
              }} 
            />
            <input 
              ref={bannerFileInputRef}
              type="file" 
              accept="image/*" 
              style={{ display: 'none' }} 
              onChange={(e) => { 
                const f = e.target.files?.[0]
                if (f) handleBannerUpload(f)
                e.target.value = '' 
              }} 
            />

            <div className="profile-studio-header">
              <div>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>Meu Perfil</span>
                  <span className="profile-studio-badge">ECHO PASS // 2026</span>
                </h2>
                <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  Personalize sua identidade, capa e presença no Echo com visualização em tempo real.
                </p>
              </div>

              {profileSavedToast && (
                <div className="profile-saved-toast">
                  <span>✓</span> Perfil salvo com sucesso!
                </div>
              )}
            </div>

            {/* Top: Echo Identity Hero (Inspirado no prestígio de perfil da Steam com acabamento moderno do Echo) */}
            <div className={`echo-hero-showcase finish-${localCardFinish}`} style={{ position: 'relative' }}>
              <ProfileEffect effectId={profileEffect} />
              {/* Panoramic Profile Banner */}
              <div 
                className={`echo-hero-banner ${!localBannerCustom ? `texture-${localBannerPreset}` : ''}`}
                style={localBannerCustom ? { backgroundImage: `url(${localBannerCustom})` } : undefined}
                onClick={() => bannerFileInputRef.current?.click()}
                title="Clique para escolher uma imagem de capa do computador"
              >
                <div className="echo-hero-banner-overlay" />
                <button 
                  type="button" 
                  className="echo-hero-banner-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    bannerFileInputRef.current?.click()
                  }}
                >
                  <CameraIcon style={{ width: '14px', height: '14px' }} />
                  <span>Alterar Capa</span>
                </button>
              </div>

              {/* Profile Card Main Info Section */}
              <div className="echo-hero-info-section">
                <div className="echo-hero-avatar-wrap">
                  <div 
                    className={`echo-hero-avatar-squircle ${localAvatarFrame}`}
                    onClick={() => avatarFileInputRef.current?.click()}
                    title="Clique para trocar foto de perfil"
                    style={{ position: 'relative', borderRadius: '50%' }}
                  >
                    <div className="echo-hero-avatar-inner" style={{ borderRadius: '50%' }}>
                      {localAvatarUrl ? (
                        <img src={localAvatarUrl} alt="Avatar" style={{ borderRadius: '50%' }} />
                      ) : (
                        localDisplayName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    {avatarDecoration && avatarDecoration !== 'none' && (
                      <AvatarDecoration decorationId={avatarDecoration} />
                    )}
                    <div className="echo-hero-avatar-overlay" style={{ borderRadius: '50%' }}>
                      <CameraIcon style={{ width: '22px', height: '22px' }} />
                    </div>
                    <span className={`echo-hero-status-dot status-${localPresenceStatus}`} />
                  </div>
                </div>

                <div className="echo-hero-details">
                  <div className="echo-hero-identity-row">
                    <div className="echo-hero-name-block">
                      <div className="echo-hero-display-name">
                        {localClanTag && (
                          <span 
                            className="echo-clan-tag" 
                            style={{ borderColor: localClanTagColor, color: localClanTagColor, boxShadow: `0 0 10px ${localClanTagColor}40` }}
                            title={`Squad Tag: ${localClanTag.toUpperCase()}`}
                          >
                            [{localClanTag.toUpperCase()}]
                          </span>
                        )}
                        <span>{localDisplayName || 'Jogador'}</span>
                        {localPronouns && <span className="echo-hero-pronoun-tag">{localPronouns}</span>}
                      </div>
                      <div className="echo-hero-handle">
                        @{localDisplayName.toLowerCase().replace(/\s+/g, '_') || 'echo_user'}
                      </div>
                    </div>

                    {/* Community Badges (Prestige Showcase - Sem nível) */}
                    <div className="echo-hero-prestige-block">
                      {localShowBadge && localBadge !== 'none' && (
                        <div className={`echo-prestige-badge badge-${localBadge}`}>
                          {localBadge === 'owner' && <><BadgeCrownIcon style={{ width: '15px', height: '15px' }} /> <span>Líder de Espaço</span></>}
                          {localBadge === 'vip' && <><BadgeVipIcon style={{ width: '15px', height: '15px' }} /> <span>Echo VIP</span></>}
                          {localBadge === 'early' && <><BadgeFounderIcon style={{ width: '15px', height: '15px' }} /> <span>Fundador 2026</span></>}
                          {localBadge === 'gamer' && <><BadgeVeteranIcon style={{ width: '15px', height: '15px' }} /> <span>Membro Veterano</span></>}
                          {localBadge === 'podcaster' && <><BadgeStreamerIcon style={{ width: '15px', height: '15px' }} /> <span>Streamer Oficial</span></>}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status / Activity Quote */}
                  {localCustomStatus && (
                    <div className="echo-hero-status-quote">
                      <span className="echo-status-wave">〰️</span>
                      <span className="echo-status-text">{localCustomStatus}</span>
                    </div>
                  )}

                  {/* Bio Preview */}
                  {localBio && (
                    <p className="echo-hero-bio-snippet">
                      {localBio}
                    </p>
                  )}

                  {/* Connected Socials Showcase */}
                  {(localSocialSteam || localSocialTwitch || localSocialYoutube || localSocialKick) && (
                    <div className="echo-hero-socials-row">
                      {localSocialSteam && (
                        <a 
                          href={localSocialSteam.startsWith('http') ? localSocialSteam : `https://steamcommunity.com/id/${localSocialSteam}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="echo-social-link-btn steam" 
                          title={`Steam: ${localSocialSteam}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SteamIcon style={{ width: '13px', height: '13px' }} />
                          <span>Steam</span>
                        </a>
                      )}
                      {localSocialTwitch && (
                        <a 
                          href={localSocialTwitch.startsWith('http') ? localSocialTwitch : `https://twitch.tv/${localSocialTwitch}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="echo-social-link-btn twitch" 
                          title={`Twitch: ${localSocialTwitch}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TwitchIcon style={{ width: '13px', height: '13px' }} />
                          <span>Twitch</span>
                        </a>
                      )}
                      {localSocialYoutube && (
                        <a 
                          href={localSocialYoutube.startsWith('http') ? localSocialYoutube : `https://youtube.com/@${localSocialYoutube.replace('@', '')}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="echo-social-link-btn youtube" 
                          title={`YouTube: ${localSocialYoutube}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <YoutubeIcon style={{ width: '13px', height: '13px' }} />
                          <span>YouTube</span>
                        </a>
                      )}
                      {localSocialKick && (
                        <a 
                          href={localSocialKick.startsWith('http') ? localSocialKick : `https://kick.com/${localSocialKick}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="echo-social-link-btn kick" 
                          title={`Kick: ${localSocialKick}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <KickIcon style={{ width: '13px', height: '13px' }} />
                          <span>Kick</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modular Customization Controls (Ergonomia limpa do Discord) */}
            <div className="echo-editor-card">
              <div className="echo-editor-nav">
                <button
                  type="button"
                  className={`echo-editor-tab-btn ${profileSubTab === 'identity' ? 'active' : ''}`}
                  onClick={() => setProfileSubTab('identity')}
                >
                  <UserIcon style={{ width: '16px', height: '16px' }} />
                  <span>Identidade & Presença</span>
                </button>
                <button
                  type="button"
                  className={`echo-editor-tab-btn ${profileSubTab === 'appearance' ? 'active' : ''}`}
                  onClick={() => setProfileSubTab('appearance')}
                >
                  <PaletteIcon style={{ width: '16px', height: '16px' }} />
                  <span>Estilo Visual (Avatar & Capa)</span>
                </button>
                <button
                  type="button"
                  className={`echo-editor-tab-btn ${profileSubTab === 'badges' ? 'active' : ''}`}
                  onClick={() => setProfileSubTab('badges')}
                >
                  <SparklesIcon style={{ width: '16px', height: '16px' }} />
                  <span>Insígnias da Comunidade</span>
                </button>
              </div>

              {/* Tab 1: Identidade & Presença */}
              {profileSubTab === 'identity' && (
                <div className="echo-editor-tab-body">
                  <div className="echo-form-row two-cols">
                    <div className="echo-input-group">
                      <label className="echo-input-label">NOME DE EXIBIÇÃO</label>
                      <input 
                        value={localDisplayName} 
                        onChange={(e) => setLocalDisplayName(e.target.value)} 
                        placeholder="Como você quer ser chamado"
                        required 
                        minLength={2}
                        maxLength={40}
                        className="echo-text-input"
                      />
                      <span className="echo-input-desc">Este é o nome visível em todas as conversas e canais.</span>
                    </div>

                    <div className="echo-input-group">
                      <label className="echo-input-label">PRONOMES</label>
                      <input 
                        value={localPronouns} 
                        onChange={(e) => setLocalPronouns(e.target.value)} 
                        placeholder="ex: ele/dele, ela/dela"
                        maxLength={20}
                        className="echo-text-input"
                      />
                      <span className="echo-input-desc">Opcional. Exibido ao lado do seu nome.</span>
                    </div>
                  </div>

                  <div className="echo-input-group">
                    <label className="echo-input-label">STATUS DE PRESENÇA</label>
                    <div className="echo-presence-picker">
                      {[
                        { id: 'online', label: 'Disponível', desc: 'Visível e pronto para conversar', color: '#10b981' },
                        { id: 'idle', label: 'Ausente', desc: 'Inativo ou afastado do teclado', color: '#f59e0b' },
                        { id: 'dnd', label: 'Não Perturbe', desc: 'Silencia notificações sonoras', color: '#ef4444' },
                        { id: 'offline', label: 'Invisível', desc: 'Aparece desconectado para os outros', color: '#6b7280' }
                      ].map(st => (
                        <button
                          key={st.id}
                          type="button"
                          className={`echo-presence-option ${localPresenceStatus === st.id ? 'active' : ''}`}
                          onClick={() => setLocalPresenceStatus(st.id as any)}
                        >
                          <span className="echo-presence-dot" style={{ background: st.color, boxShadow: localPresenceStatus === st.id ? `0 0 10px ${st.color}` : 'none' }} />
                          <div className="echo-presence-text">
                            <strong>{st.label}</strong>
                            <span>{st.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="echo-input-group">
                    <label className="echo-input-label">MENSAGEM DE ATIVIDADE (STATUS PERSONALIZADO)</label>
                    <input 
                      value={localCustomStatus} 
                      onChange={(e) => setLocalCustomStatus(e.target.value)} 
                      placeholder="Ex: Jogando ranked, ouvindo lofi, criando conteúdo..."
                      maxLength={100}
                      className="echo-text-input"
                    />
                    <span className="echo-input-desc">Uma frase curta exibida no balão [ 〰️ ] abaixo do seu nome no perfil. Deixe em branco se preferir não exibir nenhum status.</span>
                  </div>

                  <div className="echo-input-group">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">SOBRE MIM (BIOGRAFIA)</label>
                      <span className="echo-char-counter">{localBio.length}/200</span>
                    </div>
                    <textarea 
                      value={localBio} 
                      onChange={(e) => setLocalBio(e.target.value.slice(0, 200))} 
                      placeholder="Conte um pouco sobre você, seus interesses, jogos ou estilo..."
                      className="echo-textarea-input"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Estilo Visual (Avatar & Capa) */}
              {profileSubTab === 'appearance' && (
                <div className="echo-editor-tab-body">
                  {/* Foto de Perfil */}
                  <div className="echo-appearance-block">
                    <label className="echo-input-label">FOTO DE PERFIL (AVATAR)</label>
                    <div className="echo-avatar-uploader-row">
                      <div 
                        className="echo-avatar-uploader-thumb" 
                        onClick={() => avatarFileInputRef.current?.click()}
                        title="Clique para trocar imagem"
                      >
                        {localAvatarUrl ? (
                          <img src={localAvatarUrl} alt="Avatar" />
                        ) : (
                          localDisplayName.slice(0, 1).toUpperCase()
                        )}
                        <div className="echo-avatar-thumb-overlay">
                          <CameraIcon style={{ width: '18px', height: '18px' }} />
                        </div>
                      </div>

                      <div className="echo-avatar-uploader-controls">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            value={localAvatarUrl} 
                            onChange={(e) => setLocalAvatarUrl(e.target.value)} 
                            placeholder="Insira a URL de uma imagem (.png, .jpg, .gif)"
                            className="echo-text-input"
                            style={{ flex: 1 }}
                          />
                          <button 
                            type="button" 
                            className="echo-btn-secondary" 
                            onClick={() => avatarFileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                          >
                            <CameraIcon style={{ width: '14px', height: '14px' }} />
                            <span>{uploadingAvatar ? 'Enviando...' : 'Fazer Upload'}</span>
                          </button>
                        </div>

                        <div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                            Ou selecione um avatar rápido:
                          </span>
                          <div className="echo-quick-avatars-row">
                            {defaultAvatars.map((url, idx) => (
                              <button 
                                key={idx}
                                type="button" 
                                onClick={() => setLocalAvatarUrl(url)}
                                className={`echo-quick-avatar-btn ${localAvatarUrl === url ? 'selected' : ''}`}
                                title={`Avatar ${idx + 1}`}
                              >
                                <img src={url} alt={`Avatar ${idx + 1}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>



                  {/* Capa do Perfil (Banner) */}
                  <div className="echo-appearance-block">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">CAPA DO PERFIL (BANNER PANORÂMICO)</label>
                      <span className="echo-input-desc">Selecione uma textura ou escolha uma imagem do seu computador</span>
                    </div>
                    <div className="echo-banner-grid">
                      {[
                        { id: 'synthwave', name: 'Synthwave 🌌' },
                        { id: 'cybergrid', name: 'Cyber Grid ⚡' },
                        { id: 'carbon', name: 'Fibra de Carbono 🏎️' },
                        { id: 'aurora', name: 'Aurora Polar 🪐' },
                        { id: 'solar', name: 'Solar Flare 🔥' },
                        { id: 'obsidian', name: 'Stealth Obsidian 🖤' },
                      ].map(tex => (
                        <div 
                          key={tex.id}
                          className={`echo-banner-option texture-${tex.id} ${localBannerPreset === tex.id && !localBannerCustom ? 'active' : ''}`}
                          onClick={() => { setLocalBannerPreset(tex.id); setLocalBannerCustom(''); }}
                        >
                          <span className="echo-banner-option-title">{tex.name}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                      <input 
                        value={localBannerCustom} 
                        onChange={(e) => setLocalBannerCustom(e.target.value)} 
                        placeholder="Ou cole a URL de um banner customizado (.png, .jpg, .gif)"
                        className="echo-text-input"
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        className="echo-btn-secondary" 
                        onClick={() => bannerFileInputRef.current?.click()}
                        disabled={uploadingBanner}
                      >
                        <FolderIcon style={{ width: '14px', height: '14px' }} />
                        <span>{uploadingBanner ? 'Carregando...' : 'Escolher do Computador'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Tag de Squad / Clan */}
                  <div className="echo-appearance-block">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">TAG DE SQUAD / CLAN</label>
                      <span className="echo-input-desc">Sigla de 2 a 4 caracteres exibida ao lado do seu nome</span>
                    </div>
                    <div className="echo-clan-tag-editor-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input 
                        value={localClanTag} 
                        onChange={(e) => setLocalClanTag(e.target.value.toUpperCase().slice(0, 4))} 
                        placeholder="Ex: ECHO"
                        maxLength={4}
                        className="echo-text-input"
                        style={{ maxWidth: '130px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Cor da Tag:</span>
                        {[
                          { color: '#00f2fe', label: 'Ciano' },
                          { color: '#ff4655', label: 'Carmesim' },
                          { color: '#fbbf24', label: 'Ouro' },
                          { color: '#a855f7', label: 'Ametista' },
                          { color: '#10b981', label: 'Esmeralda' },
                          { color: '#ffffff', label: 'Prata' }
                        ].map(c => (
                          <button
                            key={c.color}
                            type="button"
                            className={`echo-clan-color-dot ${localClanTagColor === c.color ? 'active' : ''}`}
                            style={{ background: c.color, width: '22px', height: '22px', borderRadius: '50%', border: localClanTagColor === c.color ? '2px solid #fff' : '2px solid transparent', cursor: 'pointer', boxShadow: localClanTagColor === c.color ? `0 0 8px ${c.color}` : 'none' }}
                            onClick={() => setLocalClanTagColor(c.color)}
                            title={c.label}
                          />
                        ))}
                      </div>
                      {localClanTag && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Prévia:</span>
                          <span className="echo-clan-tag" style={{ borderColor: localClanTagColor, color: localClanTagColor, boxShadow: `0 0 8px ${localClanTagColor}40` }}>
                            [{localClanTag.toUpperCase()}]
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Vitrine de Redes Sociais Conectadas */}
                  <div className="echo-appearance-block">
                    <div className="echo-label-with-counter">
                      <label className="echo-input-label">REDES SOCIAIS & PLATAFORMAS CONECTADAS</label>
                      <span className="echo-input-desc">Links rápidos de exibição no seu cartão do perfil</span>
                    </div>
                    <div className="echo-socials-inputs-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                      <div className="echo-social-input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <SteamIcon style={{ width: '16px', height: '16px', color: '#90a4ae', flexShrink: 0 }} />
                        <input 
                          value={localSocialSteam} 
                          onChange={(e) => setLocalSocialSteam(e.target.value)} 
                          placeholder="Steam (username ou url)"
                          className="echo-text-input"
                          style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '12.5px' }}
                        />
                      </div>
                      <div className="echo-social-input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <TwitchIcon style={{ width: '16px', height: '16px', color: '#a855f7', flexShrink: 0 }} />
                        <input 
                          value={localSocialTwitch} 
                          onChange={(e) => setLocalSocialTwitch(e.target.value)} 
                          placeholder="Twitch (username)"
                          className="echo-text-input"
                          style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '12.5px' }}
                        />
                      </div>
                      <div className="echo-social-input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <YoutubeIcon style={{ width: '16px', height: '16px', color: '#ef4444', flexShrink: 0 }} />
                        <input 
                          value={localSocialYoutube} 
                          onChange={(e) => setLocalSocialYoutube(e.target.value)} 
                          placeholder="YouTube (@canal ou url)"
                          className="echo-text-input"
                          style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '12.5px' }}
                        />
                      </div>
                      <div className="echo-social-input-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <KickIcon style={{ width: '16px', height: '16px', color: '#10b981', flexShrink: 0 }} />
                        <input 
                          value={localSocialKick} 
                          onChange={(e) => setLocalSocialKick(e.target.value)} 
                          placeholder="Kick (username)"
                          className="echo-text-input"
                          style={{ border: 'none', background: 'transparent', padding: '0', fontSize: '12.5px' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Insígnias da Comunidade */}
              {profileSubTab === 'badges' && (
                <div className="echo-editor-tab-body">
                  <div className="echo-toggle-card">
                    <div className="echo-toggle-card-info">
                      <strong>Exibir Insígnia em Destaque</strong>
                      <span>Mostra sua insígnia de honra ao lado do seu nome no perfil e na lista de membros.</span>
                    </div>
                    <label className="echo-switch">
                      <input 
                        type="checkbox" 
                        checked={localShowBadge} 
                        onChange={(e) => setLocalShowBadge(e.target.checked)} 
                      />
                      <span className="echo-slider" />
                    </label>
                  </div>

                  <div className="echo-input-group" style={{ opacity: localShowBadge ? 1 : 0.45, pointerEvents: localShowBadge ? 'auto' : 'none' }}>
                    <label className="echo-input-label">ESCOLHA SUA INSÍGNIA DE DESTAQUE</label>
                    <div className="echo-badges-selection-grid">
                      {badgesList.map(b => (
                        <div
                          key={b.id}
                          className={`echo-badge-choice-card ${localBadge === b.id ? 'active' : ''} ${!b.unlocked ? 'locked' : ''}`}
                          onClick={() => {
                            if (b.unlocked) {
                              setLocalBadge(b.id)
                            } else {
                              alert(`Insígnia Bloqueada!\n\nCritério: ${b.requirement}\n\nVocê pode habilitar o "Modo Demonstração" abaixo para testar todas as insígnias localmente.`)
                            }
                          }}
                        >
                          <div className={`echo-badge-crest-box crest-${b.id}`}>
                            {b.icon}
                          </div>
                          <div className="echo-badge-choice-meta">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <strong>{b.label}</strong>
                              {b.unlocked ? (
                                <span className="echo-badge-status-pill unlocked">✓ Desbloqueado</span>
                              ) : (
                                <span className="echo-badge-status-pill locked">
                                  <LockIcon style={{ width: '10px', height: '10px', display: 'inline', marginRight: '3px' }} />
                                  Bloqueado
                                </span>
                              )}
                            </div>
                            <span>{b.desc}</span>
                            {!b.unlocked && (
                              <span style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>
                                Requisito: {b.requirement}
                              </span>
                            )}
                          </div>
                          {localBadge === b.id && <span className="echo-badge-check">✓</span>}
                        </div>
                      ))}
                    </div>

                    {/* Local testing toggle for unlocking all badges */}
                    <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(99, 102, 241, 0.08)', border: '1px dashed rgba(99, 102, 241, 0.3)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '12.5px', color: '#a5b4fc', display: 'block' }}>🛠️ Modo Demonstração (Liberar Todas para Teste Local)</strong>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Ative para desbloquear e testar qualquer insígnia sem restrição de requisitos.</span>
                      </div>
                      <label className="echo-switch">
                        <input 
                          type="checkbox" 
                          checked={devUnlockBadges} 
                          onChange={(e) => setDevUnlockBadges(e.target.checked)} 
                        />
                        <span className="echo-slider" />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Save Bar (Slide up when changes are detected) */}
            {hasChanges && (
              <div className="profile-floating-save-bar">
                <div className="floating-bar-info">
                  <span className="floating-bar-alert-dot" />
                  <span>Você tem alterações não salvas no seu perfil!</span>
                </div>
                <div className="floating-bar-actions">
                  <button 
                    type="button" 
                    className="floating-discard-btn" 
                    onClick={handleDiscardChanges}
                    disabled={savingProfile}
                  >
                    Redefinir
                  </button>
                  <button 
                    type="button" 
                    className="floating-save-btn" 
                    onClick={() => handleSaveProfile()}
                    disabled={savingProfile}
                  >
                    <SaveIcon style={{ width: '16px', height: '16px' }} />
                    <span>{savingProfile ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSettingsTab === 'inventory' && (
          <div className="settings-container echo-inventory-settings-pane" style={{ maxWidth: '100%', padding: '24px 32px' }}>
            <CosmeticsInventory
              userId={userId}
              displayName={localDisplayName || currentDisplayName}
              avatarUrl={localAvatarUrl || currentAvatarUrl}
              currentDecoration={avatarDecoration || ''}
              currentProfileEffect={profileEffect || ''}
              currentAvatarFrame={localAvatarFrame || avatarFrame || 'aura-cyan'}
              currentCardFinish={localCardFinish || cardFinish || 'none'}
              clanTag={localClanTag}
              clanTagColor={localClanTagColor}
              bio={localBio}
              bannerPreset={localBannerPreset}
              bannerCustom={localBannerCustom}
              onEquipDecoration={async (id) => {
                if (onEquipDecoration) await onEquipDecoration(id)
              }}
              onEquipProfileEffect={async (id) => {
                if (onEquipProfileEffect) await onEquipProfileEffect(id)
              }}
              onEquipAvatarFrame={(id) => {
                setLocalAvatarFrame(id)
                if (onEquipAvatarFrame) onEquipAvatarFrame(id)
                localStorage.setItem(`echo-avatar-frame-${userId}`, id)
              }}
              onEquipCardFinish={(id) => {
                setLocalCardFinish(id as any)
                if (onEquipCardFinish) onEquipCardFinish(id)
                localStorage.setItem(`echo-card-finish-${userId}`, id)
              }}
              currentNameEffect={nameEffect || 'resonance_cyan'}
              onEquipNameEffect={(id) => {
                if (onEquipNameEffect) onEquipNameEffect(id)
              }}
              onOpenShop={(targetTab) => {
                if (onOpenShop) onOpenShop(targetTab)
              }}
            />
          </div>
        )}

        {activeSettingsTab === 'subscription' && (
          <SubscriptionTab
            isPremiumUser={isPremiumUser}
            onSimulateSubscription={onSimulateSubscription}
            onResetSubscription={onResetSubscription}
            userEmail={userEmail}
            userName={localDisplayName || profileDisplayName || currentDisplayName}
            onSubscriptionSuccess={onSubscriptionSuccess}
          />
        )}

        {activeSettingsTab === 'audio' && (
          <AudioVideoTab
            audioInputs={audioInputs}
            audioOutputs={audioOutputs}
            selectedInputId={selectedInputId}
            selectedOutputId={selectedOutputId}
            onInputDeviceChange={onInputDeviceChange}
            onOutputDeviceChange={onOutputDeviceChange}
            audioError={audioError}
            onRefreshDevices={onRefreshDevices}
            noiseSuppressionEnabled={noiseSuppressionEnabled}
            echoCancellationEnabled={echoCancellationEnabled}
            onNoiseSuppressionChange={onNoiseSuppressionChange}
            onEchoCancellationChange={onEchoCancellationChange}
            sfxVolume={sfxVolume}
            onSfxVolumeChange={onSfxVolumeChange}
            noiseGateEnabled={noiseGateEnabled}
            noiseGateThreshold={noiseGateThreshold}
            onNoiseGateEnabledChange={onNoiseGateEnabledChange}
            onNoiseGateThresholdChange={onNoiseGateThresholdChange}
            spatialAudioEnabled={spatialAudioEnabled}
            onToggleSpatialAudio={onToggleSpatialAudio}
            onResetAllPans={onResetAllPans}
            isAiDenoiseEnabled={isAiDenoiseEnabled}
            onToggleAiDenoise={onToggleAiDenoise}
            pttModeSetting={pttModeSetting}
            onPttModeChange={onPttModeChange}
            pttKey={pttKey}
            onPttKeyChange={onPttKeyChange}
            onToggleOverlay={onToggleOverlay}
          />
        )}

        {activeSettingsTab === 'appearance' && (
          <AppearanceTab
            theme={theme}
            selectTheme={selectTheme}
            isPremiumUser={isPremiumUser}
            customAccentColor={customAccentColor}
            onCustomAccentColorChange={onCustomAccentColorChange}
            chatDensity={chatDensity}
            onChatDensityChange={onChatDensityChange}
            performanceMode={performanceMode}
            onPerformanceModeChange={onPerformanceModeChange}
          />
        )}

        {activeSettingsTab === 'windows' && (
          <WindowsTab onToggleOverlay={onToggleOverlay} />
        )}

        {activeSettingsTab === 'changelog' && (
          <div className="settings-content-card" style={{ padding: '0', background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <WhatsNewModal isOpen={true} isEmbedded={true} />
          </div>
        )}
      </section>
    </section>
  )
}

