import { memo } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, ServerRole } from '../../../types'
import {
  CrownIcon,
  LockIcon,
  UserMinusIcon
} from '../../icons'

export interface SpaceMembersTabProps {
  editingSpace: Space
  editingSpaceMembers: any[]
  loadingEditingMembers: boolean
  memberSearchQuery: string
  setMemberSearchQuery: (q: string) => void
  selectedMemberId: string | null
  setSelectedMemberId: (id: string | null) => void
  user: User
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  memberRoleMap: Record<string, string[]>
  serverRoles: ServerRole[]
  canManageRole: (role: ServerRole) => boolean
  canManageMember: (memberUserId: string) => boolean
  canKickMember: (memberUserId: string) => boolean
  toggleMemberRole: (memberUserId: string, roleId: string, memberName?: string) => void
  handleRoleChange: (memberUserId: string, newRole: 'owner' | 'moderator' | 'member', memberName: string) => void
  handleKickMember: (memberId: string, memberName: string) => void
}

export const SpaceMembersTab = memo(function SpaceMembersTab({
  editingSpace,
  editingSpaceMembers,
  loadingEditingMembers,
  memberSearchQuery,
  setMemberSearchQuery,
  selectedMemberId,
  setSelectedMemberId,
  user,
  getUserHighestRole,
  memberRoleMap,
  serverRoles,
  canManageRole,
  canManageMember,
  canKickMember,
  toggleMemberRole,
  handleRoleChange,
  handleKickMember
}: SpaceMembersTabProps) {
  const assignableRoles = serverRoles.filter(r => !r.isEveryone)

  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header">
        <h2>Integrantes do Espaço</h2>
        <p>Total de {editingSpaceMembers.length} integrante(s) cadastrados no espaço <strong>{editingSpace.name}</strong>.</p>
      </div>

      <div className="members-search-wrapper">
        <input 
          type="text"
          value={memberSearchQuery}
          onChange={(e) => setMemberSearchQuery(e.target.value)}
          placeholder="Buscar integrantes no espaço..."
          className="members-search-input"
        />
      </div>

      {loadingEditingMembers ? (
        <div className="members-loading-state" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
          Carregando lista de membros...
        </div>
      ) : (
        <div className="space-settings-members-list-full">
          {editingSpaceMembers
            .filter(m => !memberSearchQuery.trim() || m.user?.display_name?.toLowerCase().includes(memberSearchQuery.toLowerCase().trim()))
            .map(member => {
              const isOwner = member.user?.id === editingSpace.creator_id
              const isSelf = member.user?.id === user.id
              const highestRole = member.user?.id ? getUserHighestRole(editingSpace.id, member.user.id) : null
              const assignedRoleIds = memberRoleMap[member.user?.id] || []
              const assignedRoles = assignableRoles.filter(r => assignedRoleIds.includes(r.id))
              const canKick = !!member.user?.id && canKickMember(member.user.id)
              const memberManageable = !!member.user?.id && canManageMember(member.user.id)

              const isSelected = selectedMemberId === member.user?.id

              return (
                <div key={member.user?.id} style={{ marginBottom: '8px' }}>
                  <div 
                    className={`settings-member-item-full ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedMemberId(isSelected ? null : member.user?.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}
                  >
                    <div className="settings-member-avatar-full">
                      {member.user?.avatar_url ? (
                        <img src={member.user.avatar_url} alt={member.user.display_name} />
                      ) : (
                        <span>{(member.user?.display_name || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    
                    <div className="settings-member-info-full" style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="settings-member-name-full" style={{ color: highestRole?.color || 'var(--text-primary)', fontWeight: 700, fontSize: '14px' }}>
                          {member.user?.display_name}
                        </span>
                        {isSelf && <span className="self-tag">(Você)</span>}
                      </div>
                      <span className="settings-member-joined" style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {member.joined_at ? `Entrou em ${new Date(member.joined_at).toLocaleDateString('pt-BR')}` : 'Membro'}
                      </span>
                    </div>

                    {/* Cargos Badges */}
                    <div className="settings-member-role-badges" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {isOwner && (
                        <span className="role-badge role-owner" style={{ background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CrownIcon /> Dono
                        </span>
                      )}

                      {assignedRoles.map(r => (
                        <span 
                          key={r.id}
                          style={{ 
                            background: `${r.color}22`, 
                            color: r.color, 
                            border: `1px solid ${r.color}66`, 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '4px' 
                          }}
                        >
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.color }} />
                          {r.name}
                        </span>
                      ))}
                    </div>

                    <span className={`member-row-manage-pill ${isSelected ? 'active' : ''}`}>
                      {isSelected ? 'Gerenciando ▴' : 'Opções ▾'}
                    </span>
                  </div>

                  {/* Painel de Gestão do Integrante ao Clicar na Linha */}
                  {isSelected && (
                    <div className="member-management-panel" onClick={e => e.stopPropagation()}>
                      <div className="member-mgmt-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="member-mgmt-title">Gerenciar {member.user?.display_name}</span>
                          {isSelf && <span className="self-tag">(Você)</span>}
                        </div>
                        <button 
                          type="button" 
                          className="member-mgmt-close-btn"
                          onClick={() => setSelectedMemberId(null)}
                          title="Fechar opções"
                        >
                          ✕ Fechar
                        </button>
                      </div>

                      {/* Atribuição de Cargos do Espaço */}
                      <div className="member-mgmt-section">
                        <label className="member-mgmt-label">Cargos do Espaço</label>
                        {!memberManageable && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                            {isOwner
                              ? 'Os cargos do dono só podem ser alterados por ele mesmo.'
                              : 'Esta pessoa está no seu nível ou acima na hierarquia: você não pode alterar os cargos dela.'}
                          </span>
                        )}
                        <div className="member-mgmt-roles-grid">
                          {assignableRoles.map(r => {
                            const hasRole = assignedRoleIds.includes(r.id)
                            const allowed = memberManageable && canManageRole(r)
                            return (
                              <button
                                key={r.id}
                                type="button"
                                disabled={!allowed}
                                title={allowed ? undefined : 'Só dá para atribuir cargos abaixo do seu cargo mais alto (e a quem está abaixo de você).'}
                                className={`member-mgmt-role-pill ${hasRole ? 'active' : ''}`}
                                style={{
                                  borderColor: hasRole ? r.color : 'var(--border-color)',
                                  color: hasRole ? r.color : 'var(--text-secondary)',
                                  background: hasRole ? `${r.color}22` : 'rgba(255, 255, 255, 0.04)',
                                  opacity: allowed ? 1 : 0.55
                                }}
                                onClick={() => toggleMemberRole(member.user?.id, r.id, member.user?.display_name)}
                              >
                                <span className="role-pill-check">{hasRole ? '✓' : '＋'}</span>
                                <span className="role-pill-dot" style={{ background: r.color }} />
                                <span>{r.name}</span>
                                {!allowed && <LockIcon style={{ width: '11px', height: '11px' }} />}
                              </button>
                            )
                          })}
                          {assignableRoles.length === 0 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nenhum cargo personalizado criado neste espaço.</span>
                          )}
                        </div>
                      </div>

                      {/* Posse do espaço. (Moderador e outros cargos são os "Cargos do Espaço" acima: o banco só
                          conhece "dono" e "membro" como cargo básico, então não há mais "Cargo Básico: Moderador".) */}
                      {editingSpace.creator_id === user.id && !isOwner && (
                        <div className="member-mgmt-section">
                          <label className="member-mgmt-label">Posse do Espaço</label>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="member-mgmt-role-pill"
                              style={{ color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.4)' }}
                              onClick={() => handleRoleChange(member.user?.id, 'owner', member.user?.display_name)}
                            >
                              <span>👑 Transferir Posse</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Zona de Moderação / Expulsar */}
                      {canKick && (
                        <div className="member-mgmt-danger-zone">
                          <button 
                            type="button" 
                            className="member-mgmt-kick-btn"
                            onClick={() => handleKickMember(member.user?.id, member.user?.display_name)}
                          >
                            <UserMinusIcon style={{ width: '14px', height: '14px' }} />
                            <span>Expulsar {member.user?.display_name} do Espaço</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          {editingSpaceMembers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              Nenhum membro encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  )
})
