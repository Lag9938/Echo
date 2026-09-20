import { useState, useEffect } from 'react'
import { SOUNDBOARD_SOUNDS } from '../../lib/soundEffects'
import { SoundboardIcon } from '../SoundboardIcons'

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
    <div className="soundboard-toast" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <SoundboardIcon soundId={lastEvent.soundId} size={18} />
      </div>
      <span>
        <strong>{lastEvent.displayName}</strong> tocou <em>{sound?.name || lastEvent.soundId}</em>
      </span>
    </div>
  )
}
