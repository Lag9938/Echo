import { describe, it, expect, vi } from 'vitest'
import {
  MODERATION_METADATA_KEY as SERVER_METADATA_KEY,
  createRoomAdminToken,
  createRoomService,
  isNotFound,
  microphoneTrackSids,
  toHttpUrl,
  withModerationNotice,
  type ModerationNotice
} from '../../../supabase/functions/voice-moderation/livekit.ts'
import { MODERATION_METADATA_KEY, parseModerationNotice, requestVoiceModeration } from '../voiceModeration'

const CFG = { url: 'wss://livekit.example.com/', apiKey: 'APIkey', apiSecret: 'segredo-de-teste' }
const TARGET = '22222222-2222-4222-8222-222222222222'
const ROOM = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function base64UrlToBytes(part: string): Uint8Array<ArrayBuffer> {
  const binary = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function decodeJwtPart(part: string) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)))
}

describe('aviso de moderação nos metadados', () => {
  const move: ModerationNotice = { id: 'n1', type: 'move', at: 1, channelId: 'dest', channelName: 'Jogos' }

  it('app e servidor usam a mesma chave', () => {
    expect(MODERATION_METADATA_KEY).toBe(SERVER_METADATA_KEY)
  })

  it('o que o servidor escreve o app lê', () => {
    expect(parseModerationNotice(withModerationNotice(undefined, move))).toEqual(move)
    const mute: ModerationNotice = { id: 'n2', type: 'mute', at: 2 }
    expect(parseModerationNotice(withModerationNotice('', mute))).toEqual(mute)
  })

  it('preserva os metadados que vieram do token (avatar)', () => {
    const meta = withModerationNotice(JSON.stringify({ avatarUrl: 'https://x/a.png' }), move)
    expect(JSON.parse(meta)).toMatchObject({ avatarUrl: 'https://x/a.png', [MODERATION_METADATA_KEY]: move })
  })

  it('substitui metadados que não são JSON em vez de falhar', () => {
    expect(parseModerationNotice(withModerationNotice('lixo{', move))).toEqual(move)
  })

  it('ignora metadados sem aviso ou com aviso inválido', () => {
    for (const meta of [
      undefined,
      '',
      'lixo{',
      JSON.stringify({ avatarUrl: 'x' }),
      JSON.stringify({ [MODERATION_METADATA_KEY]: { type: 'mute', at: 1 } }),
      JSON.stringify({ [MODERATION_METADATA_KEY]: { id: 'a', type: 'ban', at: 1 } }),
      JSON.stringify({ [MODERATION_METADATA_KEY]: { id: 'a', type: 'move', at: 1 } })
    ]) {
      expect(parseModerationNotice(meta)).toBeNull()
    }
  })
})

describe('API de servidor do LiveKit', () => {
  it('converte a URL do WebSocket para HTTP', () => {
    expect(toHttpUrl('wss://lk.example.com/')).toBe('https://lk.example.com')
    expect(toHttpUrl('ws://localhost:7880')).toBe('http://localhost:7880')
    expect(toHttpUrl('https://lk.example.com')).toBe('https://lk.example.com')
  })

  it('assina token de administração restrito à sala e de vida curta', async () => {
    const token = await createRoomAdminToken(CFG, ROOM)
    const [header, payload, signature] = token.split('.')
    expect(decodeJwtPart(header)).toEqual({ alg: 'HS256', typ: 'JWT' })
    const claims = decodeJwtPart(payload)
    expect(claims).toMatchObject({ iss: 'APIkey', video: { room: ROOM, roomAdmin: true } })
    expect(claims.exp - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(60)
    expect(claims.video.roomJoin).toBeUndefined()

    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(CFG.apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sig = base64UrlToBytes(signature)
    expect(await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(`${header}.${payload}`))).toBe(true)
  })

  it('chama o RoomService via Twirp com o token e o corpo certos', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ identity: TARGET }), { status: 200 }))
    const rooms = createRoomService(CFG, fetchMock as unknown as typeof fetch)

    await rooms.mutePublishedTrack(ROOM, TARGET, 'TR_mic', true)

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://livekit.example.com/twirp/livekit.RoomService/MutePublishedTrack')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({ room: ROOM, identity: TARGET, trackSid: 'TR_mic', muted: true })
    const auth = (init.headers as Record<string, string>).Authorization
    expect(decodeJwtPart(auth.replace('Bearer ', '').split('.')[1]).video).toEqual({ room: ROOM, roomAdmin: true })
  })

  it('transforma erro do Twirp em LiveKitApiError (not_found reconhecido)', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ code: 'not_found', msg: 'participant not found' }), { status: 404 })
    )
    const rooms = createRoomService(CFG, fetchMock as unknown as typeof fetch)
    const err = await rooms.getParticipant(ROOM, TARGET).catch(e => e)
    expect(isNotFound(err)).toBe(true)
    expect(isNotFound(new Error('outro'))).toBe(false)
  })

  it('silencia só as faixas de microfone', () => {
    expect(microphoneTrackSids({
      identity: TARGET,
      tracks: [
        { sid: 'TR_mic', type: 'AUDIO', source: 'MICROPHONE' },
        { sid: 'TR_screen_audio', type: 'AUDIO', source: 'SCREEN_SHARE_AUDIO' },
        { sid: 'TR_cam', type: 'VIDEO', source: 'CAMERA' },
        { sid: 'TR_mic_num', source: 2 }
      ]
    })).toEqual(['TR_mic', 'TR_mic_num'])
    expect(microphoneTrackSids({ identity: TARGET })).toEqual([])
  })
})

describe('requestVoiceModeration', () => {
  const request = { action: 'mute' as const, channelId: ROOM, targetUserId: TARGET }

  it('chama a Edge Function e devolve ok', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { success: true }, error: null })
    const res = await requestVoiceModeration({ functions: { invoke } } as any, request)
    expect(res).toEqual({ ok: true })
    expect(invoke).toHaveBeenCalledWith('voice-moderation', { body: request })
  })

  it('mostra a mensagem do servidor quando é negado', async () => {
    const context = new Response(JSON.stringify({ success: false, error: 'Seus cargos não permitem.' }), { status: 403 })
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { message: 'non-2xx', context } })
    const res = await requestVoiceModeration({ functions: { invoke } } as any, request)
    expect(res).toEqual({ ok: false, error: 'Seus cargos não permitem.' })
  })

  it('falha sem cliente ou com erro de rede', async () => {
    expect(await requestVoiceModeration(null, request)).toMatchObject({ ok: false })
    const invoke = vi.fn().mockRejectedValue(new Error('offline'))
    expect(await requestVoiceModeration({ functions: { invoke } } as any, request)).toMatchObject({ ok: false })
  })
})
