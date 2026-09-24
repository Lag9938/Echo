import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { THEMES } from '../lib/themes'

export interface UseEchoCosmeticsOptions {
  user: User
  getProfileDisplayName?: () => string
  presenceStatus: string
  getMyGamePresence?: () => any
  presenceChannelRef: React.MutableRefObject<any>
  supabase: any
  activeVoiceChannelIdRef?: React.MutableRefObject<string | null>
  activeVoiceSpaceIdRef?: React.MutableRefObject<string | null>
}

export function useEchoCosmetics({
  user,
  getProfileDisplayName,
  presenceStatus,
  getMyGamePresence,
  presenceChannelRef,
  supabase,
  activeVoiceChannelIdRef,
  activeVoiceSpaceIdRef
}: UseEchoCosmeticsOptions) {
  // Avatar Decoration & Profile Effect
  const [avatarDecoration, setAvatarDecoration] = useState<string>(() => {
    return localStorage.getItem(`echo-avatar-decoration-${user.id}`) || localStorage.getItem('echo-avatar-decoration') || ''
  })
  const [profileEffect, setProfileEffect] = useState<string>(() => {
    return localStorage.getItem(`echo-profile-effect-${user.id}`) || localStorage.getItem('echo-profile-effect') || ''
  })

  const [avatarFrame, setAvatarFrame] = useState(() => localStorage.getItem(`echo-avatar-frame-${user.id}`) || 'aura-cyan')
  const [cardFinish, setCardFinish] = useState<'none' | 'holographic' | 'glass' | 'carbon'>(() => (localStorage.getItem(`echo-card-finish-${user.id}`) as any) || 'none')
  const [nameEffect, setNameEffect] = useState<string>(() => localStorage.getItem(`echo-name-effect-${user.id}`) || 'resonance_cyan')
  const [shopInitialTab, setShopInitialTab] = useState<'decorations' | 'profile_effects' | 'auras' | 'finishes' | 'name_effects'>('decorations')
  const [settingsInitialTab, setSettingsInitialTab] = useState<'profile' | 'subscription' | 'inventory' | 'audio' | 'appearance' | 'windows' | 'changelog'>('profile')

  // Theme & Appearance States
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('echo-theme') || 'dark'
  })
  const [isPremiumUser, setIsPremiumUser] = useState<boolean>(() => {
    return localStorage.getItem('echo-premium') === 'true'
  })
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [pendingTheme, setPendingTheme] = useState<string | null>(null)
  const [customAccentColor, setCustomAccentColor] = useState<string>(() => localStorage.getItem('echo-custom-accent') || '')
  const [chatDensity, setChatDensity] = useState<'cozy' | 'compact'>(() => (localStorage.getItem('echo-chat-density') as any) || 'cozy')
  const [performanceMode, setPerformanceMode] = useState<boolean>(() => localStorage.getItem('echo-performance-mode') === 'true')

  // Apply Theme class
  useEffect(() => {
    THEMES.forEach(t => {
      document.body.classList.remove(t.className)
    })
    const activeTheme = THEMES.find(t => t.id === theme)
    if (activeTheme) {
      document.body.classList.add(activeTheme.className)
    }
    localStorage.setItem('echo-theme', theme)
  }, [theme])

  // Custom Accent Color
  useEffect(() => {
    const applyAccent = (color: string) => {
      const clean = color.replace('#', '').trim()
      let r = 0, g = 242, b = 254
      if (clean.length === 6) {
        r = parseInt(clean.slice(0, 2), 16)
        g = parseInt(clean.slice(2, 4), 16)
        b = parseInt(clean.slice(4, 6), 16)
      } else if (clean.length === 3) {
        r = parseInt(clean[0] + clean[0], 16)
        g = parseInt(clean[1] + clean[1], 16)
        b = parseInt(clean[2] + clean[2], 16)
      }

      const light = `rgba(${r}, ${g}, ${b}, 0.16)`
      const glow = `0 0 16px rgba(${r}, ${g}, ${b}, 0.45)`
      const rgbStr = `${r}, ${g}, ${b}`

      document.body.style.setProperty('--accent-color', color, 'important')
      document.body.style.setProperty('--accent-hover', color, 'important')
      document.body.style.setProperty('--accent-light', light, 'important')
      document.body.style.setProperty('--accent-glow', glow, 'important')
      document.body.style.setProperty('--accent-color-rgb', rgbStr, 'important')

      document.documentElement.style.setProperty('--accent-color', color, 'important')
      document.documentElement.style.setProperty('--accent-hover', color, 'important')
      document.documentElement.style.setProperty('--accent-light', light, 'important')
      document.documentElement.style.setProperty('--accent-glow', glow, 'important')
      document.documentElement.style.setProperty('--accent-color-rgb', rgbStr, 'important')
    }

    if (customAccentColor) {
      applyAccent(customAccentColor)
    } else {
      ['--accent-color', '--accent-hover', '--accent-light', '--accent-glow', '--accent-color-rgb'].forEach(prop => {
        document.body.style.removeProperty(prop)
        document.documentElement.style.removeProperty(prop)
      })
    }
    localStorage.setItem('echo-custom-accent', customAccentColor)
  }, [customAccentColor, theme])

  // Chat Density
  useEffect(() => {
    if (chatDensity === 'compact') {
      document.body.classList.add('density-compact')
    } else {
      document.body.classList.remove('density-compact')
    }
    localStorage.setItem('echo-chat-density', chatDensity)
  }, [chatDensity])

  // Performance Mode
  useEffect(() => {
    if (performanceMode) {
      document.body.classList.add('theme-performance-opaque')
    } else {
      document.body.classList.remove('theme-performance-opaque')
    }
    localStorage.setItem('echo-performance-mode', performanceMode ? 'true' : 'false')
  }, [performanceMode])

  // IMPORTANT: Supabase Realtime Presence's track() REPLACES the entire
  // per-connection payload — it does not merge with the previous one.
  // Every equip handler used to send its own narrow subset of fields,
  // so whichever track() call happened to land last would silently wipe
  // out any cosmetic field it didn't include (name effect, badge, banner,
  // voice channel, etc.) for every other connected user. To fix this,
  // all equip handlers now always broadcast the FULL, canonical presence
  // payload, built fresh from localStorage/refs, regardless of which
  // single field actually changed.
  const buildFullPresencePayload = (overrides: Record<string, any> = {}) => {
    const savedPresenceStatus = presenceStatus
    const savedStatus = savedPresenceStatus === 'invisible' ? '' : (localStorage.getItem('echo-custom-status') || '')
    const gameData = savedPresenceStatus === 'invisible' ? null : (getMyGamePresence ? getMyGamePresence() : null)
    const profName = getProfileDisplayName ? getProfileDisplayName() : ''
    const curDeco = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || localStorage.getItem('echo-avatar-decoration') || avatarDecoration || ''
    const curEffect = localStorage.getItem(`echo-profile-effect-${user.id}`) || localStorage.getItem('echo-profile-effect') || profileEffect || ''
    const curNameEff = localStorage.getItem(`echo-name-effect-${user.id}`) || nameEffect || 'resonance_cyan'
    const curShowBadge = localStorage.getItem(`echo-show-badge-${user.id}`) !== 'false'
    const curBadge = curShowBadge ? (localStorage.getItem(`echo-badge-${user.id}`) || 'owner') : 'none'
    const rawBanner = localStorage.getItem(`echo-banner-custom-${user.id}`) || localStorage.getItem('echo-banner-custom') || ''
    const safeBanner = (rawBanner && !rawBanner.startsWith('data:') && rawBanner.length < 2048) ? rawBanner : ''
    const bannerPreset = localStorage.getItem(`echo-banner-preset-${user.id}`) || 'synthwave'
    const voiceChanId = activeVoiceChannelIdRef?.current || null
    const voiceSpId = activeVoiceSpaceIdRef?.current || null

    return {
      user_id: user.id,
      display_name: profName,
      online_at: new Date().toISOString(),
      custom_status: savedStatus,
      presence_status: savedPresenceStatus,
      current_game: gameData,
      game_presence: gameData,
      avatar_decoration: curDeco,
      profile_effect: curEffect,
      name_effect: curNameEff,
      badge: curBadge,
      banner_custom: safeBanner,
      banner_preset: bannerPreset,
      banner_url: safeBanner,
      voice_channel_id: voiceChanId,
      voice_space_id: voiceSpId,
      ...overrides
    }
  }

  const handleEquipDecoration = async (decorationId: string) => {
    const val = decorationId === 'none' ? '' : decorationId
    setAvatarDecoration(val)
    localStorage.setItem(`echo-avatar-decoration-${user.id}`, val)
    localStorage.setItem('echo-avatar-decoration', val)

    try {
      if (supabase && user) {
        await supabase.from('profiles').update({ avatar_decoration: val }).eq('id', user.id)
      }
    } catch (e) {
      console.warn('Unable to persist avatar_decoration in profiles:', e)
    }

    if (presenceChannelRef.current) {
      try {
        await presenceChannelRef.current.track(buildFullPresencePayload({ avatar_decoration: val }))
      } catch (e) {}
    }
  }

  const handleEquipProfileEffect = async (effectId: string) => {
    const val = effectId === 'none' ? '' : effectId
    setProfileEffect(val)
    localStorage.setItem(`echo-profile-effect-${user.id}`, val)
    localStorage.setItem('echo-profile-effect', val)

    try {
      if (supabase && user) {
        await supabase.from('profiles').update({ profile_effect: val }).eq('id', user.id)
      }
    } catch (e) {
      console.warn('Unable to persist profile_effect in profiles:', e)
    }

    if (presenceChannelRef.current) {
      try {
        await presenceChannelRef.current.track(buildFullPresencePayload({ profile_effect: val }))
      } catch (e) {}
    }
  }

  const handleEquipAvatarFrame = (frameId: string) => {
    setAvatarFrame(frameId)
    localStorage.setItem(`echo-avatar-frame-${user.id}`, frameId)
  }

  const handleEquipCardFinish = (finishId: string) => {
    setCardFinish(finishId as any)
    localStorage.setItem(`echo-card-finish-${user.id}`, finishId)
  }

  const handleEquipNameEffect = (effId: string) => {
    setNameEffect(effId)
    try {
      localStorage.setItem(`echo-name-effect-${user.id}`, effId)
      localStorage.setItem('echo-name-effect', effId)
      if (presenceChannelRef.current) {
        presenceChannelRef.current.track(buildFullPresencePayload({ name_effect: effId })).catch(() => {})
      }
    } catch (e) {}
  }

  function selectTheme(themeId: string) {
    const selected = THEMES.find(t => t.id === themeId)
    if (!selected) return

    if (selected.isPremium && !isPremiumUser) {
      setPendingTheme(themeId)
      setShowSubscriptionModal(true)
    } else {
      setTheme(themeId)
    }
  }

  function toggleTheme() {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  // Chamado depois que um pagamento PIX real é confirmado (ver
  // SubscriptionModal/SubscriptionTab: onSubscriptionSuccess). A concessão de
  // is_premium/premium_until já acontece no servidor, com service role, dentro
  // da Edge Function asaas-payment (ação "check-status") — o cliente não tem
  // (e não deve ter) permissão para escrever essas colunas diretamente. Por
  // isso aqui apenas buscamos o valor já gravado pelo servidor para refletir
  // na tela, em vez de tentar escrever (o que falharia silenciosamente).
  const handleSimulateSubscription = async () => {
    setShowSubscriptionModal(false)
    if (pendingTheme) {
      setTheme(pendingTheme)
      setPendingTheme(null)
    }
    if (supabase && user) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('is_premium, premium_until')
          .eq('id', user.id)
          .maybeSingle()
        if (data?.is_premium) {
          setIsPremiumUser(true)
          localStorage.setItem('echo-premium', 'true')
          return
        }
      } catch (e) {
        console.warn('Failed to read is_premium from profiles:', e)
      }
    }
    // Fallback otimista: se não deu pra confirmar com o servidor (ex: offline),
    // ainda refletimos Pro na UI local — o servidor é a fonte da verdade e vai
    // corrigir isso no próximo carregamento do perfil, se estiver errado.
    setIsPremiumUser(true)
    localStorage.setItem('echo-premium', 'true')
  }

  // Desativa o Echo Pro do próprio usuário ("Voltar para Conta Gratuita").
  // Assim como a concessão, isso precisa passar pelo servidor (service role)
  // porque o cliente não tem permissão de escrever is_premium/premium_until
  // diretamente — ver Edge Function asaas-payment, ação "cancel-subscription".
  const handleResetSubscription = async () => {
    setShowSubscriptionModal(false)
    if (supabase && user) {
      try {
        const { error } = await supabase.functions.invoke('asaas-payment', {
          body: { action: 'cancel-subscription' }
        })
        if (error) throw error
      } catch (e) {
        console.warn('Failed to cancel subscription:', e)
        return
      }
    }
    setIsPremiumUser(false)
    localStorage.removeItem('echo-premium')
  }

  return {
    avatarDecoration,
    setAvatarDecoration,
    profileEffect,
    setProfileEffect,
    avatarFrame,
    setAvatarFrame,
    cardFinish,
    setCardFinish,
    nameEffect,
    setNameEffect,
    shopInitialTab,
    setShopInitialTab,
    settingsInitialTab,
    setSettingsInitialTab,
    theme,
    setTheme,
    isPremiumUser,
    setIsPremiumUser,
    showSubscriptionModal,
    setShowSubscriptionModal,
    pendingTheme,
    setPendingTheme,
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
  }
}
