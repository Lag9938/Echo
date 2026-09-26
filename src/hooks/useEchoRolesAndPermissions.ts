import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { ServerRole, RolePermissions, Space, Channel } from '../types'
import {
  OWNER_DISPLAY_ROLE,
  canManageMember as canManageMemberRule,
  canManageRole as canManageRoleRule,
  canViewChannel as canViewChannelRule,
  computePermissions,
  describeRoleError,
  getHighestRole,
  getHoistedRole,
  sanitizePermissions,
  sortRoles,
  type EffectivePermissions,
  type MemberContext
} from '../lib/permissions'

export const ROLE_COLOR_PRESETS = [
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#14b8a6'
]

export interface UseEchoRolesAndPermissionsOptions {
  editingSpace: Space | null
  spaces: Space[]
  /** Espaço aberto na tela (cargos exibidos no chat e na lista de membros) */
  currentSpaceId?: string | null
  currentUserId?: string | null
  addAuditLog: (spaceId: string, action: string) => void
  showToast: (title: string, message: string, type?: any) => void
  supabase: any
}

// v2: o cache antigo tinha cargos inventados pelo cliente (ex.: "role-owner" com administrador)
const ROLES_CACHE_KEY = 'echo-spaces-roles-v2'
const memberRolesCacheKey = (spaceId: string) => `echo-member-roles-v2-${spaceId}`

function readCache<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeCache(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

function mapRoleRow(r: any): ServerRole {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    position: r.position,
    permissions: r.permissions || {},
    isDefault: !!r.is_default,
    isEveryone: !!r.is_everyone,
    hoist: !!r.hoist
  }
}

export function useEchoRolesAndPermissions({
  editingSpace,
  spaces,
  currentSpaceId = null,
  currentUserId = null,
  addAuditLog,
  showToast,
  supabase
}: UseEchoRolesAndPermissionsOptions) {
  // Cargos e atribuições de cada espaço carregado (não só do último), para as checagens não
  // misturarem o espaço aberto com o espaço sendo editado nas configurações
  const [rolesBySpace, setRolesBySpace] = useState<Record<string, ServerRole[]>>({})
  const [memberRolesBySpace, setMemberRolesBySpace] = useState<Record<string, Record<string, string[]>>>({})
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const rolesBySpaceRef = useRef(rolesBySpace)
  const memberRolesBySpaceRef = useRef(memberRolesBySpace)
  useEffect(() => {
    rolesBySpaceRef.current = rolesBySpace
    memberRolesBySpaceRef.current = memberRolesBySpace
  }, [rolesBySpace, memberRolesBySpace])

  const rolesFor = useCallback((spaceId: string): ServerRole[] => {
    return rolesBySpace[spaceId] ?? sortRoles(readCache<Record<string, ServerRole[]>>(ROLES_CACHE_KEY, {})[spaceId] ?? [])
  }, [rolesBySpace])

  const memberRolesFor = useCallback((spaceId: string): Record<string, string[]> => {
    return memberRolesBySpace[spaceId] ?? readCache<Record<string, string[]>>(memberRolesCacheKey(spaceId), {})
  }, [memberRolesBySpace])

  const applyRoles = useCallback((spaceId: string, roles: ServerRole[]) => {
    const sorted = sortRoles(roles)
    setRolesBySpace(prev => ({ ...prev, [spaceId]: sorted }))
    const cache = readCache<Record<string, ServerRole[]>>(ROLES_CACHE_KEY, {})
    cache[spaceId] = sorted
    writeCache(ROLES_CACHE_KEY, cache)
    return sorted
  }, [])

  const applyMemberRoles = useCallback((spaceId: string, map: Record<string, string[]>) => {
    setMemberRolesBySpace(prev => ({ ...prev, [spaceId]: map }))
    writeCache(memberRolesCacheKey(spaceId), map)
  }, [])

  const loadSpaceRoles = useCallback(async (spaceId: string): Promise<ServerRole[]> => {
    const cached = readCache<Record<string, ServerRole[]>>(ROLES_CACHE_KEY, {})[spaceId]
    if (cached && !rolesBySpaceRef.current[spaceId]) {
      setRolesBySpace(prev => ({ ...prev, [spaceId]: sortRoles(cached) }))
    }
    if (!supabase) return sortRoles(cached ?? [])

    // Os cargos padrão (@everyone + Moderador) são criados pelo banco junto com o espaço: o cliente
    // não semeia mais nada (a semeadura no cliente criava cargos duplicados)
    const { data, error } = await supabase
      .from('space_roles')
      .select('*')
      .eq('space_id', spaceId)
      .order('position', { ascending: true })

    if (error || !data) {
      if (error) console.warn('Supabase load roles error:', error)
      return sortRoles(cached ?? [])
    }
    const roles = applyRoles(spaceId, data.map(mapRoleRow))
    setSelectedRoleId(current => (current && roles.some(r => r.id === current)) ? current : (roles[0]?.id ?? null))
    return roles
  }, [supabase, applyRoles])

  const loadMemberRoles = useCallback(async (spaceId: string) => {
    const cached = readCache<Record<string, string[]> | null>(memberRolesCacheKey(spaceId), null)
    if (cached && !memberRolesBySpaceRef.current[spaceId]) {
      setMemberRolesBySpace(prev => ({ ...prev, [spaceId]: cached }))
    }
    if (!supabase) return

    const { data, error } = await supabase
      .from('space_member_roles')
      .select('user_id, role_id')
      .eq('space_id', spaceId)

    if (error || !data) {
      if (error) console.warn('Supabase load member roles error:', error)
      return
    }
    const map: Record<string, string[]> = {}
    data.forEach((row: any) => {
      if (!map[row.user_id]) map[row.user_id] = []
      map[row.user_id].push(row.role_id)
    })
    applyMemberRoles(spaceId, map)
  }, [supabase, applyMemberRoles])

  // ─── Contexto de permissões ────────────────────────────────────────────────

  const getMemberContext = useCallback((spaceId: string, userId: string): MemberContext => {
    const space = spaces.find(s => s.id === spaceId)
    return {
      isOwner: !!space && space.creator_id === userId,
      roles: rolesFor(spaceId),
      assignedRoleIds: memberRolesFor(spaceId)[userId] || []
    }
  }, [spaces, rolesFor, memberRolesFor])

  const getMemberPermissions = useCallback((spaceId: string, userId: string): EffectivePermissions => {
    return computePermissions(getMemberContext(spaceId, userId))
  }, [getMemberContext])

  const canUserDo = useCallback((spaceId: string, userId: string, permissionKey: keyof RolePermissions): boolean => {
    return getMemberPermissions(spaceId, userId)[permissionKey]
  }, [getMemberPermissions])

  /** Cargo mais alto (cor do nome e insígnia). O dono sem cargos aparece com o cargo de exibição dourado. */
  const getUserHighestRole = useCallback((spaceId: string, userId: string): ServerRole | null => {
    const ctx = getMemberContext(spaceId, userId)
    const highest = getHighestRole(ctx.roles, ctx.assignedRoleIds)
    if (highest) return highest
    return ctx.isOwner ? OWNER_DISPLAY_ROLE : null
  }, [getMemberContext])

  /** Cargo usado para agrupar a pessoa na lista de membros (o mais alto marcado "exibir separadamente") */
  const getUserHoistedRole = useCallback((spaceId: string, userId: string): ServerRole | null => {
    const ctx = getMemberContext(spaceId, userId)
    return getHoistedRole(ctx.roles, ctx.assignedRoleIds)
  }, [getMemberContext])

  const canManageRole = useCallback((spaceId: string, role: ServerRole): boolean => {
    if (!currentUserId) return false
    return canManageRoleRule(getMemberContext(spaceId, currentUserId), role)
  }, [currentUserId, getMemberContext])

  const canManageMember = useCallback((spaceId: string, targetUserId: string): boolean => {
    if (!currentUserId) return false
    return canManageMemberRule(
      getMemberContext(spaceId, currentUserId),
      getMemberContext(spaceId, targetUserId),
      targetUserId === currentUserId
    )
  }, [currentUserId, getMemberContext])

  const canKickMember = useCallback((spaceId: string, targetUserId: string): boolean => {
    if (!currentUserId || targetUserId === currentUserId) return false
    const target = getMemberContext(spaceId, targetUserId)
    if (target.isOwner) return false
    return canUserDo(spaceId, currentUserId, 'kickMembers') && canManageMember(spaceId, targetUserId)
  }, [currentUserId, getMemberContext, canUserDo, canManageMember])

  const canViewChannel = useCallback((channel: Channel, userId: string): boolean => {
    return canViewChannelRule(channel, getMemberContext(channel.space_id, userId))
  }, [getMemberContext])

  // ─── Gestão de cargos (tudo passa pelas funções do banco, que aplicam a hierarquia) ─────────

  const reportError = useCallback((title: string, error: any) => {
    console.warn(`${title}:`, error)
    showToast(title, describeRoleError(error), 'info')
  }, [showToast])

  async function handleCreateRole(): Promise<ServerRole | null> {
    if (!editingSpace || !supabase) return null
    const spaceId = editingSpace.id
    const color = ROLE_COLOR_PRESETS[Math.floor(Math.random() * ROLE_COLOR_PRESETS.length)]
    const { data, error } = await supabase.rpc('create_space_role', {
      p_space_id: spaceId,
      p_name: 'Novo cargo',
      p_color: color,
      p_permissions: {},
      p_hoist: false
    })
    if (error || !data) {
      reportError('Não foi possível criar o cargo', error)
      return null
    }
    const created = mapRoleRow(data)
    applyRoles(spaceId, [...rolesFor(spaceId).filter(r => r.id !== created.id), created])
    setSelectedRoleId(created.id)
    addAuditLog(spaceId, `Criou o cargo "${created.name}"`)
    return created
  }

  async function handleUpdateRole(roleId: string, updates: Partial<ServerRole>): Promise<boolean> {
    if (!editingSpace || !supabase) return false
    const spaceId = editingSpace.id
    const before = rolesFor(spaceId).find(r => r.id === roleId)
    if (!before) return false

    const changes: Record<string, unknown> = {}
    if (updates.name !== undefined && updates.name !== before.name) changes.name = updates.name.trim()
    if (updates.color !== undefined && updates.color !== before.color) changes.color = updates.color
    if (updates.hoist !== undefined && updates.hoist !== !!before.hoist) changes.hoist = updates.hoist
    if (updates.isDefault !== undefined && updates.isDefault !== !!before.isDefault) changes.is_default = updates.isDefault
    if (updates.permissions !== undefined) changes.permissions = sanitizePermissions(updates.permissions)
    if (Object.keys(changes).length === 0) return true

    const { data, error } = await supabase.rpc('update_space_role', { p_role_id: roleId, p_changes: changes })
    if (error || !data) {
      reportError('Não foi possível salvar o cargo', error)
      return false
    }
    const updated = mapRoleRow(data)
    applyRoles(spaceId, rolesFor(spaceId).map(r => {
      if (r.id === roleId) return updated
      // O banco só deixa um cargo automático por espaço
      return updated.isDefault && r.isDefault ? { ...r, isDefault: false } : r
    }))
    addAuditLog(spaceId, `Editou o cargo "${updated.name}"`)
    return true
  }

  async function handleDeleteRole(roleId: string): Promise<boolean> {
    if (!editingSpace || !supabase) return false
    const spaceId = editingSpace.id
    const role = rolesFor(spaceId).find(r => r.id === roleId)
    if (!role) return false
    if (role.isEveryone) {
      showToast('Ação bloqueada', 'O @everyone não pode ser excluído.', 'info')
      return false
    }

    const { error } = await supabase.rpc('delete_space_role', { p_role_id: roleId })
    if (error) {
      reportError('Não foi possível excluir o cargo', error)
      return false
    }
    const remaining = rolesFor(spaceId)
      .filter(r => r.id !== roleId)
      .map(r => (!r.isEveryone && r.position > role.position ? { ...r, position: r.position - 1 } : r))
    const sorted = applyRoles(spaceId, remaining)
    const map = memberRolesFor(spaceId)
    applyMemberRoles(spaceId, Object.fromEntries(Object.entries(map).map(([uid, ids]) => [uid, ids.filter(id => id !== roleId)])))
    if (selectedRoleId === roleId) setSelectedRoleId(sorted[0]?.id ?? null)
    addAuditLog(spaceId, `Excluiu o cargo "${role.name}"`)
    showToast('Cargo excluído', `O cargo "${role.name}" foi removido.`, 'info')
    return true
  }

  async function moveRole(roleId: string, direction: 'up' | 'down') {
    if (!editingSpace || !supabase) return
    const spaceId = editingSpace.id
    const ordered = rolesFor(spaceId).filter(r => !r.isEveryone)
    const index = ordered.findIndex(r => r.id === roleId)
    const target = direction === 'up' ? index - 1 : index + 1
    if (index === -1 || target < 0 || target >= ordered.length) return

    const next = ordered.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    const previous = rolesFor(spaceId)
    const everyone = previous.filter(r => r.isEveryone)
    applyRoles(spaceId, [...next.map((r, i) => ({ ...r, position: i })), ...everyone])

    const { error } = await supabase.rpc('reorder_space_roles', { p_space_id: spaceId, p_role_ids: next.map(r => r.id) })
    if (error) {
      applyRoles(spaceId, previous)
      reportError('Não foi possível mover o cargo', error)
      return
    }
    addAuditLog(spaceId, `Reordenou o cargo "${ordered[index].name}"`)
  }

  async function toggleMemberRole(memberUserId: string, roleId: string, memberName?: string) {
    if (!editingSpace || !supabase) return
    const spaceId = editingSpace.id
    const previousMap = memberRolesFor(spaceId)
    const currentList = previousMap[memberUserId] || []
    const role = rolesFor(spaceId).find(r => r.id === roleId)
    const roleLabel = role?.name || roleId
    const isRemoving = currentList.includes(roleId)
    const nextList = isRemoving ? currentList.filter(id => id !== roleId) : [...currentList, roleId]

    // Mostra a mudança na hora (otimista) e desfaz se o servidor recusar
    applyMemberRoles(spaceId, { ...previousMap, [memberUserId]: nextList })

    let failure: any = null
    try {
      const { error } = await supabase.rpc('set_space_member_role', {
        p_space_id: spaceId,
        p_user_id: memberUserId,
        p_role_id: roleId,
        p_assign: !isRemoving
      })
      failure = error
    } catch (err: any) {
      failure = { message: err?.message || 'Falha de conexão.' }
    }

    if (failure) {
      applyMemberRoles(spaceId, previousMap)
      reportError('Não foi possível alterar o cargo', failure)
      return
    }

    addAuditLog(
      spaceId,
      isRemoving
        ? `Removeu o cargo "${roleLabel}" de ${memberName || memberUserId}`
        : `Atribuiu o cargo "${roleLabel}" para ${memberName || memberUserId}`
    )
  }

  const serverRoles = useMemo(() => (currentSpaceId ? rolesFor(currentSpaceId) : []), [currentSpaceId, rolesFor])
  const memberRoleMap = useMemo(() => (currentSpaceId ? memberRolesFor(currentSpaceId) : {}), [currentSpaceId, memberRolesFor])
  const editingRoles = useMemo(() => (editingSpace ? rolesFor(editingSpace.id) : []), [editingSpace, rolesFor])
  const editingMemberRoleMap = useMemo(() => (editingSpace ? memberRolesFor(editingSpace.id) : {}), [editingSpace, memberRolesFor])

  return {
    serverRoles,
    memberRoleMap,
    editingRoles,
    editingMemberRoleMap,
    selectedRoleId,
    setSelectedRoleId,
    loadSpaceRoles,
    loadServerRoles: loadSpaceRoles,
    loadMemberRoles,
    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
    moveRole,
    toggleMemberRole,
    getUserHighestRole,
    getUserHoistedRole,
    getMemberPermissions,
    canUserDo,
    canManageRole,
    canManageMember,
    canKickMember,
    canViewChannel
  }
}
