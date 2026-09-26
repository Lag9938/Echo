import { describe, it, expect, vi } from 'vitest'
import {
  authorizeRoom,
  type ChannelRow,
  type RoomAuthDeps
} from '../../../supabase/functions/livekit-token/authorize.ts'

const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const THIRD = '33333333-3333-4333-8333-333333333333'
const SPACE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const CHANNEL = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

function makeDeps(opts: {
  channel?: Partial<ChannelRow> | null
  role?: string | null
  roleIds?: string[]
} = {}): RoomAuthDeps & { getMemberRoleIds: ReturnType<typeof vi.fn> } {
  const channel: ChannelRow | null =
    opts.channel === null
      ? null
      : { id: CHANNEL, space_id: SPACE, type: 'voice', is_private: false, allowed_role_ids: null, ...opts.channel }
  return {
    getChannel: vi.fn().mockResolvedValue(channel),
    getMembershipRole: vi.fn().mockResolvedValue(opts.role === undefined ? 'member' : opts.role),
    getMemberRoleIds: vi.fn().mockResolvedValue(opts.roleIds ?? [])
  }
}

describe('authorizeRoom — canais de voz de servidor', () => {
  it('permite membro do servidor em canal de voz público', async () => {
    const res = await authorizeRoom(CHANNEL, USER, makeDeps())
    expect(res).toEqual({ ok: true })
  })

  it('NEGA quando o canal não é encontrado (RLS esconde o canal de quem não é membro)', async () => {
    const res = await authorizeRoom(CHANNEL, USER, makeDeps({ channel: null }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA quem não é membro do servidor', async () => {
    const res = await authorizeRoom(CHANNEL, USER, makeDeps({ role: null }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA canal que não é de voz', async () => {
    const res = await authorizeRoom(CHANNEL, USER, makeDeps({ channel: { type: 'text' } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA canal sem servidor associado', async () => {
    const res = await authorizeRoom(CHANNEL, USER, makeDeps({ channel: { space_id: null } }))
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA sala que não é UUID nem chamada direta (ex.: "general")', async () => {
    const deps = makeDeps()
    const res = await authorizeRoom('general', USER, deps)
    expect(res).toMatchObject({ ok: false, status: 403 })
    expect(deps.getChannel).not.toHaveBeenCalled()
  })

  it.each([undefined, null, '', 42, 'x'.repeat(200)])('NEGA sala ausente ou inválida: %s', async (room) => {
    const res = await authorizeRoom(room, USER, makeDeps())
    expect(res).toMatchObject({ ok: false, status: 400 })
  })
})

describe('authorizeRoom — canais privados', () => {
  it('permite dono e admin mesmo sem cargo', async () => {
    for (const role of ['owner', 'admin']) {
      const res = await authorizeRoom(CHANNEL, USER, makeDeps({ channel: { is_private: true, allowed_role_ids: ['r1'] }, role }))
      expect(res).toEqual({ ok: true })
    }
  })

  it('permite membro com cargo autorizado', async () => {
    const res = await authorizeRoom(
      CHANNEL, USER,
      makeDeps({ channel: { is_private: true, allowed_role_ids: ['r1', 'r2'] }, roleIds: ['r2'] })
    )
    expect(res).toEqual({ ok: true })
  })

  it('NEGA membro sem cargo autorizado', async () => {
    const res = await authorizeRoom(
      CHANNEL, USER,
      makeDeps({ channel: { is_private: true, allowed_role_ids: ['r1'] }, roleIds: ['outro'] })
    )
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA membro comum quando o canal privado não tem nenhum cargo autorizado', async () => {
    for (const allowed of [[], null]) {
      const res = await authorizeRoom(CHANNEL, USER, makeDeps({ channel: { is_private: true, allowed_role_ids: allowed } }))
      expect(res).toMatchObject({ ok: false, status: 403 })
    }
  })
})

describe('authorizeRoom — permissões de cargos (migração 11)', () => {
  const withPerms = (perms: Record<string, boolean> | null, channel?: Partial<ChannelRow>) => ({
    ...makeDeps({ channel }),
    getChannelPermissions: vi.fn().mockResolvedValue(perms)
  })

  it('entra e fala com Ver Canais + Conectar + Falar', async () => {
    expect(await authorizeRoom(CHANNEL, USER, withPerms({ viewChannels: true, connect: true, speak: true }))).toEqual({ ok: true })
  })

  it('sem Falar entra só ouvindo', async () => {
    expect(await authorizeRoom(CHANNEL, USER, withPerms({ viewChannels: true, connect: true }))).toEqual({ ok: true, listenOnly: true })
  })

  it('NEGA sem Conectar ou sem acesso ao canal (permissões vazias)', async () => {
    expect(await authorizeRoom(CHANNEL, USER, withPerms({ viewChannels: true, speak: true }))).toMatchObject({ ok: false, status: 403 })
    expect(await authorizeRoom(CHANNEL, USER, withPerms({}, { is_private: true, allowed_role_ids: ['r1'] }))).toMatchObject({ ok: false, status: 403 })
  })

  it('banco antigo (sem a função) cai na regra antiga de canal privado', async () => {
    const deps = withPerms(null, { is_private: true, allowed_role_ids: ['r1'] })
    deps.getMemberRoleIds.mockResolvedValue(['r1'])
    expect(await authorizeRoom(CHANNEL, USER, deps)).toEqual({ ok: true })
  })
})

describe('authorizeRoom — chamadas diretas', () => {
  const room = (a: string, b: string) => `dm-call-${[a, b].sort().join('-')}`

  it('permite os dois participantes', async () => {
    expect(await authorizeRoom(room(USER, OTHER), USER, makeDeps())).toEqual({ ok: true })
    expect(await authorizeRoom(room(USER, OTHER), OTHER, makeDeps())).toEqual({ ok: true })
  })

  it('NEGA um terceiro usuário', async () => {
    const res = await authorizeRoom(room(USER, OTHER), THIRD, makeDeps())
    expect(res).toMatchObject({ ok: false, status: 403 })
  })

  it('NEGA sala forjada que apenas contém o ID do usuário no texto', async () => {
    const forged = `dm-call-${OTHER}-${OTHER}-${USER}`
    expect(await authorizeRoom(forged, USER, makeDeps())).toMatchObject({ ok: false, status: 403 })
    expect(await authorizeRoom(`dm-call-${OTHER}-lixo-${USER}`, USER, makeDeps())).toMatchObject({ ok: false, status: 403 })
  })

  it('aceita IDs em maiúsculas/minúsculas de forma equivalente', async () => {
    const res = await authorizeRoom(room(USER, OTHER), USER.toUpperCase(), makeDeps())
    expect(res).toEqual({ ok: true })
  })

  it('não consulta o banco para chamadas diretas', async () => {
    const deps = makeDeps()
    await authorizeRoom(room(USER, OTHER), USER, deps)
    expect(deps.getChannel).not.toHaveBeenCalled()
  })
})
