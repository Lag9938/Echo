import { memo } from 'react'
import type { Space, Channel, ServerRole } from '../../../types'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  HashtagIcon,
  MegaphoneIcon,
  PlusIcon,
  SettingsIcon,
  TrashIcon,
  VolumeIcon
} from '../../icons'

export interface SpaceChannelsTabProps {
  editingSpace: Space
  spaceChannels: Record<string, Channel[]>
  serverRoles: ServerRole[]
  editingChannelSettingsId: string | null
  setEditingChannelSettingsId: (id: string | null) => void
  setShowNewChannel: (spaceId: string | null) => void
  setNewChannelCategory: (cat: string) => void
  setNewChannelName: (name: string) => void
  setNewChannelTopic: (topic: string) => void
  moveChannel: (channelId: string, direction: 'up' | 'down') => void
  deleteChannel: (channelId: string) => void
  renameChannel: (channelId: string, newName: string) => void
  updateChannelSettings: (channelId: string, updates: Partial<Channel>) => void
}

export const SpaceChannelsTab = memo(function SpaceChannelsTab({
  editingSpace,
  spaceChannels,
  serverRoles,
  editingChannelSettingsId,
  setEditingChannelSettingsId,
  setShowNewChannel,
  setNewChannelCategory,
  setNewChannelName,
  setNewChannelTopic,
  moveChannel,
  deleteChannel,
  renameChannel,
  updateChannelSettings
}: SpaceChannelsTabProps) {
  // Liberar o @everyone num canal privado equivaleria a torná-lo público
  const accessRoles = serverRoles.filter(r => !r.isEveryone)
  return (
    <div className="space-settings-tab-pane">
      <div className="space-settings-pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Canais do Espaço</h2>
          <p>Gerencie, ordene e configure os canais de texto e voz da comunidade.</p>
        </div>
        <button 
          type="button" 
          className="add-space-card-btn"
          style={{ width: 'auto', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={() => {
            setNewChannelName('')
            setNewChannelCategory('')
            setNewChannelTopic('')
            setShowNewChannel(editingSpace.id)
          }}
        >
          <PlusIcon style={{ width: '15px', height: '15px' }} />
          <span>Criar Canal</span>
        </button>
      </div>

      <div className="space-channels-compact-list">
        {(spaceChannels[editingSpace.id] ?? []).map((ch, idx) => {
          const isSettingsOpen = editingChannelSettingsId === ch.id
          return (
            <div key={ch.id} className="channel-compact-row-container">
              <div className="channel-compact-row">
                <div className="channel-compact-left">
                  <div className="channel-compact-icon">
                    {ch.is_announcement ? (
                      <MegaphoneIcon style={{ color: 'var(--accent-color)' }} />
                    ) : ch.type === 'text' ? (
                      <HashtagIcon />
                    ) : (
                      <VolumeIcon />
                    )}
                  </div>
                  <span className="channel-compact-name">{ch.name}</span>
                  {ch.category && (
                    <span className="channel-compact-category-pill">{ch.category}</span>
                  )}
                  {ch.name === 'Geral' && (
                    <span className="default-channel-badge">Padrão</span>
                  )}
                  {ch.is_announcement && (
                    <span className="channel-compact-meta-chip">📢 Anúncios</span>
                  )}
                  {ch.is_private && (
                    <span className="channel-compact-meta-chip" style={{ color: '#f87171', background: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>🔒 Privado</span>
                  )}
                  {ch.slowmode_seconds ? (
                    <span className="channel-compact-meta-chip">⏱️ {ch.slowmode_seconds}s</span>
                  ) : null}
                  {ch.type === 'voice' && ch.user_limit ? (
                    <span className="channel-compact-meta-chip">👥 Máx: {ch.user_limit}</span>
                  ) : null}
                </div>

                <div className="channel-compact-actions">
                  <button 
                    type="button" 
                    className="channel-compact-action-btn" 
                    onClick={() => moveChannel(ch.id, 'up')}
                    disabled={idx === 0}
                    style={{ opacity: idx === 0 ? 0.3 : 1 }}
                    title="Mover para cima"
                  >
                    <ArrowUpIcon style={{ width: '13px', height: '13px' }} />
                  </button>
                  <button 
                    type="button" 
                    className="channel-compact-action-btn" 
                    onClick={() => moveChannel(ch.id, 'down')}
                    disabled={idx === (spaceChannels[editingSpace.id] ?? []).length - 1}
                    style={{ opacity: idx === (spaceChannels[editingSpace.id] ?? []).length - 1 ? 0.3 : 1 }}
                    title="Mover para baixo"
                  >
                    <ArrowDownIcon style={{ width: '13px', height: '13px' }} />
                  </button>
                  <button 
                    type="button" 
                    className={`channel-compact-action-btn ${isSettingsOpen ? 'active' : ''}`}
                    onClick={() => setEditingChannelSettingsId(isSettingsOpen ? null : ch.id)}
                    title="Configurações do canal"
                  >
                    <SettingsIcon style={{ width: '13px', height: '13px' }} />
                  </button>
                  {ch.name !== 'Geral' && (
                    <button 
                      type="button" 
                      className="channel-compact-action-btn danger" 
                      onClick={() => deleteChannel(ch.id)}
                      title="Excluir Canal"
                    >
                      <TrashIcon style={{ width: '13px', height: '13px' }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Gaveta Inline de Configurações Detalhadas */}
              {isSettingsOpen && (
                <div className="channel-inline-settings-card">
                  <div className="channel-inline-settings-grid">
                    <div>
                      <label className="channel-inline-label">Nome do Canal</label>
                      <input 
                        type="text" 
                        defaultValue={ch.name} 
                        onBlur={(e) => {
                          if (e.target.value.trim() && e.target.value.trim() !== ch.name) {
                            renameChannel(ch.id, e.target.value.trim())
                          }
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                        placeholder="Nome do canal"
                        className="channel-inline-input"
                      />
                    </div>

                    <div>
                      <label className="channel-inline-label">Categoria</label>
                      <input 
                        type="text"
                        defaultValue={ch.category || ''}
                        onBlur={(e) => updateChannelSettings(ch.id, { category: e.target.value.trim() })}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                        placeholder="Ex: Geral, Jogos, Call"
                        className="channel-inline-input"
                      />
                    </div>

                    {ch.type === 'text' && (
                      <>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label className="channel-inline-label">Tópico / Descrição do Canal</label>
                          <input 
                            type="text"
                            defaultValue={ch.topic || ''}
                            onBlur={(e) => updateChannelSettings(ch.id, { topic: e.target.value.trim() })}
                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
                            placeholder="Regras ou propósito deste canal..."
                            className="channel-inline-input"
                          />
                        </div>

                        <div>
                          <label className="channel-inline-label">Modo Lento</label>
                          <select 
                            value={ch.slowmode_seconds || 0}
                            onChange={(e) => updateChannelSettings(ch.id, { slowmode_seconds: parseInt(e.target.value, 10) })}
                            className="channel-inline-select"
                          >
                            <option value="0">Desativado</option>
                            <option value="5">5 segundos</option>
                            <option value="10">10 segundos</option>
                            <option value="15">15 segundos</option>
                            <option value="30">30 segundos</option>
                            <option value="60">1 minuto</option>
                            <option value="120">2 minutos</option>
                            <option value="300">5 minutos</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '6px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <input 
                              type="checkbox" 
                              checked={!!ch.is_announcement} 
                              onChange={(e) => updateChannelSettings(ch.id, { is_announcement: e.target.checked })}
                            />
                            <span>📢 Somente Leitura (Anúncios)</span>
                          </label>
                        </div>
                      </>
                    )}

                    {ch.type === 'voice' && (
                      <div>
                        <label className="channel-inline-label">Limite de Usuários</label>
                        <select 
                          value={ch.user_limit || 0}
                          onChange={(e) => updateChannelSettings(ch.id, { user_limit: parseInt(e.target.value, 10) })}
                          className="channel-inline-select"
                        >
                          <option value="0">Ilimitado</option>
                          <option value="2">2 usuários (Duplas)</option>
                          <option value="4">4 usuários (Squad)</option>
                          <option value="8">8 usuários</option>
                          <option value="10">10 usuários</option>
                          <option value="25">25 usuários</option>
                        </select>
                      </div>
                    )}

                    <div style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ch.is_private ? '10px' : '0' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🔒 Canal Privado</span>
                            {ch.is_private && <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '2px 6px', borderRadius: '4px' }}>Restrito</span>}
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            Apenas cargos selecionados, administradores e o criador do servidor poderão ver e acessar este canal.
                          </p>
                        </div>
                        <label className="echo-switch">
                          <input
                            type="checkbox"
                            checked={!!ch.is_private}
                            onChange={(e) => updateChannelSettings(ch.id, { is_private: e.target.checked })}
                          />
                          <span className="echo-switch-slider"></span>
                        </label>
                      </div>

                      {ch.is_private && (
                        <div style={{ marginTop: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                            Cargos com Permissão de Acesso:
                          </span>
                          {accessRoles.length === 0 ? (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Nenhum cargo configurado no servidor. Crie cargos na aba "Cargos & Acessos".</p>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {accessRoles.map(role => {
                                const allowed = (ch.allowed_role_ids || []).includes(role.id)
                                return (
                                  <button
                                    key={role.id}
                                    type="button"
                                    onClick={() => {
                                      const current = ch.allowed_role_ids || []
                                      const next = allowed ? current.filter(id => id !== role.id) : [...current, role.id]
                                      updateChannelSettings(ch.id, { allowed_role_ids: next })
                                    }}
                                    style={{
                                      background: allowed ? 'rgba(88, 101, 242, 0.2)' : 'rgba(255,255,255,0.04)',
                                      border: `1px solid ${allowed ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}`,
                                      color: allowed ? '#ffffff' : 'var(--text-secondary)',
                                      padding: '4px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11.5px',
                                      fontWeight: allowed ? 600 : 400,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}
                                  >
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: role.color || '#99aab5' }} />
                                    <span>{role.name}</span>
                                    {allowed && <span>✓</span>}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})
