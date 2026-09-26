// Estado do Bot de Música, publicado pelo próprio bot nos metadados do participante dele no LiveKit
// (veja music-bot/src/state.js — o formato precisa ficar igual nos dois lados).
//
// Vem de fora, então é tratado como dado não confiável: tudo é validado e cortado aqui.

export const MUSIC_BOT_IDENTITY_PREFIX = 'music-bot-'
export const MUSIC_BOT_STATE_VERSION = 1

export type MusicBotStatus = 'loading' | 'playing' | 'paused' | 'idle'

export interface MusicBotTrack {
  title: string
  durationSeconds: number | null
  /** Posição da faixa no instante em que o estado foi publicado */
  positionMs: number
  source: string | null
}

export interface MusicBotQueueItem {
  /** Estável (q1, q2...): o painel remove/promove por id, então o comando não erra se a fila andar */
  id: string | null
  title: string
}

export interface MusicBotHistoryItem {
  title: string
  url: string | null
}

export interface MusicBotState {
  v: number
  status: MusicBotStatus
  /** 0 a 200 (100 = normal) */
  volume: number
  current: MusicBotTrack | null
  queue: MusicBotQueueItem[]
  /** Total real da fila (a lista publicada é cortada em 30 itens) */
  queueTotal: number
  history: MusicBotHistoryItem[]
}

const STATUSES: ReadonlySet<string> = new Set(['loading', 'playing', 'paused', 'idle'])
const MAX_QUEUE = 50
const MAX_HISTORY = 20
const MAX_TEXT = 200

export function isMusicBotIdentity(identity: string | null | undefined): boolean {
  return typeof identity === 'string' && identity.startsWith(MUSIC_BOT_IDENTITY_PREFIX)
}

const asText = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.slice(0, MAX_TEXT) : fallback

const asNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

/** Interpreta os metadados do bot. Devolve null se estiverem vazios, inválidos ou de outra versão. */
export function parseMusicBotState(raw: string | null | undefined): MusicBotState | null {
  if (!raw) return null

  let data: any
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object' || data.v !== MUSIC_BOT_STATE_VERSION) return null

  const currentRaw = data.current
  const current: MusicBotTrack | null =
    currentRaw && typeof currentRaw === 'object'
      ? {
          title: asText(currentRaw.title, 'Música'),
          durationSeconds: (() => {
            const seconds = asNumber(currentRaw.durationSeconds, 0)
            return seconds > 0 ? seconds : null
          })(),
          positionMs: Math.max(0, asNumber(currentRaw.positionMs, 0)),
          source: typeof currentRaw.source === 'string' ? currentRaw.source : null
        }
      : null

  const queue: MusicBotQueueItem[] = (Array.isArray(data.queue) ? data.queue : [])
    .slice(0, MAX_QUEUE)
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      id: typeof item.id === 'string' && /^q\d+$/i.test(item.id) ? item.id.toLowerCase() : null,
      title: asText(item.title, 'Música')
    }))

  const history: MusicBotHistoryItem[] = (Array.isArray(data.history) ? data.history : [])
    .slice(0, MAX_HISTORY)
    .filter((item: any) => item && typeof item === 'object')
    .map((item: any) => ({
      title: asText(item.title, 'Música'),
      // O link só serve para "tocar de novo": aceita apenas http(s)
      url: typeof item.url === 'string' && /^https?:\/\//i.test(item.url) ? item.url.slice(0, 300) : null
    }))

  return {
    v: MUSIC_BOT_STATE_VERSION,
    status: STATUSES.has(data.status) ? (data.status as MusicBotStatus) : 'idle',
    volume: Math.min(200, Math.max(0, Math.round(asNumber(data.volume, 100)))),
    current,
    queue,
    queueTotal: Math.max(queue.length, Math.round(asNumber(data.queueTotal, queue.length))),
    history
  }
}

/**
 * Posição atual da faixa. O bot só publica quando algo muda, então enquanto estiver tocando o
 * painel avança o relógio sozinho a partir do instante em que recebeu o estado.
 */
export function getCurrentPositionMs(state: MusicBotState, receivedAt: number, now: number): number {
  if (!state.current) return 0
  const elapsedSincePublish = state.status === 'playing' ? Math.max(0, now - receivedAt) : 0
  const position = state.current.positionMs + elapsedSincePublish
  const durationMs = state.current.durationSeconds ? state.current.durationSeconds * 1000 : null
  return durationMs ? Math.min(position, durationMs) : position
}

/** 75000 -> "1:15"; 3725000 -> "1:02:05" */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`
}
