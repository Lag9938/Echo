import { useState, useEffect } from 'react'
import { PlayIcon, PauseIcon } from '../icons'

export interface ModernVoiceNotePlayerProps {
  audioUrl: string
  messageId: string
  activePlayingId: string | null
  onTogglePlay: () => void
  speed: number
  onChangeSpeed: () => void
  activeAudioRef: React.MutableRefObject<HTMLAudioElement | null>
}

export function ModernVoiceNotePlayer({
  audioUrl,
  messageId,
  activePlayingId,
  onTogglePlay,
  speed,
  onChangeSpeed,
  activeAudioRef
}: ModernVoiceNotePlayerProps) {
  const isPlaying = activePlayingId === messageId
  const [duration, setDuration] = useState<number>(0)
  const [currentTime, setCurrentTime] = useState<number>(0)

  useEffect(() => {
    const a = new Audio(audioUrl)
    const onLoaded = () => {
      if (a.duration && !isNaN(a.duration) && isFinite(a.duration)) {
        setDuration(a.duration)
      }
    }
    a.addEventListener('loadedmetadata', onLoaded)
    return () => {
      a.removeEventListener('loadedmetadata', onLoaded)
    }
  }, [audioUrl])

  useEffect(() => {
    let animId: number
    const updateTime = () => {
      if (isPlaying && activeAudioRef.current) {
        setCurrentTime(activeAudioRef.current.currentTime || 0)
        if (activeAudioRef.current.duration && !isNaN(activeAudioRef.current.duration) && isFinite(activeAudioRef.current.duration)) {
          setDuration(activeAudioRef.current.duration)
        }
      }
      if (isPlaying) {
        animId = requestAnimationFrame(updateTime)
      }
    }
    if (isPlaying) {
      animId = requestAnimationFrame(updateTime)
    } else {
      setCurrentTime(0)
    }
    return () => cancelAnimationFrame(animId)
  }, [isPlaying, activeAudioRef])

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // 22 aesthetic soundwave height percentages
  const waveHeights = [30, 50, 75, 40, 65, 95, 80, 45, 90, 100, 70, 55, 85, 90, 40, 60, 75, 50, 65, 45, 35, 25]

  return (
    <div className="modern-voice-note-card">
      <button 
        type="button" 
        className={`modern-voice-play-btn ${isPlaying ? 'playing' : ''}`}
        onClick={onTogglePlay}
        title={isPlaying ? 'Pausar Áudio' : 'Reproduzir Áudio'}
      >
        {isPlaying ? (
          <PauseIcon style={{ width: '14px', height: '14px' }} />
        ) : (
          <PlayIcon style={{ width: '14px', height: '14px', marginLeft: '2px' }} />
        )}
      </button>

      <div className="modern-voice-content">
        <div 
          className="modern-voice-waveform-track"
          onClick={(e) => {
            if (activeAudioRef.current && isPlaying && duration > 0) {
              const rect = e.currentTarget.getBoundingClientRect()
              const clickX = e.clientX - rect.left
              const pct = Math.max(0, Math.min(1, clickX / rect.width))
              activeAudioRef.current.currentTime = pct * duration
            }
          }}
          title="Clique para avançar/retroceder"
        >
          {waveHeights.map((h, i) => {
            const barPct = i / waveHeights.length
            const isFilled = isPlaying && progress >= barPct
            return (
              <span 
                key={i} 
                className={`modern-wave-bar ${isFilled ? 'filled' : ''} ${isPlaying ? 'wave-anim' : ''}`}
                style={{ 
                  height: `${h}%`,
                  animationDelay: `${(i % 6) * 0.1}s`
                }} 
              />
            )
          })}
        </div>

        <div className="modern-voice-meta-row">
          <span className="modern-voice-time">
            {isPlaying ? `${formatTime(currentTime)} / ${formatTime(duration)}` : (duration > 0 ? formatTime(duration) : 'Mensagem de voz')}
          </span>
          <span className="modern-voice-badge">Áudio HD</span>
        </div>
      </div>

      <button 
        type="button" 
        className="modern-voice-speed-btn"
        onClick={onChangeSpeed}
        title="Alterar velocidade de reprodução"
      >
        {speed}x
      </button>
    </div>
  )
}
