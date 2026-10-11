import { useState, type CSSProperties } from 'react'
import { SOUNDBOARD_SOUNDS } from '../../lib/soundEffects'
import { SoundboardIcon, SoundboardHeaderIcon } from '../SoundboardIcons'

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
    <div className="soundboard-backdrop" onClick={onClose}>
      <div
        className="soundboard-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Soundboard Gamer"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="soundboard-header">
          <SoundboardHeaderIcon size={34} />
          <div className="soundboard-title">
            <h3>Soundboard</h3>
            <span>Efeitos sonoros para a chamada de voz</span>
          </div>
          <button type="button" className="soundboard-close" onClick={onClose} title="Fechar" aria-label="Fechar">✕</button>
        </header>

        <div className="soundboard-grid">
          {SOUNDBOARD_SOUNDS.map(s => (
            <button
              key={s.id}
              type="button"
              className={`soundboard-card ${playingId === s.id ? 'is-playing' : ''}`}
              onClick={() => handlePlay(s.id)}
              title={`Tocar ${s.name}`}
              style={{ '--sound-color': s.color } as CSSProperties}
            >
              <span className="soundboard-icon-box">
                <SoundboardIcon soundId={s.id} size={26} />
              </span>
              <span className="soundboard-name">{s.name}</span>
              <span className="soundboard-category">{s.category}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
export { SoundboardToast } from './SoundboardToast'
export type { SoundboardToastProps } from './SoundboardToast'

