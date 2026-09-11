import { useEffect } from 'react'
import {
  ColoredRocketIcon,
  ColoredRefreshIcon,
  ColoredWindowsIcon,
  ColoredMonitorIcon,
  ColoredGamepadIcon,
  ColoredPauseIcon,
  ColoredLightningIcon
} from '../ColoredIcons'

export interface ScreenSource {
  id: string
  name: string
  type?: string
  thumbnail?: string
  appIcon?: string
  isGame?: boolean
  isMinimized?: boolean
}

export function ScreenPickerModal({
  isOpen,
  onClose,
  screenSources,
  setScreenSources,
  screenPickerTab,
  setScreenPickerTab,
  selectedPickerSourceId,
  setSelectedPickerSourceId,
  selectScreenSource,
  screenQuality,
  setScreenQuality,
  screenFps,
  setScreenFps
}: {
  isOpen: boolean
  onClose: () => void
  screenSources: ScreenSource[]
  setScreenSources: (sources: ScreenSource[]) => void
  screenPickerTab: 'windows' | 'screens'
  setScreenPickerTab: (tab: 'windows' | 'screens') => void
  selectedPickerSourceId: string | null
  setSelectedPickerSourceId: (id: string | null) => void
  selectScreenSource: (sourceId: string) => void
  screenQuality: '720p' | '1080p' | 'native'
  setScreenQuality: (q: '720p' | '1080p' | 'native') => void
  screenFps: number
  setScreenFps: (fps: 15 | 30 | 60) => void
}) {
  const currentSelectedPickerSource = screenSources.find(s => s.id === selectedPickerSourceId)
  const isPickerGameOrScreen = screenPickerTab === 'screens' || 
    currentSelectedPickerSource?.type === 'screen' || 
    currentSelectedPickerSource?.id?.startsWith('screen:') || 
    currentSelectedPickerSource?.isGame === true || 
    (currentSelectedPickerSource?.name || '').toLowerCase().includes('(jogo)')

  useEffect(() => {
    if (isOpen && !isPickerGameOrScreen && screenFps === 60) {
      setScreenFps(30)
    }
  }, [isOpen, isPickerGameOrScreen, screenFps, setScreenFps])

  if (!isOpen) return null

  return (
    <div className="screen-picker-overlay" onClick={onClose}>
      <div className="screen-picker-modal" onClick={e => e.stopPropagation()}>
        <div className="screen-picker-header">
          <div className="screen-picker-header-info">
            <div className="screen-picker-title-row">
              <span className="screen-picker-badge">
                <ColoredRocketIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> GO LIVE
              </span>
              <h2>Transmitir Jogo ou Tela</h2>
            </div>
            <p>Selecione a janela de um jogo ou aplicativo para transmitir com fluidez e som estéreo.</p>
          </div>
          <div className="screen-picker-header-actions">
            <button 
              type="button"
              className="screen-picker-refresh-btn"
              onClick={async () => {
                if ((window as any).electronAPI) {
                  const raw = await (window as any).electronAPI.getSources()
                  const seenNames = new Set<string>()
                  const sources: ScreenSource[] = []
                  for (const s of (raw || [])) {
                    if (s.type === 'screen' || (s.id && s.id.startsWith('screen:'))) {
                      sources.push(s)
                      continue
                    }
                    const cleanKey = (s.name || '').toLowerCase().replace(/\s*\(jogo\)\s*/i, '').trim()
                    if (!cleanKey || seenNames.has(cleanKey)) continue
                    seenNames.add(cleanKey)
                    sources.push(s)
                  }
                  setScreenSources(sources)
                }
              }}
              title="Atualizar lista de janelas e jogos"
            >
              <ColoredRefreshIcon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Atualizar
            </button>
            <button type="button" className="screen-picker-close-x" onClick={onClose} title="Fechar">×</button>
          </div>
        </div>

        <div className="screen-picker-tabs">
          <button 
            type="button" 
            className={`screen-picker-tab-btn ${screenPickerTab === 'windows' ? 'active' : ''}`} 
            onClick={() => {
              setScreenPickerTab('windows')
              const firstWin = screenSources.find(s => s.type === 'window' || s.id.startsWith('window:'))
              if (firstWin) {
                setSelectedPickerSourceId(firstWin.id)
                const isGame = firstWin.isGame === true || (firstWin.name || '').toLowerCase().includes('(jogo)')
                if (!isGame && screenFps === 60) {
                  setScreenFps(30)
                }
              }
            }}
          >
            <span>
              <ColoredWindowsIcon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Janelas de Jogos e Apps
            </span>
            <span className="picker-tab-count">
              {screenSources.filter(s => s.type === 'window' || s.id.startsWith('window:')).length}
            </span>
          </button>
          <button 
            type="button" 
            className={`screen-picker-tab-btn ${screenPickerTab === 'screens' ? 'active' : ''}`} 
            onClick={() => {
              setScreenPickerTab('screens')
              const firstScreen = screenSources.find(s => s.type === 'screen' || s.id.startsWith('screen:'))
              if (firstScreen) {
                setSelectedPickerSourceId(firstScreen.id)
              }
            }}
          >
            <span>
              <ColoredMonitorIcon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Telas Inteiras (Monitores)
            </span>
            <span className="picker-tab-count">
              {screenSources.filter(s => s.type === 'screen' || s.id.startsWith('screen:')).length}
            </span>
          </button>
        </div>

        <div className="sources-list">
          {screenSources
            .filter(s => screenPickerTab === 'windows' ? (s.type === 'window' || s.id.startsWith('window:')) : (s.type === 'screen' || s.id.startsWith('screen:')))
            .map(source => {
              const isSelected = selectedPickerSourceId === source.id
              return (
                <button 
                  key={source.id} 
                  type="button" 
                  className={`source-card ${isSelected ? 'selected' : ''}`} 
                  onClick={() => {
                    setSelectedPickerSourceId(source.id)
                    const isGame = source.isGame === true || (source.name || '').toLowerCase().includes('(jogo)')
                    if (!isGame && screenPickerTab !== 'screens' && screenFps === 60) {
                      setScreenFps(30)
                    }
                  }}
                  onDoubleClick={() => selectScreenSource(source.id)}
                >
                  <div className="source-card-thumb-wrap" style={{ position: 'relative' }}>
                    {source.thumbnail ? (
                      <img src={source.thumbnail} alt={source.name} className="source-thumb-img" />
                    ) : source.appIcon ? (
                      <div className="source-thumb-icon-placeholder">
                        <img src={source.appIcon} alt="" className="source-placeholder-icon" />
                      </div>
                    ) : (
                      <div className="source-thumb-icon-placeholder" style={{ background: source.isGame ? 'linear-gradient(135deg, #ff4655, #0f1923)' : undefined }}>
                        <span className="source-placeholder-emoji">
                          {screenPickerTab === 'screens' ? (
                            <ColoredMonitorIcon size={32} />
                          ) : source.isGame ? (
                            <ColoredGamepadIcon size={32} />
                          ) : (
                            <ColoredWindowsIcon size={32} />
                          )}
                        </span>
                      </div>
                    )}
                    {source.isGame ? (
                      <span className="source-game-badge">
                        <ColoredGamepadIcon size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> JOGO DETECTADO
                      </span>
                    ) : source.isMinimized ? (
                      <span className="source-minimized-badge">
                        <ColoredPauseIcon size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> MINIMIZADA
                      </span>
                    ) : null}
                    {isSelected && (
                      <span className="source-selected-badge">
                        ✓ Selecionado
                      </span>
                    )}
                    {source.appIcon && source.thumbnail && (
                      <img src={source.appIcon} alt="" className="source-app-icon-badge" />
                    )}
                  </div>
                  <div className="source-card-info">
                    {source.appIcon && <img src={source.appIcon} alt="" className="source-card-title-icon" />}
                    <span title={source.name}>{source.name}</span>
                  </div>
                </button>
              )
            })}
          {screenSources.filter(s => screenPickerTab === 'windows' ? (s.type === 'window' || s.id.startsWith('window:')) : (s.type === 'screen' || s.id.startsWith('screen:'))).length === 0 && (
            <div className="sources-empty-state">
              Nenhuma {screenPickerTab === 'windows' ? 'janela aberta' : 'tela'} encontrada no momento.
            </div>
          )}
        </div>

        {/* Quality & FPS Stream Settings Integrated Panel */}
        <div className="screen-picker-quality-box">
          <div className="picker-quality-col">
            <span className="picker-section-label">RESOLUÇÃO DE TRANSMISSÃO</span>
            <div className="picker-chips-row">
              {(['720p', '1080p', 'native'] as const).map(q => (
                <button
                  key={q}
                  type="button"
                  className={`picker-config-chip ${screenQuality === q ? 'active' : ''}`}
                  onClick={() => setScreenQuality(q)}
                >
                  {q === '720p' ? '720p HD' : q === '1080p' ? '1080p Full HD' : 'Fonte (Nativa)'}
                </button>
              ))}
            </div>
          </div>

          <div className="picker-quality-col">
            <span className="picker-section-label">TAXA DE QUADROS</span>
            <div className="picker-chips-row">
              {([15, 30, 60] as const).map(f => {
                const is60Locked = f === 60 && !isPickerGameOrScreen
                return (
                  <button
                    key={f}
                    type="button"
                    disabled={is60Locked}
                    title={is60Locked ? '60 FPS disponível apenas em Jogos e Telas Inteiras' : undefined}
                    className={`picker-config-chip ${screenFps === f ? 'active' : ''} ${f === 60 ? 'fps-60' : ''} ${is60Locked ? 'disabled' : ''}`}
                    onClick={() => {
                      if (!is60Locked) {
                        setScreenFps(f)
                      }
                    }}
                  >
                    {f === 60 ? (
                      <>
                        <ColoredLightningIcon size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} /> 60 FPS (Ultra Suave)
                        {is60Locked && (
                          <span style={{ fontSize: '9px', marginLeft: 6, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            (Jogos/Telas)
                          </span>
                        )}
                      </>
                    ) : (
                      `${f} FPS`
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="screen-picker-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button type="button" className="picker-close-btn" onClick={onClose}>
            Cancelar
          </button>
          <button 
            type="button"
            className="picker-go-live-btn"
            disabled={!selectedPickerSourceId && screenSources.length === 0}
            onClick={() => {
              const targetId = selectedPickerSourceId || (screenSources[0]?.id)
              if (targetId) {
                selectScreenSource(targetId)
              }
            }}
          >
            <ColoredRocketIcon size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Iniciar Transmissão (Go Live)
          </button>
        </div>
      </div>
    </div>
  )
}
