import { memo, useEffect, useMemo, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { RolePermissions, ServerRole, Space } from '../../../types'
import { ROLE_COLOR_PRESETS } from '../../../lib/formatters'
import {
  PERMISSION_CATEGORIES,
  sanitizePermissions,
  type EffectivePermissions,
  type PermissionKey
} from '../../../lib/permissions'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  HashtagIcon,
  LockIcon,
  MicIcon,
  PaletteIcon,
  PlusIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon,
  XIcon
} from '../../icons'

export interface SpaceRolesTabProps {
  editingSpace: Space
  user: User
  serverRoles: ServerRole[]
  memberRoleMap: Record<string, string[]>
  editingSpaceMembers: any[]
  selectedRoleId: string | null
  setSelectedRoleId: (id: string | null) => void
  handleCreateRole: () => Promise<ServerRole | null>
  handleUpdateRole: (roleId: string, updates: Partial<ServerRole>) => Promise<boolean>
  handleDeleteRole: (roleId: string) => Promise<boolean>
  moveRole: (roleId: string, direction: 'up' | 'down') => void
  myPermissions: EffectivePermissions
  canManageRole: (role: ServerRole) => boolean
  canManageMember: (memberUserId: string) => boolean
  toggleMemberRole: (memberUserId: string, roleId: string, memberName?: string) => void
  profileDisplayName: string
  displayName?: string
  showToast: (title: string, message: string, type?: any) => void
}

type EditorTab = 'display' | 'permissions' | 'members'

const CATEGORY_ICONS = {
  general: <ShieldIcon style={{ width: '13px', height: '13px' }} />,
  membership: <UsersIcon style={{ width: '13px', height: '13px' }} />,
  text: <HashtagIcon style={{ width: '13px', height: '13px' }} />,
  voice: <MicIcon style={{ width: '13px', height: '13px' }} />,
  advanced: <LockIcon style={{ width: '13px', height: '13px' }} />
} as const

const CATEGORY_BADGE = {
  general: 'channels',
  membership: 'mod',
  text: 'channels',
  voice: 'mod',
  advanced: 'admin'
} as const

function sameRole(a: ServerRole | null, b: ServerRole | null): boolean {
  if (!a || !b) return a === b
  const pa = sanitizePermissions(a.permissions)
  const pb = sanitizePermissions(b.permissions)
  return a.name === b.name
    && a.color === b.color
    && !!a.hoist === !!b.hoist
    && !!a.isDefault === !!b.isDefault
    && Object.keys(pa).length === Object.keys(pb).length
    && Object.keys(pa).every(k => pb[k as PermissionKey])
}

export const SpaceRolesTab = memo(function SpaceRolesTab({
  editingSpace,
  user,
  serverRoles,
  memberRoleMap,
  editingSpaceMembers,
  selectedRoleId,
  setSelectedRoleId,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole,
  moveRole,
  myPermissions,
  canManageRole,
  canManageMember,
  toggleMemberRole,
  profileDisplayName,
  displayName,
  showToast
}: SpaceRolesTabProps) {
  const currentRole = serverRoles.find(r => r.id === selectedRoleId) || serverRoles[0] || null
  const editable = currentRole ? canManageRole(currentRole) : false

  const [editorTab, setEditorTab] = useState<EditorTab>('display')
  const [draft, setDraft] = useState<ServerRole | null>(currentRole)
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [flashUnsaved, setFlashUnsaved] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [permSearch, setPermSearch] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  // Guardado com o id do cargo: ao trocar de cargo o painel fecha sozinho
  const [addMembersRoleId, setAddMembersRoleId] = useState<string | null>(null)
  const showAddMembers = !!currentRole && addMembersRoleId === currentRole.id
  const setShowAddMembers = (update: (v: boolean) => boolean) =>
    setAddMembersRoleId(update(showAddMembers) && currentRole ? currentRole.id : null)
  const lastServerRoleRef = useRef<ServerRole | null>(currentRole)

  // O rascunho acompanha o cargo do servidor enquanto não há edição pendente
  useEffect(() => {
    const previous = lastServerRoleRef.current
    lastServerRoleRef.current = currentRole
    setDraft(d => {
      if (!currentRole) return null
      if (!d || d.id !== currentRole.id || sameRole(d, previous)) return { ...currentRole, permissions: { ...currentRole.permissions } }
      return d
    })
  }, [currentRole])

  // O @everyone só tem a aba de permissões
  const activeEditorTab: EditorTab = currentRole?.isEveryone ? 'permissions' : editorTab

  const dirty = !!draft && !!currentRole && draft.id === currentRole.id && !sameRole(draft, currentRole)

  const nudgeUnsaved = () => {
    setFlashUnsaved(true)
    setTimeout(() => setFlashUnsaved(false), 700)
  }

  const selectRole = (roleId: string) => {
    if (roleId === currentRole?.id) return
    if (dirty) {
      nudgeUnsaved()
      return
    }
    setConfirmDeleteId(null)
    setMemberSearch('')
    setSelectedRoleId(roleId)
  }

  const onCreate = async () => {
    if (dirty) {
      nudgeUnsaved()
      return
    }
    setCreating(true)
    const created = await handleCreateRole()
    setCreating(false)
    if (created) setEditorTab('display')
  }

  const onSave = async () => {
    if (!draft || !currentRole) return
    if (!draft.name.trim()) {
      showToast('Nome obrigatório', 'Dê um nome ao cargo antes de salvar.', 'info')
      return
    }
    setSaving(true)
    const updates: Partial<ServerRole> = { permissions: draft.permissions }
    if (!currentRole.isEveryone) {
      updates.name = draft.name
      updates.color = draft.color
      updates.hoist = !!draft.hoist
      updates.isDefault = !!draft.isDefault
    }
    const ok = await handleUpdateRole(currentRole.id, updates)
    setSaving(false)
    if (ok) showToast('Cargo salvo', `As alterações em "${draft.name}" foram aplicadas.`, 'info')
  }

  const onReset = () => {
    if (currentRole) setDraft({ ...currentRole, permissions: { ...currentRole.permissions } })
  }

  const onDelete = async () => {
    if (!currentRole) return
    if (confirmDeleteId !== currentRole.id) {
      setConfirmDeleteId(currentRole.id)
      return
    }
    setConfirmDeleteId(null)
    await handleDeleteRole(currentRole.id)
  }

  const setPermission = (key: PermissionKey, value: boolean) => {
    setDraft(d => d ? { ...d, permissions: { ...d.permissions, [key]: value } } : d)
  }

  // Tirar permissões é sempre permitido (só conceder exige ter a permissão)
  const clearPermissions = () => {
    const none: RolePermissions = {}
    setDraft(d => d ? { ...d, permissions: none } : d)
  }

  const memberCountFor = (role: ServerRole) => {
    if (role.isEveryone) return editingSpaceMembers.length
    return Object.values(memberRoleMap).filter(ids => ids.includes(role.id)).length
  }

  // Seta para cima só se o cargo de cima também está abaixo de mim (não dá para subir além do próprio nível)
  const orderedRoles = useMemo(() => serverRoles.filter(r => !r.isEveryone), [serverRoles])

  const membersWithRole = useMemo(() => {
    if (!currentRole || currentRole.isEveryone) return []
    return editingSpaceMembers.filter(m => m.user?.id && (memberRoleMap[m.user.id] || []).includes(currentRole.id))
  }, [currentRole, editingSpaceMembers, memberRoleMap])

  const membersWithoutRole = useMemo(() => {
    if (!currentRole || currentRole.isEveryone) return []
    return editingSpaceMembers.filter(m => m.user?.id && !(memberRoleMap[m.user.id] || []).includes(currentRole.id))
  }, [currentRole, editingSpaceMembers, memberRoleMap])

  const permQuery = permSearch.trim().toLowerCase()
  const memberQuery = memberSearch.trim().toLowerCase()
  const previewName = profileDisplayName || displayName || 'Seu Nome'
  const shownRole = draft && currentRole && draft.id === currentRole.id ? draft : currentRole
  const isAdminDraft = !!shownRole?.permissions?.administrator

  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
        <div>
          <h2>Cargos do Espaço</h2>
          <p>Use cargos para organizar os membros e definir o que cada um pode fazer. Cargos mais altos na lista mandam nos de baixo.</p>
        </div>
        <button
          type="button"
          className="add-space-card-btn"
          style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
          onClick={onCreate}
          disabled={creating || !myPermissions.manageRoles}
        >
          <PlusIcon />
          <span>{creating ? 'Criando…' : 'Criar Cargo'}</span>
        </button>
      </div>

      <div className="roles-management-layout" style={{ marginTop: '16px' }}>
        {/* Lista de cargos: topo da hierarquia em cima, @everyone sempre por último */}
        <div className="roles-sidebar-list">
          <span className="roles-list-caption">CARGOS — {orderedRoles.length}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {serverRoles.map(role => {
              const isSelected = currentRole?.id === role.id
              const manageable = canManageRole(role)
              const idx = orderedRoles.findIndex(r => r.id === role.id)
              const above = idx > 0 ? orderedRoles[idx - 1] : null
              const below = idx >= 0 && idx < orderedRoles.length - 1 ? orderedRoles[idx + 1] : null
              return (
                <div key={role.id}>
                  {role.isEveryone && orderedRoles.length > 0 && <div className="roles-list-divider" />}
                  <div
                    className={`role-list-item ${isSelected ? 'active' : ''}`}
                    onClick={() => selectRole(role.id)}
                    title={manageable ? undefined : 'Este cargo está no seu nível ou acima: você não pode editá-lo'}
                  >
                    <span className="role-list-dot" style={{ background: role.isEveryone ? 'var(--text-muted)' : role.color }} />
                    <span className="role-list-name" style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      <span className="role-list-name-text">{role.name}</span>
                      {role.isDefault && <span className="role-default-pill">AUTO</span>}
                    </span>
                    {!manageable && <LockIcon style={{ width: '12px', height: '12px', color: 'var(--text-muted)', flexShrink: 0 }} />}
                    <span className="role-list-count" title="Membros com este cargo">
                      <UsersIcon style={{ width: '11px', height: '11px' }} />
                      {memberCountFor(role)}
                    </span>
                    {!role.isEveryone && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        <button
                          type="button"
                          className="settings-channel-delete-btn"
                          style={{ width: '22px', height: '22px', padding: 0 }}
                          onClick={(e) => { e.stopPropagation(); if (dirty) nudgeUnsaved(); else moveRole(role.id, 'up') }}
                          disabled={!manageable || !above || !canManageRole(above)}
                          title="Subir cargo"
                        >
                          <ArrowUpIcon style={{ width: '12px', height: '12px' }} />
                        </button>
                        <button
                          type="button"
                          className="settings-channel-delete-btn"
                          style={{ width: '22px', height: '22px', padding: 0 }}
                          onClick={(e) => { e.stopPropagation(); if (dirty) nudgeUnsaved(); else moveRole(role.id, 'down') }}
                          disabled={!manageable || !below}
                          title="Descer cargo"
                        >
                          <ArrowDownIcon style={{ width: '12px', height: '12px' }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="roles-list-hint">
            Membros usam a cor do cargo mais alto que têm. O @everyone vale para todos que estão no espaço.
          </p>
        </div>

        {/* Editor do cargo selecionado */}
        {currentRole && shownRole && (
          <div className="role-editor-pane">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0, minWidth: 0 }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: currentRole.isEveryone ? 'var(--text-muted)' : shownRole.color, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Editar cargo — {shownRole.name || 'sem nome'}</span>
              </h3>
              {editable && !currentRole.isEveryone && (
                <button
                  type="button"
                  className={`role-delete-btn ${confirmDeleteId === currentRole.id ? 'confirming' : ''}`}
                  onClick={onDelete}
                  onBlur={() => setConfirmDeleteId(null)}
                >
                  <TrashIcon style={{ width: '13px', height: '13px' }} />
                  <span>{confirmDeleteId === currentRole.id ? 'Clique de novo para excluir' : 'Excluir cargo'}</span>
                </button>
              )}
            </div>

            {!editable && (
              <div className="role-locked-banner">
                <LockIcon style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                <span>
                  {myPermissions.manageRoles
                    ? 'Este cargo está no mesmo nível ou acima do seu cargo mais alto. Só quem está acima dele pode editá-lo.'
                    : 'Você não tem a permissão "Gerenciar cargos".'}
                </span>
              </div>
            )}

            <div className="role-editor-tabs">
              {!currentRole.isEveryone && (
                <button type="button" className={activeEditorTab === 'display' ? 'active' : ''} onClick={() => setEditorTab('display')}>Exibição</button>
              )}
              <button type="button" className={activeEditorTab === 'permissions' ? 'active' : ''} onClick={() => setEditorTab('permissions')}>Permissões</button>
              {!currentRole.isEveryone && (
                <button type="button" className={activeEditorTab === 'members' ? 'active' : ''} onClick={() => setEditorTab('members')}>
                  Membros ({membersWithRole.length})
                </button>
              )}
            </div>

            {currentRole.isEveryone && (
              <p className="role-everyone-note">
                O <strong>@everyone</strong> é a base de permissões de todo mundo no espaço. Cargos só <em>somam</em> permissões a ele —
                para restringir algo para todos, desligue aqui.
              </p>
            )}

            {activeEditorTab === 'display' && !currentRole.isEveryone && (
              <div className="role-editor-section">
                <div className="selector-card" style={{ marginBottom: '16px' }}>
                  <label>Nome do cargo</label>
                  <input
                    type="text"
                    className="role-name-input"
                    value={shownRole.name}
                    maxLength={64}
                    onChange={(e) => setDraft(d => d ? { ...d, name: e.target.value } : d)}
                    placeholder="Nome do cargo"
                    disabled={!editable}
                  />
                </div>

                <div className="selector-card" style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <PaletteIcon />
                    <span>Cor do cargo</span>
                  </label>
                  <p className="role-field-hint">Membros usam a cor do cargo mais alto que têm.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {ROLE_COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        type="button"
                        disabled={!editable}
                        onClick={() => setDraft(d => d ? { ...d, color: c } : d)}
                        className={`role-color-swatch ${shownRole.color.toLowerCase() === c ? 'selected' : ''}`}
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={shownRole.color}
                      disabled={!editable}
                      onChange={(e) => setDraft(d => d ? { ...d, color: e.target.value } : d)}
                      className="role-color-custom"
                      title="Cor personalizada"
                    />
                  </div>
                </div>

                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Exibir membros separadamente</strong>
                    <span className="role-perm-card-desc">Quem tem este cargo aparece num grupo próprio na lista de membros online.</span>
                  </div>
                  <label className="echo-switch">
                    <input type="checkbox" checked={!!shownRole.hoist} disabled={!editable} onChange={(e) => setDraft(d => d ? { ...d, hoist: e.target.checked } : d)} />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>

                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">
                      Cargo automático para novos membros {shownRole.isDefault && <span className="role-default-pill">ATIVO</span>}
                    </strong>
                    <span className="role-perm-card-desc">Quem entrar no espaço por convite ganha este cargo na hora. Só um cargo pode ser automático.</span>
                  </div>
                  <label className="echo-switch">
                    <input type="checkbox" checked={!!shownRole.isDefault} disabled={!editable} onChange={(e) => setDraft(d => d ? { ...d, isDefault: e.target.checked } : d)} />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>

                {/* Prévia do nome e da insígnia no chat */}
                <div className="role-chat-preview-box" style={{ marginTop: '18px' }}>
                  <span className="role-preview-label">PRÉVIA NO CHAT</span>
                  <div className="role-chat-preview-msg">
                    <div className="role-preview-avatar">{previewName[0].toUpperCase()}</div>
                    <div className="role-preview-content">
                      <div className="role-preview-meta">
                        <span className="role-preview-author" style={{ color: shownRole.color }}>{previewName}</span>
                        <span className="role-pill-badge" style={{ background: `${shownRole.color}22`, color: shownRole.color, borderColor: `${shownRole.color}66` }}>
                          <span style={{ background: shownRole.color }} className="role-pill-dot" />
                          {shownRole.name || 'Cargo'}
                        </span>
                        <span className="role-preview-time">Hoje às 12:00</span>
                      </div>
                      <p className="role-preview-text">Esta é a cor e a insígnia de quem tem este cargo.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeEditorTab === 'permissions' && (
              <div className="role-editor-section">
                <div className="role-perm-toolbar">
                  <div className="role-search-box">
                    <SearchIcon style={{ width: '13px', height: '13px' }} />
                    <input value={permSearch} onChange={e => setPermSearch(e.target.value)} placeholder="Buscar permissões" />
                  </div>
                  {editable && (
                    <button type="button" className="role-link-btn" onClick={clearPermissions}>Limpar permissões</button>
                  )}
                </div>

                <div className="role-permissions-section">
                  {PERMISSION_CATEGORIES.map(category => {
                    const perms = category.permissions.filter(p => !permQuery || p.label.toLowerCase().includes(permQuery) || p.description.toLowerCase().includes(permQuery))
                    if (perms.length === 0) return null
                    return (
                      <div key={category.id} className="role-perms-category">
                        <div className="role-perms-category-header">
                          <span className={`role-cat-icon-badge ${CATEGORY_BADGE[category.id]}`}>{CATEGORY_ICONS[category.id]}</span>
                          <span>{category.title}</span>
                        </div>
                        {perms.map(p => {
                          const on = !!shownRole.permissions?.[p.key]
                          const coveredByAdmin = isAdminDraft && p.key !== 'administrator'
                          // Ninguém concede o que não tem (mas pode tirar)
                          const cannotGrant = !on && !myPermissions[p.key]
                          const disabled = !editable || coveredByAdmin || cannotGrant
                          return (
                            <div key={p.key} className={`role-perm-card ${p.key === 'administrator' && on ? 'danger' : ''}`}>
                              <div className="role-perm-card-info">
                                <strong className="role-perm-card-title">{p.label}</strong>
                                <span className="role-perm-card-desc">
                                  {p.description}
                                  {cannotGrant && editable && !coveredByAdmin && <em className="role-perm-missing"> Você não tem esta permissão, então não pode concedê-la.</em>}
                                </span>
                              </div>
                              <label className="echo-switch" title={coveredByAdmin ? 'Incluída em Administrador' : undefined}>
                                <input type="checkbox" checked={on || coveredByAdmin} disabled={disabled} onChange={(e) => setPermission(p.key, e.target.checked)} />
                                <span className="echo-switch-slider"></span>
                              </label>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {activeEditorTab === 'members' && !currentRole.isEveryone && (
              <div className="role-editor-section">
                <div className="role-perm-toolbar">
                  <div className="role-search-box">
                    <SearchIcon style={{ width: '13px', height: '13px' }} />
                    <input value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Buscar membros" />
                  </div>
                  {editable && (
                    <button type="button" className="role-add-members-btn" onClick={() => setShowAddMembers(v => !v)}>
                      <PlusIcon style={{ width: '13px', height: '13px' }} />
                      <span>Adicionar membros</span>
                    </button>
                  )}
                </div>

                {showAddMembers && editable && (
                  <div className="role-add-members-panel">
                    {membersWithoutRole.filter(m => !memberQuery || m.user.display_name?.toLowerCase().includes(memberQuery)).map(m => {
                      const allowed = canManageMember(m.user.id)
                      return (
                        <button
                          key={m.user.id}
                          type="button"
                          className="role-member-pick"
                          disabled={!allowed}
                          title={allowed ? undefined : 'Esta pessoa está no seu nível ou acima'}
                          onClick={() => toggleMemberRole(m.user.id, currentRole.id, m.user.display_name)}
                        >
                          <span className="role-member-avatar">
                            {m.user.avatar_url ? <img src={m.user.avatar_url} alt="" /> : (m.user.display_name || '?')[0].toUpperCase()}
                          </span>
                          <span className="role-member-name">{m.user.display_name}</span>
                          {allowed ? <PlusIcon style={{ width: '12px', height: '12px' }} /> : <LockIcon style={{ width: '12px', height: '12px' }} />}
                        </button>
                      )
                    })}
                    {membersWithoutRole.length === 0 && <span className="role-empty-text">Todos os membros já têm este cargo.</span>}
                  </div>
                )}

                <div className="role-members-list">
                  {membersWithRole.filter(m => !memberQuery || m.user.display_name?.toLowerCase().includes(memberQuery)).map(m => {
                    const allowed = editable && canManageMember(m.user.id)
                    return (
                      <div key={m.user.id} className="role-member-row">
                        <span className="role-member-avatar">
                          {m.user.avatar_url ? <img src={m.user.avatar_url} alt="" /> : (m.user.display_name || '?')[0].toUpperCase()}
                        </span>
                        <span className="role-member-name" style={{ color: shownRole.color }}>
                          {m.user.display_name}
                          {m.user.id === user.id && <span className="self-tag"> (Você)</span>}
                          {m.user.id === editingSpace.creator_id && <span className="self-tag"> 👑</span>}
                        </span>
                        {allowed && (
                          <button
                            type="button"
                            className="role-member-remove"
                            title={`Remover o cargo de ${m.user.display_name}`}
                            onClick={() => toggleMemberRole(m.user.id, currentRole.id, m.user.display_name)}
                          >
                            <XIcon style={{ width: '12px', height: '12px' }} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {membersWithRole.length === 0 && (
                    <span className="role-empty-text">Ninguém tem este cargo ainda.</span>
                  )}
                </div>
              </div>
            )}

            {dirty && editable && (
              <div className={`role-unsaved-bar ${flashUnsaved ? 'flash' : ''}`}>
                <span>Cuidado — você tem alterações que não foram salvas!</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="role-link-btn" onClick={onReset} disabled={saving}>Redefinir</button>
                  <button type="button" className="role-save-btn" onClick={onSave} disabled={saving}>
                    {saving ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
