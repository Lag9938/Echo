import { useState, useRef, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'

export interface UseEchoGlobalPresenceOptions {
  user: User
  profileDisplayName: string
  displayName: string
  avatarDecoration?: string
  profileEffect?: string
  myGamePresence?: any
  myGamePresenceRef?: React.MutableRefObject<any>
  getMyGamePresence?: () => any
  presenceChannelRef?: React.MutableRefObject<any>
  supabase: any
  activeVoiceChannelIdRef?: React.MutableRefObject<string | null>
  activeVoiceSpaceIdRef?: React.MutableRefObject<string | null>
}

export function useEchoGlobalPresence({
  user,
  profileDisplayName,
  displayName,
  avatarDecoration,
  profileEffect,
  myGamePresence,
  myGamePresenceRef,
  getMyGamePresence,
  presenceChannelRef: externalPresenceChannelRef,
  supabase,
  activeVoiceChannelIdRef,
  activeVoiceSpaceIdRef
}: UseEchoGlobalPresenceOptions) {
  const [presenceData, setPresenceData] = useState<Record<string, any>>({})
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const internalPresenceChannelRef = useRef<any>(null)
  const presenceChannelRef = externalPresenceChannelRef || internalPresenceChannelRef

  const handleGlobalPresenceUpdate = useCallback(() => {
    const presenceChannel = presenceChannelRef.current
    if (!presenceChannel) return

    const state = presenceChannel.presenceState()
    const online = new Set<string>()
    const pData: Record<string, any> = {}
    
    Object.keys(state).forEach(key => {
      const userPresence = state[key]
      if (userPresence && userPresence.length > 0) {
        const merged: any = {}
        for (const item of userPresence) {
          Object.assign(merged, item)
        }
        if (!merged.current_game && !merged.game_presence) {
          for (let i = userPresence.length - 1; i >= 0; i--) {
            if (userPresence[i].current_game || userPresence[i].game_presence) {
              merged.current_game = userPresence[i].current_game
              merged.game_presence = userPresence[i].game_presence
              break
            }
          }
        }
        const uid = merged.user_id || key
        pData[key] = merged
        pData[uid] = merged
        if (merged.presence_status !== 'invisible') {
          online.add(key)
          online.add(uid)
        }
      }
    })

    const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true')
    if (isMock) {
      online.add('friend-valkyrie')
      online.add('friend-gaming')
      pData['friend-valkyrie'] = {
        presence_status: 'online',
        custom_status: 'Disponível',
        avatar_decoration: 'cyber_hud'
      }
      pData['friend-gaming'] = {
        presence_status: 'online',
        custom_status: 'Jogando Cyberpunk 2077',
        current_game: { name: 'Cyberpunk 2077' },
        avatar_decoration: 'fire_storm'
      }
    }

    setPresenceData(prev => {
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(pData)
      if (prevKeys.length === nextKeys.length) {
        let same = true
        for (const k of nextKeys) {
          const oldP = prev[k]
          const newP = pData[k]
          const oldGameName = oldP?.current_game?.name || oldP?.game_presence?.name || (typeof oldP?.current_game === 'string' ? oldP.current_game : null)
          const newGameName = newP?.current_game?.name || newP?.game_presence?.name || (typeof newP?.current_game === 'string' ? newP.current_game : null)
          const oldGameStart = oldP?.current_game?.startedAt || oldP?.game_presence?.startedAt || null
          const newGameStart = newP?.current_game?.startedAt || newP?.game_presence?.startedAt || null

          if (
            !oldP || 
            oldP.presence_status !== newP?.presence_status || 
            oldP.custom_status !== newP?.custom_status || 
            oldP.avatar_decoration !== newP?.avatar_decoration || 
            oldP.profile_effect !== newP?.profile_effect || 
            oldP.banner_custom !== newP?.banner_custom ||
            oldP.banner_preset !== newP?.banner_preset ||
            oldP.name_effect !== newP?.name_effect ||
            oldP.badge !== newP?.badge ||
            oldGameName !== newGameName ||
            oldGameStart !== newGameStart
          ) {
            same = false
            break
          }
        }
        if (same) return prev
      }
      return pData
    })

    setOnlineUsers(prev => {
      if (prev.size === online.size) {
        let same = true
        for (const id of online) {
          if (!prev.has(id)) {
            same = false
            break
          }
        }
        if (same) return prev
      }
      return online
    })
  }, [])

  const trackMyPresence = useCallback(async () => {
    const presenceChannel = presenceChannelRef.current
    if (!presenceChannel) return

    const savedStatus = localStorage.getItem('echo-custom-status') || ''
    const savedPresStatus = localStorage.getItem('echo-presence-status') || 'online'
    const savedDecoration = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || localStorage.getItem('echo-avatar-decoration') || avatarDecoration || ''
    const savedEffect = localStorage.getItem(`echo-profile-effect-${user.id}`) || localStorage.getItem('echo-profile-effect') || profileEffect || ''
    const rawBannerCustom = localStorage.getItem(`echo-banner-custom-${user.id}`) || localStorage.getItem('echo-banner-custom') || ''
    const safeBannerUrl = (rawBannerCustom && !rawBannerCustom.startsWith('data:') && rawBannerCustom.length < 2048) ? rawBannerCustom : ''
    const savedBannerPreset = localStorage.getItem(`echo-banner-preset-${user.id}`) || localStorage.getItem('echo-banner-preset') || 'synthwave'
    const currentGameData = myGamePresenceRef?.current !== undefined 
      ? myGamePresenceRef.current 
      : (myGamePresence !== undefined ? myGamePresence : (getMyGamePresence ? getMyGamePresence() : null))
    const gameData = savedPresStatus === 'invisible' ? null : (currentGameData || null)
    const voiceChanId = activeVoiceChannelIdRef?.current || null
    const voiceSpId = activeVoiceSpaceIdRef?.current || null
    const curNameEff = localStorage.getItem(`echo-name-effect-${user.id}`) || 'resonance_cyan'
    const curRawBadge = localStorage.getItem(`echo-badge-${user.id}`) || 'owner'
    const curShowBadge = localStorage.getItem(`echo-show-badge-${user.id}`) !== 'false'
    const curActiveBadge = curShowBadge ? curRawBadge : 'none'

    await presenceChannel.track({
      user_id: user.id,
      display_name: profileDisplayName || displayName,
      online_at: new Date().toISOString(),
      custom_status: savedStatus,
      presence_status: savedPresStatus,
      avatar_decoration: savedDecoration,
      profile_effect: savedEffect,
      name_effect: curNameEff,
      badge: curActiveBadge,
      banner_custom: safeBannerUrl,
      banner_preset: savedBannerPreset,
      banner_url: safeBannerUrl,
      current_game: gameData,
      game_presence: gameData,
      voice_channel_id: voiceChanId,
      voice_space_id: voiceSpId
    }).catch(() => {})
  }, [user.id, profileDisplayName, displayName, avatarDecoration, profileEffect, myGamePresence])

  const trackMyPresenceRef = useRef(trackMyPresence)
  trackMyPresenceRef.current = trackMyPresence

  // Atualiza metadados de presença quando perfil/jogo mudar, SEM destruir o canal
  useEffect(() => {
    if (presenceChannelRef.current) {
      trackMyPresenceRef.current()
    }
  }, [profileDisplayName, displayName, avatarDecoration, profileEffect, myGamePresence])

  // Ouvir evento de atualização de perfil para re-sincronizar presença (incluindo banner)
  useEffect(() => {
    const handleProfileUpdate = () => {
      if (presenceChannelRef.current) {
        trackMyPresenceRef.current()
      }
    }
    window.addEventListener('echo-profile-updated', handleProfileUpdate)
    window.addEventListener('storage', handleProfileUpdate)
    return () => {
      window.removeEventListener('echo-profile-updated', handleProfileUpdate)
      window.removeEventListener('storage', handleProfileUpdate)
    }
  }, [])

  // Re-sincroniza presença imediatamente ao detectar alteração de jogo
  useEffect(() => {
    const handleGameChange = () => {
      if (presenceChannelRef.current) {
        trackMyPresenceRef.current()
      }
    }
    if ((window as any).electronAPI?.onGameDetected) {
      (window as any).electronAPI.onGameDetected(handleGameChange)
    }
    const storageHandler = (e: StorageEvent) => {
      if (e.key === 'echo-my-game-presence' || e.key === 'echo-custom-status') {
        handleGameChange()
      }
    }
    window.addEventListener('echo-presence-refresh', handleGameChange)
    window.addEventListener('storage', storageHandler)
    return () => {
      window.removeEventListener('echo-presence-refresh', handleGameChange)
      window.removeEventListener('storage', storageHandler)
    }
  }, [])

  useEffect(() => {
    const client = supabase
    if (!client || !user?.id) return

    // Setup global online presence (persistente e estável)
    const presenceChannel = client.channel('global-presence', {
      config: { presence: { key: user.id } }
    })
    presenceChannelRef.current = presenceChannel

    presenceChannel
      .on('presence', { event: 'sync' }, handleGlobalPresenceUpdate)
      .on('presence', { event: 'join' }, handleGlobalPresenceUpdate)
      .on('presence', { event: 'leave' }, handleGlobalPresenceUpdate)
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await trackMyPresenceRef.current()
          handleGlobalPresenceUpdate()
        }
      })

    // Intervalo de redundância de presença global (a cada 30s)
    const presenceKeepAlive = setInterval(() => {
      trackMyPresenceRef.current()
    }, 30000)

    return () => {
      clearInterval(presenceKeepAlive)
      client.removeChannel(presenceChannel)
    }
  }, [supabase, user?.id, handleGlobalPresenceUpdate])

  return {
    presenceData,
    setPresenceData,
    onlineUsers,
    setOnlineUsers,
    presenceChannelRef,
    trackMyPresence,
    handleGlobalPresenceUpdate
  }
}
