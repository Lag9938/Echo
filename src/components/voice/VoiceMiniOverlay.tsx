import { useState, useEffect } from 'react'
import {
  MicIcon,
  MicOffIcon,
  HeadphonesIcon,
  HeadphonesOffIcon,
  PhoneOffIcon
} from '../icons'

export function VoiceMiniOverlay() {
  const [voiceData, setVoiceData] = useState<{
    channelName: string;
    participants: {
      userId: string;
      displayName: string;
      avatarUrl?: string;
      isSpeaking: boolean;
      isMuted?: boolean;
      isDeafened?: boolean;
      hasScreen?: boolean;
    }[];
    isMuted: boolean;
    isDeafened: boolean;
    activeVoiceChannelId: string | null;
  }>(() => {
    try {
      const cached = localStorage.getItem('echo-voice-overlay-cache')
      if (cached) return JSON.parse(cached)
    } catch (e) {}
    return {
      channelName: 'Chamada de Voz',
      participants: [],
      isMuted: false,
      isDeafened: false,
      activeVoiceChannelId: null
    }
  })

  useEffect(() => {
    document.body.classList.add('is-overlay-mode')
    return () => {
      document.body.classList.remove('is-overlay-mode')
    }
  }, [])

  useEffect(() => {
    const channel = new BroadcastChannel('echo-voice-overlay-sync')
    channel.onmessage = (event) => {
      if (event.data?.type === 'VOICE_STATE_UPDATE' && event.data.payload) {
        setVoiceData(event.data.payload)
        try {
          localStorage.setItem('echo-voice-overlay-cache', JSON.stringify(event.data.payload))
        } catch (e) {}
      }
    }
    channel.postMessage({ type: 'REQUEST_SYNC' })
    return () => {
      channel.close()
    }
  }, [])

  const handleAction = (action: 'toggleMute' | 'toggleDeafen' | 'leaveVoice') => {
    const channel = new BroadcastChannel('echo-voice-overlay-sync')
    channel.postMessage({ type: 'OVERLAY_ACTION', action })
    channel.close()
    if (action === 'toggleMute') {
      setVoiceData(prev => ({ ...prev, isMuted: !prev.isMuted }))
    } else if (action === 'toggleDeafen') {
      setVoiceData(prev => ({ ...prev, isDeafened: !prev.isDeafened }))
    } else if (action === 'leaveVoice') {
      setVoiceData(prev => ({ ...prev, activeVoiceChannelId: null, participants: [] }))
    }
  }

  const handleClose = () => {
    if ((window as any).electronAPI?.closeOverlay) {
      (window as any).electronAPI.closeOverlay()
    } else {
      window.close()
    }
  }

  const hasActiveCall = Boolean(voiceData.activeVoiceChannelId && voiceData.participants && voiceData.participants.length > 0)

  return (
    <div className="voice-mini-overlay">
      {!hasActiveCall ? (
        <div className="mini-overlay-idle-chip" title="Arraste para mover ou clique no ✕ para fechar">
          <span className="mini-overlay-idle-dot" />
          <span className="mini-overlay-idle-text">Echo Overlay</span>
          <button
            type="button"
            className="mini-overlay-chip-close"
            onClick={handleClose}
            title="Fechar overlay"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="mini-overlay-hud-container">
          {/* Draggable HUD Action Bar */}
          <div className="mini-overlay-hud-bar">
            <div className="mini-overlay-hud-drag" title="Arraste para mover o overlay">
              <span className="mini-overlay-live-indicator" />
              <span className="mini-overlay-hud-channel" title={voiceData.channelName}>
                {voiceData.channelName}
              </span>
            </div>
            <div className="mini-overlay-hud-actions">
              <button
                type="button"
                className={`mini-overlay-hud-btn ${voiceData.isMuted ? 'active-mute' : ''}`}
                onClick={() => handleAction('toggleMute')}
                title={voiceData.isMuted ? "Desmutar microfone" : "Mutar microfone"}
              >
                {voiceData.isMuted ? <MicOffIcon style={{ width: 12, height: 12 }} /> : <MicIcon style={{ width: 12, height: 12 }} />}
              </button>
              <button
                type="button"
                className={`mini-overlay-hud-btn ${voiceData.isDeafened ? 'active-deaf' : ''}`}
                onClick={() => handleAction('toggleDeafen')}
                title={voiceData.isDeafened ? "Desensurdecer" : "Ensurdecer"}
              >
                {voiceData.isDeafened ? <HeadphonesOffIcon style={{ width: 12, height: 12 }} /> : <HeadphonesIcon style={{ width: 12, height: 12 }} />}
              </button>
              <button
                type="button"
                className="mini-overlay-hud-btn leave-call-btn"
                onClick={() => handleAction('leaveVoice')}
                title="Sair da chamada"
              >
                <PhoneOffIcon style={{ width: 12, height: 12 }} />
              </button>
              <button
                type="button"
                className="mini-overlay-hud-btn close-btn"
                onClick={handleClose}
                title="Fechar overlay"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Discord-Style Floating Active Participants */}
          <div className="mini-overlay-participants-list">
            {voiceData.participants.map(p => {
              return (
                <div key={p.userId} className={`mini-overlay-participant ${p.isSpeaking ? 'is-speaking' : ''}`}>
                  <div className="mini-overlay-avatar-wrapper">
                    <div className="mini-overlay-avatar">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.displayName} />
                      ) : (
                        (p.displayName || 'M').slice(0, 1).toUpperCase()
                      )}
                    </div>
                    {p.isSpeaking && <div className="mini-overlay-speaker-pulse" />}
                    {p.isMuted && (
                      <span className="mini-overlay-avatar-status muted" title="Mutado">
                        <MicOffIcon style={{ width: 8, height: 8 }} />
                      </span>
                    )}
                    {p.isDeafened && (
                      <span className="mini-overlay-avatar-status deafened" title="Ensurdecido">
                        <HeadphonesOffIcon style={{ width: 8, height: 8 }} />
                      </span>
                    )}
                  </div>
                  <div className="mini-overlay-p-info">
                    <span className="mini-overlay-p-name">{p.displayName}</span>
                    {p.hasScreen && (
                      <span className="mini-overlay-screen-badge" title="Transmitindo tela">🖥️</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
