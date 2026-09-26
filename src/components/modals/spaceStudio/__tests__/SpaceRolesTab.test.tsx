import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { SpaceRolesTab } from '../SpaceRolesTab'
import { canManageRole, computePermissions, type MemberContext } from '../../../../lib/permissions'
import type { ServerRole } from '../../../../types'

const everyone: ServerRole = { id: 'everyone', name: '@everyone', color: '#99aab5', position: 2147483647, isEveryone: true, permissions: { viewChannels: true, sendMessages: true } }
const gestor: ServerRole = { id: 'gestor', name: 'Gestor', color: '#22c55e', position: 0, hoist: true, permissions: { manageRoles: true, kickMembers: true } }
const baixo: ServerRole = { id: 'baixo', name: 'Baixo', color: '#ef4444', position: 1, permissions: {} }
const ROLES = [gestor, baixo, everyone]
const MEMBERS = [
  { user: { id: 'user-b', display_name: 'Bia' } },
  { user: { id: 'user-c', display_name: 'Caio' } }
]

function renderTab(selectedRoleId: string, overrides: Partial<Parameters<typeof SpaceRolesTab>[0]> = {}) {
  // Quem usa o app é a Bia (Gestor): gerencia só o que está abaixo dela
  const me: MemberContext = { isOwner: false, roles: ROLES, assignedRoleIds: ['gestor'] }
  const props = {
    editingSpace: { id: 's1', name: 'Espaço', description: '', creator_id: 'owner' },
    user: { id: 'user-b' } as any,
    serverRoles: ROLES,
    memberRoleMap: { 'user-b': ['gestor'], 'user-c': ['baixo'] },
    editingSpaceMembers: MEMBERS,
    selectedRoleId,
    setSelectedRoleId: vi.fn(),
    handleCreateRole: vi.fn().mockResolvedValue(null),
    handleUpdateRole: vi.fn().mockResolvedValue(true),
    handleDeleteRole: vi.fn().mockResolvedValue(true),
    moveRole: vi.fn(),
    myPermissions: computePermissions(me),
    canManageRole: (role: ServerRole) => canManageRole(me, role),
    canManageMember: (id: string) => id !== 'user-b',
    toggleMemberRole: vi.fn(),
    profileDisplayName: 'Bia',
    showToast: vi.fn(),
    ...overrides
  }
  return { ...render(<SpaceRolesTab {...props} />), props }
}

describe('SpaceRolesTab', () => {
  it('cargo acima (o próprio) fica bloqueado para edição', () => {
    renderTab('gestor')
    expect(screen.getByText(/mesmo nível ou acima do seu cargo mais alto/)).toBeTruthy()
    expect((screen.getByPlaceholderText('Nome do cargo') as HTMLInputElement).disabled).toBe(true)
    expect(screen.queryByText('Excluir cargo')).toBeNull()
  })

  it('edita um cargo abaixo com rascunho: só salva ao clicar em "Salvar alterações"', async () => {
    const { props } = renderTab('baixo')
    const name = screen.getByPlaceholderText('Nome do cargo') as HTMLInputElement
    expect(name.disabled).toBe(false)
    expect(screen.queryByText(/alterações que não foram salvas/)).toBeNull()

    fireEvent.change(name, { target: { value: 'Novato' } })
    expect(props.handleUpdateRole).not.toHaveBeenCalled()
    expect(screen.getByText(/alterações que não foram salvas/)).toBeTruthy()

    await act(async () => { fireEvent.click(screen.getByText('Salvar alterações')) })
    expect(props.handleUpdateRole).toHaveBeenCalledWith('baixo', expect.objectContaining({ name: 'Novato' }))
  })

  it('não troca de cargo com alterações pendentes; "Redefinir" descarta', () => {
    const { props } = renderTab('baixo')
    fireEvent.change(screen.getByPlaceholderText('Nome do cargo'), { target: { value: 'X' } })
    fireEvent.click(screen.getByText('Gestor'))
    expect(props.setSelectedRoleId).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Redefinir'))
    expect((screen.getByPlaceholderText('Nome do cargo') as HTMLInputElement).value).toBe('Baixo')
    expect(screen.queryByText(/alterações que não foram salvas/)).toBeNull()
  })

  it('permissões: não dá para conceder o que não tem (Administrador), mas dá para o que tem', () => {
    renderTab('baixo')
    fireEvent.click(screen.getByText('Permissões'))
    const toggleFor = (label: string) => screen.getByText(label).closest('.role-perm-card')!.querySelector('input') as HTMLInputElement
    expect(toggleFor('Administrador').disabled).toBe(true)
    expect(toggleFor('Expulsar membros').disabled).toBe(false)
    fireEvent.click(toggleFor('Expulsar membros'))
    expect(screen.getByText(/alterações que não foram salvas/)).toBeTruthy()
  })

  it('@everyone: só permissões, sem nome/cor/exclusão', () => {
    renderTab('everyone')
    expect(screen.queryByPlaceholderText('Nome do cargo')).toBeNull()
    expect(screen.queryByText('Exibição')).toBeNull()
    expect(screen.queryByText('Excluir cargo')).toBeNull()
    expect(screen.getByText(/base de permissões de todo mundo/)).toBeTruthy()
  })

  it('excluir pede confirmação com um segundo clique', async () => {
    const { props } = renderTab('baixo')
    fireEvent.click(screen.getByText('Excluir cargo'))
    expect(props.handleDeleteRole).not.toHaveBeenCalled()
    await act(async () => { fireEvent.click(screen.getByText('Clique de novo para excluir')) })
    expect(props.handleDeleteRole).toHaveBeenCalledWith('baixo')
  })

  it('aba Membros lista quem tem o cargo e permite remover', () => {
    const { props } = renderTab('baixo')
    fireEvent.click(screen.getByText('Membros (1)'))
    expect(screen.getByText('Caio')).toBeTruthy()
    fireEvent.click(screen.getByTitle('Remover o cargo de Caio'))
    expect(props.toggleMemberRole).toHaveBeenCalledWith('user-c', 'baixo', 'Caio')
  })
})
