import { describe, it, expect } from 'vitest'
import type { ServerRole } from '../../types'
import {
  EVERYONE_DEFAULT_PERMISSIONS,
  NO_ROLE_POSITION,
  canGrantPermission,
  canManageMember,
  canManageRole,
  canViewChannel,
  computePermissions,
  describeRoleError,
  getHighestRole,
  getHoistedRole,
  getTopPosition,
  sanitizePermissions,
  sortRoles,
  type MemberContext
} from '../permissions'

const everyone: ServerRole = { id: 'everyone', name: '@everyone', color: '#99aab5', position: 2147483647, isEveryone: true, permissions: { ...EVERYONE_DEFAULT_PERMISSIONS } }
const admin: ServerRole = { id: 'admin', name: 'Admin', color: '#fff', position: 0, hoist: true, permissions: { administrator: true } }
const gestor: ServerRole = { id: 'gestor', name: 'Gestor', color: '#0f0', position: 1, hoist: true, permissions: { manageRoles: true, kickMembers: true } }
const mod: ServerRole = { id: 'mod', name: 'Mod', color: '#00f', position: 2, hoist: false, permissions: { manageMessages: true } }
const baixo: ServerRole = { id: 'baixo', name: 'Baixo', color: '#f00', position: 3, permissions: {} }
const roles = [baixo, everyone, mod, admin, gestor]

const ctx = (assignedRoleIds: string[], isOwner = false): MemberContext => ({ isOwner, roles, assignedRoleIds })

describe('permissões efetivas', () => {
  it('membro sem cargos recebe o @everyone', () => {
    const p = computePermissions(ctx([]))
    expect(p.sendMessages).toBe(true)
    expect(p.connect).toBe(true)
    expect(p.manageMessages).toBe(false)
  })

  it('cargos somam permissões ao @everyone', () => {
    const p = computePermissions(ctx(['mod', 'gestor']))
    expect(p.manageMessages && p.manageRoles && p.kickMembers && p.sendMessages).toBe(true)
    expect(p.manageSpace).toBe(false)
  })

  it('tirar do @everyone tira de todo mundo que não tem cargo que dê de volta', () => {
    const muted: ServerRole = { ...everyone, permissions: { viewChannels: true } }
    const p = computePermissions({ isOwner: false, roles: [muted, mod], assignedRoleIds: ['mod'] })
    expect(p.sendMessages).toBe(false)
    expect(p.manageMessages).toBe(true)
  })

  it('administrador e dono têm tudo', () => {
    expect(Object.values(computePermissions(ctx(['admin']))).every(Boolean)).toBe(true)
    expect(Object.values(computePermissions(ctx([], true))).every(Boolean)).toBe(true)
  })

  it('sem @everyone carregado (banco antigo) usa o padrão em vez de travar a pessoa', () => {
    const p = computePermissions({ isOwner: false, roles: [mod], assignedRoleIds: [] })
    expect(p.sendMessages).toBe(true)
  })

  it('quem não é membro não tem nada', () => {
    expect(Object.values(computePermissions({ isOwner: false, isMember: false, roles, assignedRoleIds: ['admin'] })).some(Boolean)).toBe(false)
  })
})

describe('hierarquia', () => {
  it('ordena do topo para baixo com @everyone por último', () => {
    expect(sortRoles(roles).map(r => r.id)).toEqual(['admin', 'gestor', 'mod', 'baixo', 'everyone'])
  })

  it('posição mais alta: dono -1, sem cargos fica abaixo de tudo', () => {
    expect(getTopPosition(ctx([], true))).toBe(-1)
    expect(getTopPosition(ctx([]))).toBe(NO_ROLE_POSITION)
    expect(getTopPosition(ctx(['baixo', 'gestor']))).toBe(1)
  })

  it('gerencia só cargos abaixo do próprio cargo mais alto', () => {
    const b = ctx(['gestor'])
    expect(canManageRole(b, mod)).toBe(true)
    expect(canManageRole(b, gestor)).toBe(false)
    expect(canManageRole(b, admin)).toBe(false)
    expect(canManageRole(b, everyone)).toBe(true)
    expect(canManageRole(ctx(['mod']), baixo)).toBe(false) // sem Gerenciar Cargos
  })

  it('gerencia só membros abaixo; o dono só por ele mesmo', () => {
    const b = ctx(['gestor'])
    expect(canManageMember(b, ctx(['mod']), false)).toBe(true)
    expect(canManageMember(b, ctx(['gestor']), false)).toBe(false)
    expect(canManageMember(b, ctx([], true), false)).toBe(false)
    expect(canManageMember(b, b, true)).toBe(true)
    expect(canManageMember(ctx([], true), ctx([], true), true)).toBe(true)
  })

  it('não concede permissão que não tem', () => {
    expect(canGrantPermission(ctx(['gestor']), 'kickMembers')).toBe(true)
    expect(canGrantPermission(ctx(['gestor']), 'administrator')).toBe(false)
  })

  it('cor vem do cargo mais alto; grupo da lista vem do mais alto com "exibir separadamente"', () => {
    expect(getHighestRole(roles, ['baixo', 'mod'])?.id).toBe('mod')
    expect(getHoistedRole(roles, ['baixo', 'mod'])).toBeNull()
    expect(getHoistedRole(roles, ['mod', 'gestor'])?.id).toBe('gestor')
  })
})

describe('canais', () => {
  const priv = { is_private: true, allowed_role_ids: ['mod'] }

  it('canal privado: só cargos liberados e administradores', () => {
    expect(canViewChannel(priv, ctx(['mod']))).toBe(true)
    expect(canViewChannel(priv, ctx(['gestor']))).toBe(false)
    expect(canViewChannel(priv, ctx(['admin']))).toBe(true)
    expect(canViewChannel(priv, ctx([], true))).toBe(true)
  })

  it('sem Ver Canais não vê nem os públicos', () => {
    const blind: ServerRole = { ...everyone, permissions: {} }
    expect(canViewChannel({ is_private: false }, { isOwner: false, roles: [blind], assignedRoleIds: [] })).toBe(false)
  })
})

describe('utilitários', () => {
  it('sanitiza permissões como o banco (só chaves conhecidas com true)', () => {
    expect(sanitizePermissions({ kickMembers: true, speak: false, bogus: true } as any)).toEqual({ kickMembers: true })
  })

  it('traduz os erros das funções do banco', () => {
    expect(describeRoleError({ message: 'missing_permission:administrator' })).toContain('Administrador')
    expect(describeRoleError({ message: 'role_hierarchy' })).toContain('abaixo do seu cargo')
    expect(describeRoleError({ code: 'PGRST202', message: 'Could not find the function' })).toContain('migração 11')
  })
})
