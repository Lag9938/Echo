// Autorização de acesso a uma sala LiveKit. Módulo puro (sem APIs do Deno nem do Supabase) para poder
// ser testado com o vitest; o index.ts injeta as consultas ao banco.
//
// Regra central: o acesso é NEGADO por padrão. Antes, se o canal não fosse encontrado a checagem era
// pulada e o token saía mesmo assim — como a RLS de `channels` esconde canais de quem não é membro,
// um não membro que soubesse o ID de um canal de voz conseguia entrar na chamada.

export interface ChannelRow {
  id: string
  space_id: string | null
  type: string | null
  is_private: boolean | null
  allowed_role_ids: string[] | null
}

export interface RoomAuthDeps {
  getChannel(roomId: string): Promise<ChannelRow | null>
  getMembershipRole(spaceId: string, userId: string): Promise<string | null>
  getMemberRoleIds(spaceId: string, userId: string): Promise<string[]>
  /**
   * Permissões efetivas do usuário no canal, calculadas pelo banco (get_my_channel_permissions):
   * @everyone + cargos, administrador, canal privado. null = banco sem o sistema de cargos novo
   * (antes da migração 11): cai na regra antiga de canal privado.
   */
  getChannelPermissions?(channelId: string): Promise<Record<string, boolean> | null>
}

/** listenOnly: pode entrar, mas sem a permissão "Falar" (token sem canPublish) */
export type RoomAuthResult = { ok: true; listenOnly?: boolean } | { ok: false; status: number; error: string }

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
const UUID_RE = new RegExp(`^${UUID}$`)
// O app monta a sala como `dm-call-${[idA, idB].sort().join('-')}`
const DM_ROOM_RE = new RegExp(`^dm-call-(${UUID})-(${UUID})$`)

const deny = (status: number, error: string): RoomAuthResult => ({ ok: false, status, error })

export async function authorizeRoom(room: unknown, userId: string, deps: RoomAuthDeps): Promise<RoomAuthResult> {
  if (typeof room !== 'string' || room.length === 0 || room.length > 128) {
    return deny(400, 'Sala inválida.')
  }
  if (!userId) {
    return deny(401, 'Sessão inválida.')
  }

  // Chamada direta: o usuário precisa ser exatamente um dos dois participantes (não basta o ID aparecer no texto)
  if (room.startsWith('dm-call-')) {
    const match = DM_ROOM_RE.exec(room)
    if (!match) return deny(403, 'Sala de chamada direta inválida.')
    const me = userId.toLowerCase()
    if (match[1].toLowerCase() !== me && match[2].toLowerCase() !== me) {
      return deny(403, 'Acesso negado a esta chamada direta.')
    }
    return { ok: true }
  }

  // Canal de voz de servidor: a sala é o UUID do canal
  if (!UUID_RE.test(room)) {
    return deny(403, 'Sala desconhecida.')
  }

  const channel = await deps.getChannel(room)
  if (!channel || !channel.space_id || channel.type !== 'voice') {
    // Também cobre canais que existem mas a RLS esconde de quem não é membro
    return deny(403, 'Canal de voz não encontrado ou sem acesso.')
  }

  const role = await deps.getMembershipRole(channel.space_id, userId)
  if (!role) {
    return deny(403, 'Você não é membro deste servidor.')
  }

  // Regra de cargos do banco: Ver Canais + Conectar para entrar, Falar para transmitir
  const perms = deps.getChannelPermissions ? await deps.getChannelPermissions(channel.id) : null
  if (perms) {
    if (!perms.viewChannels || !perms.connect) {
      return deny(403, 'Seus cargos não permitem entrar neste canal de voz.')
    }
    return perms.speak ? { ok: true } : { ok: true, listenOnly: true }
  }

  // Canal privado: só dono/admin ou quem tem um cargo autorizado (sem cargos autorizados, só dono/admin)
  if (channel.is_private && role !== 'owner' && role !== 'admin') {
    const allowedRoles = Array.isArray(channel.allowed_role_ids) ? channel.allowed_role_ids : []
    if (allowedRoles.length === 0) {
      return deny(403, 'Acesso não autorizado a este canal privado.')
    }
    const userRoleIds = await deps.getMemberRoleIds(channel.space_id, userId)
    if (!allowedRoles.some(roleId => userRoleIds.includes(roleId))) {
      return deny(403, 'Acesso não autorizado a este canal privado.')
    }
  }

  return { ok: true }
}
