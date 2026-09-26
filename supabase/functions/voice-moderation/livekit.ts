// Cliente mínimo da API de servidor do LiveKit (RoomService, via Twirp/JSON) e o aviso de moderação que
// vai nos metadados do participante. Só usa fetch e crypto.subtle, então roda no Deno e no vitest.
//
// Por que metadados e não uma mensagem de dados: o app do alvo não tem como saber quem enviou uma
// mensagem de dados (o livekit-client entrega `participant` indefinido tanto para o servidor quanto para
// um participante que acabou de entrar). Já os metadados do participante só podem ser escritos pela API
// de servidor: o token do livekit-token não concede canUpdateOwnMetadata. É o canal confiável.

export interface LiveKitConfig {
  /** URL do servidor LiveKit (wss:// ou https://) */
  url: string
  apiKey: string
  apiSecret: string
}

export class LiveKitApiError extends Error {
  status: number
  code: string
  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'LiveKitApiError'
    this.status = status
    this.code = code
  }
}

export const isNotFound = (err: unknown) =>
  err instanceof LiveKitApiError && (err.code === 'not_found' || err.status === 404)

export interface LiveKitTrackInfo {
  sid: string
  type?: string | number
  source?: string | number
  muted?: boolean
}

export interface LiveKitParticipantInfo {
  identity: string
  metadata?: string
  tracks?: LiveKitTrackInfo[]
}

/** Chave dos metadados do participante com o último aviso de moderação (mesma de src/lib/voiceModeration.ts) */
export const MODERATION_METADATA_KEY = 'echoModeration'

export interface ModerationNotice {
  /** Único por ação: o app do alvo ignora avisos que já tratou (reconexão, outras mudanças de metadados) */
  id: string
  type: 'mute' | 'disconnect' | 'move'
  at: number
  channelId?: string
  channelName?: string
}

/** Junta o aviso aos metadados atuais sem perder o que já está lá (ex.: avatarUrl do token) */
export function withModerationNotice(currentMetadata: string | undefined, notice: ModerationNotice): string {
  let base: Record<string, unknown> = {}
  if (currentMetadata) {
    try {
      const parsed = JSON.parse(currentMetadata)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) base = parsed
    } catch {
      // Metadados que não são JSON não são do Echo: descarta em vez de falhar a moderação
    }
  }
  return JSON.stringify({ ...base, [MODERATION_METADATA_KEY]: notice })
}

/** SIDs das faixas de microfone publicadas (enum TrackSource.MICROPHONE = 2; o JSON pode vir como nome ou número) */
export function microphoneTrackSids(participant: LiveKitParticipantInfo): string[] {
  return (participant.tracks || [])
    .filter(t => t.source === 'MICROPHONE' || t.source === 2)
    .map(t => t.sid)
}

/** A API de servidor fala HTTP no mesmo host do WebSocket */
export function toHttpUrl(url: string): string {
  return url.replace(/^ws(s?):\/\//i, 'http$1://').replace(/\/+$/, '')
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const base64UrlEncode = (str: string) => base64UrlEncodeBytes(new TextEncoder().encode(str))

/** Token de administração restrito a uma sala e de vida curta */
export async function createRoomAdminToken(cfg: LiveKitConfig, room: string, ttlSeconds = 60): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    iss: cfg.apiKey,
    nbf: now - 60,
    exp: now + ttlSeconds,
    video: { room, roomAdmin: true }
  }
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(cfg.apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(unsigned))
  return `${unsigned}.${base64UrlEncodeBytes(new Uint8Array(signature))}`
}

export function createRoomService(cfg: LiveKitConfig, fetchImpl: typeof fetch = fetch) {
  const baseUrl = toHttpUrl(cfg.url)

  async function call<T>(method: string, room: string, body: Record<string, unknown>): Promise<T> {
    const token = await createRoomAdminToken(cfg, room)
    const res = await fetchImpl(`${baseUrl}/twirp/livekit.RoomService/${method}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, ...body })
    })
    const text = await res.text()
    let data: any = {}
    try { data = text ? JSON.parse(text) : {} } catch { data = { msg: text } }
    if (!res.ok) {
      throw new LiveKitApiError(`LiveKit ${method}: ${data?.msg || res.statusText}`, res.status, data?.code || '')
    }
    return data as T
  }

  return {
    getParticipant: (room: string, identity: string) =>
      call<LiveKitParticipantInfo>('GetParticipant', room, { identity }),
    updateParticipantMetadata: (room: string, identity: string, metadata: string) =>
      call<LiveKitParticipantInfo>('UpdateParticipant', room, { identity, metadata }),
    mutePublishedTrack: (room: string, identity: string, trackSid: string, muted: boolean) =>
      call<unknown>('MutePublishedTrack', room, { identity, trackSid, muted }),
    removeParticipant: (room: string, identity: string) =>
      call<unknown>('RemoveParticipant', room, { identity })
  }
}

export type RoomService = ReturnType<typeof createRoomService>
