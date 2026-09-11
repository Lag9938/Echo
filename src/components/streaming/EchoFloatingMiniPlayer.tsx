import { useState, useEffect, useRef } from 'react'
import type { VoiceParticipant } from '../../lib/useVoiceChannel'
import { AudioLevelMeter } from '../voice/AudioLevelMeter'

export function EchoFloatingMiniPlayer({
  activeScreenSharers,
  activeScreenSharer,
  onSelectSharer,
  peerScreenVolumes,
  setPeerScreenVolumes,
  onClose,
  onExpand,
}: {
  activeScreenSharers: VoiceParticipant[];
  activeScreenSharer: VoiceParticipant | null;
  onSelectSharer: (userId: string) => void;
  peerScreenVolumes: Record<string, number>;
  setPeerScreenVolumes: (v: Record<string, number>) => void;
  onClose: () => void;
  onExpand: () => void;
}) {
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    return { x: window.innerWidth - 370, y: window.innerHeight - 250 }
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({ startX: 0, startY: 0, initialX: 0, initialY: 0 })
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    if (videoRef.current && activeScreenSharer?.screenStream) {
      const currentTrackId = (videoRef.current.srcObject as MediaStream)?.getVideoTracks?.()[0]?.id
      const newTrackId = activeScreenSharer.screenStream?.getVideoTracks?.()[0]?.id
      if (currentTrackId !== newTrackId) {
        videoRef.current.srcObject = activeScreenSharer.screenStream
      }
      videoRef.current.play().catch(() => {})
    }
  }, [activeScreenSharer?.screenStream])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, a')) return
    setIsDragging(true)
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStartRef.current.startX
      const dy = e.clientY - dragStartRef.current.startY
      const newX = Math.max(10, Math.min(window.innerWidth - 360, dragStartRef.current.initialX + dx))
      const newY = Math.max(10, Math.min(window.innerHeight - 230, dragStartRef.current.initialY + dy))
      setPosition({ x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  if (!activeScreenSharer) return null

  const volumeVal = peerScreenVolumes[activeScreenSharer.userId] !== undefined ? peerScreenVolumes[activeScreenSharer.userId] : 100

  return (
    <div 
      className="echo-floating-pip-container"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="echo-pip-card">
        {/* Header Bar */}
        <div className="echo-pip-header">
          <div className="echo-pip-title-row">
            <span className="echo-pip-live-badge">🔴 LIVE</span>
            <span className="echo-pip-streamer-name" title={activeScreenSharer.displayName}>
              {activeScreenSharer.displayName}
            </span>
            <AudioLevelMeter stream={activeScreenSharer.screenStream || null} />
          </div>

          <div className="echo-pip-actions">
            {activeScreenSharers.length > 1 && (
              <button 
                type="button" 
                className="echo-pip-btn" 
                title="Alternar para outra transmissão"
                onClick={() => {
                  const currentIndex = activeScreenSharers.findIndex(s => s.userId === activeScreenSharer.userId)
                  const nextIndex = (currentIndex + 1) % activeScreenSharers.length
                  onSelectSharer(activeScreenSharers[nextIndex].userId)
                }}
              >
                🔄
              </button>
            )}

            <button 
              type="button" 
              className="echo-pip-btn" 
              title="Expandir foco na chamada"
              onClick={onExpand}
            >
              ⛶
            </button>

            <button 
              type="button" 
              className="echo-pip-btn close" 
              title="Fechar mini player (✕)"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Video Area */}
        <div className="echo-pip-video-wrapper">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted
            className="echo-pip-video-el"
          />

          {/* Quick Volume & Sound Bar on Hover */}
          <div className="echo-pip-hover-bar">
            <button 
              type="button" 
              className="echo-pip-mini-action"
              onClick={() => {
                const nextVol = isMuted ? 100 : 0
                setIsMuted(!isMuted)
                setPeerScreenVolumes({ ...peerScreenVolumes, [activeScreenSharer.userId]: nextVol })
              }}
              title={isMuted ? 'Desmutar som do jogo' : 'Mutar som do jogo'}
            >
              {isMuted || volumeVal === 0 ? '🔇' : '🔊'}
            </button>
            <input 
              type="range"
              min="0"
              max="200"
              value={volumeVal}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10)
                setPeerScreenVolumes({ ...peerScreenVolumes, [activeScreenSharer.userId]: val })
                setIsMuted(val === 0)
              }}
              className="echo-pip-volume-slider"
              title={`Volume do jogo: ${volumeVal}%`}
            />
            <span className="echo-pip-vol-text">{volumeVal}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
