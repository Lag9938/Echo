import { memo } from 'react'
import type { FormEvent } from 'react'
import type { Space, Channel } from '../../../types'
import {
  getServerGradient,
  getServerInitials
} from '../../../lib/formatters'
import {
  BellIcon,
  BellOffIcon,
  CameraIcon,
  MegaphoneIcon,
  SettingsIcon
} from '../../icons'

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

export interface SpaceOverviewTabProps {
  editingSpace: Space
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
  handleSpaceIconUpload: (file: File) => void
  handleRemoveSpaceIcon: () => void
  handleSpaceBannerUpload: (file: File) => void
  handleRemoveSpaceBanner: () => void
  handleSaveSpaceSettings: (e?: FormEvent) => void
  spaceChannels: Record<string, Channel[]>
  mutedSpaces: Set<string>
  toggleMuteSpace: (spaceId: string) => void
}

export const SpaceOverviewTab = memo(function SpaceOverviewTab({
  editingSpace,
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
  handleSpaceIconUpload,
  handleRemoveSpaceIcon,
  handleSpaceBannerUpload,
  handleRemoveSpaceBanner,
  handleSaveSpaceSettings,
  spaceChannels,
  mutedSpaces,
  toggleMuteSpace
}: SpaceOverviewTabProps) {
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
})
