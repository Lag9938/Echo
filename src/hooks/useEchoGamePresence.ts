import { useState, useEffect } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { buildPresencePayload } from '../lib/presencePayload'

export interface GamePresenceData {
  name: string
  icon: string
  startedAt: number
}

export interface UseEchoGamePresenceOptions {
  userId: string
  profileDisplayName: string
  getProfileAvatarUrl?: () => string
  avatarDecoration?: string | null
  profileEffect?: string | null
  nameEffect?: string | null
  presenceStatus: 'online' | 'idle' | 'dnd' | 'invisible'
  presenceChannelRef: React.MutableRefObject<RealtimeChannel | null>
  activeVoiceChannelIdRef?: React.MutableRefObject<string | null>
  activeVoiceSpaceIdRef?: React.MutableRefObject<string | null>
}

export function useEchoGamePresence({
  userId,
  profileDisplayName,
  getProfileAvatarUrl,
  avatarDecoration,
  profileEffect,
  nameEffect,
  presenceStatus,
  presenceChannelRef,
  activeVoiceChannelIdRef,
  activeVoiceSpaceIdRef
}: UseEchoGamePresenceOptions) {
  // Rich Presence: My active game (strictly in-memory live process tracking)
  const [myGamePresence, setMyGamePresence] = useState<GamePresenceData | null>(null)

  useEffect(() => {
    // Purge any stale ghost game from localStorage on mount
    try {
      localStorage.removeItem('echo-my-game-presence')
    } catch {}

    // O processo principal e o polling chamam handleGame a cada 5s com o mesmo jogo. Só reage quando muda,
    // senão cada chamada regravava o localStorage e disparava 'echo-presence-refresh' (um track por vez).
    let lastGameKey: string | null = null
    const handleGame = (game: any) => {
      const gameKey = game ? `${game.name}|${game.startedAt}` : ''
      if (gameKey === lastGameKey) return
      lastGameKey = gameKey

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
    // Só pergunta uma vez, ao abrir. Dali em diante o processo principal avisa (onGameDetected) quando o jogo
    // abre ou fecha; perguntar de novo a cada 5s fazia o Windows listar todos os programas em dobro.
    if ((window as any).electronAPI?.checkActiveGame) {
      (window as any).electronAPI.checkActiveGame().then(handleGame).catch(() => handleGame(null))
    }
    return () => {
      if (unsubGame) unsubGame()
    }
  }, [])

  // Auto-broadcast game presence to Supabase presence channel
  useEffect(() => {
    if (presenceChannelRef && presenceChannelRef.current) {
      presenceChannelRef.current.track(buildPresencePayload({
        userId,
        displayName: profileDisplayName,
        avatarUrl: getProfileAvatarUrl ? getProfileAvatarUrl() : undefined,
        presenceStatus,
        game: myGamePresence,
        avatarDecoration,
        profileEffect,
        nameEffect,
        voiceChannelId: activeVoiceChannelIdRef?.current,
        voiceSpaceId: activeVoiceSpaceIdRef?.current
      })).catch(() => {})
    }
  }, [myGamePresence, presenceStatus, profileDisplayName, avatarDecoration, profileEffect, nameEffect, userId, presenceChannelRef])

  return {
    myGamePresence,
    setMyGamePresence
  }
}
