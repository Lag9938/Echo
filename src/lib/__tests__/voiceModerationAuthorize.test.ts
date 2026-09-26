import { describe, it, expect, vi } from 'vitest'
import {
  authorizeVoiceModeration,
  ACTION_PERMISSION,
  type VoiceChannelRow,
  type VoiceModerationDeps
} from '../../../supabase/functions/voice-moderation/authorize.ts'

const ACTOR = '11111111-1111-4111-8111-111111111111'
const TARGET = '22222222-2222-4222-8222-222222222222'
const SPACE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OTHER_SPACE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const CHANNEL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

const OWNER = -1
const NO_ROLE = 2147483647

type Perms = Record<string, boolean>

function makeDeps(opts: {
  channels?: Record<string, Partial<VoiceChannelRow> | null>
  perms?: Perms | null
  destPerms?: Perms | null
  positions?: Record<string, number>
} = {}): VoiceModerationDeps & { [K in keyof VoiceModerationDeps]: ReturnType<typeof vi.fn> } {
  const channels: Record<string, VoiceChannelRow | null> = {
    [CHANNEL]: { id: CHANNEL, space_id: SPACE, type: 'voice', name: 'Geral' },
    [DEST]: { id: DEST, space_id: SPACE, type: 'voice', name: 'Jogos' }
  }
  for (const [id, row] of Object.entries(opts.channels ?? {})) {
    channels[id] = row === null ? null : { ...(channels[id] as VoiceChannelRow), ...row }
  }
  const allMod: Perms = { viewChannels: true, connect: true, muteMembers: true, moveMembers: true, disconnectMembers: true }
  const positions: Record<string, number> = { [ACTOR]: 1, [TARGET]: 3, ...opts.positions }
  return {
    getChannel: vi.fn(async (id: string) => channels[id] ?? null),
    getMyChannelPermissions: vi.fn(async (id: string) => {
      if (id === DEST && opts.destPerms !== undefined) return opts.destPerms
      return opts.perms === undefined ? allMod : opts.perms
    }),
    getTopPosition: vi.fn(async (_space: string, userId: string) => positions[userId] ?? NO_ROLE)
  }
}

const mute = { action: 'mute', channelId: CHANNEL, targetUserId: TARGET }
const disconnect = { action: 'disconnect', channelId: CHANNEL, targetUserId: TARGET }
const move = { action: 'move', channelId: CHANNEL, targetUserId: TARGET, targetChannelId: DEST }

describe('authorizeVoiceModeration — permissão do cargo', () => {
  it.each([
    ['mute', mute],
    ['disconnect', disconnect],
    ['move', move]
  ])('permite %s com a permissão e acima do alvo', async (_name, input) => {
    const res = await authorizeVoiceModeration(input, ACTOR, makeDeps())
    expect(res).toMatchObject({ ok: true, action: input.action, room: CHANNEL, spaceId: SPACE, targetUserId: TARGET })
  })

  it.each([
    ['mute', mute, 'muteMembers'],
    ['disconnect', disconnect, 'disconnectMembers'],
    ['move', move, 'moveMembers']
  ])('NEGA %s sem a permissão %s (as outras de moderação não servem)', async (_name, input, perm) => {
    const perms: Perms = { viewChannels: true, connect: true, muteMembers: true, moveMembers: true, disconnectMembers: true }
    perms[perm] = false
    const res = await authorizeVoiceModeration(input, ACTOR, makeDeps({ perms }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('mapeia cada ação para a permissão certa', () => {
    expect(ACTION_PERMISSION).toEqual({ mute: 'muteMembers', disconnect: 'disconnectMembers', move: 'moveMembers' })
  })

  it('NEGA membro comum (só as permissões do @everyone)', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ perms: { viewChannels: true, connect: true, speak: true } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA quando não vê o canal (get_my_channel_permissions devolve vazio)', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ perms: {} }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('bloqueia (503) quando o banco ainda não tem o sistema de cargos, nunca libera', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ perms: null }))
    expect(res).toMatchObject({ ok: false, status: 503 })
  })

  it('só aceita true de verdade como permissão', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ perms: { muteMembers: 'true' as unknown as boolean } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })
})

describe('authorizeVoiceModeration — hierarquia', () => {
  it('NEGA moderar alguém com o mesmo cargo mais alto', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ positions: { [ACTOR]: 2, [TARGET]: 2 } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA moderar alguém acima na hierarquia', async () => {
    const res = await authorizeVoiceModeration(disconnect, ACTOR, makeDeps({ positions: { [ACTOR]: 4, [TARGET]: 1 } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA moderar o dono, mesmo sendo administrador', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ positions: { [ACTOR]: 0, [TARGET]: OWNER } }))
    expect(res).toMatchObject({ ok: false, status: 403, error: expect.stringMatching(/dono/i) })
  })

  it('NEGA quem tem a permissão só pelo @everyone contra outro membro sem cargo (empate)', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ positions: { [ACTOR]: NO_ROLE, [TARGET]: NO_ROLE } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('permite ao dono moderar qualquer membro', async () => {
    const res = await authorizeVoiceModeration(disconnect, ACTOR, makeDeps({ positions: { [ACTOR]: OWNER, [TARGET]: 0 } }))
    expect(res).toMatchObject({ ok: true })
  })

  it('permite moderar quem não tem cargo nenhum', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ positions: { [ACTOR]: 5, [TARGET]: NO_ROLE } }))
    expect(res).toMatchObject({ ok: true })
  })

  it('NEGA moderar a si mesmo sem consultar o banco', async () => {
    const deps = makeDeps()
    const res = await authorizeVoiceModeration({ ...mute, targetUserId: ACTOR.toUpperCase() }, ACTOR, deps)
    expect(res).toMatchObject({ ok: false, status: 400 })
    expect(deps.getChannel).not.toHaveBeenCalled()
  })

  it('consulta a hierarquia no espaço do canal (não num espaço vindo do pedido)', async () => {
    const deps = makeDeps()
    await authorizeVoiceModeration({ ...mute, spaceId: OTHER_SPACE }, ACTOR, deps)
    expect(deps.getTopPosition).toHaveBeenCalledWith(SPACE, TARGET)
    expect(deps.getTopPosition).toHaveBeenCalledWith(SPACE, ACTOR)
    expect(deps.getTopPosition).not.toHaveBeenCalledWith(OTHER_SPACE, expect.anything())
  })
})

describe('authorizeVoiceModeration — canal de origem', () => {
  it('NEGA canal que não existe ou que a RLS esconde', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ channels: { [CHANNEL]: null } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA canal que não é de voz', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ channels: { [CHANNEL]: { type: 'text' } } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA canal sem espaço (ex.: chamada direta)', async () => {
    const res = await authorizeVoiceModeration(mute, ACTOR, makeDeps({ channels: { [CHANNEL]: { space_id: null } } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })
})

describe('authorizeVoiceModeration — mover', () => {
  it('devolve o canal de destino com o nome vindo do banco', async () => {
    const res = await authorizeVoiceModeration({ ...move, targetChannelName: 'nome forjado' }, ACTOR, makeDeps())
    expect(res).toMatchObject({ ok: true, targetChannel: { id: DEST, name: 'Jogos' } })
  })

  it('NEGA destino em outro espaço', async () => {
    const res = await authorizeVoiceModeration(move, ACTOR, makeDeps({ channels: { [DEST]: { space_id: OTHER_SPACE } } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA destino que não é de voz ou que não existe', async () => {
    expect(await authorizeVoiceModeration(move, ACTOR, makeDeps({ channels: { [DEST]: { type: 'text' } } })))
      .toMatchObject({ ok: false, status: 403 })
    expect(await authorizeVoiceModeration(move, ACTOR, makeDeps({ channels: { [DEST]: null } })))
      .toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA destino em que quem move não pode entrar (canal privado ou sem Conectar)', async () => {
    expect(await authorizeVoiceModeration(move, ACTOR, makeDeps({ destPerms: {} })))
      .toMatchObject({ ok: false, status: 403 })
    expect(await authorizeVoiceModeration(move, ACTOR, makeDeps({ destPerms: { viewChannels: true, moveMembers: true } })))
      .toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA mover para o mesmo canal', async () => {
    const res = await authorizeVoiceModeration({ ...move, targetChannelId: CHANNEL }, ACTOR, makeDeps())
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('NEGA mover sem canal de destino válido', async () => {
    for (const targetChannelId of [undefined, '', 'geral', 42]) {
      const res = await authorizeVoiceModeration({ ...move, targetChannelId }, ACTOR, makeDeps())
      expect(res).toMatchObject({ ok: false, status: 400 })
    }
  })
})

describe('authorizeVoiceModeration — entrada inválida', () => {
  it.each([undefined, null, 'mute', 42, {}])('NEGA corpo inválido: %s', async (input) => {
    const res = await authorizeVoiceModeration(input, ACTOR, makeDeps())
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it.each(['server_mute', 'disconnect_member', 'ban', ''])('NEGA ação desconhecida: %s', async (action) => {
    const res = await authorizeVoiceModeration({ ...mute, action }, ACTOR, makeDeps())
    expect(res).toMatchObject({ ok: false, status: 400 })
  })

  it('NEGA IDs que não são UUID', async () => {
    expect(await authorizeVoiceModeration({ ...mute, channelId: 'geral' }, ACTOR, makeDeps())).toMatchObject({ ok: false, status: 400 })
    expect(await authorizeVoiceModeration({ ...mute, targetUserId: 'music-bot' }, ACTOR, makeDeps())).toMatchObject({ ok: false, status: 400 })
  })

  it('NEGA sem usuário autenticado', async () => {
    const res = await authorizeVoiceModeration(mute, '', makeDeps())
    expect(res).toMatchObject({ ok: false, status: 401 })
  })

  it('não engole erro do banco: a exceção sobe (vira 500), nunca permissão', async () => {
    const deps = makeDeps()
    deps.getTopPosition.mockRejectedValueOnce(new Error('db down'))
    await expect(authorizeVoiceModeration(mute, ACTOR, deps)).rejects.toThrow('db down')
  })
})
