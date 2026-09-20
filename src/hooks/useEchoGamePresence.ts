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
  // Rich Presence: My active game (strictly in-memory live process tracking)
  const [myGamePresence, setMyGamePresence] = useState<GamePresenceData | null>(null)

  useEffect(() => {
    // Purge any stale ghost game from localStorage on mount
    try {
      localStorage.removeItem('echo-my-game-presence')
    } catch {}

    const handleGame = (game: any) => {
      setMyGamePresence(prev => {
        const prevName = prev?.name || null
        const newName = game?.name || null
        if (prevName === newName && prev?.startedAt === game?.startedAt) {
          return prev
        }
        return game || null
      })
      try {
        if (game) {
          localStorage.setItem('echo-my-game-presence', JSON.stringify(game))
        } else {
          localStorage.removeItem('echo-my-game-presence')
        }
      } catch {}
      window.dispatchEvent(new CustomEvent('echo-presence-refresh'))
    }

    let unsubGame: (() => void) | undefined
    if ((window as any).electronAPI?.onGameDetected) {
      unsubGame = (window as any).electronAPI.onGameDetected(handleGame)
    }
    let pollTimer: any
    if ((window as any).electronAPI?.checkActiveGame) {
      (window as any).electronAPI.checkActiveGame().then(handleGame).catch(() => handleGame(null))
      pollTimer = setInterval(() => {
        (window as any).electronAPI.checkActiveGame().then(handleGame).catch(() => handleGame(null))
      }, 5000)
    }
    return () => {
      if (unsubGame) unsubGame()
      if (pollTimer) clearInterval(pollTimer)
    }
  }, [])

  // Auto-broadcast game presence to Supabase presence channel
  useEffect(() => {
    if (presenceChannelRef && presenceChannelRef.current) {
      const savedStatus = presenceStatus === 'invisible' ? '' : (localStorage.getItem('echo-custom-status') || '')
      const gameData = presenceStatus === 'invisible' ? null : myGamePresence
      const curDeco = localStorage.getItem(`echo-avatar-decoration-${userId}`) || avatarDecoration || ''
      const curEff = localStorage.getItem(`echo-profile-effect-${userId}`) || profileEffect || ''
      const curNameEff = localStorage.getItem(`echo-name-effect-${userId}`) || nameEffect || 'resonance_cyan'
      const rawBanner = localStorage.getItem(`echo-banner-custom-${userId}`) || localStorage.getItem('echo-banner-custom') || ''
      const safeBanner = (rawBanner && !rawBanner.startsWith('data:') && rawBanner.length < 2048) ? rawBanner : ''
      const preset = localStorage.getItem(`echo-banner-preset-${userId}`) || 'synthwave'
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
        name_effect: curNameEff,
        banner_custom: safeBanner,
        banner_preset: preset,
        banner_url: safeBanner
      }).catch(() => {})
    }
  }, [myGamePresence, presenceStatus, profileDisplayName, avatarDecoration, profileEffect, nameEffect, userId, presenceChannelRef])

  return {
    myGamePresence,
    setMyGamePresence
  }
}
