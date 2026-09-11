import { useState, useEffect } from 'react'
import { ColoredWindowsIcon, ColoredTrayIcon } from '../../components/ColoredIcons'

export interface WindowsTabProps {
  onToggleOverlay?: () => void
}

export function WindowsTab({ onToggleOverlay }: WindowsTabProps) {
  const [autoStartEnabled, setAutoStartEnabled] = useState(false)
  const [openAsHidden, setOpenAsHidden] = useState(false)
  const [loadingAutoStart, setLoadingAutoStart] = useState(false)
  const [autoStartToast, setAutoStartToast] = useState<string | null>(null)

  useEffect(() => {
    async function loadAutoStart() {
      try {
        if (window.electronAPI?.getAutoStartSettings) {
          const res = await window.electronAPI.getAutoStartSettings()
          setAutoStartEnabled(Boolean(res?.openAtLogin))
        }
      } catch (err) {
        console.warn('Erro ao carregar autostart settings:', err)
      }
    }
    loadAutoStart()
  }, [])

  const handleToggleAutoStart = async (checked: boolean) => {
    setLoadingAutoStart(true)
    try {
      if (window.electronAPI?.setAutoStartSettings) {
        await window.electronAPI.setAutoStartSettings({
          openAtLogin: checked,
          openAsHidden: openAsHidden,
        })
        setAutoStartEnabled(checked)
        setAutoStartToast(
          checked
            ? 'Echo configurado para iniciar junto com o Windows!'
            : 'Inicialização automática com o Windows desativada.'
        )
        setTimeout(() => setAutoStartToast(null), 3500)
      }
    } catch (e) {
      console.error('Falha ao salvar inicialização:', e)
    } finally {
      setLoadingAutoStart(false)
    }
  }

  const handleToggleHidden = async (checked: boolean) => {
    setOpenAsHidden(checked)
    if (autoStartEnabled && window.electronAPI?.setAutoStartSettings) {
      try {
        await window.electronAPI.setAutoStartSettings({
          openAtLogin: true,
          openAsHidden: checked,
        })
      } catch (e) {
        console.error('Falha ao salvar hidden autostart:', e)
      }
    }
  }

  return (
    <div className="settings-container">
      <h2>Inicialização & Windows</h2>
      <p>Gerencie como o Echo é iniciado no Windows ao ligar o computador ou fazer login.</p>

      {autoStartToast && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: 'rgba(0, 242, 254, 0.12)',
            border: '1px solid rgba(0, 242, 254, 0.3)',
            borderRadius: '10px',
            color: 'var(--accent-color, #00f2fe)',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeInToast 0.2s ease',
          }}
        >
          <span>✓</span>
          <span>{autoStartToast}</span>
        </div>
      )}

      {/* Iniciar com o Windows */}
      <div
        style={{
          marginTop: '24px',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))',
          padding: '20px 22px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ maxWidth: '540px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
              <ColoredWindowsIcon size={20} style={{ marginRight: 8 }} /> Iniciar o Echo com o Windows
            </h3>
            <span
              style={{
                background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.1))',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 9px',
                borderRadius: '12px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                letterSpacing: '0.5px',
              }}
            >
              NATIVO
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Abre o Echo automaticamente toda vez que você liga o computador e inicia o Windows. Fique sempre conectado com seus amigos para chamadas e conversas sem precisar abrir o app manualmente.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              background: autoStartEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              color: autoStartEnabled ? '#34d399' : 'var(--text-muted)',
              border: autoStartEnabled ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-color)',
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: autoStartEnabled ? '#10b981' : '#64748b',
                boxShadow: autoStartEnabled ? '0 0 8px #10b981' : 'none',
              }}
            />
            {autoStartEnabled ? 'Ativado' : 'Desativado'}
          </span>
          <label className="echo-switch">
            <input
              type="checkbox"
              checked={autoStartEnabled}
              disabled={loadingAutoStart}
              onChange={(e) => handleToggleAutoStart(e.target.checked)}
            />
            <span className="echo-slider"></span>
          </label>
        </div>
      </div>

      {/* Iniciar Minimizado na Bandeja */}
      <div
        style={{
          marginTop: '16px',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))',
          padding: '20px 22px',
          borderRadius: '14px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
          opacity: autoStartEnabled ? 1 : 0.5,
          transition: 'opacity 0.2s ease',
        }}
      >
        <div style={{ maxWidth: '540px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
              <ColoredTrayIcon size={20} style={{ marginRight: 8 }} /> Iniciar Minimizado na Bandeja (Tray)
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
            Ao ligar o Windows, o Echo inicia silenciosamente em segundo plano direto na bandeja do sistema, sem abrir uma janela grande na frente da sua tela.
          </p>
        </div>

        <label className="echo-switch">
          <input
            type="checkbox"
            checked={openAsHidden}
            disabled={!autoStartEnabled}
            onChange={(e) => handleToggleHidden(e.target.checked)}
          />
          <span className="echo-slider"></span>
        </label>
      </div>

      {/* Mini Overlay de Jogo */}
      {onToggleOverlay && (
        <div
          style={{
            marginTop: '16px',
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01))',
            padding: '20px 22px',
            borderRadius: '14px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: '540px' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', color: 'var(--text-primary)' }}>
              🎮 Mini Overlay Flutuante de Jogo
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
              Abre uma janela translúcida compacta que permanece sempre no topo sobre seus jogos (Valorant, CS2, etc.), mostrando quem está falando no canal de voz.
            </p>
          </div>
          <button
            type="button"
            className="echo-btn-primary"
            onClick={onToggleOverlay}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Abrir Mini Overlay
          </button>
        </div>
      )}
    </div>
  )
}
