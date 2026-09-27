import { useEffect, useMemo, useRef, useState } from 'react'
import type { Channel } from '../types'
import { isMusicBotIdentity } from '../lib/musicBotState'
import { useMusicBotStore } from '../stores/useMusicBotStore'
import {
  diffVoiceUsers,
  summarizeCall,
  type CallSummary,
  type VoiceFeedEvent,
  type VoiceSnapshot,
  type VoiceUserLite
} from '../lib/voiceActivity'

const MAX_EVENTS = 30

interface UseVoiceActivityOptions {
  spaceId: string | undefined
  channels: Channel[]
  spaceVoiceUsers: Record<string, VoiceUserLite[]>
  /** Chamada em que a própria pessoa está conectada e quem o LiveKit mostra nela */
  activeVoiceChannelId: string | null
  participants: VoiceUserLite[]
  selfId: string | undefined
  presenceData: Record<string, any>
}

const gameNameOf = (presence: any): string | null => {
  if (!presence) return null
  const game = presence.current_game ?? presence.game_presence
  if (!game) return null
  const name = typeof game === 'string' ? game : game.name
  return typeof name === 'string' && name.trim() ? name.trim() : null
}

/**
 * Resumo da chamada em andamento no espaço (para a faixa no topo do chat) e eventos de voz (entrou, saiu,
 * o bot tocou) para o meio da conversa. Os eventos só existem enquanto o app está aberto: não são gravados.
 */
export function useVoiceActivity({
  spaceId,
  channels,
  spaceVoiceUsers,
  activeVoiceChannelId,
  participants,
  selfId,
  presenceData
}: UseVoiceActivityOptions): { summary: CallSummary | null; events: VoiceFeedEvent[] } {
  const voiceChannels = useMemo(
    () => channels.filter((c) => c.type === 'voice').map((c) => ({ id: c.id, name: c.name })),
    [channels]
  )

  const usersByChannel = useMemo(() => {
    const result: Record<string, VoiceUserLite[]> = {}
    voiceChannels.forEach((channel) => {
      const map = new Map<string, VoiceUserLite>()
      if (channel.id === activeVoiceChannelId) participants.forEach((p) => map.set(p.userId, p))
      ;(spaceVoiceUsers[channel.id] || []).forEach((p) => {
        if (p.userId && !map.has(p.userId)) map.set(p.userId, p)
      })
      // O bot de música tem o próprio cartão (mini player); não conta como "gente na call"
      result[channel.id] = [...map.values()].filter((p) => !isMusicBotIdentity(p.userId))
    })
    return result
  }, [voiceChannels, spaceVoiceUsers, activeVoiceChannelId, participants])

  const summary = useMemo(
    () => summarizeCall(voiceChannels, usersByChannel, activeVoiceChannelId, (userId) => gameNameOf(presenceData[userId])),
    [voiceChannels, usersByChannel, activeVoiceChannelId, presenceData]
  )

  // ── Eventos: diferença entre um retrato das chamadas e o anterior ─────────────────────────────
  const [events, setEvents] = useState<VoiceFeedEvent[]>([])
  const previousRef = useRef<VoiceSnapshot | null>(null)
  const spaceRef = useRef<string | undefined>(spaceId)

  useEffect(() => {
    if (spaceRef.current !== spaceId) {
      spaceRef.current = spaceId
      previousRef.current = null
      setEvents([])
    }
  }, [spaceId])

  const snapshot = useMemo<VoiceSnapshot>(() => {
    const result: VoiceSnapshot = {}
    Object.entries(usersByChannel).forEach(([channelId, users]) => {
      if (users.length === 0) return
      result[channelId] = Object.fromEntries(users.map((u) => [u.userId, u.displayName]))
    })
    return result
  }, [usersByChannel])
  const snapshotKey = JSON.stringify(snapshot)

  useEffect(() => {
    const previous = previousRef.current
    previousRef.current = snapshot
    // A primeira leitura é só o ponto de partida: quem já estava na call não vira "entrou"
    if (!previous || spaceRef.current !== spaceId) return
    const names = Object.fromEntries(voiceChannels.map((c) => [c.id, c.name]))
    const fresh = diffVoiceUsers(previous, snapshot, names, selfId, Date.now())
    if (fresh.length > 0) setEvents((prev) => [...prev, ...fresh].slice(-MAX_EVENTS))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotKey])

  // ── Evento do bot: quando muda a música que ele está tocando (só na chamada em que estou) ────────
  const currentTitle = useMusicBotStore((s) => s.state?.current?.title ?? null)
  const lastTitleRef = useRef<string | null>(null)
  const titleInitializedRef = useRef(false)
  useEffect(() => {
    const title = currentTitle
    const previousTitle = lastTitleRef.current
    lastTitleRef.current = title
    // A primeira leitura é só o ponto de partida: uma música que já estava tocando não vira evento
    if (!titleInitializedRef.current) {
      titleInitializedRef.current = true
      return
    }
    if (!title || title === previousTitle) return
    setEvents((prev) => [...prev, { id: `music-${Date.now()}`, at: Date.now(), kind: 'music' as const, text: `O bot tocou "${title}"` }].slice(-MAX_EVENTS))
  }, [currentTitle])

  return { summary, events }
}
