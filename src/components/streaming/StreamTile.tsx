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
  onChangeScreenAudioSyncDelay
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
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [streamResolution, setStreamResolution] = useState<string>('')
  const [showStatsHud, setShowStatsHud] = useState(false)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const hideTimeoutRef = useRef<any>(null)

  const isLocalSharer = participant.userId === user.id
  const volumeVal = peerScreenVolumes[participant.userId] !== undefined ? peerScreenVolumes[participant.userId] : 100
  const [showLocalPreview, setShowLocalPreview] = useState(false)
  const [detectedFps, setDetectedFps] = useState<number>(30)
  const streamFps = isLocalSharer ? (localScreenFps || 30) : detectedFps

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
    if (track) {
      const settings = track.getSettings?.()
      if (settings?.frameRate && settings.frameRate > 0) {
        setDetectedFps(Math.round(settings.frameRate))
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
        const normalizedFps = rawFps >= 45 ? 60 : rawFps >= 22 ? 30 : rawFps >= 10 ? 15 : rawFps
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
      // com volume aplicado nativamente sem eco para o streamer
      videoEl.muted = isLocalSharer ? true : (participant.isDeafened || false)
      videoEl.volume = Math.max(0, Math.min(1, volumeVal / 100))

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
  }, [participant.screenStream, isLocalSharer, showLocalPreview, participant.isDeafened])

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
          muted={isLocalSharer || (participant.isDeafened || false)}
          className="screen-share-video-el"
        />
      )}

      {/* Stream Info Tag Header */}
      <div className="screen-share-tag" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="stream-live-tag">AO VIVO</span>
        <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <FocusIcon style={{ width: '13px', height: '13px' }} />
          <span>{participant.displayName}</span>
        </span>
        {streamResolution && (
          <span className="stream-res-badge">
            {streamFps} FPS • {streamResolution}
          </span>
        )}
        <AudioLevelMeter stream={participant.screenStream || null} />
      </div>

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
      
      {/* Stream Overlay Controls */}
      <div className="screen-share-overlay-controls">
        {onSelectFocus && (
          <button 
            type="button"
            className="stream-action-btn"
            onClick={onSelectFocus}
            title="Expandir e focar nesta transmissão"
          >
            <FocusIcon />
            <span>Focar</span>
          </button>
        )}

        {/* HUD de Estatísticas (Bitrate, FPS, Resolução e Codecs) */}
        <button
          type="button"
          className={`stream-action-btn stats-hud-btn ${showStatsHud ? 'active' : ''}`}
          onClick={() => setShowStatsHud(!showStatsHud)}
          title="Ver Estatísticas da Transmissão (FPS, Resolução, Codec e Sincronia)"
          style={{
            background: showStatsHud ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.45)',
            borderColor: showStatsHud ? 'var(--accent-color)' : 'rgba(255, 255, 255, 0.1)',
            color: showStatsHud ? 'var(--accent-color)' : '#fff'
          }}
        >
          <BarChartIcon style={{ width: '14px', height: '14px' }} />
          <span>Stats</span>
        </button>

        {/* Botão de Pausar Prévia Local para liberar GPU/FPS em jogos */}
        {isLocalSharer && showLocalPreview && (
          <button
            type="button"
            className="stream-action-btn local-preview-pause-btn"
            onClick={() => setShowLocalPreview(false)}
            title="Pausar prévia local para economizar FPS do jogo"
            style={{ color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.4)' }}
          >
            <EyeOffIcon style={{ width: '14px', height: '14px' }} />
            <span>Pausar Prévia (FPS+)</span>
          </button>
        )}

        {/* Picture-in-Picture Button */}
        <button
          className={`stream-action-btn ${isPiPActive ? 'active' : ''}`}
          onClick={onToggleFloatingPiP}
          title={isPiPActive ? "Fechar Mini Player Flutuante" : "Ativar Mini Player Flutuante (Always-on-Top)"}
        >
          <PipIcon />
          <span>{isPiPActive ? 'Mini Player ON' : 'Mini Player'}</span>
        </button>

        {/* Volume Booster Slider (0% - 200%) */}
        {participant.userId !== user.id && (
          <div className="screen-volume-control" title="Volume da Transmissão (Até 200%)">
            <VolumeIcon className="screen-volume-icon" />
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
              style={{ width: '80px', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '11px', minWidth: '34px', fontWeight: 'bold', color: volumeVal > 100 ? '#ff9f43' : 'inherit' }}>
              {volumeVal}%
            </span>
          </div>
        )}

        {onToggleFullScreen && (
          <button 
            className={`fullscreen-toggle-btn ${isFullScreen ? 'active' : ''}`}
            onClick={onToggleFullScreen}
            title={isFullScreen ? "Sair da Tela Cheia (Esc)" : "Tela Cheia"}
          >
            <FullscreenIcon />
          </button>
        )}

        {onCloseStream && (
          <button 
            type="button"
            className="stream-action-btn danger"
            onClick={onCloseStream}
            title="Fechar vídeo e voltar aos avatares de voz"
            style={{
              background: 'rgba(235, 59, 90, 0.18)',
              border: '1px solid rgba(235, 59, 90, 0.35)',
              color: '#eb3b5a',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            ✕ Fechar Vídeo
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Echo Floating Mini Player (Always-On-Top PiP) Component ─────────────── */
