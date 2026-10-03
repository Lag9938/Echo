import { useState, useEffect, useRef } from 'react'
import {
  ColoredRefreshIcon,
  ColoredBrainAiIcon,
  ColoredHeadphonesIcon,
  ColoredMicActiveIcon,
  ColoredPushToTalkIcon,
  ColoredVolumeSpeakerIcon
} from '../../components/ColoredIcons'

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

export function AudioVideoTab({
  audioInputs,
  audioOutputs,
  selectedInputId,
  selectedOutputId,
  onInputDeviceChange,
  onOutputDeviceChange,
  audioError,
  onRefreshDevices,
  noiseSuppressionEnabled,
  echoCancellationEnabled,
  onNoiseSuppressionChange,
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
  onNavigateToKeybinds
}: AudioVideoTabProps) {
  // Push-to-Talk settings
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

  // Global In-Game Hotkeys state (read-only in audio tab; edited in Keybinds tab)
  const [localMuteKey] = useState<string>(() =>
    muteShortcut || localStorage.getItem('echo-shortcut-mute') || 'F8'
  )
  const [localDeafenKey] = useState<string>(() =>
    deafenShortcut || localStorage.getItem('echo-shortcut-deafen') || 'F9'
  )
  const [localAiDenoiseKey] = useState<string>(() =>
    aiDenoiseShortcut || localStorage.getItem('echo-shortcut-ai-denoise') || 'F7'
  )

  // Mic test state
  const [testingMic, setTestingMic] = useState(false)
  const [testVolume, setTestVolume] = useState(0)
  const micTestIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const micTestStreamRef = useRef<MediaStream | null>(null)
  const micTestCtxRef = useRef<AudioContext | null>(null)

  function toggleMicTest() {
    if (testingMic) {
      if (micTestIntervalRef.current) clearInterval(micTestIntervalRef.current)
      micTestStreamRef.current?.getTracks().forEach(t => t.stop())
      micTestCtxRef.current?.close().catch(() => {})
      setTestVolume(0)
      setTestingMic(false)
    } else {
      navigator.mediaDevices.getUserMedia({
        audio: selectedInputId !== 'default' ? { deviceId: { exact: selectedInputId } } : true,
        video: false
      }).then(stream => {
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
      }).catch(err => {
        alert('Não foi possível acessar o microfone para teste: ' + err)
      })
    }
  }

  useEffect(() => {
    return () => {
      if (micTestIntervalRef.current) clearInterval(micTestIntervalRef.current)
      micTestStreamRef.current?.getTracks().forEach(t => t.stop())
      micTestCtxRef.current?.close().catch(() => {})
    }
  }, [])

  return (
    <div className="settings-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Configurações de Áudio</h2>
        <button
          type="button"
          className="picker-close-btn"
          style={{ margin: 0, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={onRefreshDevices}
        >
          <ColoredRefreshIcon size={14} /> Detectar Dispositivos
        </button>
      </div>
      <p>Configure os dispositivos de entrada e saída de som do seu sistema.</p>

      {audioError && (
        <div className="friend-search-notice error" style={{ margin: '8px 0' }}>
          <strong>Aviso do Sistema:</strong> {audioError}
          <br />
          <span style={{ fontSize: '11px', opacity: 0.85 }}>
            Verifique se o seu microfone está conectado e se o acesso ao microfone está habilitado nas Configurações de Privacidade do Windows.
          </span>
        </div>
      )}
      
      <div className="device-selectors-grid">
        <div className="selector-card">
          <label>
            <ColoredMicActiveIcon size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Microfone (Entrada)
          </label>
          <select value={selectedInputId} onChange={(e) => onInputDeviceChange(e.target.value)}>
            <option value="default">Microfone padrão do sistema</option>
            {audioInputs.map(input => (
              <option key={input.deviceId} value={input.deviceId}>
                {input.label || `Microfone (${input.deviceId.slice(0, 5)})`}
              </option>
            ))}
          </select>
        </div>

        <div className="selector-card">
          <label>
            <ColoredHeadphonesIcon size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Dispositivo de Saída (Fones / Alto-falante)
          </label>
          <select value={selectedOutputId} onChange={(e) => onOutputDeviceChange(e.target.value)}>
            <option value="default">Saída padrão do sistema</option>
            {audioOutputs.map(output => (
              <option key={output.deviceId} value={output.deviceId}>
                {output.label || `Saída (${output.deviceId.slice(0, 5)})`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cyber Studio VU Meter Cockpit */}
      <div className="mic-test-panel audio-cockpit-panel">
        <div className="cockpit-panel-header">
          <div>
            <h3>Testar Microfone & Nível de Entrada</h3>
            <p>Fale no seu microfone para conferir o espectro de frequências e decibéis em tempo real.</p>
          </div>
          <div className="cockpit-live-badge-wrap">
            {testingMic ? (
              <span className="audio-studio-live-badge active">
                <span className="live-dot" />
                TESTE ATIVO
              </span>
            ) : (
              <span className="audio-studio-live-badge standby">
                STANDBY
              </span>
            )}
          </div>
        </div>

        {/* 36-Segment Cyber Studio VU Meter */}
        <div className="audio-vu-meter-cockpit">
          <div className="vu-meter-scale">
            <span>-60 dB</span>
            <span>-40 dB</span>
            <span>-25 dB</span>
            <span>-15 dB</span>
            <span>-6 dB</span>
            <span style={{ color: '#ef4444' }}>0 dB (CLIP)</span>
          </div>

          <div className="vu-meter-segments">
            {Array.from({ length: 36 }).map((_, idx) => {
              const threshold = ((idx + 1) / 36) * 100
              const isLit = testVolume >= threshold
              let segClass = 'seg-low'
              if (idx >= 22 && idx < 30) segClass = 'seg-mid'
              if (idx >= 30) segClass = 'seg-high'
              return (
                <div
                  key={idx}
                  className={`vu-segment ${segClass} ${isLit ? 'lit' : ''}`}
                />
              )
            })}
          </div>

          <div className="vu-meter-footer">
            <span className="vu-db-readout">
              {testingMic && testVolume > 0
                ? `${Math.round(-60 + (testVolume / 100) * 60)} dB`
                : '-∞ dB'}
            </span>
            <span className={`vu-level-status ${testVolume > 85 ? 'peak' : testVolume > 20 ? 'optimal' : 'idle'}`}>
              {!testingMic
                ? 'TESTE DESATIVADO'
                : testVolume > 85
                ? '⚠️ PICO ELEVADO (GANHO ALTO)'
                : testVolume > 15
                ? '✓ NÍVEL IDEAL DE TRANSMISSÃO'
                : 'AGUARDANDO VOZ...'}
            </span>
          </div>
        </div>

        <div className="mic-test-row">
          <button 
            type="button" 
            className={`mic-test-btn ${testingMic ? 'testing' : ''}`} 
            onClick={toggleMicTest}
          >
            {testingMic ? '⏹ Parar Teste' : '🎙 Iniciar Teste de Microfone'}
          </button>
          <div className="volume-meter-bg">
            <div className="volume-meter-fill" style={{ width: `${testVolume}%` }} />
          </div>
        </div>
      </div>

      <div className="mic-test-panel" style={{ marginTop: '20px' }}>
        <h3>Preferências de Voz</h3>
        <p>Habilite filtros de redução de ruído e eco para melhorar a sua voz.</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <label className="checkbox-setting-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={noiseSuppressionEnabled} 
              onChange={(e) => onNoiseSuppressionChange(e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Supressão de Ruído</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Filtra ruídos de fundo como ventiladores e digitação</span>
            </div>
          </label>

          <label className="checkbox-setting-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', marginTop: '4px' }}>
            <input 
              type="checkbox" 
              checked={echoCancellationEnabled} 
              onChange={(e) => onEchoCancellationChange(e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Cancelamento de Eco</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Impede que a voz de outras pessoas nos speakers retorne ao seu microfone</span>
            </div>
          </label>

          <label className="checkbox-setting-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13.5px', cursor: 'pointer', marginTop: '4px' }}>
            <input 
              type="checkbox" 
              checked={noiseGateEnabled} 
              onChange={(e) => onNoiseGateEnabledChange(e.target.checked)} 
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div>
              <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Portão de Ruído (Noise Gate)</strong>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Corta o som do microfone automaticamente quando você está em silêncio</span>
            </div>
          </label>

          {noiseGateEnabled && (
            <div className="noise-gate-interactive-box">
              <div className="noise-gate-graph-header">
                <span className="gate-status-text">
                  {testVolume > Math.max(5, (noiseGateThreshold + 60) * (100 / 35))
                    ? '🔊 Portão Aberto (Voz Transmitida)'
                    : '🔇 Portão Fechado (Ruído Silenciado)'}
                </span>
                <span className="gate-threshold-value">
                  Limiar: <strong>{noiseGateThreshold} dB</strong>
                </span>
              </div>

              {/* Acoustic Waveform Visualizer with Threshold Cutoff Line */}
              <div className="noise-gate-visualizer-canvas">
                <svg className="gate-wave-svg" viewBox="0 0 400 64" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gateWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.03" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,52 Q40,48 80,50 T160,36 T240,14 T300,38 T400,52 L400,64 L0,64 Z"
                    fill="url(#gateWaveGrad)"
                  />
                  <path
                    d="M0,52 Q40,48 80,50 T160,36 T240,14 T300,38 T400,52"
                    fill="none"
                    stroke="#00f2fe"
                    strokeWidth="1.8"
                  />
                </svg>

                {/* Animated / Placed Red Threshold Cutoff Line */}
                <div
                  className="noise-gate-threshold-line"
                  style={{
                    left: `${Math.max(5, Math.min(95, ((noiseGateThreshold - (-60)) / 35) * 100))}%`
                  }}
                >
                  <span className="threshold-tag">Corte: {noiseGateThreshold} dB</span>
                </div>
              </div>

              <div className="gate-zones-legend">
                <span className="zone-cut">◀ Zona Silenciada (Cortada)</span>
                <span className="zone-pass">Zona de Voz (Transmitida) ▶</span>
              </div>

              <div style={{ marginTop: '10px' }}>
                <input 
                  type="range" 
                  min="-60" 
                  max="-25" 
                  step="1" 
                  value={noiseGateThreshold} 
                  onChange={(e) => onNoiseGateThresholdChange(parseFloat(e.target.value))} 
                  className="slider-setting"
                  style={{ cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span>-60 dB (Mais Sensível)</span>
                  <span>-45 dB (Padrão Recomendado)</span>
                  <span>-25 dB (Menos Sensível)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mic-test-panel" style={{ marginTop: '20px' }}>
        <h3>Efeitos Sonoros</h3>
        <p>Ajuste o volume dos avisos sonoros de conexão, mudo e transmissão.</p>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <ColoredVolumeSpeakerIcon size={20} level={sfxVolume} />
          </span>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05" 
            value={sfxVolume}
            onChange={(e) => onSfxVolumeChange(parseFloat(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent-color)', cursor: 'pointer', height: '6px', borderRadius: '3px' }}
          />
          <span style={{ minWidth: '40px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>
            {Math.round(sfxVolume * 100)}%
          </span>
        </div>
      </div>

      {/* AI Noise Suppression (RNNoise) Card */}
      <div className="mic-test-panel tech-card ai-denoise-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <ColoredBrainAiIcon size={20} />
                Supressão de Ruído por IA (Rede Neural RNNoise)
              </span>
              <span style={{ fontSize: '10.5px', background: 'rgba(168, 85, 247, 0.25)', color: '#c084fc', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                IA LOCAL • 0% CPU
              </span>
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Rede neural de deep learning local (mesma tecnologia do OBS Studio). Remove cliques de teclado mecânico, barulho de ventilador, respiração e chiado elétrico sem distorcer a voz.
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

        {isAiDenoiseEnabled && (
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
              ✓ Inteligência Artificial Ativa • Voz de estúdio limpa transmitida para seus amigos com máxima nitidez.
            </span>
          </div>
        )}
      </div>

      {/* Spatial 3D Audio Card */}
      <div className="mic-test-panel tech-card spatial-audio-card" style={{ marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                <ColoredHeadphonesIcon size={20} />
                Áudio Espacial 3D (Posicionamento Estéreo)
              </span>
              <span style={{ fontSize: '10.5px', background: 'rgba(0, 242, 254, 0.2)', color: '#00f2fe', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                ÁUDIO 3D
              </span>
            </h3>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Permite posicionar a voz de cada amigo no espaço estéreo (esquerda, centro ou direita) para facilitar a comunicação e reconhecimento no squad.
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

        {spatialAudioEnabled && (
          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
              ✓ Áudio Espacial Ativo • Você pode ajustar a posição de cada amigo no menu de volume dele.
            </span>
            <button 
              type="button" 
              className="picker-close-btn" 
              style={{ margin: 0, padding: '5px 12px', fontSize: '11.5px', display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={onResetAllPans}
            >
              <ColoredRefreshIcon size={13} /> Centralizar Todos os Amigos
            </button>
          </div>
        )}
      </div>

      {/* Push-to-Talk Gamer Configuration */}
      <div className="mic-test-panel" style={{ marginTop: '20px' }}>
        <h3>Modo de Entrada & Push-to-Talk Global</h3>
        <p>Escolha se sua voz é transmitida continuamente ou apenas quando você segura a tecla de atalho.</p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
          <button
            type="button"
            className={`mic-test-btn ${!localPttMode ? 'testing' : ''}`}
            onClick={() => {
              localStorage.setItem('echo-ptt-mode', 'false')
              setLocalPttMode(false)
              onPttModeChange?.(false)
            }}
            style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <ColoredMicActiveIcon size={17} />
            <span>Detecção por Voz (Automático)</span>
          </button>
          <button
            type="button"
            className={`mic-test-btn ${localPttMode ? 'testing' : ''}`}
            onClick={() => {
              localStorage.setItem('echo-ptt-mode', 'true')
              setLocalPttMode(true)
              onPttModeChange?.(true)
            }}
            style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <ColoredPushToTalkIcon size={17} />
            <span>Push-to-Talk (PTT)</span>
          </button>
        </div>

        {localPttMode && (
          <div style={{ marginTop: '16px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              Tecla de Atalho Global do Push-to-Talk:
            </label>
            <select
              value={localPttKey}
              onChange={(e) => {
                const newKey = e.target.value
                localStorage.setItem('echo-ptt-key', newKey)
                setLocalPttKey(newKey)
                onPttKeyChange?.(newKey)
              }}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontWeight: 700, outline: 'none', width: '100%', maxWidth: '240px' }}
            >
              <option value="KeyV">V (Padrão Gamer)</option>
              <option value="KeyC">C</option>
              <option value="KeyX">X</option>
              <option value="KeyZ">Z</option>
              <option value="KeyT">T</option>
              <option value="KeyB">B</option>
              <option value="Space">Barra de Espaço (Space)</option>
              <option value="CapsLock">Caps Lock</option>
              <option value="Tab">Tab</option>
              <option value="Backquote">Aspas / Til (~ / `)</option>
              <option value="AltLeft">Alt Esquerdo</option>
              <option value="ControlLeft">Ctrl Esquerdo</option>
              <option value="F1">F1</option>
              <option value="F2">F2</option>
            </select>
            <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Funciona globalmente em tela cheia no VALORANT, CS2, Fortnite, etc.
            </span>
          </div>
        )}

        {/* Link para a Nova Aba Dedicada de Teclas de Atalho */}
        <div style={{
          marginTop: '20px',
          background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.08), rgba(79, 70, 229, 0.08))',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(0, 242, 254, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                ⌨️ Teclas de Atalho Globais (In-Game)
              </span>
              <span style={{ fontSize: '10px', background: 'var(--accent-color, #00f2fe)', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                NOVA ABA DEDICADA
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Configurações de Push-to-Talk, Mudo ({localMuteKey}), Deafen ({localDeafenKey}), Filtro de Ruído IA ({localAiDenoiseKey}) e atalhos globais agora possuem uma aba própria na barra lateral.
            </p>
          </div>
          {onNavigateToKeybinds && (
            <button
              onClick={onNavigateToKeybinds}
              style={{
                background: 'var(--accent-color, #00f2fe)',
                color: '#000',
                border: 'none',
                padding: '9px 18px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              Abrir Teclas de Atalho →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
