import { useState, useEffect } from 'react'
import { SOUNDBOARD_SOUNDS } from '../../lib/soundEffects'

export interface SoundboardModalProps {
  isOpen: boolean
  onClose: () => void
  onPlaySound: (soundId: string) => void
}

export function SoundboardModal({ isOpen, onClose, onPlaySound }: SoundboardModalProps) {
  const [playingId, setPlayingId] = useState<string | null>(null)

  if (!isOpen) return null

  const handlePlay = (soundId: string) => {
    setPlayingId(soundId)
    onPlaySound(soundId)
    setTimeout(() => {
      setPlayingId(prev => (prev === soundId ? null : prev))
    }, 600)
  }

  return (
    <div 
      className="modal-backdrop" 
      style={{
        position: 'fixed',
        inset: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div className="modal-content" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>📢</span>
            <div>
              <h3 style={{ margin: 0 }}>Soundboard Gamer</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Efeitos sonoros em tempo real para a chamada de voz</span>
            </div>
          </div>
          <button className="settings-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="soundboard-grid" style={{ marginTop: '16px' }}>
          {SOUNDBOARD_SOUNDS.map(s => (
            <button
              key={s.id}
              type="button"
              className={`soundboard-card ${playingId === s.id ? 'is-playing' : ''}`}
              onClick={() => handlePlay(s.id)}
              title={`Tocar ${s.name}`}
              style={{ borderLeftColor: s.color }}
            >
              <span className="soundboard-emoji">{s.emoji}</span>
              <span className="soundboard-name">{s.name}</span>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                {s.category}
              </span>
            </button>
          ))}
        </div>

        <div className="modal-actions" style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn-modal-cancel" 
            onClick={onClose}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

export interface SoundboardToastProps {
  lastEvent: {
    soundId: string
    displayName: string
    timestamp: number
  } | null
}

export function SoundboardToast({ lastEvent }: SoundboardToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!lastEvent) {
      setVisible(false)
      return
    }
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
    }, 3500)
    return () => clearTimeout(timer)
  }, [lastEvent?.timestamp, lastEvent?.soundId])

  if (!visible || !lastEvent) {
    return null
  }

  const sound = SOUNDBOARD_SOUNDS.find(s => s.id === lastEvent.soundId)

  return (
    <div className="soundboard-toast">
      <span>{sound?.emoji || '📢'}</span>
      <span>
        <strong>{lastEvent.displayName}</strong> tocou <em>{sound?.name || lastEvent.soundId}</em>
      </span>
    </div>
  )
}
