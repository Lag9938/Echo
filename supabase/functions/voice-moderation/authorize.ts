// Autorização da moderação de voz (silenciar, desconectar e mover membros de uma chamada). Módulo puro
// (sem APIs do Deno nem do Supabase) para poder ser testado com o vitest; o index.ts injeta as consultas.
//
// Antes, o comando saía do próprio app (DataChannel do LiveKit + broadcast do Supabase Realtime) e quem
// recebia obedecia sem conferir nada: qualquer membro conseguia silenciar, mover ou derrubar qualquer um.
// Agora quem executa a ação é o servidor, e só depois de passar por aqui. Tudo é NEGADO por padrão:
//  * quem pede precisa ter a permissão do cargo no canal (muteMembers / disconnectMembers / moveMembers),
//    calculada pelo banco (get_my_channel_permissions, que já considera administrador e canal privado);
//  * precisa estar ACIMA do alvo na hierarquia (space_member_top_position: 0 = topo, dono = -1);
//  * o dono nunca é alvo, e ninguém modera a si mesmo por aqui (os controles da própria chamada bastam);
//  * para mover, o destino precisa ser outro canal de voz do mesmo espaço em que quem move pode entrar.

export type VoiceModerationAction = 'mute' | 'disconnect' | 'move'

/** Permissão de cargo exigida por ação (mesmas chaves de src/lib/permissions.ts) */
export const ACTION_PERMISSION: Record<VoiceModerationAction, 'muteMembers' | 'disconnectMembers' | 'moveMembers'> = {
  mute: 'muteMembers',
  disconnect: 'disconnectMembers',
  move: 'moveMembers'
}

/** Posição do dono em space_member_top_position (acima de todos os cargos) */
export const OWNER_POSITION = -1

export interface VoiceChannelRow {
  id: string
  space_id: string | null
  type: string | null
  name: string | null
}

export interface VoiceModerationDeps {
  /** Canal visto com o token de quem pede (a RLS esconde canais de espaços dos quais ele não faz parte) */
  getChannel(channelId: string): Promise<VoiceChannelRow | null>
  /**
   * Permissões efetivas de quem pede no canal (get_my_channel_permissions). null = banco sem o sistema de
   * cargos (antes da migração 11): a moderação fica bloqueada, nunca liberada.
   */
  getMyChannelPermissions(channelId: string): Promise<Record<string, boolean> | null>
  /** Posição do cargo mais alto do membro no espaço (space_member_top_position) */
  getTopPosition(spaceId: string, userId: string): Promise<number>
}

export type VoiceModerationAuthResult =
  | {
      ok: true
      action: VoiceModerationAction
      /** Sala LiveKit = ID do canal de voz onde o alvo está */
      room: string
      spaceId: string
      targetUserId: string
      targetChannel?: { id: string; name: string }
    }
  | { ok: false; status: number; error: string }

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const ACTIONS: VoiceModerationAction[] = ['mute', 'disconnect', 'move']

const deny = (status: number, error: string): VoiceModerationAuthResult => ({ ok: false, status, error })

const isUuid = (value: unknown): value is string => typeof value === 'string' && UUID_RE.test(value)

export async function authorizeVoiceModeration(
  input: unknown,
  actorId: string,
  deps: VoiceModerationDeps
): Promise<VoiceModerationAuthResult> {
  if (!actorId) {
    return deny(401, 'Sessão inválida.')
  }

  const { action, channelId, targetUserId, targetChannelId } = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>
  if (typeof action !== 'string' || !ACTIONS.includes(action as VoiceModerationAction)) {
    return deny(400, 'Ação de moderação inválida.')
  }
  if (!isUuid(channelId) || !isUuid(targetUserId)) {
    return deny(400, 'Canal ou membro inválido.')
  }
  const act = action as VoiceModerationAction
  if (act === 'move') {
    if (!isUuid(targetChannelId)) return deny(400, 'Canal de destino inválido.')
    if (targetChannelId.toLowerCase() === channelId.toLowerCase()) {
      return deny(400, 'Essa pessoa já está nesse canal.')
    }
  }
  const target = targetUserId.toLowerCase()
  if (target === actorId.toLowerCase()) {
    return deny(400, 'Use os controles da sua própria chamada para isso.')
  }

  const channel = await deps.getChannel(channelId)
  if (!channel || !channel.space_id || channel.type !== 'voice') {
    return deny(403, 'Canal de voz não encontrado ou sem acesso.')
  }
  const spaceId = channel.space_id

  const perms = await deps.getMyChannelPermissions(channel.id)
  if (!perms) {
    return deny(503, 'O servidor ainda não tem o sistema de cargos atualizado. Tente de novo mais tarde.')
  }
  if (perms[ACTION_PERMISSION[act]] !== true) {
    return deny(403, 'Seus cargos não permitem fazer isso neste canal.')
  }

  const targetTop = await deps.getTopPosition(spaceId, target)
  if (targetTop === OWNER_POSITION) {
    return deny(403, 'O dono do espaço não pode ser moderado.')
  }
  const actorTop = await deps.getTopPosition(spaceId, actorId)
  if (!(actorTop < targetTop)) {
    return deny(403, 'Você só pode moderar membros abaixo do seu cargo mais alto.')
  }

  if (act !== 'move') {
    return { ok: true, action: act, room: channel.id, spaceId, targetUserId: target }
  }

  const destination = await deps.getChannel(targetChannelId as string)
  if (!destination || destination.type !== 'voice' || destination.space_id !== spaceId) {
    return deny(403, 'Canal de destino não encontrado neste espaço.')
  }
  const destinationPerms = await deps.getMyChannelPermissions(destination.id)
  if (!destinationPerms?.viewChannels || !destinationPerms.connect) {
    return deny(403, 'Você não tem acesso ao canal de destino.')
  }

  return {
    ok: true,
    action: act,
    room: channel.id,
    spaceId,
    targetUserId: target,
    targetChannel: { id: destination.id, name: destination.name || '' }
  }
}
