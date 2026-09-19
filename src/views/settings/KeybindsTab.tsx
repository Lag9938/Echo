import { useState, useEffect } from 'react'
import {
  KeyboardIcon,
  OverlayPipIcon
} from '../../components/icons'
import {
  ColoredPushToTalkIcon,
  ColoredMicActiveIcon,
  ColoredHeadphonesIcon,
  ColoredBrainAiIcon
} from '../../components/ColoredIcons'
import { GlobalShortcutRecorder } from './GlobalShortcutRecorder'

export interface KeybindsTabProps {
  pttModeSetting?: boolean
  onPttModeChange?: (val: boolean) => void
  pttKey?: string
  onPttKeyChange?: (val: string) => void
  muteShortcut?: string
  onMuteShortcutChange?: (key: string) => void
  deafenShortcut?: string
  onDeafenShortcutChange?: (key: string) => void
  aiDenoiseShortcut?: string
  onAiDenoiseShortcutChange?: (key: string) => void
  onToggleOverlay?: () => void
}

export function KeybindsTab({
  pttModeSetting = false,
  onPttModeChange,
  pttKey = 'V',
  onPttKeyChange,
  muteShortcut = 'F8',
  onMuteShortcutChange,
  deafenShortcut = 'F9',
  onDeafenShortcutChange,
  aiDenoiseShortcut = 'F7',
  onAiDenoiseShortcutChange,
  onToggleOverlay
}: KeybindsTabProps) {
  // PTT State
  const [localPttMode, setLocalPttMode] = useState<boolean>(pttModeSetting)
  const [localPttKey, setLocalPttKey] = useState<string>(pttKey)
  const [isRecordingPtt, setIsRecordingPtt] = useState(false)

  // Global Shortcuts State
  const [localMuteKey, setLocalMuteKey] = useState<string>(() => localStorage.getItem('echo-shortcut-mute') || muteShortcut || 'F8')
  const [localDeafenKey, setLocalDeafenKey] = useState<string>(() => localStorage.getItem('echo-shortcut-deafen') || deafenShortcut || 'F9')
  const [localAiDenoiseKey, setLocalAiDenoiseKey] = useState<string>(() => localStorage.getItem('echo-shortcut-ai-denoise') || aiDenoiseShortcut || 'F7')

  useEffect(() => {
    setLocalPttMode(pttModeSetting)
  }, [pttModeSetting])

  useEffect(() => {
    setLocalPttKey(pttKey)
  }, [pttKey])

  const handlePttModeToggle = (enabled: boolean) => {
    setLocalPttMode(enabled)
    onPttModeChange?.(enabled)
  }

  const handlePttKeyRecorded = (key: string) => {
    setLocalPttKey(key)
    setIsRecordingPtt(false)
    onPttKeyChange?.(key)
  }

  const handleMuteKeyChange = (newKey: string) => {
    setLocalMuteKey(newKey)
    localStorage.setItem('echo-shortcut-mute', newKey)
    onMuteShortcutChange?.(newKey)
  }

  const handleDeafenKeyChange = (newKey: string) => {
    setLocalDeafenKey(newKey)
    localStorage.setItem('echo-shortcut-deafen', newKey)
    onDeafenShortcutChange?.(newKey)
  }

  const handleAiDenoiseKeyChange = (newKey: string) => {
    setLocalAiDenoiseKey(newKey)
    localStorage.setItem('echo-shortcut-ai-denoise', newKey)
    onAiDenoiseShortcutChange?.(newKey)
  }

  const handleResetAllToDefaults = () => {
    handleMuteKeyChange('F8')
    handleDeafenKeyChange('F9')
    handleAiDenoiseKeyChange('F7')
    handlePttKeyRecorded('V')
  }

  return (
    <div className="settings-content-pane">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'rgba(0, 242, 254, 0.12)',
            border: '1px solid rgba(0, 242, 254, 0.25)',
            display: 'grid',
            placeItems: 'center',
            color: '#00f2fe'
          }}>
            <KeyboardIcon style={{ width: '20px', height: '20px' }} />
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Teclas de Atalho
          </h2>
          <span style={{
            fontSize: '10px',
            fontWeight: 800,
            background: 'rgba(0, 242, 254, 0.15)',
            color: '#00f2fe',
            padding: '2px 8px',
            borderRadius: '5px',
            border: '1px solid rgba(0, 242, 254, 0.3)'
          }}>
            GLOBAL & IN-GAME
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          Controle seu áudio, microfone e modos de transmissão em tempo real enquanto joga, sem precisar usar Alt+Tab para sair da partida.
        </p>
      </div>

      {/* Dica de Teclados */}
      <div style={{
        background: 'rgba(0, 242, 254, 0.05)',
        border: '1px solid rgba(0, 242, 254, 0.18)',
        borderRadius: '10px',
        padding: '12px 14px',
        marginBottom: '22px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div>
          <strong style={{ color: '#00f2fe' }}>Compatibilidade Total:</strong> Suporta teclados 60%, TKL e 100%. Você pode gravar teclas simples (como <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>F8</code>) ou combinações com modificadores (<code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>Alt+M</code>, <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 5px', borderRadius: 4 }}>Ctrl+Shift+M</code>).
        </div>
        <button
          type="button"
          onClick={handleResetAllToDefaults}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--text-muted)',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#fff' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)' }}
        >
          Restaurar Padrões
        </button>
      </div>

      {/* Push-to-Talk (Pressione para Falar) Card */}
      <div style={{
        background: 'var(--bg-secondary, #111827)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        borderRadius: '12px',
        padding: '18px 20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ColoredPushToTalkIcon size={22} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Pressione para Falar (Push-to-Talk)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Seu microfone só transmite áudio enquanto a tecla escolhida estiver pressionada.
              </div>
            </div>
          </div>

          <label className="toggle-switch" style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={localPttMode}
              onChange={(e) => handlePttModeToggle(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        {localPttMode && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '14px 16px',
            marginTop: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Tecla Ativa de PTT:
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <kbd style={{
                    display: 'inline-block',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#00f2fe',
                    background: 'rgba(0, 242, 254, 0.12)',
                    border: '1px solid rgba(0, 242, 254, 0.3)',
                    borderRadius: '6px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    letterSpacing: '0.05em'
                  }}>
                    {isRecordingPtt ? 'Pressione a tecla...' : localPttKey}
                  </kbd>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn-primary ${isRecordingPtt ? 'recording' : ''}`}
                  onClick={() => setIsRecordingPtt(true)}
                  style={{ fontSize: '12px', padding: '6px 14px' }}
                >
                  {isRecordingPtt ? 'Aguardando tecla...' : 'Gravar Tecla PTT'}
                </button>
                {isRecordingPtt && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsRecordingPtt(false)}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Presets Rápidos para PTT */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sugestões:</span>
              {['V', 'C', 'Caps Lock', 'Alt', 'Mouse 4', 'Mouse 5'].map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handlePttKeyRecorded(k)}
                  style={{
                    background: localPttKey === k ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    border: localPttKey === k ? '1px solid #00f2fe' : '1px solid rgba(255, 255, 255, 0.1)',
                    color: localPttKey === k ? '#00f2fe' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {k}
                </button>
              ))}
            </div>

            {/* Listener quando gravando PTT */}
            {isRecordingPtt && (
              <input
                type="text"
                autoFocus
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                onKeyDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (e.key === 'Escape') {
                    setIsRecordingPtt(false)
                    return
                  }
                  let k = e.key.toUpperCase()
                  if (e.code.startsWith('Key')) k = e.code.slice(3)
                  handlePttKeyRecorded(k)
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Atalhos Globais In-Game Card */}
      <div style={{
        background: 'var(--bg-secondary, #111827)',
        border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Atalhos Globais de Voz & Partida</span>
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Silencie o microfone ou amigos instantaneamente com atalhos de hardware.
            </p>
          </div>
          <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
            ✓ Ativos mesmo em tela cheia
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Mutar Microfone */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: 2 }}>
              <ColoredMicActiveIcon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <GlobalShortcutRecorder
                label="Mutar / Desmutar Microfone"
                description="Alterna o microfone entre mudo e aberto em tempo real"
                value={localMuteKey}
                defaultValue="F8"
                actionKey="toggle-mute"
                popularPresets={['F8', 'Alt+M', 'Ctrl+Shift+M', 'Insert', 'Pause', 'PageDown']}
                onChange={handleMuteKeyChange}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

          {/* Silenciar Áudio dos Outros (Deafen) */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: 2 }}>
              <ColoredHeadphonesIcon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <GlobalShortcutRecorder
                label="Silenciar Fone (Deafen)"
                description="Silencia o som de todos os membros do canal para foco no jogo"
                value={localDeafenKey}
                defaultValue="F9"
                actionKey="toggle-deafen"
                popularPresets={['F9', 'Alt+D', 'Ctrl+Shift+D', 'Delete', 'End', 'PageUp']}
                onChange={handleDeafenKeyChange}
              />
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

          {/* Alternar Supressão de Ruído */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ marginTop: 2 }}>
              <ColoredBrainAiIcon size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <GlobalShortcutRecorder
                label="Filtro de Ruído IA"
                description="Alterna o algoritmo RNNoise de inteligência artificial instantaneamente"
                value={localAiDenoiseKey}
                defaultValue="F7"
                actionKey="toggle-ai-denoise"
                popularPresets={['F7', 'Alt+N', 'Ctrl+Shift+N', 'Home', 'ScrollLock']}
                onChange={handleAiDenoiseKeyChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mini Overlay de Voz Gamer (Always-on-Top) */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))',
        padding: '18px 20px',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{ maxWidth: '520px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
              <OverlayPipIcon style={{ width: '18px', height: '18px', color: 'var(--accent-color, #00f2fe)', marginRight: 8 }} />
              Mini Overlay de Voz Gamer (Always-on-Top)
            </h3>
            <span style={{
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.2), rgba(0, 198, 255, 0.1))',
              color: 'var(--accent-color, #00f2fe)',
              fontSize: '10.5px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '10px',
              border: '1px solid rgba(0, 242, 254, 0.3)'
            }}>
              SOBREPOSIÇÃO
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Janela flutuante translúcida que fica sobreposta aos seus jogos. Exibe quem está falando em tempo real e permite mutar/desmutar sem sair da partida.
          </p>
        </div>

        {onToggleOverlay && (
          <button
            type="button"
            className="btn-primary"
            onClick={onToggleOverlay}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '12.5px',
              whiteSpace: 'nowrap'
            }}
          >
            <OverlayPipIcon style={{ width: '14px', height: '14px' }} />
            <span>Alternar Overlay</span>
          </button>
        )}
      </div>
    </div>
  )
}
