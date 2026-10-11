import { useState, useEffect, useRef } from 'react'

export interface AudioVideoTabProps {
  audioInputs: MediaDeviceInfo[]
  audioOutputs: MediaDeviceInfo[]
  selectedInputId: string
  selectedOutputId: string
  onInputDeviceChange: (id: string) => void
  onOutputDeviceChange: (id: string) => void
  audioError: string | null
  onRefreshDevices: () => void
  noiseSuppressionEnabled: boolean
  echoCancellationEnabled: boolean
  onNoiseSuppressionChange: (val: boolean) => void
  onEchoCancellationChange: (val: boolean) => void
  sfxVolume: number
  onSfxVolumeChange: (val: number) => void
  noiseGateEnabled: boolean
  noiseGateThreshold: number
  onNoiseGateEnabledChange: (val: boolean) => void
  onNoiseGateThresholdChange: (val: number) => void
  spatialAudioEnabled: boolean
  onToggleSpatialAudio: (val: boolean) => void
  onResetAllPans: () => void
  isAiDenoiseEnabled: boolean
  onToggleAiDenoise: (val?: boolean) => void
  pttModeSetting?: boolean
  onPttModeChange?: (val: boolean) => void
  pttKey?: string
  onPttKeyChange?: (val: string) => void
  muteShortcut?: string
  deafenShortcut?: string
  aiDenoiseShortcut?: string
  onNavigateToKeybinds?: () => void
}

/* ── Minimalist Clean SVG Icons (Zero cartoon emojis) ── */
function MicIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function HeadphonesIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  )
}

function RefreshIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 21h5v-5" />
    </svg>
  )
}

function SparklesAiIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function ShieldCheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function SpatialAudioIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M3.05 11a9 9 0 0 1 .5-2m16.9 2a9 9 0 0 0-.5-2M6.16 6.16a9 9 0 0 1 11.68 0M12 3a9 9 0 0 1 9 9m-9 9a9 9 0 0 1-9-9" />
    </svg>
  )
}

function VolumeSpeakerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function CheckmarkIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function KeyboardIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="6" y1="8" x2="6" y2="8" />
      <line x1="10" y1="8" x2="10" y2="8" />
      <line x1="14" y1="8" x2="14" y2="8" />
      <line x1="18" y1="8" x2="18" y2="8" />
      <line x1="6" y1="12" x2="6" y2="12" />
      <line x1="10" y1="12" x2="10" y2="12" />
      <line x1="14" y1="12" x2="14" y2="12" />
      <line x1="18" y1="12" x2="18" y2="12" />
      <line x1="7" y1="16" x2="17" y2="16" />
    </svg>
  )
}

export function AudioVideoTab({
  audioInputs,
  audioOutputs,
  selectedInputId,
  selectedOutputId,
  onInputDeviceChange,
  onOutputDeviceChange,
  audioError,
  onRefreshDevices,
  echoCancellationEnabled,
  onEchoCancellationChange,
  sfxVolume,
  onSfxVolumeChange,
  noiseGateEnabled,
  noiseGateThreshold,
  onNoiseGateEnabledChange,
  onNoiseGateThresholdChange,
  spatialAudioEnabled,
  onToggleSpatialAudio,
  onResetAllPans,
  isAiDenoiseEnabled,
  onToggleAiDenoise,
  pttModeSetting,
  onPttModeChange,
  pttKey,
  onPttKeyChange,
  muteShortcut,
  deafenShortcut,
  aiDenoiseShortcut,
  onNavigateToKeybinds,
}: AudioVideoTabProps) {
  // Push-to-Talk state
  const [prevPttModeSetting, setPrevPttModeSetting] = useState(pttModeSetting)
  const [localPttMode, setLocalPttMode] = useState<boolean>(() =>
    pttModeSetting !== undefined ? pttModeSetting : localStorage.getItem('echo-ptt-mode') === 'true'
  )

  if (pttModeSetting !== undefined && pttModeSetting !== prevPttModeSetting) {
    setPrevPttModeSetting(pttModeSetting)
    setLocalPttMode(pttModeSetting)
  }

  const [prevPttKey, setPrevPttKey] = useState(pttKey)
  const [localPttKey, setLocalPttKey] = useState<string>(() =>
    pttKey || localStorage.getItem('echo-ptt-key') || 'KeyV'
  )

  if (pttKey && pttKey !== prevPttKey) {
    setPrevPttKey(pttKey)
    setLocalPttKey(pttKey)
  }

  // Hotkeys state
  const [localMuteKey] = useState<string>(() =>
    muteShortcut || localStorage.getItem('echo-shortcut-mute') || 'F8'
  )
  const [localDeafenKey] = useState<string>(() =>
    deafenShortcut || localStorage.getItem('echo-shortcut-deafen') || 'F9'
  )
  const [localAiDenoiseKey] = useState<string>(() =>
    aiDenoiseShortcut || localStorage.getItem('echo-shortcut-ai-denoise') || 'F7'
  )

  // Real mic test state
  const [testingMic, setTestingMic] = useState(false)
  const [testVolume, setTestVolume] = useState(0)
  const micTestIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const micTestStreamRef = useRef<MediaStream | null>(null)
  const micTestCtxRef = useRef<AudioContext | null>(null)

  function toggleMicTest() {
    if (testingMic) {
      if (micTestIntervalRef.current) clearInterval(micTestIntervalRef.current)
      micTestStreamRef.current?.getTracks().forEach((t) => t.stop())
      micTestCtxRef.current?.close().catch(() => {})
      setTestVolume(0)
      setTestingMic(false)
    } else {
      navigator.mediaDevices
        .getUserMedia({
          audio: selectedInputId !== 'default' ? { deviceId: { exact: selectedInputId } } : true,
          video: false,
        })
        .then((stream) => {
          micTestStreamRef.current = stream
          const ctx = new AudioContext()
          micTestCtxRef.current = ctx
          const source = ctx.createMediaStreamSource(stream)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 512
          source.connect(analyser)

          setTestingMic(true)
          micTestIntervalRef.current = setInterval(() => {
            const data = new Uint8Array(analyser.frequencyBinCount)
            analyser.getByteFrequencyData(data)
            const avg = data.reduce((sum, v) => sum + v, 0) / data.length
            const vol = Math.min(100, Math.floor(avg * 2.5))
            setTestVolume(vol)
          }, 100)
        })
        .catch((err) => {
          alert('Não foi possível acessar o microfone para teste: ' + err)
        })
    }
  }

  useEffect(() => {
    return () => {
      if (micTestIntervalRef.current) clearInterval(micTestIntervalRef.current)
      micTestStreamRef.current?.getTracks().forEach((t) => t.stop())
      micTestCtxRef.current?.close().catch(() => {})
    }
  }, [])

  return (
    <div className="settings-container">
      {/* ── Cabeçalho Principal ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Voz &bull; Configurações de Áudio
          </h2>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', margin: '4px 0 0', lineHeight: 1.5 }}>
            Configure seus dispositivos de som, teste o microfone e calibre o cancelamento de ruído.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshDevices}
          style={{
            padding: '7px 14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-color)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-color)')}
        >
          <RefreshIcon size={13} /> Detectar Dispositivos
        </button>
      </div>

      {audioError && (
        <div className="friend-search-notice error" style={{ margin: '14px 0', padding: '12px 16px', borderRadius: '10px' }}>
          <strong>Aviso do Sistema:</strong> {audioError}
          <br />
          <span style={{ fontSize: '11px', opacity: 0.85 }}>
            Verifique se o seu microfone está conectado e se o acesso ao microfone está habilitado nas Configurações de Privacidade do Windows.
          </span>
        </div>
      )}

      {/* ── 1. Dispositivos de Entrada e Saída (Lado a Lado em Cards Modernos) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
        {/* Microfone (Entrada) */}
        <div className="echo-audio-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}>
                <MicIcon size={18} />
              </span>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                  Microfone (Entrada)
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Captação da sua voz
                </span>
              </div>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              Pronto
            </span>
          </div>

          <div>
            <select
              value={selectedInputId}
              onChange={(e) => onInputDeviceChange(e.target.value)}
              className="echo-audio-select"
            >
              <option value="default">Microfone padrão do sistema</option>
              {audioInputs.map((input) => (
                <option key={input.deviceId} value={input.deviceId}>
                  {input.label || `Microfone (${input.deviceId.slice(0, 5)})`}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fones / Alto-falantes (Saída) */}
        <div className="echo-audio-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ color: '#38bdf8', display: 'flex', alignItems: 'center' }}>
                <HeadphonesIcon size={18} />
              </span>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                  Dispositivo de Saída
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Fones de ouvido e caixas de som
                </span>
              </div>
            </div>
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              Ativo
            </span>
          </div>

          <div>
            <select
              value={selectedOutputId}
              onChange={(e) => onOutputDeviceChange(e.target.value)}
              className="echo-audio-select"
            >
              <option value="default">Saída padrão do sistema</option>
              {audioOutputs.map((output) => (
                <option key={output.deviceId} value={output.deviceId}>
                  {output.label || `Saída (${output.deviceId.slice(0, 5)})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── 2. Calibração & Teste de Microfone (Fluido, sem os 36 blocos pesados) ── */}
      <div className="echo-audio-card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}>
                <MicIcon size={16} />
              </span>
              Calibração & Teste de Microfone
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Fale para conferir se o seu microfone está captando com clareza e no nível ideal para o squad.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleMicTest}
            className={`mic-test-btn ${testingMic ? 'testing' : ''}`}
          >
            <span className="mic-test-dot" />
            {testingMic ? 'Parar Teste de Microfone' : 'Iniciar Teste de Microfone'}
          </button>
        </div>

        {/* Barra de Nível Studio Fluida */}
        <div className="echo-clean-vu-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 600 }}>
            <span>Silêncio (-60 dB)</span>
            <span style={{ color: '#10b981' }}>Nível Ideal (-20 dB a -6 dB)</span>
            <span style={{ color: '#ef4444' }}>Pico / Distorção (0 dB)</span>
          </div>

          <div className="echo-vu-track">
            <div
              className="echo-vu-bar-fill"
              style={{ width: `${testVolume}%` }}
            />
            {/* Linha da zona ideal */}
            <div className="echo-vu-zone-mark" style={{ left: '65%' }} title="Zona recomendada de fala" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginTop: '2px' }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-color)' }}>
              {testingMic && testVolume > 0 ? `${Math.round(-60 + (testVolume / 100) * 60)} dB` : '-∞ dB'}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: testVolume > 85 ? '#ef4444' : testVolume > 15 ? '#10b981' : 'var(--text-muted)' }}>
              {!testingMic
                ? 'Teste desativado'
                : testVolume > 85
                ? 'Pico elevado (reduza a sensibilidade)'
                : testVolume > 15
                ? 'Nível ideal de transmissão'
                : 'Aguardando voz...'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. Modo de Transmissão de Voz (Detecção vs Push-to-Talk) ── */}
      <div className="echo-audio-card" style={{ marginTop: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Modo de Transmissão de Voz
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Defina se o microfone transmite continuamente ao detectar sua fala ou apenas segurando uma tecla.
          </p>
        </div>

        <div className="echo-transmit-grid">
          {/* Detecção por Voz */}
          <div
            className={`echo-transmit-card ${!localPttMode ? 'selected' : ''}`}
            onClick={() => {
              localStorage.setItem('echo-ptt-mode', 'false')
              setLocalPttMode(false)
              onPttModeChange?.(false)
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                Detecção por Voz (Automático)
              </span>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                O microfone abre sozinho quando você fala.
              </p>
            </div>
            {!localPttMode && (
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-color)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckmarkIcon size={11} />
              </span>
            )}
          </div>

          {/* Push-to-Talk */}
          <div
            className={`echo-transmit-card ${localPttMode ? 'selected' : ''}`}
            onClick={() => {
              localStorage.setItem('echo-ptt-mode', 'true')
              setLocalPttMode(true)
              onPttModeChange?.(true)
            }}
          >
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                Push-to-Talk (Aperte para Falar)
              </span>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Transmite som apenas enquanto você segura a tecla.
              </p>
            </div>
            {localPttMode && (
              <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--accent-color)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckmarkIcon size={11} />
              </span>
            )}
          </div>
        </div>

        {/* Sensibilidade do Portão de Ruído (Noise Gate) - Sem gráfico confuso */}
        {!localPttMode ? (
          <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                  Sensibilidade do Portão de Ruído (Noise Gate)
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  Sons ambientes abaixo deste volume não abrirão seu microfone.
                </span>
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-color)' }}>
                {noiseGateThreshold} dB {noiseGateThreshold === -45 ? '(Padrão)' : ''}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label className="echo-switch">
                <input
                  type="checkbox"
                  checked={noiseGateEnabled}
                  onChange={(e) => onNoiseGateEnabledChange(e.target.checked)}
                />
                <span className="echo-slider" />
              </label>

              {noiseGateEnabled && (
                <div style={{ flex: 1 }}>
                  <input
                    type="range"
                    min="-60"
                    max="-25"
                    step="1"
                    value={noiseGateThreshold}
                    onChange={(e) => onNoiseGateThresholdChange(parseFloat(e.target.value))}
                    className="slider-setting"
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    <span>-60 dB (Mais Sensível)</span>
                    <span>-45 dB (Recomendado)</span>
                    <span>-25 dB (Menos Sensível)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Seletor de Tecla PTT */
          <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                Tecla de Atalho do Push-to-Talk
              </span>
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Funciona em segundo plano durante jogos em tela cheia.
              </span>
            </div>
            <select
              value={localPttKey}
              onChange={(e) => {
                const newKey = e.target.value
                localStorage.setItem('echo-ptt-key', newKey)
                setLocalPttKey(newKey)
                onPttKeyChange?.(newKey)
              }}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontWeight: 700,
                outline: 'none',
                width: '180px',
              }}
            >
              <option value="KeyV">V (Padrão Gamer)</option>
              <option value="KeyC">C</option>
              <option value="KeyX">X</option>
              <option value="KeyZ">Z</option>
              <option value="KeyT">T</option>
              <option value="KeyB">B</option>
              <option value="Space">Espaço</option>
              <option value="CapsLock">Caps Lock</option>
              <option value="Tab">Tab</option>
              <option value="AltLeft">Alt Esquerdo</option>
              <option value="ControlLeft">Ctrl Esquerdo</option>
              <option value="F1">F1</option>
              <option value="F2">F2</option>
            </select>
          </div>
        )}
      </div>

      {/* ── 4. Filtros & Processamento Inteligente em Grid 2x2 ── */}
      <div className="echo-audio-card" style={{ marginTop: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Filtros & Processamento Inteligente
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Recursos para garantir voz limpa sem sobrecarregar sua CPU ou taxa de quadros (FPS).
          </p>
        </div>

        <div className="echo-filters-grid">
          {/* Supressão de Ruído por IA (RNNoise) */}
          <div className="echo-filter-item">
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#c084fc', display: 'flex', alignItems: 'center' }}>
                  <SparklesAiIcon size={16} />
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Supressão por IA (RNNoise)
                </span>
                <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                  0% CPU
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                Remove teclado mecânico, respiração e ruído elétrico com rede neural.
              </p>
            </div>
            <label className="echo-switch">
              <input
                type="checkbox"
                checked={isAiDenoiseEnabled}
                onChange={(e) => onToggleAiDenoise(e.target.checked)}
              />
              <span className="echo-slider" />
            </label>
          </div>

          {/* Cancelamento de Eco */}
          <div className="echo-filter-item">
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
                  <ShieldCheckIcon size={16} />
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Cancelamento de Eco
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                Impede que o som dos fones ou caixas volte e cause retorno.
              </p>
            </div>
            <label className="echo-switch">
              <input
                type="checkbox"
                checked={echoCancellationEnabled}
                onChange={(e) => onEchoCancellationChange(e.target.checked)}
              />
              <span className="echo-slider" />
            </label>
          </div>

          {/* Áudio Espacial 3D */}
          <div className="echo-filter-item">
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}>
                  <SpatialAudioIcon size={16} />
                </span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Áudio Espacial 3D
                </span>
                <span style={{ fontSize: '9.5px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-color)' }}>
                  Posicional
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                Separa a voz de cada amigo no espaço estéreo (esquerda/direita).
              </p>
            </div>
            <label className="echo-switch">
              <input
                type="checkbox"
                checked={spatialAudioEnabled}
                onChange={(e) => onToggleSpatialAudio(e.target.checked)}
              />
              <span className="echo-slider" />
            </label>
          </div>

          {/* Efeitos Sonoros do Aplicativo (SFX Volume) */}
          <div className="echo-filter-item">
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                    <VolumeSpeakerIcon size={16} />
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Efeitos Sonoros (SFX)
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={sfxVolume}
                onChange={(e) => onSfxVolumeChange(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer', height: '5px', marginTop: '6px' }}
              />
            </div>
          </div>
        </div>

        {spatialAudioEnabled && (
          <div style={{ paddingTop: '10px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
              Áudio Espacial ativo &bull; Ajuste a posição de cada amigo no menu de volume individual.
            </span>
            <button
              type="button"
              onClick={onResetAllPans}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshIcon size={12} /> Centralizar Todos
            </button>
          </div>
        )}
      </div>

      {/* ── 5. Atalhos Globais In-Game ── */}
      <div className="echo-audio-hotkeys-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center' }}>
            <KeyboardIcon size={22} />
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="echo-audio-hotkeys-title">
                Teclas de Atalho Globais (In-Game)
              </span>
              <span className="echo-audio-hotkeys-badge">
                Aba Dedicada
              </span>
            </div>
            <p className="echo-audio-hotkeys-desc">
              Mudo ({localMuteKey}), Deafen ({localDeafenKey}), Filtro IA ({localAiDenoiseKey}) e atalhos rápidos possuem uma aba própria.
            </p>
          </div>
        </div>

        {onNavigateToKeybinds && (
          <button
            type="button"
            onClick={onNavigateToKeybinds}
            className="echo-audio-hotkeys-btn"
          >
            Abrir Teclas de Atalho &rarr;
          </button>
        )}
      </div>
    </div>
  )
}
