// Chamadas ao servidor para convites de espaço (funções SQL da migração 08).
// Recebe o cliente Supabase como parâmetro para poder ser testado sem rede.

import type { SupabaseClient } from '@supabase/supabase-js'

type RpcClient = Pick<SupabaseClient, 'rpc'>

export interface SpaceInvite {
  code: string
  spaceId: string
  /** ISO 8601; null quando o convite nunca expira */
  expiresAt: string | null
}

export interface InviteDetails {
  id: string
  name: string
  description?: string | null
  icon_url?: string | null
  banner_url?: string | null
  banner_theme?: string | null
  member_count?: number
}

export interface JoinedSpace {
  spaceId: string
  name: string
  alreadyMember: boolean
}

const NEVER_EXPIRES = 0
const MEMBER_INVITE_HOURS = 24 * 7

/** Traduz a mensagem de erro do servidor para algo que o usuário entenda */
export function inviteErrorMessage(raw?: string | null): string {
  const message = raw || ''
  if (/invite_not_found/.test(message)) return 'Convite inválido ou revogado.'
  if (/invite_expired/.test(message)) return 'Este convite expirou. Peça um novo link.'
  if (/invite_exhausted/.test(message)) return 'Este convite atingiu o limite de usos. Peça um novo link.'
  if (/not_authenticated/.test(message)) return 'Faça login para entrar no espaço.'
  if (/not_a_member/.test(message)) return 'Você não faz parte deste espaço.'
  if (/could not find the function|PGRST202/i.test(message)) return 'Convites indisponíveis no momento. Atualize o Echo e tente de novo.'
  return 'Não foi possível concluir o convite. Tente novamente.'
}

/**
 * Devolve um convite ativo do usuário para o espaço (criando se não houver).
 * O dono recebe um convite que nunca expira; os demais membros, um de 7 dias.
 */
export async function getOrCreateSpaceInvite(client: RpcClient, spaceId: string): Promise<SpaceInvite> {
  let res = await client.rpc('get_or_create_space_invite', {
    p_space_id: spaceId,
    p_expires_in_hours: NEVER_EXPIRES
  })

  if (res.error && /forbidden_never_expires/.test(res.error.message)) {
    res = await client.rpc('get_or_create_space_invite', {
      p_space_id: spaceId,
      p_expires_in_hours: MEMBER_INVITE_HOURS
    })
  }

  const data = res.data as { code?: string; space_id?: string; expires_at?: string | null } | null
  if (res.error || !data?.code) {
    throw new Error(inviteErrorMessage(res.error?.message))
  }
  return { code: data.code, spaceId: data.space_id ?? spaceId, expiresAt: data.expires_at ?? null }
}

/** Detalhes públicos de um convite válido; null se for inexistente, expirado, revogado ou esgotado */
export async function getInviteDetails(client: RpcClient, code: string): Promise<InviteDetails | null> {
  const { data, error } = await client.rpc('get_invite_details', { p_code: code })
  if (error) return null
  const detail = (Array.isArray(data) ? data[0] : data) as InviteDetails | null
  return detail && detail.id ? detail : null
}

export async function joinSpaceWithInvite(client: RpcClient, code: string): Promise<JoinedSpace> {
  const { data, error } = await client.rpc('join_space_with_invite', { p_code: code })
  const result = data as { space_id?: string; name?: string; already_member?: boolean } | null
  if (error || !result?.space_id) {
    throw new Error(inviteErrorMessage(error?.message))
  }
  return { spaceId: result.space_id, name: result.name || 'Espaço Echo', alreadyMember: Boolean(result.already_member) }
}

/** Revoga todos os convites ativos do espaço (só o dono). Devolve quantos foram revogados. */
export async function revokeAllSpaceInvites(client: RpcClient, spaceId: string): Promise<number> {
  const { data, error } = await client.rpc('revoke_all_space_invites', { p_space_id: spaceId })
  if (error) throw new Error(inviteErrorMessage(error.message))
  return typeof data === 'number' ? data : 0
}
