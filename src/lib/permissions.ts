// Modelo de cargos e permissões do Echo, no estilo Discord. Espelha as regras do banco
// (supabase/migration_11_discord_roles.sql): o servidor é quem decide de verdade; aqui o app só
// antecipa o resultado para esconder/desabilitar o que a pessoa não pode fazer.
//
//  * Todo espaço tem um cargo @everyone (isEveryone) que vale para todos os membros.
//  * Permissões efetivas = @everyone + cargos atribuídos. "administrator" libera tudo. O dono tem tudo.
//  * Hierarquia: position 0 é o topo. Só se gerencia cargos e membros abaixo do seu cargo mais alto.
import type { Channel, RolePermissions, ServerRole } from '../types'

export type PermissionKey = keyof RolePermissions

export interface PermissionDefinition {
  key: PermissionKey
  label: string
  description: string
}

export interface PermissionCategory {
  id: 'general' | 'membership' | 'text' | 'voice' | 'advanced'
  title: string
  permissions: PermissionDefinition[]
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: 'general',
    title: 'Permissões gerais do espaço',
    permissions: [
      { key: 'viewChannels', label: 'Ver canais', description: 'Permite ver os canais (exceto os privados que não liberam este cargo).' },
      { key: 'manageChannels', label: 'Gerenciar canais', description: 'Permite criar, editar, reordenar e excluir canais.' },
      { key: 'manageRoles', label: 'Gerenciar cargos', description: 'Permite criar e editar cargos abaixo do seu cargo mais alto e atribuí-los a membros.' },
      { key: 'manageEmojis', label: 'Gerenciar emojis', description: 'Permite adicionar e remover emojis personalizados do espaço.' },
      { key: 'viewAuditLog', label: 'Ver registro de ações', description: 'Permite ver o histórico de alterações feitas no espaço.' },
      { key: 'manageSpace', label: 'Gerenciar espaço', description: 'Permite mudar nome, ícone, banner e demais configurações, e gerenciar todos os convites.' }
    ]
  },
  {
    id: 'membership',
    title: 'Permissões de membros',
    permissions: [
      { key: 'createInvite', label: 'Criar convite', description: 'Permite convidar novas pessoas para o espaço.' },
      { key: 'kickMembers', label: 'Expulsar membros', description: 'Permite remover do espaço membros abaixo do seu cargo mais alto.' }
    ]
  },
  {
    id: 'text',
    title: 'Permissões de canais de texto',
    permissions: [
      { key: 'sendMessages', label: 'Enviar mensagens', description: 'Permite enviar mensagens nos canais de texto.' },
      { key: 'attachFiles', label: 'Anexar arquivos', description: 'Permite enviar imagens, vídeos, áudios e arquivos.' },
      { key: 'sendInAnnouncementChannels', label: 'Postar em canais de anúncios', description: 'Permite enviar mensagens em canais marcados como anúncios (somente leitura).' },
      { key: 'manageMessages', label: 'Gerenciar mensagens', description: 'Permite apagar mensagens de outros membros e fixar/desafixar mensagens.' }
    ]
  },
  {
    id: 'voice',
    title: 'Permissões de canais de voz',
    permissions: [
      { key: 'connect', label: 'Conectar', description: 'Permite entrar nos canais de voz.' },
      { key: 'speak', label: 'Falar', description: 'Permite falar e transmitir nos canais de voz. Sem ela, a pessoa entra só para ouvir.' },
      { key: 'muteMembers', label: 'Silenciar membros', description: 'Permite silenciar o microfone de outros membros nas chamadas.' },
      { key: 'moveMembers', label: 'Mover membros', description: 'Permite mover membros entre canais de voz.' },
      { key: 'disconnectMembers', label: 'Desconectar membros', description: 'Permite desconectar membros de canais de voz.' }
    ]
  },
  {
    id: 'advanced',
    title: 'Permissões avançadas',
    permissions: [
      { key: 'administrator', label: 'Administrador', description: 'Concede todas as permissões e ignora as restrições de canais privados. Conceda com cuidado.' }
    ]
  }
]

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key))

export const PERMISSION_LABELS: Record<PermissionKey, string> = Object.fromEntries(
  PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => [p.key, p.label]))
) as Record<PermissionKey, string>

/** Permissões base do @everyone (as mesmas que o banco usa ao criar um espaço) */
export const EVERYONE_DEFAULT_PERMISSIONS: RolePermissions = {
  viewChannels: true,
  createInvite: true,
  sendMessages: true,
  attachFiles: true,
  connect: true,
  speak: true
}

/** Permissões que dão acesso à tela de Configurações do Espaço */
export const SPACE_SETTINGS_PERMISSIONS: PermissionKey[] = [
  'manageSpace', 'manageRoles', 'manageChannels', 'manageEmojis', 'viewAuditLog', 'kickMembers'
]

/** Posição usada para quem não tem cargo nenhum (fica abaixo de todos) */
export const NO_ROLE_POSITION = Number.MAX_SAFE_INTEGER
/** O dono fica acima de todos os cargos */
export const OWNER_POSITION = -1

/** Cargo "de exibição" do dono que não tem cargos: o nome dourado com coroa, marca do Echo */
export const OWNER_DISPLAY_ROLE: ServerRole = {
  id: 'owner',
  name: '👑 Dono',
  color: '#eab308',
  position: OWNER_POSITION,
  permissions: { administrator: true }
}

export type EffectivePermissions = Record<PermissionKey, boolean>

export function emptyPermissions(): EffectivePermissions {
  return Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, false])) as EffectivePermissions
}

function allPermissions(): EffectivePermissions {
  return Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, true])) as EffectivePermissions
}

/** Só chaves conhecidas com valor true, como o banco guarda */
export function sanitizePermissions(perms: RolePermissions | null | undefined): RolePermissions {
  const clean: RolePermissions = {}
  if (!perms) return clean
  for (const key of ALL_PERMISSION_KEYS) {
    if (perms[key] === true) clean[key] = true
  }
  return clean
}

/** @everyone por último; os demais do topo (position 0) para baixo */
export function sortRoles(roles: ServerRole[]): ServerRole[] {
  return roles.slice().sort((a, b) => {
    if (!!a.isEveryone !== !!b.isEveryone) return a.isEveryone ? 1 : -1
    return a.position - b.position
  })
}

export function getEveryoneRole(roles: ServerRole[]): ServerRole | undefined {
  return roles.find(r => r.isEveryone)
}

export interface MemberContext {
  isOwner: boolean
  isMember?: boolean
  roles: ServerRole[]
  assignedRoleIds: string[]
}

export function computePermissions({ isOwner, isMember = true, roles, assignedRoleIds }: MemberContext): EffectivePermissions {
  if (isOwner) return allPermissions()
  if (!isMember) return emptyPermissions()

  const perms = emptyPermissions()
  const everyone = getEveryoneRole(roles)
  // Banco ainda sem @everyone (antes da migração 11): usa o padrão para não travar ninguém
  const base = everyone ? everyone.permissions : EVERYONE_DEFAULT_PERMISSIONS
  const applied = [base, ...roles.filter(r => !r.isEveryone && assignedRoleIds.includes(r.id)).map(r => r.permissions)]
  for (const rolePerms of applied) {
    for (const key of ALL_PERMISSION_KEYS) {
      if (rolePerms?.[key] === true) perms[key] = true
    }
  }
  return perms.administrator ? allPermissions() : perms
}

export function getTopPosition({ isOwner, roles, assignedRoleIds }: MemberContext): number {
  if (isOwner) return OWNER_POSITION
  const positions = roles.filter(r => !r.isEveryone && assignedRoleIds.includes(r.id)).map(r => r.position)
  return positions.length ? Math.min(...positions) : NO_ROLE_POSITION
}

/** Cargo mais alto atribuído (não inclui @everyone) */
export function getHighestRole(roles: ServerRole[], assignedRoleIds: string[]): ServerRole | null {
  return sortRoles(roles).find(r => !r.isEveryone && assignedRoleIds.includes(r.id)) ?? null
}

/** Cargo mais alto que aparece separado na lista de membros */
export function getHoistedRole(roles: ServerRole[], assignedRoleIds: string[]): ServerRole | null {
  return sortRoles(roles).find(r => !r.isEveryone && r.hoist && assignedRoleIds.includes(r.id)) ?? null
}

/** Pode editar/excluir/atribuir este cargo? (@everyone: só editar permissões) */
export function canManageRole(actor: MemberContext, role: ServerRole): boolean {
  const perms = computePermissions(actor)
  if (!perms.manageRoles) return false
  if (role.isEveryone) return true
  return getTopPosition(actor) < role.position
}

/** Pode mexer nos cargos / expulsar este membro? */
export function canManageMember(actor: MemberContext, target: MemberContext, isSelf: boolean): boolean {
  if (target.isOwner) return actor.isOwner && isSelf
  if (isSelf) return true
  return getTopPosition(actor) < getTopPosition(target)
}

/** Pode conceder esta permissão a um cargo? (ninguém dá o que não tem) */
export function canGrantPermission(actor: MemberContext, key: PermissionKey): boolean {
  return computePermissions(actor)[key]
}

export function canViewChannel(
  channel: Pick<Channel, 'is_private' | 'allowed_role_ids'>,
  actor: MemberContext
): boolean {
  const perms = computePermissions(actor)
  if (perms.administrator) return true
  if (!perms.viewChannels) return false
  if (!channel.is_private) return true
  const allowed = channel.allowed_role_ids || []
  return actor.roles.some(r => allowed.includes(r.id) && (r.isEveryone || actor.assignedRoleIds.includes(r.id)))
}

export function canAccessSpaceSettings(perms: EffectivePermissions): boolean {
  return SPACE_SETTINGS_PERMISSIONS.some(k => perms[k])
}

/** Converte os códigos de erro das funções do banco em mensagens para a pessoa */
export function describeRoleError(error: { message?: string; code?: string } | null | undefined): string {
  const message = error?.message || ''
  if (error?.code === 'PGRST202' || /could not find the function/i.test(message)) {
    return 'O banco ainda não tem o novo sistema de cargos (migração 11). Atualize o servidor.'
  }
  const missing = /missing_permission:(\w+)/.exec(message)
  if (missing) {
    const label = PERMISSION_LABELS[missing[1] as PermissionKey] || missing[1]
    return `Você não pode conceder "${label}" porque não tem essa permissão.`
  }
  if (message.includes('role_hierarchy')) return 'Você só pode gerenciar cargos abaixo do seu cargo mais alto.'
  if (message.includes('member_hierarchy')) return 'Você só pode gerenciar membros abaixo de você na hierarquia.'
  if (message.includes('everyone_locked')) return 'O @everyone não pode ser renomeado, excluído nem atribuído — só as permissões dele mudam.'
  if (message.includes('invalid_role_name')) return 'O nome do cargo precisa ter entre 1 e 64 caracteres (e não pode ser @everyone).'
  if (message.includes('invalid_role_color')) return 'Cor inválida para o cargo.'
  if (message.includes('invalid_role_order')) return 'A lista de cargos mudou. Recarregue e tente de novo.'
  if (message.includes('too_many_roles')) return 'Este espaço já chegou ao limite de 250 cargos.'
  if (message.includes('not_a_member')) return 'Essa pessoa não faz mais parte do espaço.'
  if (message.includes('role_not_found')) return 'Esse cargo não existe mais.'
  if (message.includes('forbidden') || error?.code === '42501') return 'Você não tem permissão para gerenciar cargos neste espaço.'
  return message || 'Falha de conexão.'
}
