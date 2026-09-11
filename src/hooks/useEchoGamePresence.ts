import { useState, useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface GamePresenceData {
  name: string
  icon: string
  startedAt: number
}

export interface UseEchoGamePresenceOptions {
  userId: string
  profileDisplayName: string
  avatarDecoration?: string | null
  profileEffect?: string | null
  nameEffect?: string | null
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  presenceChannelRef: React.MutableRefObject<RealtimeChannel | null>
}

export function useEchoGamePresence({
  userId,
  profileDisplayName,
  avatarDecoration,
  profileEffect,
  nameEffect,
  presenceStatus,
  presenceChannelRef
}: UseEchoGamePresenceOptions) {
  // Rich Presence: My active game
  const [myGamePresence, setMyGamePresence] = useState<GamePresenceData | null>(() => {
    try {
      const cached = localStorage.getItem('echo-my-game-presence')
      if (cached) return JSON.parse(cached)
    } catch {}
    return null
  })

  useEffect(() => {
    const handleGame = (game: any) => {
      setMyGamePresence(game)
      try {
        if (game) {
          localStorage.setItem('echo-my-game-presence', JSON.stringify(game))
        } else {
          localStorage.removeItem('echo-my-game-presence')
        }
      } catch {}
    }

    if ((window as any).electronAPI?.onGameDetected) {
      (window as any).electronAPI.onGameDetected(handleGame)
    }
    if ((window as any).electronAPI?.checkActiveGame) {
      (window as any).electronAPI.checkActiveGame().then(handleGame).catch(() => {})
      const pollTimer = setInterval(() => {
        (window as any).electronAPI.checkActiveGame().then(handleGame).catch(() => {})
      }, 5000)
      return () => clearInterval(pollTimer)
    }
  }, [])

  // Auto-broadcast game presence to Supabase presence channel
  useEffect(() => {
    if (presenceChannelRef.current) {
      const savedStatus = presenceStatus === 'invisible' ? '' : (localStorage.getItem('echo-custom-status') || '')
      const gameData = presenceStatus === 'invisible' ? null : myGamePresence
      const curDeco = localStorage.getItem(`echo-avatar-decoration-${userId}`) || avatarDecoration || ''
      const curEff = localStorage.getItem(`echo-profile-effect-${userId}`) || profileEffect || ''
      const curNameEff = localStorage.getItem(`echo-name-effect-${userId}`) || nameEffect || 'resonance_cyan'
      presenceChannelRef.current.track({
        user_id: userId,
        display_name: profileDisplayName,
        online_at: new Date().toISOString(),
        custom_status: savedStatus,
        presence_status: presenceStatus,
        current_game: gameData,
        game_presence: gameData,
        avatar_decoration: curDeco,
        profile_effect: curEff,
        name_effect: curNameEff
      }).catch(() => {})
    }
  }, [myGamePresence, presenceStatus, profileDisplayName, avatarDecoration, profileEffect, nameEffect, userId, presenceChannelRef])

  return {
    myGamePresence,
    setMyGamePresence
  }
}
