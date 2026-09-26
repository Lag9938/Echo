import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEchoRolesAndPermissions } from '../useEchoRolesAndPermissions'

const SPACE = { id: 'space-1', name: 'Espaço', creator_id: 'owner-1' } as any

/** Cadeia mínima do supabase-js para space_member_roles: insert e delete().match().select() */
function makeSupabase(result: { insertError?: any; deleted?: any[] | null; deleteError?: any }) {
  const insert = vi.fn().mockResolvedValue({ error: result.insertError ?? null })
  const select = vi.fn().mockResolvedValue({ data: result.deleted ?? [], error: result.deleteError ?? null })
  const match = vi.fn().mockReturnValue({ select })
  const del = vi.fn().mockReturnValue({ match })
  const from = vi.fn().mockReturnValue({ insert, delete: del })
  return { client: { from }, insert, match }
}

describe('useEchoRolesAndPermissions.toggleMemberRole', () => {
  let addAuditLog: any
  let showToast: any

  beforeEach(() => {
    localStorage.clear()
    addAuditLog = vi.fn()
    showToast = vi.fn()
  })

  const setup = (supabase: any) =>
    renderHook(() => useEchoRolesAndPermissions({ editingSpace: SPACE, spaces: [SPACE], addAuditLog, showToast, supabase }))

  it('grava o cargo para a pessoa certa (a ordem dos argumentos é usuário, cargo, nome)', async () => {
    const { client, insert } = makeSupabase({})
    const { result } = setup(client)

    await act(async () => { await result.current.toggleMemberRole('user-9', 'role-3', 'Fulano') })

    expect(insert).toHaveBeenCalledWith({ space_id: 'space-1', user_id: 'user-9', role_id: 'role-3' })
    expect(result.current.memberRoleMap['user-9']).toEqual(['role-3'])
    expect(addAuditLog).toHaveBeenCalledWith('space-1', expect.stringContaining('Fulano'))
    expect(showToast).not.toHaveBeenCalled()
  })

  it('se o banco recusar (RLS), desfaz a mudança, avisa e não registra ação que não aconteceu', async () => {
    const { client } = makeSupabase({ insertError: { code: '42501', message: 'new row violates row-level security policy' } })
    const { result } = setup(client)

    await act(async () => { await result.current.toggleMemberRole('user-9', 'role-3', 'Fulano') })

    expect(result.current.memberRoleMap['user-9'] ?? []).toEqual([])
    expect(showToast).toHaveBeenCalledWith('Não foi possível alterar o cargo', expect.stringContaining('dono'), 'info')
    expect(addAuditLog).not.toHaveBeenCalled()
  })

  it('remover: o banco devolve as linhas apagadas; vazio significa que não deixou e a mudança é desfeita', async () => {
    const ok = makeSupabase({ deleted: [{ role_id: 'role-3' }] })
    const first = setup(ok.client)
    await act(async () => { await first.result.current.toggleMemberRole('user-9', 'role-3', 'Fulano') }) // atribui
    await act(async () => { await first.result.current.toggleMemberRole('user-9', 'role-3', 'Fulano') }) // remove
    expect(ok.match).toHaveBeenCalledWith({ space_id: 'space-1', user_id: 'user-9', role_id: 'role-3' })
    expect(first.result.current.memberRoleMap['user-9']).toEqual([])

    const blocked = makeSupabase({ deleted: [] })
    const second = setup(blocked.client)
    await act(async () => { await second.result.current.toggleMemberRole('user-9', 'role-3', 'Fulano') }) // atribui
    showToast.mockClear()
    await act(async () => { await second.result.current.toggleMemberRole('user-9', 'role-3', 'Fulano') }) // tenta remover
    expect(second.result.current.memberRoleMap['user-9']).toEqual(['role-3'])
    expect(showToast).toHaveBeenCalledWith('Não foi possível alterar o cargo', expect.any(String), 'info')
  })
})
