import { THEMES } from '../../lib/themes'
import { ColoredRocketIcon } from '../../components/ColoredIcons'

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
}

export function AppearanceTab({
  theme,
  selectTheme,
  isPremiumUser = false,
  customAccentColor = '',
  onCustomAccentColorChange,
  chatDensity = 'cozy',
  onChatDensityChange,
  performanceMode = false,
  onPerformanceModeChange,
}: AppearanceTabProps) {
  return (
    <div className="settings-container">
      <h2>Aparência</h2>
      <p>Personalize o visual do Echo com temas exclusivos. Assinantes premium têm acesso a temas personalizados.</p>

      {/* Grade de Temas */}
      <div className="themes-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
        {THEMES.map(t => {
          const isSelected = theme === t.id
          return (
            <div 
              key={t.id}
              onClick={() => selectTheme(t.id)}
              className={`theme-card ${isSelected ? 'selected' : ''}`}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                border: isSelected ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                transition: 'all 0.2s',
                boxShadow: isSelected ? '0 4px 12px rgba(0,0,0,0.08)' : 'none'
              }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                {t.previewColors.map((color, i) => (
                  <span 
                    key={i} 
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: color,
                      border: '1px solid rgba(0,0,0,0.1)'
                    }} 
                  />
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>{t.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {t.isPremium ? (isPremiumUser ? 'Premium 👑 (Ativo)' : 'Premium 👑') : 'Gratuito'}
                </span>
              </div>

              {isSelected && (
                <span style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'var(--accent-color)',
                  color: '#fff',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 1. Cor de Destaque Personalizada ── */}
      <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🎨 Cor de Destaque da Interface
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
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              ↺ Restaurar Padrão do Tema
            </button>
          )}
        </div>

        {/* Accent Color Presets & Custom Picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { name: 'Ciano Echo', hex: '#00f2fe' },
            { name: 'Roxo Neon', hex: '#a855f7' },
            { name: 'Rosa Choque', hex: '#ec4899' },
            { name: 'Esmeralda', hex: '#10b981' },
            { name: 'Âmbar Solar', hex: '#f59e0b' },
            { name: 'Rubi Gamer', hex: '#ef4444' },
            { name: 'Índigo Real', hex: '#6366f1' },
            { name: 'Menta Pastel', hex: '#2dd4bf' }
          ].map(preset => {
            const isCur = (customAccentColor || '').toLowerCase() === preset.hex.toLowerCase()
            return (
              <button
                key={preset.hex}
                type="button"
                title={preset.name}
                onClick={() => onCustomAccentColorChange?.(preset.hex)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: preset.hex,
                  border: isCur ? '3px solid #fff' : '2px solid rgba(255,255,255,0.2)',
                  boxShadow: isCur ? `0 0 14px ${preset.hex}` : 'none',
                  cursor: 'pointer',
                  transform: isCur ? 'scale(1.15)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#000',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {isCur ? '✓' : ''}
              </button>
            )
          })}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '6px', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <label htmlFor="custom-accent-picker" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              Personalizado:
            </label>
            <input
              id="custom-accent-picker"
              type="color"
              value={customAccentColor || '#00f2fe'}
              onChange={(e) => onCustomAccentColorChange?.(e.target.value)}
              style={{
                width: '28px',
                height: '28px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: 'transparent'
              }}
            />
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
              {customAccentColor ? customAccentColor.toUpperCase() : 'PADRÃO'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Densidade de Mensagens do Chat ── */}
      <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            💬 Densidade do Chat
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Controle o espaçamento vertical entre mensagens nos canais de texto.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div
            onClick={() => onChatDensityChange?.('cozy')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: chatDensity === 'cozy' ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: chatDensity === 'cozy' ? '0 4px 16px rgba(0, 242, 254, 0.15)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>🛋️ Confortável (Padrão)</span>
              {chatDensity === 'cozy' && (
                <span style={{ background: 'var(--accent-color)', color: '#000', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Espaçamento amplo, avatares destacados e leitura relaxada para conversas diárias.
            </span>
            {/* Visual preview miniature */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '8px', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00f2fe' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ width: '40%', height: '8px', background: 'rgba(255,255,255,0.4)', borderRadius: '4px' }} />
                <div style={{ width: '80%', height: '8px', background: 'rgba(255,255,255,0.2)', borderRadius: '4px' }} />
              </div>
            </div>
          </div>

          <div
            onClick={() => onChatDensityChange?.('compact')}
            style={{
              padding: '16px',
              borderRadius: '12px',
              background: 'var(--bg-secondary)',
              border: chatDensity === 'compact' ? '2px solid var(--accent-color)' : '2px solid var(--border-color)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: chatDensity === 'compact' ? '0 4px 16px rgba(0, 242, 254, 0.15)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>⚡ Compacto</span>
              {chatDensity === 'compact' && (
                <span style={{ background: 'var(--accent-color)', color: '#000', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
              )}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Menos margem, avatares reduzidos e máximo de mensagens simultâneas na tela.
            </span>
            {/* Visual preview miniature */}
            <div style={{ background: 'rgba(0,0,0,0.25)', padding: '6px 8px', borderRadius: '8px', display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#a855f7' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ width: '35%', height: '6px', background: 'rgba(255,255,255,0.4)', borderRadius: '3px' }} />
                <div style={{ width: '90%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Pré-visualização em Tempo Real do Chat ── */}
        <div style={{ marginTop: '16px', background: 'var(--bg-primary)', borderRadius: '14px', padding: '16px', border: '1px solid var(--border-color)', transition: 'all 0.2s ease' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>
              👁️ Pré-visualização no Chat (Modo {chatDensity === 'cozy' ? 'Confortável' : 'Compacto'})
            </span>
            <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'var(--accent-light)', color: 'var(--accent-color)', fontWeight: 700 }}>
              Exibição ao vivo
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: chatDensity === 'cozy' ? '8px' : '3px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: chatDensity === 'cozy' ? '12px' : '8px',
              padding: chatDensity === 'cozy' ? '10px 14px' : '4px 10px',
              background: 'var(--bg-secondary)',
              borderRadius: chatDensity === 'cozy' ? '10px' : '6px',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <div style={{
                width: chatDensity === 'cozy' ? '36px' : '26px',
                height: chatDensity === 'cozy' ? '36px' : '26px',
                borderRadius: chatDensity === 'cozy' ? '12px' : '8px',
                background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: chatDensity === 'cozy' ? '13px' : '11px',
                fontWeight: 600,
                flexShrink: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                A
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: chatDensity === 'cozy' ? '13px' : '12px', color: 'var(--text-primary)' }}>Alexandre</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>18:32</span>
                </div>
                <p style={{ margin: chatDensity === 'cozy' ? '3px 0 0' : '1px 0 0', fontSize: chatDensity === 'cozy' ? '13.5px' : '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Bora fechar squad pra ranked hoje à noite? 🔥
                </p>
              </div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: chatDensity === 'cozy' ? '12px' : '8px',
              padding: chatDensity === 'cozy' ? '10px 14px' : '4px 10px',
              background: 'var(--bg-secondary)',
              borderRadius: chatDensity === 'cozy' ? '10px' : '6px',
              border: '1px solid rgba(255, 255, 255, 0.04)',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              <div style={{
                width: chatDensity === 'cozy' ? '36px' : '26px',
                height: chatDensity === 'cozy' ? '36px' : '26px',
                borderRadius: chatDensity === 'cozy' ? '12px' : '8px',
                background: 'linear-gradient(135deg, var(--accent-color), #3b82f6)',
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                fontSize: chatDensity === 'cozy' ? '13px' : '11px',
                fontWeight: 600,
                flexShrink: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
              }}>
                V
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontWeight: 700, fontSize: chatDensity === 'cozy' ? '13px' : '12px', color: 'var(--accent-color)' }}>Você</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>18:33</span>
                </div>
                <p style={{ margin: chatDensity === 'cozy' ? '3px 0 0' : '1px 0 0', fontSize: chatDensity === 'cozy' ? '13.5px' : '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  Com certeza! Já tô logado aqui no Echo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. Modo de Desempenho Visual (FPS Booster) ── */}
      <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'var(--bg-secondary)', padding: '18px 20px', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
          <div style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
                <ColoredRocketIcon size={18} style={{ marginRight: 8 }} /> Modo Alto Desempenho (Opaco)
              </h3>
              <span style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-color, #00f2fe)', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.3)' }}>
                0% GPU BLUR
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Desativa transparências e desfoques pesados de GPU (<code style={{ fontSize: '11px' }}>backdrop-filter</code>). Recomendado para manter altas taxas de quadros em jogos competitivos com o Echo em segundo plano.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 10px',
              borderRadius: '8px',
              background: performanceMode ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: performanceMode ? '#10b981' : 'var(--text-muted)',
              border: performanceMode ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-color)',
              transition: 'all 0.2s'
            }}
            >
              {performanceMode ? '🟢 Ativado' : '⚪ Desativado'}
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
          <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', animation: 'fadeInToast 0.25s ease' }}>
            <span>⚡</span>
            <span><strong>Modo de Alto Desempenho ativado:</strong> todos os efeitos de desfoque (blur) e transparências translúcidas foram desativados para liberar processamento da sua GPU enquanto joga.</span>
          </div>
        )}
      </div>
    </div>
  )
}
