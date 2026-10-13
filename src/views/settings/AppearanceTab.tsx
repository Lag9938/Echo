import React from 'react'
import { THEMES } from '../../lib/themes'
import { MOTION_OPTIONS, type MotionPreference } from '../../lib/motionPreference'

export interface AppearanceTabProps {
  theme: string
  selectTheme: (themeId: string) => void
  isPremiumUser?: boolean
  customAccentColor?: string
  onCustomAccentColorChange?: (color: string) => void
  chatDensity?: 'cozy' | 'compact'
  onChatDensityChange?: (density: 'cozy' | 'compact') => void
  performanceMode?: boolean
  onPerformanceModeChange?: (val: boolean) => void
  motionPreference?: MotionPreference
  onMotionPreferenceChange?: (value: MotionPreference) => void
  sidebarLayout?: 'glass' | 'classic'
  onSidebarLayoutChange?: (layout: 'glass' | 'classic') => void
}

/* ── Minimalist Clean SVG Icons (Zero cartoon emojis) ── */
function GlassLayersIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function PaletteIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C21.996 6.5 17.5 2 12 2z" />
    </svg>
  )
}

function DensityRowsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CozyLayoutIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="15" x2="13" y2="15" />
    </svg>
  )
}

function CompactLayoutIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <line x1="7" y1="8" x2="17" y2="8" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  )
}

function GaugeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M4.93 4.93l2.83 2.83M2 12h4M4.93 19.07l2.83-2.83M12 22v-4M19.07 19.07l-2.83-2.83M22 12h-4M19.07 4.93l-2.83 2.83" />
    </svg>
  )
}

function CheckIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function RefreshIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  )
}

function HashIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  )
}

function VolumeWaveIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

export function AppearanceTab({
  theme,
  selectTheme,
  customAccentColor = '',
  onCustomAccentColorChange,
  chatDensity = 'cozy',
  onChatDensityChange,
  performanceMode = false,
  onPerformanceModeChange,
  motionPreference = 'system',
  onMotionPreferenceChange,
  sidebarLayout = 'glass',
  onSidebarLayoutChange,
}: AppearanceTabProps) {
  const activeTheme = THEMES.find((t) => t.id === theme) || THEMES[0]
  const activeAccent = customAccentColor || activeTheme.accentColor

  const accentPresets = [
    { name: 'Coral Echo Aurora', hex: '#df6d5d' },
    { name: 'Índigo Blurple', hex: '#5865f2' },
    { name: 'Ciano Oceânico', hex: '#0ea5e9' },
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Âmbar Solar', hex: '#f59e0b' },
    { name: 'Coral Radiante', hex: '#f43f5e' },
    { name: 'Roxo Lavanda', hex: '#8b5cf6' },
    { name: 'Menta Suave', hex: '#14b8a6' },
    { name: 'Rosa Choque', hex: '#ec4899' },
  ]

  return (
    <div className="settings-container">
      {/* ── Cabeçalho Principal ── */}
      <div className="echo-appearance-header">
        <h2>Aparência</h2>
        <p>Personalize o visual do Echo com temas exclusivos. Assinantes premium têm acesso a temas personalizados.</p>
      </div>

      {/* ── Seletor de Superfície: Efeito Glass vs Clássico Sólido (Garantia de Reversão) ── */}
      <div className="echo-glass-toggle-card">
        <div style={{ maxWidth: '580px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}>
              <GlassLayersIcon size={18} />
            </span>
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
              Efeito de Vidro Fosco (Glass)
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: sidebarLayout === 'glass' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                color: sidebarLayout === 'glass' ? 'var(--accent-color)' : 'var(--text-muted)',
                border: sidebarLayout === 'glass' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid var(--border-color)',
                transition: 'all 0.2s',
              }}
            >
              {sidebarLayout === 'glass' ? 'Ativado (Translúcido)' : 'Desativado (Sólido Clássico)'}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
            Aplica translucidez e desfoque suave de profundidade nos menus e painéis. Desative a qualquer momento para voltar ao modo clássico sólido com 100% de opacidade e economia de GPU.
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={sidebarLayout === 'glass'}
          onClick={() => onSidebarLayoutChange?.(sidebarLayout === 'glass' ? 'classic' : 'glass')}
          className={`echo-switch-btn ${sidebarLayout === 'glass' ? 'active' : ''}`}
          title="Alternar efeito vidro fosco"
        >
          <span className="echo-switch-knob" />
        </button>
      </div>

      {/* ── OPÇÃO 3: Palco Único de Demonstração em Tempo Real ── */}
      <div className="echo-appearance-stage-wrapper">
        <div className="echo-stage-header-row">
          <div className="echo-stage-title">
            <span>Demonstração em Tempo Real</span>
            <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>
              (Reflete imediatamente o tema e a cor selecionados)
            </span>
          </div>
          <span
            className="echo-stage-badge"
            style={{
              background: `${activeAccent}20`,
              color: activeAccent,
              border: `1px solid ${activeAccent}40`,
            }}
          >
            {activeTheme.name} &bull; {activeTheme.tag}
          </span>
        </div>

        {/* Janela de Palco Único (Echo em escala real) */}
        <div
          className="echo-appearance-stage"
          style={{
            background: activeTheme.bgPrimary,
            borderColor: `${activeAccent}35`,
          }}
        >
          {/* Topbar da janela */}
          <div
            className="echo-stage-window-topbar"
            style={{ background: activeTheme.bgSecondary }}
          >
            <div className="echo-stage-window-dots">
              <span className="echo-stage-dot" style={{ background: activeAccent }} />
              <span className="echo-stage-dot" style={{ background: 'rgba(255,255,255,0.25)' }} />
              <span className="echo-stage-dot" style={{ background: 'rgba(255,255,255,0.12)' }} />
            </div>

            <div className="echo-stage-window-channel">
              <span style={{ color: activeAccent }}><HashIcon size={13} /></span>
              <span>geral</span>
              <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                &bull; Servidor Principal
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                }}
              >
                Online
              </span>
            </div>
          </div>

          {/* Corpo do Palco com Sidebar + Chat */}
          <div className="echo-stage-body">
            {/* Sidebar do Echo */}
            <div
              className="echo-stage-sidebar"
              style={{ background: activeTheme.bgSecondary }}
            >
              <div className="echo-stage-channel-list">
                <span className="echo-stage-category-label">Canais de Texto</span>
                <div
                  className="echo-stage-channel-item active"
                  style={{
                    background: activeAccent,
                    color: '#000',
                  }}
                >
                  <HashIcon size={12} />
                  <span>geral</span>
                </div>
                <div className="echo-stage-channel-item">
                  <HashIcon size={12} />
                  <span>clipes-e-jogos</span>
                </div>

                <span className="echo-stage-category-label" style={{ marginTop: 4 }}>Canais de Voz</span>
                <div
                  className="echo-stage-channel-item"
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <VolumeWaveIcon size={12} />
                    <span>Squad Alpha</span>
                  </div>
                  <span style={{ fontSize: '9px', fontWeight: 800, opacity: 0.8 }}>3/5</span>
                </div>
              </div>

              {/* User Bar inferior */}
              <div className="echo-stage-user-bar">
                <div
                  className="echo-stage-user-avatar"
                  style={{ background: activeAccent }}
                >
                  V
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                    Você
                  </span>
                  <span style={{ fontSize: '9.5px', color: '#10b981', lineHeight: 1.1 }}>
                    Disponível
                  </span>
                </div>
              </div>
            </div>

            {/* Chat do Echo */}
            <div
              className="echo-stage-chat"
              style={{ background: activeTheme.bgPrimary }}
            >
              <div className="echo-stage-messages">
                {/* Mensagem 1 */}
                <div className="echo-stage-msg">
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    AL
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>Alexandre</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>18:32</span>
                    </div>
                    <p style={{ margin: '1px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      Bora fechar squad pra ranked hoje à noite? O servidor tá pronto.
                    </p>
                  </div>
                </div>

                {/* Mensagem 2 (Você) */}
                <div className="echo-stage-msg">
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      background: activeAccent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000',
                      fontSize: '10px',
                      fontWeight: 800,
                      flexShrink: 0,
                      transition: 'background-color 0.2s ease',
                    }}
                  >
                    V
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                      <span style={{ fontWeight: 700, fontSize: '12px', color: activeAccent, transition: 'color 0.2s ease' }}>
                        Você
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>18:33</span>
                    </div>
                    <p style={{ margin: '1px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      Com certeza! Já tô logado no Echo e com o microfone calibrado.
                    </p>
                  </div>
                </div>
              </div>

              {/* Barra de input falsa */}
              <div className="echo-stage-input-bar">
                <span>Conversar em #geral...</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.6 }}>
                  <span>GIF</span>
                  <span>#</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Seletor de Temas (Dock Limpo - Substitui os 8 quadrados) ── */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Selecione um estilo de tema:
          </div>
          <div className="echo-themes-dock">
            {THEMES.map((t) => {
              const isSelected = theme === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTheme(t.id)}
                  className={`echo-theme-btn ${isSelected ? 'selected' : ''}`}
                  style={{
                    '--theme-accent': t.accentColor,
                  } as React.CSSProperties}
                >
                  <div
                    className="echo-theme-swatch-box"
                    style={{ background: t.bgPrimary }}
                  >
                    <span
                      className="echo-theme-accent-pip"
                      style={{ background: t.accentColor }}
                    />
                  </div>

                  <div className="echo-theme-btn-info">
                    <span className="echo-theme-btn-name">{t.name}</span>
                    <span
                      className="echo-theme-btn-tag"
                      style={{
                        background: `${t.accentColor}18`,
                        color: t.accentColor,
                        border: `1px solid ${t.accentColor}30`,
                      }}
                    >
                      {t.tag}
                    </span>
                  </div>

                  {isSelected && (
                    <span
                      className="echo-theme-btn-check"
                      style={{ background: t.accentColor }}
                    >
                      <CheckIcon size={11} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 1. Cor de Destaque da Interface ── */}
      <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}>
                <PaletteIcon size={18} />
              </span>
              Cor de Destaque da Interface
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Personalize botões, destaques e bordas ativas com a cor que preferir.
            </p>
          </div>
          {customAccentColor && (
            <button
              type="button"
              onClick={() => onCustomAccentColorChange?.('')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              <RefreshIcon size={12} /> Restaurar Padrão do Tema
            </button>
          )}
        </div>

        {/* Accent Color Presets & Custom Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {accentPresets.map((preset) => {
            const isCur = (customAccentColor || '').toLowerCase() === preset.hex.toLowerCase()
            return (
              <button
                key={preset.hex}
                type="button"
                title={preset.name}
                onClick={() => onCustomAccentColorChange?.(preset.hex)}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  background: preset.hex,
                  border: isCur ? '2.5px solid #fff' : '2px solid rgba(255,255,255,0.18)',
                  boxShadow: isCur ? `0 0 14px ${preset.hex}` : 'none',
                  cursor: 'pointer',
                  transform: isCur ? 'scale(1.12)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                {isCur && <CheckIcon size={12} />}
              </button>
            )
          })}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginLeft: '6px',
              background: 'var(--bg-secondary)',
              padding: '5px 12px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)',
            }}
          >
            <label htmlFor="custom-accent-picker" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Personalizado:
            </label>
            <input
              id="custom-accent-picker"
              type="color"
              value={customAccentColor || activeTheme.accentColor}
              onChange={(e) => onCustomAccentColorChange?.(e.target.value)}
              style={{
                width: '26px',
                height: '26px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: 'transparent',
              }}
            />
            <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
              {customAccentColor ? customAccentColor.toUpperCase() : 'PADRÃO'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Densidade de Mensagens do Chat ── */}
      <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}>
              <DensityRowsIcon size={18} />
            </span>
            Densidade do Chat
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Controle o espaçamento vertical entre mensagens nos canais de texto.
          </p>
        </div>

        <div className="chat-density-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div
            className={`density-card ${chatDensity === 'cozy' ? 'selected' : ''}`}
            onClick={() => onChatDensityChange?.('cozy')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: chatDensity === 'cozy' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CozyLayoutIcon size={16} />
                Confortável (Padrão)
              </span>
              {chatDensity === 'cozy' && (
                <span
                  style={{
                    background: 'var(--accent-color)',
                    color: '#000',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckIcon size={10} />
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Espaçamento amplo, avatares destacados e leitura relaxada para conversas diárias.
            </span>
          </div>

          <div
            className={`density-card ${chatDensity === 'compact' ? 'selected' : ''}`}
            onClick={() => onChatDensityChange?.('compact')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: chatDensity === 'compact' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CompactLayoutIcon size={16} />
                Compacto
              </span>
              {chatDensity === 'compact' && (
                <span
                  style={{
                    background: 'var(--accent-color)',
                    color: '#000',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckIcon size={10} />
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Menos margem, avatares reduzidos e máximo de mensagens simultâneas na tela.
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Modo de Desempenho Visual (FPS Booster) ── */}
      <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
        <div
          className="performance-mode-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            background: 'var(--bg-secondary)',
            padding: '18px 20px',
            borderRadius: '14px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}>
                  <GaugeIcon size={18} />
                </span>
                Modo Alto Desempenho (Opaco)
              </h3>
              <span
                style={{
                  background: 'rgba(0, 242, 254, 0.15)',
                  color: 'var(--accent-color, #00f2fe)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                }}
              >
                0% GPU BLUR
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.45' }}>
              Desativa transparências e desfoques pesados de GPU (<code style={{ fontSize: '11px' }}>backdrop-filter</code>). Recomendado para manter altas taxas de quadros em jogos competitivos com o Echo em segundo plano.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
                background: performanceMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                color: performanceMode ? '#10b981' : 'var(--text-muted)',
                border: performanceMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
                transition: 'all 0.2s',
              }}
            >
              {performanceMode ? 'Ativado' : 'Desativado'}
            </span>
            <label className="echo-switch">
              <input
                type="checkbox"
                checked={performanceMode}
                onChange={(e) => onPerformanceModeChange?.(e.target.checked)}
              />
              <span className="echo-slider"></span>
            </label>
          </div>
        </div>

        {performanceMode && (
          <div
            style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'rgba(16, 185, 129, 0.08)',
              borderRadius: '10px',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              fontSize: '12px',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeInToast 0.25s ease',
            }}
          >
            <CheckIcon size={13} />
            <span>
              <strong>Modo de Alto Desempenho ativado:</strong> todos os efeitos de desfoque (blur) e transparências translúcidas foram desativados para liberar processamento da sua GPU enquanto joga.
            </span>
          </div>
        )}
      </div>

      {/* Reduzir movimento: acessibilidade (e conforto) para quem se incomoda com animações */}
      <div className="echo-motion-card">
        <div className="echo-motion-card-text">
          <h3 id="echo-motion-title">Movimento e animações</h3>
          <p id="echo-motion-desc">
            Reduza as animações e transições do app (brilhos que pulsam, molas, deslizes). Em Automático, o Echo segue a
            opção &quot;reduzir movimento&quot; do seu sistema.
          </p>
        </div>
        <div className="echo-motion-options" role="radiogroup" aria-labelledby="echo-motion-title" aria-describedby="echo-motion-desc">
          {MOTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={motionPreference === opt.value}
              className={`echo-motion-option ${motionPreference === opt.value ? 'is-selected' : ''}`}
              onClick={() => onMotionPreferenceChange?.(opt.value)}
            >
              <strong>{opt.label}</strong>
              <span>{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
