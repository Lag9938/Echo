// Atividade de voz de um espaço para mostrar no chat de texto: o resumo da chamada em andamento (faixa no topo)
// e os eventos (entrou, saiu, o bot tocou) que aparecem no meio da conversa.

export interface VoiceUserLite {
  userId: string
  displayName: string
  avatarUrl?: string
}

/** channelId -> (userId -> nome) */
export type VoiceSnapshot = Record<string, Record<string, string>>

export interface VoiceFeedEvent {
  id: string
  at: number
  kind: 'join' | 'leave' | 'music'
  text: string
}

/** Compara dois retratos das chamadas e devolve o que mudou (sem contar a própria pessoa) */
export function diffVoiceUsers(
  prev: VoiceSnapshot,
  next: VoiceSnapshot,
  channelNames: Record<string, string>,
  selfId: string | undefined,
  now: number
): VoiceFeedEvent[] {
  const events: VoiceFeedEvent[] = []
  const channelIds = new Set([...Object.keys(prev), ...Object.keys(next)])

  channelIds.forEach((channelId) => {
    const before = prev[channelId] || {}
    const after = next[channelId] || {}
    const where = channelNames[channelId] ? ` ${channelNames[channelId]}` : ''

    Object.keys(after).forEach((userId) => {
      if (!(userId in before) && userId !== selfId) {
        events.push({ id: `join-${channelId}-${userId}-${now}`, at: now, kind: 'join', text: `${after[userId]} entrou na call${where}` })
      }
    })
    Object.keys(before).forEach((userId) => {
      if (!(userId in after) && userId !== selfId) {
        events.push({ id: `leave-${channelId}-${userId}-${now}`, at: now, kind: 'leave', text: `${before[userId]} saiu da call${where}` })
      }
    })
  })

  return events
}

export interface CallSummary {
  channelId: string
  channelName: string
  people: VoiceUserLite[]
  /** "lordking e elden jogam VALORANT" (só quando há jogo em andamento) */
  activityText: string | null
}

const listNames = (names: string[]): string => {
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} e ${names[1]}`
  return `${names[0]}, ${names[1]} e mais ${names.length - 2}`
}

/**
 * Escolhe a chamada a destacar: aquela em que a pessoa está, senão a com mais gente. Devolve null se ninguém
 * está em nenhuma. `gameOf` diz o jogo de cada pessoa (ou null).
 */
export function summarizeCall(
  channels: { id: string; name: string }[],
  usersByChannel: Record<string, VoiceUserLite[]>,
  activeChannelId: string | null,
  gameOf: (userId: string) => string | null
): CallSummary | null {
  const populated = channels.filter((c) => (usersByChannel[c.id] || []).length > 0)
  if (populated.length === 0) return null

  const chosen =
    populated.find((c) => c.id === activeChannelId) ||
    populated.reduce((best, c) => ((usersByChannel[c.id] || []).length > (usersByChannel[best.id] || []).length ? c : best))

  const people = usersByChannel[chosen.id] || []
  const byGame = new Map<string, string[]>()
  people.forEach((p) => {
    const game = gameOf(p.userId)
    if (!game) return
    byGame.set(game, [...(byGame.get(game) || []), p.displayName])
  })

  let activityText: string | null = null
  if (byGame.size > 0) {
    // O jogo com mais gente na chamada
    const [game, names] = [...byGame.entries()].sort((a, b) => b[1].length - a[1].length)[0]
    activityText = `${listNames(names)} ${names.length === 1 ? 'joga' : 'jogam'} ${game}`
  }

  return { channelId: chosen.id, channelName: chosen.name, people, activityText }
}
