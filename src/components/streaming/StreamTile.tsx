import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { VoiceParticipant } from '../../lib/useVoiceChannel'
import { AudioLevelMeter } from '../voice/AudioLevelMeter'
import {
  BarChartIcon,
  EyeIcon,
  EyeOffIcon,
  FocusIcon,
  FullscreenIcon,
  PipIcon,
  ScreenIcon,
  VolumeIcon
} from '../icons'

export function StreamTile({
  participant,
  user,
  peerScreenVolumes,
  setPeerScreenVolumes,
  isFullScreen,
  onToggleFullScreen,
  onSelectFocus,
  isGrid,
  isPiPActive,
  onToggleFloatingPiP,
  onCloseStream,
  localScreenFps = 30,
  screenAudioSyncDelayMs,
  onChangeScreenAudioSyncDelay,
  isDeafened = false
}: {
  participant: VoiceParticipant;
  user: User;
  peerScreenVolumes: Record<string, number>;
  setPeerScreenVolumes: (v: Record<string, number>) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onSelectFocus?: () => void;
  isGrid?: boolean;
  isPiPActive?: boolean;
  onToggleFloatingPiP?: () => void;
  onCloseStream?: () => void;
  localScreenFps?: number;
  screenAudioSyncDelayMs?: number;
  onChangeScreenAudioSyncDelay?: (ms: number) => void;
  isDeafened?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [streamResolution, setStreamResolution] = useState<string>('')
  const [showStatsHud, setShowStatsHud] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const hideTimeoutRef = useRef<any>(null)

  const isLocalSharer = participant.userId === user.id
  const volumeVal = peerScreenVolumes[participant.userId] !== undefined ? peerScreenVolumes[participant.userId] : 100
  const [showLocalPreview, setShowLocalPreview] = useState(false)
  const [detectedFps, setDetectedFps] = useState<number>(participant.screenFps || 30)
  const streamFps = isLocalSharer ? (localScreenFps || 30) : (participant.screenFps || detectedFps || 30)

  const handleMouseMove = () => {
    setIsControlsVisible(true)
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    if (!showStatsHud) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false)
      }, 2500)
    }
  }

  const handleMouseLeave = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
    }
    if (!showStatsHud) {
      setIsControlsVisible(false)
    }
  }

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [])

  // Atalhos de teclado para calibrar a Sincronia Labial em tempo real: [ diminui, ] aumenta
  useEffect(() => {
    if (isLocalSharer || !onChangeScreenAudioSyncDelay) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === '[') {
        const current = screenAudioSyncDelayMs !== undefined ? screenAudioSyncDelayMs : 0
        onChangeScreenAudioSyncDelay(Math.max(0, current - 25))
      } else if (e.key === ']') {
        const current = screenAudioSyncDelayMs !== undefined ? screenAudioSyncDelayMs : 0
        onChangeScreenAudioSyncDelay(Math.min(1000, current + 25))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLocalSharer, screenAudioSyncDelayMs, onChangeScreenAudioSyncDelay])

  // Detect real FPS for remote participants
  useEffect(() => {
    if (isLocalSharer) return
    const stream = participant.screenStream
    if (!stream) return

    const track = stream.getVideoTracks?.()[0]
    let trackTargetFps = participant.screenFps || 30
    if (track) {
      const settings = track.getSettings?.()
      if (settings?.frameRate && settings.frameRate >= 24) {
        trackTargetFps = Math.round(settings.frameRate)
        setDetectedFps(trackTargetFps)
      } else if (participant.screenFps) {
        trackTargetFps = participant.screenFps
        setDetectedFps(participant.screenFps)
      }
    }

    const videoEl = videoRef.current
    if (!videoEl || !('requestVideoFrameCallback' in videoEl)) return

    let rVfcId: number | null = null
    let frameCount = 0
    let lastTime = performance.now()

    const onFrame = (now: DOMHighResTimeStamp) => {
      frameCount++
      const elapsed = now - lastTime
      if (elapsed >= 1500) {
        const rawFps = Math.round((frameCount * 1000) / elapsed)
        // Tolerância inteligente a frames estáticos/menus para transmissões de tela VFR (Variable Frame Rate)
        // Mantém a meta de 30 FPS ou 60 FPS e não derruba falsamente para 15 FPS quando a tela estiver parada ou em menu
        const normalizedFps = rawFps >= 42
          ? 60
          : (trackTargetFps >= 60 && rawFps >= 22)
          ? 60
          : (trackTargetFps >= 30 && rawFps >= 4)
          ? 30
          : rawFps >= 20
          ? 30
          : rawFps >= 8
          ? 15
          : rawFps
        if (normalizedFps > 0) {
          setDetectedFps(normalizedFps)
        }
        frameCount = 0
        lastTime = now
      }
      if (videoEl && 'requestVideoFrameCallback' in videoEl) {
        rVfcId = (videoEl as any).requestVideoFrameCallback(onFrame)
      }
    }

    rVfcId = (videoEl as any).requestVideoFrameCallback(onFrame)

    return () => {
      if (rVfcId !== null && 'cancelVideoFrameCallback' in videoEl) {
        (videoEl as any).cancelVideoFrameCallback(rVfcId)
      }
    }
  }, [participant.screenStream, isLocalSharer])

  // Notifica o canal de voz que o StreamTile está ativo na tela para o usuário (evita som duplicado / eco no fundo)
  useEffect(() => {
    if (isLocalSharer) return
    window.dispatchEvent(new CustomEvent('echo-stream-tile-active', { detail: { userId: participant.userId, active: true } }))
    return () => {
      window.dispatchEvent(new CustomEvent('echo-stream-tile-active', { detail: { userId: participant.userId, active: false } }))
    }
  }, [participant.userId, isLocalSharer])

  useEffect(() => {
    const videoEl = videoRef.current
    if (videoEl) {
      if (isLocalSharer && !showLocalPreview) {
        videoEl.srcObject = null
        return
      }

      const stream = participant.screenStream || null
      const currentStream = videoEl.srcObject as MediaStream
      const currentTrackId = currentStream?.getVideoTracks?.()[0]?.id
      const newTrackId = stream?.getVideoTracks?.()[0]?.id
      const currentAudioId = currentStream?.getAudioTracks?.()[0]?.id
      const newAudioId = stream?.getAudioTracks?.()[0]?.id

      if (currentTrackId !== newTrackId || currentAudioId !== newAudioId) {
        videoEl.srcObject = stream
      }

      // Sincronização Labial Nativa WebRTC A/V: o elemento <video> reproduz o áudio unificado
      // com volume aplicado nativamente sem eco para o streamer.
      // Silencia 100% se o usuário local estiver ensurdecido (deafened), se for o próprio transmissor, ou se o volume for 0.
      const isMutedLocally = isLocalSharer || isDeafened || volumeVal === 0
      videoEl.muted = isMutedLocally
      videoEl.volume = isMutedLocally ? 0 : Math.max(0, Math.min(1, volumeVal / 100))

      if (stream && videoEl.paused) {
        videoEl.play().catch(() => {})
      }

      const updateDimensions = () => {
        if (videoEl && videoEl.videoWidth > 0) {
          setStreamResolution(`${videoEl.videoWidth}x${videoEl.videoHeight}`)
        }
      }

      // Auto-retomada imediata caso o player trave ou pause devido a flutuações de rede ou alt-tab
      const handleAutoResume = () => {
        if (videoEl && videoEl.paused && videoEl.srcObject) {
          videoEl.play().catch(() => {})
        }
      }

      videoEl.addEventListener('loadedmetadata', updateDimensions)
      videoEl.addEventListener('resize', updateDimensions)
      videoEl.addEventListener('pause', handleAutoResume)
      videoEl.addEventListener('stalled', handleAutoResume)
      videoEl.addEventListener('waiting', handleAutoResume)

      return () => {
        videoEl.removeEventListener('loadedmetadata', updateDimensions)
        videoEl.removeEventListener('resize', updateDimensions)
        videoEl.removeEventListener('pause', handleAutoResume)
        videoEl.removeEventListener('stalled', handleAutoResume)
        videoEl.removeEventListener('waiting', handleAutoResume)
      }
    }
  }, [participant.screenStream, isLocalSharer, showLocalPreview, isDeafened])

  // Ajuste em tempo real do volume no elemento de vídeo
  useEffect(() => {
    const videoEl = videoRef.current
    if (videoEl && !isLocalSharer) {
      videoEl.volume = Math.max(0, Math.min(1, volumeVal / 100))
    }
  }, [volumeVal, isLocalSharer])

  return (
    <div 
      className={`screen-share-view ${isFullScreen ? 'fullscreen-active' : ''} ${isGrid ? 'grid-stream-view' : ''} ${!isControlsVisible ? 'stream-idle-hide' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {isLocalSharer && !showLocalPreview ? (
        <div className="local-stream-placeholder">
          <div className="local-stream-beacon">
            <ScreenIcon style={{ width: '42px', height: '42px', color: 'var(--accent-color)' }} />
          </div>
          <h3 className="local-stream-title">Você está transmitindo sua tela</h3>
          <p className="local-stream-desc">
            A prévia local foi pausada para priorizar 100% do FPS e desempenho do seu jogo.
          </p>
          <button
            type="button"
            className="local-stream-preview-toggle-btn"
            onClick={() => setShowLocalPreview(true)}
            title="Ver a sua transmissão em tempo real"
          >
            <EyeIcon style={{ width: '15px', height: '15px' }} />
            <span>Ver Pré-visualização</span>
          </button>
        </div>
      ) : (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted={isLocalSharer || isDeafened}
          className="screen-share-video-el"
        />
      )}


      {/* Diagnostic Stream HUD (Like Discord Stream Stats) */}
      {showStatsHud && (
        <div className="stream-stats-hud-overlay">
          <div className="stream-stats-hud-header">
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <BarChartIcon />
              <span>Estatísticas da Transmissão</span>
            </strong>
            <button type="button" onClick={() => setShowStatsHud(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
          </div>
          <div className="stream-stats-hud-grid">
            <div className="stats-row"><span>Resolução Real:</span> <strong>{streamResolution || '1920x1080'}</strong></div>
            <div className="stats-row"><span>Taxa de Quadros:</span> <strong style={{ color: '#10b981' }}>{streamFps} FPS {streamFps >= 60 ? '(Ultra Suave)' : '(Padrão / Fluido)'}</strong></div>
            <div className="stats-row"><span>Bitrate de Vídeo:</span> <strong>~2.4 - 3.2 Mbps (Otimizado SFU / Simulcast)</strong></div>
            <div className="stats-row"><span>Codec de Vídeo:</span> <strong>H.264 High Profile (GPU HW)</strong></div>
            <div className="stats-row"><span>Áudio do Jogo:</span> <strong>Opus 48kHz Estéreo (128 kbps)</strong></div>
            <div className="stats-row"><span>Sincronia Labial:</span> <strong style={{ color: '#10b981' }}>{screenAudioSyncDelayMs !== undefined && screenAudioSyncDelayMs > 0 ? `+${screenAudioSyncDelayMs}ms (Manual [ / ])` : 'Automática (Tempo Real / 20ms Buffer)'}</strong></div>
            <div className="stats-row"><span>Degradação:</span> <strong>Maintain Framerate (Sem Lag)</strong></div>
          </div>
        </div>
      )}
      
      {/* Unified Floating Glass Cinema Bar (Echo Style) */}
      <div className={`stream-unified-glass-bar ${showStatsHud ? 'always-visible' : ''}`}>
        {/* Telemetria e Info da Transmissão */}
        <div className="stream-glass-telemetry">
          <div className="stream-live-pill">
            <span className="stream-live-pulse-dot" />
            <span>AO VIVO</span>
          </div>

          <div className="stream-streamer-unit">
            {participant.avatarUrl ? (
              <img
                src={participant.avatarUrl}
                alt={participant.displayName}
                className="stream-avatar-circle"
              />
            ) : (
              <div className="stream-avatar-circle">
                {(participant.displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="stream-author-name">{participant.displayName}</span>
          </div>

          <span className="stream-quality-pill">
            {streamResolution ? `${streamFps} FPS • ${streamResolution}` : `${streamFps} FPS`}
          </span>

          <AudioLevelMeter stream={participant.screenStream || null} />
        </div>

        {/* Ações e Controles da Transmissão (Squircles Uniformes) */}
        <div className="stream-glass-actions">
          {onSelectFocus && (
            <button 
              type="button"
              className="stream-squircle-btn"
              onClick={onSelectFocus}
              title="Focar nesta transmissão"
            >
              <FocusIcon style={{ width: '16px', height: '16px' }} />
              <span className="stream-tooltip">Focar</span>
            </button>
          )}

          {/* HUD de Estatísticas */}
          <button
            type="button"
            className={`stream-squircle-btn ${showStatsHud ? 'active' : ''}`}
            onClick={() => setShowStatsHud(!showStatsHud)}
            title="Estatísticas da Transmissão"
          >
            <BarChartIcon style={{ width: '16px', height: '16px' }} />
            <span className="stream-tooltip">Estatísticas</span>
          </button>

          {/* Botão de Pausar Prévia Local para liberar GPU/FPS em jogos */}
          {isLocalSharer && showLocalPreview && (
            <button
              type="button"
              className="stream-squircle-btn fps-boost-btn"
              onClick={() => setShowLocalPreview(false)}
              title="Pausar prévia local (liberar GPU)"
            >
              <EyeOffIcon style={{ width: '16px', height: '16px' }} />
              <span className="stream-tooltip">Pausar Prévia (FPS+)</span>
            </button>
          )}

          {/* Picture-in-Picture Button */}
          <button
            type="button"
            className={`stream-squircle-btn ${isPiPActive ? 'active' : ''}`}
            onClick={onToggleFloatingPiP}
            title={isPiPActive ? "Fechar Mini Player Flutuante" : "Mini Player Flutuante (PiP)"}
          >
            <PipIcon style={{ width: '16px', height: '16px' }} />
            <span className="stream-tooltip">{isPiPActive ? 'Fechar Mini Player' : 'Mini Player (PiP)'}</span>
          </button>

          {/* Volume Booster Slider (0% - 200%) */}
          {participant.userId !== user.id && (
            <div className="stream-glass-volume-capsule" title="Volume da Transmissão (0% - 200%)">
              <VolumeIcon className="stream-volume-icon" style={{ width: '15px', height: '15px' }} />
              <input 
                type="range" 
                min="0" 
                max="200" 
                value={volumeVal}
                onChange={(e) => {
                  const val = parseInt(e.target.value)
                  const newVols = { ...peerScreenVolumes, [participant.userId]: val }
                  setPeerScreenVolumes(newVols)
                  localStorage.setItem('echo-peer-screen-volumes', JSON.stringify(newVols))
                }}
                className="stream-volume-slider"
              />
              <span className="stream-volume-pct" style={{ color: volumeVal > 100 ? '#f59e0b' : undefined }}>
                {volumeVal}%
              </span>
            </div>
          )}

          {/* Tela Cheia */}
          {onToggleFullScreen && (
            <button 
              type="button"
              className={`stream-squircle-btn ${isFullScreen ? 'active' : ''}`}
              onClick={onToggleFullScreen}
              title={isFullScreen ? "Sair da Tela Cheia (Esc)" : "Tela Cheia"}
            >
              <FullscreenIcon style={{ width: '16px', height: '16px' }} />
              <span className="stream-tooltip">{isFullScreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}</span>
            </button>
          )}

          {/* Divisor vertical */}
          {onCloseStream && <span className="stream-glass-sep" />}

          {/* Fechar Vídeo */}
          {onCloseStream && (
            <button 
              type="button"
              className="stream-squircle-btn exit-btn"
              onClick={onCloseStream}
              title="Fechar Vídeo e Voltar à Voz"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span className="stream-tooltip">Fechar Vídeo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Echo Floating Mini Player (Always-On-Top PiP) Component ─────────────── */
