import { useRef } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type {
  Space,
  Channel,
  ServerRole,
  ServerEmoji,
  ServerAuditLog,
  RolePermissions
} from '../../types'
import {
  getServerGradient,
  getServerInitials,
  ROLE_COLOR_PRESETS
} from '../../lib/formatters'
import { copyToClipboard } from '../../lib/clipboard'
import { getPublicInviteUrl } from '../../lib/invite'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BellIcon,
  BellOffIcon,
  CameraIcon,
  CrownIcon,
  FileTextIcon,
  HashtagIcon,
  LinkIcon,
  MegaphoneIcon,
  PaletteIcon,
  PlusIcon,
  SettingsIcon,
  ShieldIcon,
  SmileIcon,
  TrashIcon,
  UserMinusIcon,
  UsersIcon,
  VolumeIcon
} from '../icons'

export const SERVER_BANNER_PRESETS = [
  { id: 'dark', name: 'Dark Void', style: 'linear-gradient(135deg, #2b3240, #181b22)' },
  { id: 'magenta', name: 'Neon Pink', style: 'linear-gradient(135deg, #ff007f, #aa0055)' },
  { id: 'red', name: 'Ruby Crimson', style: 'linear-gradient(135deg, #e0554c, #8b1d16)' },
  { id: 'orange', name: 'Sunset Orange', style: 'linear-gradient(135deg, #f97316, #c2410c)' },
  { id: 'gold', name: 'Golden Glow', style: 'linear-gradient(135deg, #eab308, #a16207)' },
  { id: 'purple', name: 'Cyber Violet', style: 'linear-gradient(135deg, #8b5cf6, #5b21b6)' },
  { id: 'cyan', name: 'Arctic Cyan', style: 'linear-gradient(135deg, #06b6d4, #0e7490)' },
  { id: 'emerald', name: 'Emerald Forest', style: 'linear-gradient(135deg, #10b981, #047857)' }
]

export interface SpaceStudioModalProps {
  isOpen: boolean
  onClose: () => void
  editingSpace: Space | null
  user: User
  profileDisplayName: string
  displayName?: string
  serverRoles: ServerRole[]
  serverEmojis: ServerEmoji[]
  serverAuditLogs: ServerAuditLog[]
  editingSpaceMembers: any[]
  loadingEditingMembers: boolean
  memberRoleMap: Record<string, string[]>
  spaceChannels: Record<string, Channel[]>
  mutedSpaces: Set<string>
  toggleMuteSpace: (spaceId: string) => void
  activeSpaceTab: 'geral' | 'roles' | 'emojis' | 'channels' | 'members' | 'audit' | 'invites' | 'danger'
  setActiveSpaceTab: (tab: 'geral' | 'roles' | 'emojis' | 'channels' | 'members' | 'audit' | 'invites' | 'danger') => void
  editingSpaceName: string
  setEditingSpaceName: (name: string) => void
  editingSpaceDescription: string
  setEditingSpaceDescription: (desc: string) => void
  editingSpaceIconUrl: string
  setEditingSpaceIconUrl: (url: string) => void
  editingSpaceBannerUrl: string
  setEditingSpaceBannerUrl: (url: string) => void
  editingSpaceBannerTheme: string
  setEditingSpaceBannerTheme: (theme: string) => void
  editingSpaceWelcomeChannelId: string
  setEditingSpaceWelcomeChannelId: (id: string) => void
  uploadingSpaceIcon: boolean
  uploadingSpaceBanner: boolean
  memberSearchQuery: string
  setMemberSearchQuery: (q: string) => void
  selectedRoleId: string | null
  setSelectedRoleId: (id: string | null) => void
  selectedMemberId: string | null
  setSelectedMemberId: (id: string | null) => void
  newEmojiName: string
  setNewEmojiName: (name: string) => void
  uploadingEmoji: boolean
  editingChannelSettingsId: string | null
  setEditingChannelSettingsId: (id: string | null) => void
  setShowNewChannel: (spaceId: string | null) => void
  setNewChannelCategory: (cat: string) => void
  setNewChannelName: (name: string) => void
  setNewChannelTopic: (topic: string) => void
  handleSpaceIconUpload: (file: File) => void
  handleRemoveSpaceIcon: () => void
  handleSpaceBannerUpload: (file: File) => void
  handleRemoveSpaceBanner: () => void
  handleSaveSpaceSettings: (e?: FormEvent) => void
  handleCreateRole: () => void
  handleUpdateRole: (roleId: string, updates: Partial<ServerRole>) => void
  handleDeleteRole: (roleId: string) => void
  moveRole: (roleId: string, direction: 'up' | 'down') => void
  handleCreateEmoji: (file: File, name: string) => void
  handleDeleteEmoji: (emojiId: string) => void
  moveChannel: (channelId: string, direction: 'up' | 'down') => void
  updateChannelSettings: (channelId: string, updates: Partial<Channel>) => void
  renameChannel: (channelId: string, newName: string) => void
  deleteChannel: (channelId: string) => void
  getUserHighestRole: (spaceId: string, userId: string) => ServerRole | null
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  toggleMemberRole: (spaceId: string, targetUserId: string, roleId: string) => void
  handleRoleChange: (memberUserId: string, newRole: 'owner' | 'moderator' | 'member', memberName: string) => void
  handleKickMember: (memberId: string, memberName: string) => void
  handleDeleteSpace: () => void
  loadSpaceEmojis: (spaceId: string) => void
  loadEditingSpaceMembers: (spaceId: string) => void
  showToast: (title: string, message: string, type?: any) => void
}

export function SpaceStudioModal({
  isOpen,
  onClose,
  editingSpace,
  user,
  profileDisplayName,
  displayName,
  serverRoles,
  serverEmojis,
  serverAuditLogs,
  editingSpaceMembers,
  loadingEditingMembers,
  memberRoleMap,
  spaceChannels,
  mutedSpaces,
  toggleMuteSpace,
  activeSpaceTab,
  setActiveSpaceTab,
  editingSpaceName,
  setEditingSpaceName,
  editingSpaceDescription,
  setEditingSpaceDescription,
  editingSpaceIconUrl,
  setEditingSpaceIconUrl,
  editingSpaceBannerUrl,
  setEditingSpaceBannerUrl,
  editingSpaceBannerTheme,
  setEditingSpaceBannerTheme,
  editingSpaceWelcomeChannelId,
  setEditingSpaceWelcomeChannelId,
  uploadingSpaceIcon,
  uploadingSpaceBanner,
  memberSearchQuery,
  setMemberSearchQuery,
  selectedRoleId,
  setSelectedRoleId,
  selectedMemberId,
  setSelectedMemberId,
  newEmojiName,
  setNewEmojiName,
  uploadingEmoji,
  editingChannelSettingsId,
  setEditingChannelSettingsId,
  setShowNewChannel,
  setNewChannelCategory,
  setNewChannelName,
  setNewChannelTopic,
  handleSpaceIconUpload,
  handleRemoveSpaceIcon,
  handleSpaceBannerUpload,
  handleRemoveSpaceBanner,
  handleSaveSpaceSettings,
  handleCreateRole,
  handleUpdateRole,
  handleDeleteRole,
  moveRole,
  handleCreateEmoji,
  handleDeleteEmoji,
  moveChannel,
  updateChannelSettings,
  renameChannel,
  deleteChannel,
  getUserHighestRole,
  canUserDo,
  toggleMemberRole,
  handleRoleChange,
  handleKickMember,
  handleDeleteSpace,
  loadSpaceEmojis,
  loadEditingSpaceMembers,
  showToast
}: SpaceStudioModalProps) {
  const navTrackRef = useRef<HTMLDivElement | null>(null)
  const isDraggingNavRef = useRef(false)
  const navStartXRef = useRef(0)
  const navScrollLeftRef = useRef(0)

  if (!isOpen || !editingSpace) return null

  return (
<div className="space-studio-overlay">
          <div className="space-studio-container">
            {/* Studio Header: Identity + Close Action */}
            <header className="space-studio-header">
              <div className="space-studio-header-left">
                <div 
                  className="space-studio-header-avatar"
                  style={{ background: editingSpaceIconUrl ? 'transparent' : getServerGradient(editingSpace.name) }}
                >
                  {editingSpaceIconUrl ? (
                    <img src={editingSpaceIconUrl} alt={editingSpace.name} />
                  ) : (
                    getServerInitials(editingSpace.name)
                  )}
                </div>
                <div className="space-studio-header-info">
                  <div className="space-studio-header-title-row">
                    <h2>{editingSpace.name}</h2>
                    <span className="space-studio-badge">✦ Espaço Echo</span>
                  </div>
                  <p className="space-studio-header-sub">Painel de Configurações & Gestão da Comunidade</p>
                </div>
              </div>

              <div className="space-studio-header-right">
                <button 
                  type="button" 
                  className="space-studio-close-btn-discord"
                  onClick={() => onClose()}
                  title="Fechar Configurações (ESC)"
                >
                  <div className="space-studio-close-circle">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </div>
                  <span className="space-studio-close-label">ESC</span>
                </button>
              </div>
            </header>

            {/* Horizontal Segmented Tabs Navigation with Wheel Scroll & Drag-to-Scroll */}
            <div className="space-studio-nav-wrapper">
              <button 
                type="button" 
                className="space-studio-nav-arrow left"
                onClick={() => navTrackRef.current?.scrollBy({ left: -240, behavior: 'smooth' })}
                title="Rolar abas para a esquerda"
              >
                ‹
              </button>

              <nav 
                ref={navTrackRef}
                className="space-studio-nav-track"
                onWheel={(e) => {
                  if (navTrackRef.current) {
                    navTrackRef.current.scrollLeft += e.deltaY
                  }
                }}
                onMouseDown={(e) => {
                  isDraggingNavRef.current = true
                  navStartXRef.current = e.pageX - (navTrackRef.current?.offsetLeft || 0)
                  navScrollLeftRef.current = navTrackRef.current?.scrollLeft || 0
                }}
                onMouseMove={(e) => {
                  if (!isDraggingNavRef.current || !navTrackRef.current) return
                  e.preventDefault()
                  const x = e.pageX - (navTrackRef.current.offsetLeft || 0)
                  const walk = (x - navStartXRef.current) * 1.5
                  navTrackRef.current.scrollLeft = navScrollLeftRef.current - walk
                }}
                onMouseUp={() => {
                  isDraggingNavRef.current = false
                }}
                onMouseLeave={() => {
                  isDraggingNavRef.current = false
                }}
              >
                <button 
                  type="button" 
                  className={`space-studio-tab-btn ${activeSpaceTab === 'geral' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('geral')}
                >
                  <SettingsIcon style={{ width: '15px', height: '15px' }} />
                  <span>Identidade & Perfil</span>
                </button>

                <button 
                  type="button" 
                  className={`space-studio-tab-btn ${activeSpaceTab === 'roles' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('roles')}
                >
                  <ShieldIcon style={{ width: '15px', height: '15px' }} />
                  <span>Cargos & Acessos</span>
                  {serverRoles.length > 0 && <span className="space-studio-tab-badge">{serverRoles.length}</span>}
                </button>

                <button 
                  type="button" 
                  className={`space-studio-tab-btn ${activeSpaceTab === 'channels' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('channels')}
                >
                  <HashtagIcon style={{ width: '15px', height: '15px' }} />
                  <span>Canais</span>
                  <span className="space-studio-tab-badge">{(spaceChannels[editingSpace.id] ?? []).length}</span>
                </button>

                <button 
                  type="button" 
                  className={`space-studio-tab-btn ${activeSpaceTab === 'emojis' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSpaceTab('emojis')
                    loadSpaceEmojis(editingSpace.id)
                  }}
                >
                  <SmileIcon style={{ width: '15px', height: '15px' }} />
                  <span>Emojis</span>
                  {serverEmojis.length > 0 && <span className="space-studio-tab-badge">{serverEmojis.length}</span>}
                </button>

                <button 
                  type="button" 
                  className={`space-studio-tab-btn ${activeSpaceTab === 'members' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSpaceTab('members')
                    loadEditingSpaceMembers(editingSpace.id)
                  }}
                >
                  <UsersIcon style={{ width: '15px', height: '15px' }} />
                  <span>Integrantes</span>
                  <span className="space-studio-tab-badge">{editingSpaceMembers.length || 1}</span>
                </button>

                <button 
                  type="button" 
                  className={`space-studio-tab-btn ${activeSpaceTab === 'audit' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('audit')}
                >
                  <FileTextIcon style={{ width: '15px', height: '15px' }} />
                  <span>Registro de Ações</span>
                </button>

                <button 
                  type="button" 
                  className={`space-studio-tab-btn ${activeSpaceTab === 'invites' ? 'active' : ''}`}
                  onClick={() => setActiveSpaceTab('invites')}
                >
                  <LinkIcon style={{ width: '15px', height: '15px' }} />
                  <span>Convites</span>
                </button>

                {editingSpace.creator_id === user.id && (
                  <button 
                    type="button" 
                    className={`space-studio-tab-btn danger ${activeSpaceTab === 'danger' ? 'active' : ''}`}
                    onClick={() => setActiveSpaceTab('danger')}
                  >
                    <UserMinusIcon style={{ width: '15px', height: '15px' }} />
                    <span>Encerrar Espaço</span>
                  </button>
                )}
              </nav>

              <button 
                type="button" 
                className="space-studio-nav-arrow right"
                onClick={() => navTrackRef.current?.scrollBy({ left: 240, behavior: 'smooth' })}
                title="Rolar abas para a direita"
              >
                ›
              </button>
            </div>

            {/* Studio Content Body */}
            <div className="space-studio-content-body">
              {/* ABA 1: IDENTIDADE & PERFIL (Live Hero Customizer) */}
              {activeSpaceTab === 'geral' && (() => {
                const isGeralDirty = Boolean(
                  editingSpace && (
                    editingSpaceName.trim() !== (editingSpace.name || '').trim() ||
                    (editingSpaceDescription || '').trim() !== (editingSpace.description || '').trim() ||
                    (editingSpaceIconUrl || '') !== (editingSpace.icon_url || '') ||
                    (editingSpaceBannerUrl || '') !== (editingSpace.banner_url || '') ||
                    (editingSpaceBannerTheme || 'dark') !== (editingSpace.banner_theme || 'dark') ||
                    (editingSpaceWelcomeChannelId || '') !== (editingSpace.welcome_channel_id || '')
                  )
                )

                const activePreset = SERVER_BANNER_PRESETS.find(p => p.id === editingSpaceBannerTheme) || SERVER_BANNER_PRESETS[0]

                return (
                  <div className="space-settings-tab-pane">
                    {/* Live Hero Banner Customizer */}
                    <div className="space-studio-hero">
                      <div 
                        className="space-studio-hero-bg" 
                        style={{
                          background: editingSpaceBannerUrl 
                            ? `url(${editingSpaceBannerUrl}) center/cover no-repeat` 
                            : activePreset.style
                        }}
                      />
                      <div className="space-studio-hero-overlay" />

                      {/* Banner Top Controls */}
                      <div className="space-studio-hero-top">
                        <input 
                          type="file" 
                          id="server-banner-file-input" 
                          style={{ display: 'none' }} 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleSpaceBannerUpload(file)
                            e.target.value = ''
                          }} 
                        />
                        <button 
                          type="button" 
                          className="space-studio-hero-btn"
                          onClick={() => document.getElementById('server-banner-file-input')?.click()}
                          disabled={uploadingSpaceBanner}
                        >
                          <span>{uploadingSpaceBanner ? 'Enviando...' : 'Alterar Capa (Foto ou GIF)'}</span>
                        </button>
                        {editingSpaceBannerUrl && (
                          <button 
                            type="button" 
                            className="space-studio-hero-btn btn-remove"
                            onClick={handleRemoveSpaceBanner}
                          >
                            <span>Remover Capa</span>
                          </button>
                        )}
                      </div>

                      {/* Banner Bottom: Avatar + Live Title */}
                      <div className="space-studio-hero-bottom">
                        <input 
                          type="file" 
                          id="server-icon-file-input" 
                          style={{ display: 'none' }} 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleSpaceIconUpload(file)
                            e.target.value = ''
                          }} 
                        />
                        <div 
                          className="space-studio-hero-avatar-wrap"
                          style={{
                            background: editingSpaceIconUrl ? '#10131a' : getServerGradient(editingSpaceName || editingSpace.name)
                          }}
                          onClick={() => document.getElementById('server-icon-file-input')?.click()}
                          title="Clique para alterar a foto do espaço"
                        >
                          {editingSpaceIconUrl ? (
                            <img src={editingSpaceIconUrl} alt={editingSpaceName} />
                          ) : (
                            getServerInitials(editingSpaceName || editingSpace.name)
                          )}
                          <div className="space-studio-avatar-hover-hint">
                            <CameraIcon style={{ width: '18px', height: '18px' }} />
                            <span>{uploadingSpaceIcon ? 'Enviando...' : 'Mudar Foto'}</span>
                          </div>
                        </div>

                        <div className="space-studio-hero-title-group">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ margin: 0 }}>{editingSpaceName || 'Nome do Espaço'}</h3>
                            {editingSpaceIconUrl && (
                              <button 
                                type="button" 
                                className="space-studio-hero-btn btn-remove"
                                onClick={handleRemoveSpaceIcon}
                                style={{ padding: '3px 8px', fontSize: '11px', height: 'auto' }}
                                title="Remover foto do espaço"
                              >
                                ✕ Remover Foto
                              </button>
                            )}
                          </div>
                          <p>{editingSpaceDescription || 'Comunidade Echo • Personalize a identidade visual e regras deste espaço.'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Gradient Palettes if No Custom Image */}
                    <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Paleta de Gradientes Padrão do Echo</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Usado quando nenhuma imagem de capa personalizada está ativa</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                        {SERVER_BANNER_PRESETS.map(preset => {
                          const isActive = !editingSpaceBannerUrl && editingSpaceBannerTheme === preset.id
                          return (
                            <button 
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setEditingSpaceBannerTheme(preset.id)
                                setEditingSpaceBannerUrl('')
                              }}
                              className={`server-banner-swatch ${isActive ? 'active' : ''}`}
                              style={{ background: preset.style, height: '36px', borderRadius: '8px', border: isActive ? '2px solid #fff' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                              title={preset.name}
                            >
                              {isActive && <span style={{ color: '#fff', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* 2-Column Structured Card Grid */}
                    <form onSubmit={handleSaveSpaceSettings} className="space-studio-grid-2col">
                      {/* Card 1: Informações do Espaço */}
                      <div className="space-studio-card">
                        <h4 className="space-studio-card-title">
                          <SettingsIcon style={{ width: '16px', height: '16px', color: 'var(--accent-color)' }} />
                          <span>Informações do Espaço</span>
                        </h4>
                        <p className="space-studio-card-desc">Defina o nome de exibição e uma breve descrição da sua comunidade.</p>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Nome do Espaço</label>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{editingSpaceName.length}/80</span>
                          </div>
                          <input 
                            value={editingSpaceName} 
                            onChange={(e) => setEditingSpaceName(e.target.value)} 
                            placeholder="Ex: Sala dos Amigos, Guilda Gamer..."
                            required 
                            minLength={2}
                            maxLength={80}
                            style={{
                              padding: '11px 14px',
                              borderRadius: '10px',
                              border: '1.5px solid var(--border-color)',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              fontSize: '13.5px',
                              fontWeight: 600,
                              outline: 'none',
                              width: '100%',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Descrição do Espaço</label>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{editingSpaceDescription.length}/280</span>
                          </div>
                          <textarea 
                            value={editingSpaceDescription} 
                            onChange={(e) => setEditingSpaceDescription(e.target.value)} 
                            placeholder="Fale um pouco sobre o que é este espaço, quais jogos vocês jogam ou as regras da comunidade..."
                            className="space-settings-textarea"
                            maxLength={280}
                            style={{ minHeight: '90px', borderRadius: '10px', background: 'var(--bg-tertiary)', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                      </div>

                      {/* Card 2: Experiência & Notificações */}
                      <div className="space-studio-card">
                        <h4 className="space-studio-card-title">
                          <MegaphoneIcon style={{ width: '16px', height: '16px', color: 'var(--accent-color)' }} />
                          <span>Recepção & Notificações</span>
                        </h4>
                        <p className="space-studio-card-desc">Configure mensagens automáticas de chegada e preferências de alerta sonoro.</p>

                        <div>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            Canal de Boas-Vindas do Sistema
                          </label>
                          <select 
                            value={editingSpaceWelcomeChannelId} 
                            onChange={(e) => setEditingSpaceWelcomeChannelId(e.target.value)}
                            style={{
                              padding: '11px 14px',
                              borderRadius: '10px',
                              border: '1.5px solid var(--border-color)',
                              background: 'var(--bg-tertiary)',
                              color: 'var(--text-primary)',
                              fontSize: '13px',
                              outline: 'none',
                              width: '100%',
                              cursor: 'pointer',
                              boxSizing: 'border-box'
                            }}
                          >
                            <option value="">Nenhum canal selecionado</option>
                            {(spaceChannels[editingSpace.id] ?? []).filter(c => c.type === 'text').map(ch => (
                              <option key={ch.id} value={ch.id}># {ch.name}</option>
                            ))}
                          </select>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                            Envia automaticamente uma mensagem de boas-vindas do sistema quando alguém entrar neste espaço.
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-tertiary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {mutedSpaces.has(editingSpace.id) ? <BellOffIcon style={{ color: '#e0554c' }} /> : <BellIcon style={{ color: 'var(--text-primary)' }} />}
                            <div>
                              <span style={{ fontSize: '13px', fontWeight: 700, display: 'block', color: 'var(--text-primary)' }}>Silenciar Notificações</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Desative alertas sonoros deste espaço no seu app.</span>
                            </div>
                          </div>
                          <label className="echo-switch">
                            <input 
                              type="checkbox" 
                              checked={mutedSpaces.has(editingSpace.id)} 
                              onChange={() => toggleMuteSpace(editingSpace.id)} 
                            />
                            <span className="echo-switch-slider"></span>
                          </label>
                        </div>
                      </div>
                    </form>

                    {/* Floating Unsaved Changes Bar */}
                    {isGeralDirty && (
                      <div className="space-settings-floating-bar">
                        <div className="space-settings-floating-bar-text">
                          <span className="floating-warning-icon">⚠️</span>
                          <span>Cuidado — você tem alterações não salvas!</span>
                        </div>
                        <div className="space-settings-floating-bar-actions">
                          <button 
                            type="button" 
                            className="floating-btn-reset"
                            onClick={() => {
                              if (editingSpace) {
                                setEditingSpaceName(editingSpace.name)
                                setEditingSpaceDescription(editingSpace.description || '')
                                setEditingSpaceIconUrl(editingSpace.icon_url || '')
                                setEditingSpaceBannerUrl(editingSpace.banner_url || '')
                                setEditingSpaceBannerTheme(editingSpace.banner_theme || 'dark')
                                setEditingSpaceWelcomeChannelId(editingSpace.welcome_channel_id || '')
                              }
                            }}
                          >
                            Redefinir
                          </button>
                          <button 
                            type="button" 
                            className="floating-btn-save"
                            onClick={() => handleSaveSpaceSettings()}
                          >
                            Salvar Alterações
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* ABA 2: CARGOS E PERMISSÕES (NOVA ABA DEDICADA) */}
              {activeSpaceTab === 'roles' && (
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
                    {(() => {
                      const currentRole = serverRoles.find(r => r.id === selectedRoleId) || serverRoles[0]
                      if (!currentRole) return null

                      return (
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
                      )
                    })()}
                  </div>
                </div>
              )}

              {/* ABA: EMOJIS DO ESPAÇO */}
              {activeSpaceTab === 'emojis' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Emojis e Figurinhas do Espaço</h2>
                    <p>Envie imagens estáticas ou <strong>GIFs animados</strong> com código :nome: para membros usarem no chat deste espaço.</p>
                  </div>

                  {/* Form de Criação de Emoji */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--text-primary)' }}>Adicionar Novo Emoji ou GIF</h4>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <input 
                        type="text" 
                        value={newEmojiName} 
                        onChange={(e) => setNewEmojiName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="Nome do emoji (ex: pepe, hype, gg)"
                        maxLength={32}
                        style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '8px', border: '1.5px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '13.5px' }}
                      />
                      <input 
                        type="file" 
                        id="server-emoji-file-input" 
                        style={{ display: 'none' }} 
                        accept="image/*" 
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) {
                            if (!newEmojiName.trim()) {
                              const autoName = f.name.split('.')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_')
                              handleCreateEmoji(f, autoName)
                            } else {
                              handleCreateEmoji(f, newEmojiName)
                            }
                          }
                          e.target.value = ''
                        }}
                      />
                      <button 
                        type="button" 
                        className="add-space-card-btn" 
                        style={{ width: 'auto', padding: '10px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        disabled={uploadingEmoji}
                        onClick={() => {
                          if (!newEmojiName.trim()) {
                            showToast("Nome do Emoji", "Digite um nome para o emoji antes de escolher o arquivo.", "info")
                            return
                          }
                          document.getElementById('server-emoji-file-input')?.click()
                        }}
                      >
                        <SmileIcon />
                        <span>{uploadingEmoji ? 'Enviando...' : 'Carregar Imagem / GIF'}</span>
                      </button>
                    </div>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>Formatos suportados: .png, .gif, .jpg, .webp (Recomendado: 128x128px com fundo transparente).</span>
                  </div>

                  {/* Grid de Emojis do Servidor */}
                  <div className="server-emojis-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' }}>
                    {serverEmojis.map(emoji => (
                      <div key={emoji.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <img src={emoji.url} alt={emoji.name} style={{ width: '36px', height: '36px', objectFit: 'contain', borderRadius: '4px' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            :{emoji.name}:
                          </span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                            {new Date(emoji.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <button 
                          type="button" 
                          className="settings-channel-delete-btn" 
                          onClick={() => handleDeleteEmoji(emoji.id)}
                          title="Excluir Emoji"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    {serverEmojis.length === 0 && (
                      <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <SmileIcon style={{ width: '36px', height: '36px', margin: '0 auto 10px auto', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>Nenhum emoji personalizado cadastrado ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ABA 3: CANAIS */}
              {activeSpaceTab === 'channels' && (
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
                                      {serverRoles.length === 0 ? (
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Nenhum cargo configurado no servidor. Crie cargos na aba "Cargos & Acessos".</p>
                                      ) : (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                          {serverRoles.map(role => {
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
              )}

              {/* ABA 4: MEMBROS E ATRIBUIÇÃO DE CARGOS */}
              {activeSpaceTab === 'members' && (
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
                          const assignedRoles = serverRoles.filter(r => assignedRoleIds.includes(r.id))
                          const canKick = (editingSpace.creator_id === user.id && !isOwner && !isSelf) || (canUserDo(editingSpace.id, user.id, 'kickMembers') && !isOwner && !isSelf)

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
                                    <div className="member-mgmt-roles-grid">
                                      {serverRoles.filter(r => r.id !== 'role-owner').map(r => {
                                        const hasRole = assignedRoleIds.includes(r.id)
                                        return (
                                          <button
                                            key={r.id}
                                            type="button"
                                            className={`member-mgmt-role-pill ${hasRole ? 'active' : ''}`}
                                            style={{
                                              borderColor: hasRole ? r.color : 'var(--border-color)',
                                              color: hasRole ? r.color : 'var(--text-secondary)',
                                              background: hasRole ? `${r.color}22` : 'rgba(255, 255, 255, 0.04)'
                                            }}
                                            onClick={() => toggleMemberRole(member.user?.id, r.id, member.user?.display_name)}
                                          >
                                            <span className="role-pill-check">{hasRole ? '✓' : '＋'}</span>
                                            <span className="role-pill-dot" style={{ background: r.color }} />
                                            <span>{r.name}</span>
                                          </button>
                                        )
                                      })}
                                      {serverRoles.filter(r => r.id !== 'role-owner').length === 0 && (
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nenhum cargo personalizado criado neste espaço.</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Permissão Básica / Moderação */}
                                  <div className="member-mgmt-section">
                                    <label className="member-mgmt-label">Cargo Básico</label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        className={`member-mgmt-role-pill ${member.role === 'member' && !isOwner ? 'active' : ''}`}
                                        onClick={() => handleRoleChange(member.user?.id, 'member', member.user?.display_name)}
                                        disabled={isOwner}
                                      >
                                        <span>Membro</span>
                                      </button>
                                      <button
                                        type="button"
                                        className={`member-mgmt-role-pill ${member.role === 'moderator' ? 'active' : ''}`}
                                        onClick={() => handleRoleChange(member.user?.id, 'moderator', member.user?.display_name)}
                                        disabled={isOwner}
                                      >
                                        <span>Moderador</span>
                                      </button>

                                      {editingSpace.creator_id === user.id && !isOwner && (
                                        <button
                                          type="button"
                                          className="member-mgmt-role-pill"
                                          style={{ color: '#eab308', borderColor: 'rgba(234, 179, 8, 0.4)' }}
                                          onClick={() => handleRoleChange(member.user?.id, 'owner', member.user?.display_name)}
                                        >
                                          <span>👑 Transferir Posse</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

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
              )}

              {/* ABA 5: REGISTRO DE AUDITORIA (AUDIT LOGS) */}
              {activeSpaceTab === 'audit' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Registro de Ações do Espaço</h2>
                    <p>Histórico cronológico em tempo real de eventos de moderação e alterações realizadas no espaço.</p>
                  </div>

                  <div className="audit-logs-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                    {serverAuditLogs.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                        <FileTextIcon style={{ width: '32px', height: '32px', margin: '0 auto 12px auto', opacity: 0.5 }} />
                        <p style={{ margin: 0, fontSize: '14px' }}>Nenhum evento registrado recentemente neste espaço.</p>
                      </div>
                    ) : (
                      serverAuditLogs.map(log => (
                        <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'grid', placeItems: 'center', color: 'var(--accent-color)' }}>
                              <FileTextIcon style={{ width: '16px', height: '16px' }} />
                            </div>
                            <div>
                              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                                <strong>{log.author_name}</strong> {log.action}
                              </span>
                              {log.details && (
                                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>{log.details}</span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ABA 6: CONVITES */}
              {activeSpaceTab === 'invites' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2>Convites do Espaço</h2>
                    <p>Compartilhe o link direto de convite para que seus amigos possam acessar e entrar no seu espaço com um clique.</p>
                  </div>

                  <div className="invites-card-container">
                    <label className="invite-field-label">LINK DE CONVITE INSTANTÂNEO</label>
                    <div className="invite-input-row">
                      <input 
                        type="text" 
                        value={getPublicInviteUrl(editingSpace.id)} 
                        readOnly 
                        className="invite-code-input"
                      />
                      <button 
                        type="button" 
                        className="ch-create-btn" 
                        style={{ padding: '10px 20px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => {
                          const link = getPublicInviteUrl(editingSpace.id)
                          copyToClipboard(link)
                          showToast("Link Copiado!", "Link de convite direto do espaço copiado com sucesso.", "info")
                        }}
                      >
                        <LinkIcon style={{ width: '14px', height: '14px' }} />
                        Copiar Link
                      </button>
                    </div>

                    <div className="invite-divider" />

                    <label className="invite-field-label">MENSAGEM DE CONVITE PRONTA</label>
                    <button 
                      type="button" 
                      className="invite-message-btn"
                      onClick={() => {
                        const directUrl = getPublicInviteUrl(editingSpace.id)
                        const inviteMsg = `Entre no meu espaço "${editingSpace.name}" no Echo!\n🔗 Link Direto: ${directUrl}\n🔑 Código do Espaço: ${editingSpace.id}`
                        copyToClipboard(inviteMsg)
                        showToast("Mensagem Copiada!", "Texto de convite com link e código copiado para a área de transferência.", "info")
                      }}
                    >
                      📋 Copiar Mensagem de Convite Pronta
                    </button>

                    <div className="invite-help-box">
                      <span style={{ fontSize: '16px' }}>💡</span>
                      <p>
                        <strong>Como funciona:</strong> Seus amigos só precisam clicar no link para entrar. Caso prefiram, podem colar esse mesmo link na opção <strong>"Entrar em um Espaço"</strong> no menu superior do Echo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 7: ZONA DE GESTÃO / PERIGO */}
              {activeSpaceTab === 'danger' && (
                <div className="space-settings-tab-pane">
                  <div className="space-settings-pane-header">
                    <h2 style={{ color: '#e0554c' }}>Encerrar Espaço</h2>
                    <p>Ações irreversíveis para este espaço e comunidade.</p>
                  </div>

                  <div className="danger-zone-full">
                    <div className="danger-zone-header">
                      <h3>Encerrar Espaço Definitivamente</h3>
                      <p>Ao encerrar este espaço, todos os canais, mensagens, cargos e participantes associados a ele serão deletados permanentemente. Esta ação não pode ser desfeita.</p>
                    </div>
                    <button 
                      type="button" 
                      className="dropdown-action-btn danger" 
                      style={{ width: 'auto', padding: '12px 24px', fontWeight: 'bold', fontSize: '14px' }} 
                      onClick={handleDeleteSpace}
                    >
                      Encerrar Espaço Permanentemente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
  )
}
