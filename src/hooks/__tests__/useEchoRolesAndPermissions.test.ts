import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEchoRolesAndPermissions } from '../useEchoRolesAndPermissions'

const SPACE = { id: 'space-1', name: 'Espaço', creator_id: 'owner-1' } as any

const ROLE_ROWS = [
  { id: 'everyone', name: '@everyone', color: '#99aab5', position: 2147483647, is_everyone: true, permissions: { viewChannels: true, sendMessages: true } },
  { id: 'gestor', name: 'Gestor', color: '#22c55e', position: 0, hoist: true, permissions: { manageRoles: true, kickMembers: true } },
  { id: 'baixo', name: 'Baixo', color: '#ef4444', position: 1, permissions: {} }
]
const MEMBER_ROLE_ROWS = [
  { user_id: 'user-b', role_id: 'gestor' },
  { user_id: 'user-c', role_id: 'baixo' }
]

/** supabase-js mínimo: leituras de space_roles / space_member_roles e rpc() */
function makeSupabase(rpcResult: (fn: string, args: any) => { data?: any; error?: any } = () => ({ data: true })) {
  const rpc = vi.fn(async (fn: string, args: any) => ({ data: null, error: null, ...rpcResult(fn, args) }))
  const from = vi.fn((table: string) => {
    const rows = table === 'space_roles' ? ROLE_ROWS : MEMBER_ROLE_ROWS
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: async () => ({ data: rows, error: null }),
      then: (resolve: any) => resolve({ data: rows, error: null })
    }
    return chain
  })
  return { client: { from, rpc }, rpc, from }
}

describe('useEchoRolesAndPermissions', () => {
  let addAuditLog: any
  let showToast: any

  beforeEach(() => {
    localStorage.clear()
    addAuditLog = vi.fn()
    showToast = vi.fn()
  })

  const setup = (supabase: any, currentUserId = 'owner-1') =>
    renderHook(() => useEchoRolesAndPermissions({
      editingSpace: SPACE,
      spaces: [SPACE],
      currentSpaceId: SPACE.id,
      currentUserId,
      addAuditLog,
      showToast,
      supabase
    }))

  const load = async (result: any) => {
    await act(async () => {
      await result.current.loadSpaceRoles(SPACE.id)
      await result.current.loadMemberRoles(SPACE.id)
    })
  }

  it('não semeia cargos no cliente (o banco cria @everyone e Moderador com o espaço)', async () => {
    const { client, rpc } = makeSupabase()
    const { result } = setup(client)
    await load(result)
    expect(rpc).not.toHaveBeenCalled()
    expect(result.current.serverRoles.map(r => r.id)).toEqual(['gestor', 'baixo', 'everyone'])
  })

  it('permissões: @everyone + cargos; dono tem tudo', async () => {
    const { client } = makeSupabase()
    const { result } = setup(client)
    await load(result)
    expect(result.current.canUserDo(SPACE.id, 'user-x', 'sendMessages')).toBe(true)
    expect(result.current.canUserDo(SPACE.id, 'user-x', 'kickMembers')).toBe(false)
    expect(result.current.canUserDo(SPACE.id, 'user-b', 'kickMembers')).toBe(true)
    expect(result.current.canUserDo(SPACE.id, 'owner-1', 'manageSpace')).toBe(true)
  })

  it('hierarquia para quem está usando o app (B = Gestor)', async () => {
    const { client } = makeSupabase()
    const { result } = setup(client, 'user-b')
    await load(result)
    const [gestor, baixo] = result.current.serverRoles
    expect(result.current.canManageRole(SPACE.id, baixo)).toBe(true)
    expect(result.current.canManageRole(SPACE.id, gestor)).toBe(false)
    expect(result.current.canKickMember(SPACE.id, 'user-c')).toBe(true)
    expect(result.current.canKickMember(SPACE.id, 'owner-1')).toBe(false)
    expect(result.current.canKickMember(SPACE.id, 'user-b')).toBe(false)
  })

  it('dono sem cargos aparece com o cargo de exibição dourado', async () => {
    const { client } = makeSupabase()
    const { result } = setup(client)
    await load(result)
    expect(result.current.getUserHighestRole(SPACE.id, 'owner-1')?.color).toBe('#eab308')
    expect(result.current.getUserHighestRole(SPACE.id, 'user-c')?.id).toBe('baixo')
    expect(result.current.getUserHighestRole(SPACE.id, 'user-x')).toBeNull()
  })

  it('atribuir cargo chama set_space_member_role com a pessoa certa', async () => {
    const { client, rpc } = makeSupabase()
    const { result } = setup(client)
    await load(result)
    await act(async () => { await result.current.toggleMemberRole('user-x', 'baixo', 'Fulano') })
    expect(rpc).toHaveBeenCalledWith('set_space_member_role', { p_space_id: 'space-1', p_user_id: 'user-x', p_role_id: 'baixo', p_assign: true })
    expect(result.current.memberRoleMap['user-x']).toEqual(['baixo'])
    expect(addAuditLog).toHaveBeenCalledWith('space-1', expect.stringContaining('Fulano'))
  })

  it('se o banco recusar pela hierarquia, desfaz, explica e não registra ação', async () => {
    const { client } = makeSupabase(() => ({ error: { code: '42501', message: 'role_hierarchy' } }))
    const { result } = setup(client, 'user-b')
    await load(result)
    await act(async () => { await result.current.toggleMemberRole('user-c', 'baixo', 'Ciclano') })
    expect(result.current.memberRoleMap['user-c']).toEqual(['baixo'])
    expect(showToast).toHaveBeenCalledWith('Não foi possível alterar o cargo', expect.stringContaining('abaixo do seu cargo'), 'info')
    expect(addAuditLog).not.toHaveBeenCalled()
  })

  it('salvar cargo manda só o que mudou e aplica a resposta do banco', async () => {
    const { client, rpc } = makeSupabase((fn, args) => fn === 'update_space_role'
      ? { data: { ...ROLE_ROWS[2], name: args.p_changes.name, permissions: args.p_changes.permissions } }
      : { data: true })
    const { result } = setup(client)
    await load(result)
    let ok = false
    await act(async () => { ok = await result.current.handleUpdateRole('baixo', { name: 'Novato', color: '#ef4444', permissions: { kickMembers: true, speak: false } as any }) })
    expect(ok).toBe(true)
    expect(rpc).toHaveBeenCalledWith('update_space_role', { p_role_id: 'baixo', p_changes: { name: 'Novato', permissions: { kickMembers: true } } })
    expect(result.current.serverRoles.find(r => r.id === 'baixo')?.name).toBe('Novato')
  })

  it('reordenar manda a lista completa (sem o @everyone) e desfaz se recusado', async () => {
    const { client, rpc } = makeSupabase(() => ({ error: { message: 'role_hierarchy' } }))
    const { result } = setup(client)
    await load(result)
    await act(async () => { await result.current.moveRole('baixo', 'up') })
    expect(rpc).toHaveBeenCalledWith('reorder_space_roles', { p_space_id: 'space-1', p_role_ids: ['baixo', 'gestor'] })
    expect(result.current.serverRoles.map(r => r.id)).toEqual(['gestor', 'baixo', 'everyone'])
  })

  it('@everyone não pode ser excluído', async () => {
    const { client, rpc } = makeSupabase()
    const { result } = setup(client)
    await load(result)
    await act(async () => { await result.current.handleDeleteRole('everyone') })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('canal privado só aparece para cargos liberados', async () => {
    const { client } = makeSupabase()
    const { result } = setup(client)
    await load(result)
    const channel = { id: 'c1', name: 'secreto', type: 'text', space_id: SPACE.id, is_private: true, allowed_role_ids: ['baixo'] } as any
    expect(result.current.canViewChannel(channel, 'user-c')).toBe(true)
    expect(result.current.canViewChannel(channel, 'user-b')).toBe(false)
    expect(result.current.canViewChannel(channel, 'owner-1')).toBe(true)
  })
})
