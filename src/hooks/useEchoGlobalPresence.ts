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
  supabase
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
        const p = userPresence[0] as any
        pData[key] = p
        if (p.presence_status !== 'invisible') {
          online.add(key)
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
          if (
            !oldP || 
            oldP.presence_status !== newP?.presence_status || 
            oldP.custom_status !== newP?.custom_status || 
            oldP.avatar_decoration !== newP?.avatar_decoration || 
            oldP.profile_effect !== newP?.profile_effect || 
            oldP.current_game?.name !== newP?.current_game?.name
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
    const currentGameData = myGamePresenceRef?.current !== undefined 
      ? myGamePresenceRef.current 
      : (myGamePresence !== undefined ? myGamePresence : (getMyGamePresence ? getMyGamePresence() : null))
    const gameData = savedPresStatus === 'invisible' ? null : currentGameData

    await presenceChannel.track({
      user_id: user.id,
      display_name: profileDisplayName || displayName,
      online_at: new Date().toISOString(),
      custom_status: savedStatus,
      presence_status: savedPresStatus,
      avatar_decoration: savedDecoration,
      profile_effect: savedEffect,
      current_game: gameData,
      game_presence: gameData
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
