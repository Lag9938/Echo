import { memo } from 'react'
import type { ServerRole } from '../../../types'
import { ROLE_COLOR_PRESETS } from '../../../lib/formatters'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  HashtagIcon,
  PaletteIcon,
  PlusIcon,
  ShieldIcon,
  TrashIcon,
  UsersIcon
} from '../../icons'

export interface SpaceRolesTabProps {
  serverRoles: ServerRole[]
  selectedRoleId: string | null
  setSelectedRoleId: (id: string | null) => void
  handleCreateRole: () => void
  handleUpdateRole: (roleId: string, updates: Partial<ServerRole>) => void
  handleDeleteRole: (roleId: string) => void
  moveRole: (roleId: string, direction: 'up' | 'down') => void
  profileDisplayName: string
  displayName?: string
}

export const SpaceRolesTab = memo(function SpaceRolesTab({
  serverRoles,
  selectedRoleId,
  setSelectedRoleId,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole,
  moveRole,
  profileDisplayName,
  displayName
}: SpaceRolesTabProps) {
  const currentRole = serverRoles.find(r => r.id === selectedRoleId) || serverRoles[0]

  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Cargos do Espaço</h2>
          <p>Crie cargos personalizados, defina cores vibrantes e gerencie permissões detalhadas para seus membros.</p>
        </div>
        <button 
          type="button" 
          className="add-space-card-btn" 
          style={{ width: 'auto', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={handleCreateRole}
        >
          <PlusIcon />
          <span>Criar Cargo</span>
        </button>
      </div>

      <div className="roles-management-layout" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px', marginTop: '16px' }}>
        {/* Lista de Cargos na esquerda */}
        <div className="roles-sidebar-list" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '12px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', padding: '4px 8px', display: 'block', marginBottom: '8px' }}>
            CARGOS ({serverRoles.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {serverRoles.map((role, idx) => {
              const isSelected = selectedRoleId === role.id
              return (
                <div 
                  key={role.id} 
                  className={`role-list-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedRoleId(role.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isSelected ? 'var(--bg-tertiary)' : 'transparent',
                    border: isSelected ? '1px solid var(--accent-color)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all .15s ease'
                  }}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: role.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{role.name}</span>
                    {role.isDefault && <span className="role-default-pill">PADRÃO</span>}
                  </span>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button 
                      type="button" 
                      className="settings-channel-delete-btn" 
                      style={{ width: '22px', height: '22px', padding: 0 }} 
                      onClick={(e) => { e.stopPropagation(); moveRole(role.id, 'up') }}
                      disabled={idx === 0}
                      title="Mover cargo para cima"
                    >
                      <ArrowUpIcon style={{ width: '12px', height: '12px' }} />
                    </button>
                    <button 
                      type="button" 
                      className="settings-channel-delete-btn" 
                      style={{ width: '22px', height: '22px', padding: 0 }} 
                      onClick={(e) => { e.stopPropagation(); moveRole(role.id, 'down') }}
                      disabled={idx === serverRoles.length - 1}
                      title="Mover cargo para baixo"
                    >
                      <ArrowDownIcon style={{ width: '12px', height: '12px' }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Editor do Cargo Selecionado na direita */}
        {currentRole && (
          <div className="role-editor-pane" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '20px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: currentRole.color }} />
                Editar Cargo: {currentRole.name}
              </h3>
              {currentRole.id !== 'role-owner' && currentRole.id !== 'role-member' && (
                <button 
                  type="button" 
                  className="settings-channel-delete-btn" 
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px', color: '#e0554c' }}
                  onClick={() => handleDeleteRole(currentRole.id)}
                >
                  <TrashIcon style={{ width: '13px', height: '13px' }} />
                  <span>Excluir Cargo</span>
                </button>
              )}
            </div>

            <div className="selector-card" style={{ marginBottom: '16px' }}>
              <label>Nome do Cargo</label>
              <input 
                type="text" 
                value={currentRole.name} 
                onChange={(e) => handleUpdateRole(currentRole.id, { name: e.target.value })}
                placeholder="Nome do cargo"
                disabled={currentRole.id === 'role-owner' || currentRole.id === 'role-member'}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>

            {/* Role Color Picker */}
            <div className="selector-card" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <PaletteIcon />
                <span>Cor do Cargo</span>
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                {ROLE_COLOR_PRESETS.map(c => (
                  <button 
                    key={c}
                    type="button"
                    onClick={() => handleUpdateRole(currentRole.id, { color: c })}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: c,
                      border: currentRole.color === c ? '2.5px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                      boxShadow: currentRole.color === c ? '0 0 0 2px var(--accent-color)' : 'none',
                      cursor: 'pointer'
                    }}
                  />
                ))}
                <input 
                  type="color" 
                  value={currentRole.color} 
                  onChange={(e) => handleUpdateRole(currentRole.id, { color: e.target.value })}
                  style={{ width: '32px', height: '32px', border: 'none', borderRadius: '50%', background: 'transparent', cursor: 'pointer' }}
                  title="Cor personalizada"
                />
              </div>
            </div>

            {/* Cargo Padrão para Novos Integrantes */}
            {currentRole.id !== 'role-owner' && !currentRole.name.toLowerCase().includes('dono') && (
              <div className="role-default-setting-card" style={{ marginBottom: '20px', background: 'var(--bg-primary)', border: currentRole.isDefault ? '1.5px solid var(--accent-color)' : '1px solid var(--border-color)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div className="role-perm-card-info" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <strong className="role-perm-card-title" style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Cargo Padrão de Novos Membros</strong>
                    {currentRole.isDefault && (
                      <span className="role-default-pill">PADRÃO ATIVO</span>
                    )}
                  </div>
                  <span className="role-perm-card-desc" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Atribuir este cargo automaticamente a qualquer pessoa assim que ela entrar no espaço.
                  </span>
                </div>
                <label className="echo-switch">
                  <input 
                    type="checkbox" 
                    checked={!!currentRole.isDefault} 
                    onChange={(e) => handleUpdateRole(currentRole.id, { isDefault: e.target.checked })}
                  />
                  <span className="echo-switch-slider"></span>
                </label>
              </div>
            )}

            {/* Live Chat Preview of Role */}
            <div className="role-chat-preview-box">
              <span className="role-preview-label">PRÉVIA DE EXIBIÇÃO NO CHAT</span>
              <div className="role-chat-preview-msg">
                <div className="role-preview-avatar">
                  {(profileDisplayName || displayName || 'U')[0].toUpperCase()}
                </div>
                <div className="role-preview-content">
                  <div className="role-preview-meta">
                    <span className="role-preview-author" style={{ color: currentRole.color }}>
                      {profileDisplayName || displayName || 'Seu Nome'}
                    </span>
                    <span className="role-pill-badge" style={{ background: `${currentRole.color}22`, color: currentRole.color, borderColor: `${currentRole.color}66` }}>
                      <span style={{ background: currentRole.color }} className="role-pill-dot" />
                      {currentRole.name}
                    </span>
                    <span className="role-preview-time">Hoje às 12:00</span>
                  </div>
                  <p className="role-preview-text">Esta é a cor e a insígnia que identificam os membros com este cargo no chat.</p>
                </div>
              </div>
            </div>

            {/* Permissões Categorizadas com Modern Toggle Switches */}
            <div className="role-permissions-section">
              {/* Categoria 1: Administração Geral */}
              <div className="role-perms-category">
                <div className="role-perms-category-header">
                  <span className="role-cat-icon-badge admin">
                    <ShieldIcon style={{ width: '13px', height: '13px' }} />
                  </span>
                  <span>Administração Geral</span>
                </div>
                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Administrador</strong>
                    <span className="role-perm-card-desc">Membros com este cargo têm todas as permissões e ignoram quaisquer restrições de canais.</span>
                  </div>
                  <label className="echo-switch">
                    <input 
                      type="checkbox" 
                      checked={!!currentRole.permissions?.administrator} 
                      disabled={currentRole.id === 'role-owner' || currentRole.name.toLowerCase().includes('dono')}
                      onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, administrator: e.target.checked } })}
                    />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>
              </div>

              {/* Categoria 2: Moderação & Membros */}
              <div className="role-perms-category">
                <div className="role-perms-category-header">
                  <span className="role-cat-icon-badge mod">
                    <UsersIcon style={{ width: '13px', height: '13px' }} />
                  </span>
                  <span>Moderação & Membros</span>
                </div>
                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Expulsar Membros</strong>
                    <span className="role-perm-card-desc">Permite remover membros indesejados do espaço.</span>
                  </div>
                  <label className="echo-switch">
                    <input 
                      type="checkbox" 
                      checked={!!currentRole.permissions?.kickMembers || !!currentRole.permissions?.administrator} 
                      disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                      onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, kickMembers: e.target.checked } })}
                    />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>

                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Moderação de Voz</strong>
                    <span className="role-perm-card-desc">Permite silenciar microfones de outros membros no servidor.</span>
                  </div>
                  <label className="echo-switch">
                    <input 
                      type="checkbox" 
                      checked={!!currentRole.permissions?.muteMembers || !!currentRole.permissions?.administrator} 
                      disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                      onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, muteMembers: e.target.checked } })}
                    />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>

                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Mover Membros da Chamada</strong>
                    <span className="role-perm-card-desc">Permite transferir participantes entre salas de voz conectadas.</span>
                  </div>
                  <label className="echo-switch">
                    <input 
                      type="checkbox" 
                      checked={!!currentRole.permissions?.moveMembers || !!currentRole.permissions?.administrator} 
                      disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                      onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, moveMembers: e.target.checked } })}
                    />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>

                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Expulsar da Chamada</strong>
                    <span className="role-perm-card-desc">Permite desconectar participantes de salas de voz ativas.</span>
                  </div>
                  <label className="echo-switch">
                    <input 
                      type="checkbox" 
                      checked={!!currentRole.permissions?.disconnectMembers || !!currentRole.permissions?.administrator} 
                      disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                      onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, disconnectMembers: e.target.checked } })}
                    />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>
              </div>

              {/* Categoria 3: Canais & Mensagens */}
              <div className="role-perms-category">
                <div className="role-perms-category-header">
                  <span className="role-cat-icon-badge channels">
                    <HashtagIcon style={{ width: '13px', height: '13px' }} />
                  </span>
                  <span>Canais & Mensagens</span>
                </div>
                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Gerenciar Canais</strong>
                    <span className="role-perm-card-desc">Permite criar, renomear, reordenar e excluir canais de texto e voz.</span>
                  </div>
                  <label className="echo-switch">
                    <input 
                      type="checkbox" 
                      checked={!!currentRole.permissions?.manageChannels || !!currentRole.permissions?.administrator} 
                      disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                      onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, manageChannels: e.target.checked } })}
                    />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>

                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Gerenciar Mensagens</strong>
                    <span className="role-perm-card-desc">Permite apagar ou fixar mensagens de outros membros no chat.</span>
                  </div>
                  <label className="echo-switch">
                    <input 
                      type="checkbox" 
                      checked={!!currentRole.permissions?.manageMessages || !!currentRole.permissions?.administrator} 
                      disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                      onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, manageMessages: e.target.checked } })}
                    />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>

                <div className="role-perm-card">
                  <div className="role-perm-card-info">
                    <strong className="role-perm-card-title">Postar em Canais de Anúncios</strong>
                    <span className="role-perm-card-desc">Permite enviar mensagens em canais configurados como Somente Leitura.</span>
                  </div>
                  <label className="echo-switch">
                    <input 
                      type="checkbox" 
                      checked={!!currentRole.permissions?.sendInAnnouncementChannels || !!currentRole.permissions?.administrator} 
                      disabled={!!currentRole.permissions?.administrator || currentRole.id === 'role-owner'}
                      onChange={(e) => handleUpdateRole(currentRole.id, { permissions: { ...currentRole.permissions, sendInAnnouncementChannels: e.target.checked } })}
                    />
                    <span className="echo-switch-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})
