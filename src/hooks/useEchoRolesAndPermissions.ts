import { useState, useCallback } from 'react'
import type { ServerRole, RolePermissions, Space } from '../types'

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
  addAuditLog: (spaceId: string, action: string) => void
  showToast: (title: string, message: string, type?: any) => void
  supabase: any
}

export function useEchoRolesAndPermissions({
  editingSpace,
  spaces,
  addAuditLog,
  showToast,
  supabase
}: UseEchoRolesAndPermissionsOptions) {
  const [serverRoles, setServerRoles] = useState<ServerRole[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [memberRoleMap, setMemberRoleMap] = useState<Record<string, string[]>>({}) // userId -> roleIds[]

  function saveRolesForSpace(spaceId: string, updatedRoles: ServerRole[]) {
    let rolesMap: Record<string, ServerRole[]> = {}
    try {
      rolesMap = JSON.parse(localStorage.getItem('echo-spaces-roles') || '{}')
    } catch {
      rolesMap = {}
    }
    rolesMap[spaceId] = updatedRoles
    localStorage.setItem('echo-spaces-roles', JSON.stringify(rolesMap))
    setServerRoles(updatedRoles)
  }

  async function loadSpaceRoles(spaceId: string): Promise<ServerRole[]> {
    let rolesMap: Record<string, ServerRole[]> = {}
    try {
      rolesMap = JSON.parse(localStorage.getItem('echo-spaces-roles') || '{}')
    } catch {
      rolesMap = {}
    }
    let localRoles = rolesMap[spaceId] || []
    if (localRoles.length > 0) {
      setServerRoles(localRoles)
      if (!selectedRoleId || !localRoles.some(r => r.id === selectedRoleId)) {
        setSelectedRoleId(localRoles[0].id)
      }
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('space_roles')
          .select('*')
          .eq('space_id', spaceId)
          .order('position', { ascending: true })

        if (!error && data && data.length > 0) {
          const dbRoles: ServerRole[] = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            color: r.color,
            position: r.position,
            permissions: r.permissions || {},
            isDefault: !!(r.is_default || r.isDefault)
          }))
          setServerRoles(dbRoles)
          rolesMap[spaceId] = dbRoles
          localStorage.setItem('echo-spaces-roles', JSON.stringify(rolesMap))
          if (!selectedRoleId || !dbRoles.some(r => r.id === selectedRoleId)) {
            setSelectedRoleId(dbRoles[0].id)
          }
          return dbRoles
        } else if (!error && (!data || data.length === 0)) {
          // Seed default roles in Supabase
          const defaultRoles = [
            {
              space_id: spaceId,
              name: '👑 Dono',
              color: '#eab308',
              position: 0,
              permissions: {
                administrator: true,
                manageChannels: true,
                manageMessages: true,
                kickMembers: true,
                muteMembers: true,
                moveMembers: true,
                disconnectMembers: true,
                sendInAnnouncementChannels: true
              },
              is_default: false
            },
            {
              space_id: spaceId,
              name: '🛡️ Moderador',
              color: '#3b82f6',
              position: 1,
              permissions: {
                manageChannels: true,
                manageMessages: true,
                kickMembers: true,
                muteMembers: true,
                moveMembers: true,
                disconnectMembers: true,
                sendInAnnouncementChannels: true
              },
              is_default: false
            },
            {
              space_id: spaceId,
              name: '👤 Membro',
              color: '#99aab5',
              position: 2,
              permissions: {
                sendInAnnouncementChannels: false,
                muteMembers: false,
                moveMembers: false,
                disconnectMembers: false
              },
              is_default: true
            }
          ]

          const { data: inserted } = await supabase
            .from('space_roles')
            .insert(defaultRoles)
            .select()

          if (inserted && inserted.length > 0) {
            const formatted: ServerRole[] = inserted.map((r: any) => ({
              id: r.id,
              name: r.name,
              color: r.color,
              position: r.position,
              permissions: r.permissions || {},
              isDefault: !!(r.is_default || r.isDefault)
            }))
            setServerRoles(formatted)
            rolesMap[spaceId] = formatted
            localStorage.setItem('echo-spaces-roles', JSON.stringify(rolesMap))
            setSelectedRoleId(formatted[0].id)
            return formatted
          }
        }
      } catch (err) {
        console.warn("Supabase load roles error:", err)
      }
    }

    if (!localRoles || localRoles.length === 0) {
      localRoles = [
        {
          id: 'role-owner',
          name: '👑 Dono',
          color: '#eab308',
          position: 0,
          permissions: {
            administrator: true,
            manageChannels: true,
            manageMessages: true,
            kickMembers: true,
            muteMembers: true,
            moveMembers: true,
            disconnectMembers: true,
            sendInAnnouncementChannels: true
          }
        },
        {
          id: 'role-mod',
          name: '🛡️ Moderador',
          color: '#3b82f6',
          position: 1,
          permissions: {
            manageChannels: true,
            manageMessages: true,
            kickMembers: true,
            muteMembers: true,
            moveMembers: true,
            disconnectMembers: true,
            sendInAnnouncementChannels: true
          }
        },
        {
          id: 'role-member',
          name: '👤 Membro',
          color: '#99aab5',
          position: 2,
          permissions: {
            sendInAnnouncementChannels: false,
            muteMembers: false,
            moveMembers: false,
            disconnectMembers: false
          }
        }
      ]
      rolesMap[spaceId] = localRoles
      localStorage.setItem('echo-spaces-roles', JSON.stringify(rolesMap))
    }
    setServerRoles(localRoles)
    if (!selectedRoleId || !localRoles.some(r => r.id === selectedRoleId)) {
      setSelectedRoleId(localRoles[0].id)
    }
    return localRoles
  }

  async function loadMemberRoles(spaceId: string) {
    try {
      const map = JSON.parse(localStorage.getItem(`echo-member-roles-${spaceId}`) || '{}')
      setMemberRoleMap(map)
    } catch {
      setMemberRoleMap({})
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('space_member_roles')
          .select('user_id, role_id')
          .eq('space_id', spaceId)

        if (!error && data) {
          const map: Record<string, string[]> = {}
          data.forEach((row: any) => {
            if (!map[row.user_id]) map[row.user_id] = []
            map[row.user_id].push(row.role_id)
          })
          setMemberRoleMap(map)
          localStorage.setItem(`echo-member-roles-${spaceId}`, JSON.stringify(map))
        }
      } catch (err) {
        console.warn("Supabase load member roles error:", err)
      }
    }
  }

  async function handleCreateRole() {
    if (!editingSpace) return
    const newName = 'Novo Cargo'
    const newColor = ROLE_COLOR_PRESETS[Math.floor(Math.random() * ROLE_COLOR_PRESETS.length)]
    const newPosition = serverRoles.length
    const newPerms = {
      manageChannels: false,
      manageMessages: false,
      kickMembers: false,
      muteMembers: false,
      moveMembers: false,
      disconnectMembers: false,
      sendInAnnouncementChannels: false
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('space_roles')
          .insert({
            space_id: editingSpace.id,
            name: newName,
            color: newColor,
            position: newPosition,
            permissions: newPerms
          })
          .select()
          .single()

        if (!error && data) {
          const createdRole: ServerRole = {
            id: data.id,
            name: data.name,
            color: data.color,
            position: data.position,
            permissions: data.permissions || {}
          }
          const updated = [...serverRoles, createdRole]
          setServerRoles(updated)
          setSelectedRoleId(createdRole.id)
          saveRolesForSpace(editingSpace.id, updated)
          addAuditLog(editingSpace.id, `Criou o cargo "${createdRole.name}"`)
          showToast("Cargo Criado!", `Cargo "${createdRole.name}" foi adicionado.`, "info")
          return
        }
      } catch (err) {
        console.warn("Supabase create role error:", err)
      }
    }

    const newRole: ServerRole = {
      id: `role-${Date.now()}`,
      name: newName,
      color: newColor,
      position: newPosition,
      permissions: newPerms
    }
    const updated = [...serverRoles, newRole]
    saveRolesForSpace(editingSpace.id, updated)
    setSelectedRoleId(newRole.id)
    addAuditLog(editingSpace.id, `Criou o cargo "${newRole.name}"`)
    showToast("Cargo Criado!", `Cargo "${newRole.name}" foi adicionado.`, "info")
  }

  async function handleUpdateRole(roleId: string, updates: Partial<ServerRole>) {
    if (!editingSpace) return
    let updated = serverRoles.map(r => r.id === roleId ? { ...r, ...updates } : r)
    if (updates.isDefault) {
      updated = updated.map(r => r.id === roleId ? { ...r, isDefault: true } : { ...r, isDefault: false })
    }
    saveRolesForSpace(editingSpace.id, updated)

    if (supabase && !roleId.startsWith('role-')) {
      try {
        const dbPayload: any = {}
        if (updates.name !== undefined) dbPayload.name = updates.name
        if (updates.color !== undefined) dbPayload.color = updates.color
        if (updates.position !== undefined) dbPayload.position = updates.position
        if (updates.permissions !== undefined) dbPayload.permissions = updates.permissions
        if (updates.isDefault !== undefined) {
          if (updates.isDefault) {
            await supabase.from('space_roles').update({ is_default: false }).eq('space_id', editingSpace.id)
          }
          dbPayload.is_default = updates.isDefault
        }
        await supabase
          .from('space_roles')
          .update(dbPayload)
          .eq('id', roleId)
      } catch (err) {
        console.warn("Supabase update role error:", err)
      }
    }
  }

  async function handleDeleteRole(roleId: string) {
    if (!editingSpace) return
    const roleToDelete = serverRoles.find(r => r.id === roleId)
    if (!roleToDelete) return
    if (roleToDelete.position === 0 || roleToDelete.name.toLowerCase().includes('dono') || roleToDelete.name.toLowerCase().includes('membro')) {
      showToast("Ação Bloqueada", "Cargos essenciais do sistema não podem ser excluídos.", "info")
      return
    }
    const updated = serverRoles.filter(r => r.id !== roleId)
    saveRolesForSpace(editingSpace.id, updated)
    if (selectedRoleId === roleId) {
      setSelectedRoleId(updated[0]?.id || null)
    }
    // Remove from member roles
    const memberMap = { ...memberRoleMap }
    Object.keys(memberMap).forEach(uid => {
      memberMap[uid] = memberMap[uid].filter(id => id !== roleId)
    })
    setMemberRoleMap(memberMap)
    localStorage.setItem(`echo-member-roles-${editingSpace.id}`, JSON.stringify(memberMap))

    if (supabase && !roleId.startsWith('role-')) {
      try {
        await supabase.from('space_roles').delete().eq('id', roleId)
        await supabase.from('space_member_roles').delete().eq('role_id', roleId)
      } catch (err) {
        console.warn("Supabase delete role error:", err)
      }
    }

    addAuditLog(editingSpace.id, `Excluiu o cargo "${roleToDelete.name}"`)
    showToast("Cargo Excluído", `O cargo "${roleToDelete.name}" foi removido.`, "info")
  }

  async function moveRole(roleId: string, direction: 'up' | 'down') {
    if (!editingSpace) return
    const list = [...serverRoles]
    const index = list.findIndex(r => r.id === roleId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === list.length - 1) return
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    const temp = list[index]
    list[index] = list[targetIdx]
    list[targetIdx] = temp
    list.forEach((r, idx) => { r.position = idx })
    saveRolesForSpace(editingSpace.id, list)

    if (supabase) {
      try {
        for (const r of list) {
          if (!r.id.startsWith('role-')) {
            await supabase.from('space_roles').update({ position: r.position }).eq('id', r.id)
          }
        }
      } catch (err) {
        console.warn("Supabase move role error:", err)
      }
    }
  }

  async function toggleMemberRole(memberUserId: string, roleId: string, memberName?: string) {
    if (!editingSpace) return
    const currentList = memberRoleMap[memberUserId] || []
    let nextList: string[] = []
    const roleObj = serverRoles.find(r => r.id === roleId)
    const isRemoving = currentList.includes(roleId)

    if (isRemoving) {
      nextList = currentList.filter(id => id !== roleId)
      addAuditLog(editingSpace.id, `Removeu o cargo "${roleObj?.name || roleId}" de ${memberName || memberUserId}`)
    } else {
      nextList = [...currentList, roleId]
      addAuditLog(editingSpace.id, `Atribuiu o cargo "${roleObj?.name || roleId}" para ${memberName || memberUserId}`)
    }
    const updatedMap = { ...memberRoleMap, [memberUserId]: nextList }
    setMemberRoleMap(updatedMap)
    localStorage.setItem(`echo-member-roles-${editingSpace.id}`, JSON.stringify(updatedMap))

    if (supabase) {
      try {
        if (isRemoving) {
          await supabase
            .from('space_member_roles')
            .delete()
            .match({ space_id: editingSpace.id, user_id: memberUserId, role_id: roleId })
        } else {
          await supabase
            .from('space_member_roles')
            .insert({
              space_id: editingSpace.id,
              user_id: memberUserId,
              role_id: roleId
            })
        }
      } catch (err) {
        console.warn("Supabase toggle member role error:", err)
      }
    }
  }

  const getUserHighestRole = useCallback((spaceId: string, userId: string): ServerRole | null => {
    const space = spaces.find(s => s.id === spaceId)
    let roles = serverRoles
    if (!roles || roles.length === 0) {
      try {
        const rolesMap = JSON.parse(localStorage.getItem('echo-spaces-roles') || '{}')
        roles = rolesMap[spaceId] || []
      } catch {}
    }
    
    // If user is owner
    if (space && space.creator_id === userId) {
      const ownerRole = roles.find(r => r.id === 'role-owner' || r.permissions?.administrator || r.name.toLowerCase().includes('dono'))
      if (ownerRole) return ownerRole
      return {
        id: 'role-owner',
        name: '👑 Dono',
        color: '#eab308',
        position: 0,
        permissions: { administrator: true }
      }
    }

    let memberRoles: Record<string, string[]> = memberRoleMap
    if (!memberRoles[userId]) {
      try {
        const stored = JSON.parse(localStorage.getItem(`echo-member-roles-${spaceId}`) || '{}')
        if (stored[userId]) memberRoles = stored
      } catch {}
    }
    const assignedIds = memberRoles[userId] || []
    if (assignedIds.length === 0) return null

    const matched = roles.filter(r => assignedIds.includes(r.id)).sort((a, b) => a.position - b.position)
    return matched[0] || null
  }, [spaces, serverRoles, memberRoleMap])

  const canUserDo = useCallback((spaceId: string, userId: string, permissionKey: keyof RolePermissions): boolean => {
    const space = spaces.find(s => s.id === spaceId)
    if (space && space.creator_id === userId) return true

    let roles = serverRoles
    if (!roles || roles.length === 0) {
      try {
        const rolesMap = JSON.parse(localStorage.getItem('echo-spaces-roles') || '{}')
        roles = rolesMap[spaceId] || []
      } catch {}
    }

    let memberRoles: Record<string, string[]> = memberRoleMap
    if (!memberRoles[userId]) {
      try {
        const stored = JSON.parse(localStorage.getItem(`echo-member-roles-${spaceId}`) || '{}')
        if (stored[userId]) memberRoles = stored
      } catch {}
    }
    const assignedIds = memberRoles[userId] || []
    const userRoles = roles.filter(r => assignedIds.includes(r.id))

    return userRoles.some(r => r.permissions?.administrator || r.permissions?.[permissionKey])
  }, [spaces, serverRoles, memberRoleMap])

  return {
    serverRoles,
    setServerRoles,
    selectedRoleId,
    setSelectedRoleId,
    memberRoleMap,
    setMemberRoleMap,
    loadSpaceRoles,
    loadServerRoles: loadSpaceRoles,
    loadMemberRoles,
    saveRolesForSpace,
    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
    moveRole,
    toggleMemberRole,
    getUserHighestRole,
    canUserDo
  }
}
