import { useState } from 'react'
import type { Channel, RolePermissions } from '../../types'

export interface VolumeControlUser {
  userId: string
  displayName: string
}

export interface VolumeControlModalProps {
  volumeControlUser: VolumeControlUser | null
  onClose: () => void
  userVolumes: Record<string, number>
  setUserVolumes: (v: Record<string, number>) => void
  userStereoPans: Record<string, number>
  setUserStereoPans: (p: Record<string, number>) => void
  changePeerPan: (peerId: string, panVal: number) => void
  spatialAudioEnabled: boolean
  setSpatialAudioEnabledState: (enabled: boolean) => void
  participants: { userId: string }[]
  currentUserId: string
  // Moderation props
  spaceId?: string
  isSpaceOwner?: boolean
  canUserDo?: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  availableVoiceChannels?: Channel[]
  serverMuteParticipant?: (userId: string) => void
  disconnectParticipant?: (userId: string) => void
  moveParticipant?: (userId: string, targetChannelId: string, targetChannelName?: string) => void
}

export function VolumeControlModal({
  volumeControlUser,
  onClose,
  userVolumes,
  setUserVolumes,
  userStereoPans,
  setUserStereoPans,
  changePeerPan,
  spatialAudioEnabled,
  setSpatialAudioEnabledState,
  participants,
  currentUserId,
  spaceId,
  isSpaceOwner,
  canUserDo,
  availableVoiceChannels,
  serverMuteParticipant,
  disconnectParticipant,
  moveParticipant
}: VolumeControlModalProps) {
  const [mutedFeedback, setMutedFeedback] = useState(false)
  const [selectedMoveChannelId, setSelectedMoveChannelId] = useState('')

  if (!volumeControlUser) return null

  return (
    <div className="screen-picker-overlay" onClick={onClose}>
      <div className="screen-picker-modal volume-control-modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Áudio & Posição 3D</h2>
          <button className="picker-close-btn" style={{ margin: 0, padding: '4px 8px' }} onClick={onClose}>✕</button>
        </div>
        <p style={{ margin: '6px 0 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Ajuste o volume e o posicionamento estéreo da voz de <strong>{volumeControlUser.displayName}</strong>.
        </p>
        
        {/* Section 1: Volume */}
        <div className="volume-slider-container" style={{ margin: '14px 0', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            <span>🔊 Volume de Voz</span>
            <span style={{ color: (userVolumes[volumeControlUser.userId] || 100) > 100 ? '#ff9f43' : 'inherit' }}>
              {userVolumes[volumeControlUser.userId] !== undefined ? userVolumes[volumeControlUser.userId] : 100}%
            </span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="200" 
            value={userVolumes[volumeControlUser.userId] !== undefined ? userVolumes[volumeControlUser.userId] : 100}
            onChange={(e) => {
              const val = parseInt(e.target.value)
              const newVols = { ...userVolumes, [volumeControlUser.userId]: val }
              setUserVolumes(newVols)
              localStorage.setItem('echo-user-volumes', JSON.stringify(newVols))
            }}
            style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
          />
        </div>

        {/* Section 2: 3D Spatial Stereo Panning */}
        <div className="volume-slider-container" style={{ margin: '14px 0', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '13.5px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎧 Posicionamento Estéreo (3D)</span>
            </span>
            <span style={{ fontSize: '12px', color: (userStereoPans[volumeControlUser.userId] || 0) === 0 ? '#10b981' : '#00f2fe', fontWeight: 600 }}>
              {(userStereoPans[volumeControlUser.userId] || 0) === 0 && '● Centro (Neutro)'}
              {(userStereoPans[volumeControlUser.userId] || 0) < 0 && `⬅️ ${Math.round(Math.abs(userStereoPans[volumeControlUser.userId]) * 100)}% Esquerda`}
              {(userStereoPans[volumeControlUser.userId] || 0) > 0 && `➡️ ${Math.round((userStereoPans[volumeControlUser.userId]) * 100)}% Direita`}
            </span>
          </div>

          <input 
            type="range" 
            min="-100" 
            max="100" 
            step="5"
            value={Math.round((userStereoPans[volumeControlUser.userId] !== undefined ? userStereoPans[volumeControlUser.userId] : 0) * 100)}
            onChange={(e) => {
              const rawVal = parseInt(e.target.value, 10) / 100
              const newPans = { ...userStereoPans, [volumeControlUser.userId]: rawVal }
              setUserStereoPans(newPans)
              localStorage.setItem('echo-user-stereo-pans', JSON.stringify(newPans))
              changePeerPan(volumeControlUser.userId, rawVal)
              if (!spatialAudioEnabled) {
                setSpatialAudioEnabledState(true)
                localStorage.setItem('echo-spatial-audio-enabled', 'true')
              }
            }}
            style={{ width: '100%', accentColor: '#00f2fe', cursor: 'pointer' }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>100% Esquerda</span>
            <span>Centro</span>
            <span>100% Direita</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => {
                const newPans = { ...userStereoPans, [volumeControlUser.userId]: 0 }
                setUserStereoPans(newPans)
                localStorage.setItem('echo-user-stereo-pans', JSON.stringify(newPans))
                changePeerPan(volumeControlUser.userId, 0)
              }}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '6px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              🔄 Centralizar
            </button>

            {participants.filter(p => p.userId !== currentUserId).length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const otherPeers = participants.filter(p => p.userId !== currentUserId)
                  const count = otherPeers.length
                  const newPans = { ...userStereoPans }
                  otherPeers.forEach((p, idx) => {
                    const panVal = count === 1 ? 0 : -0.75 + (1.5 / (count - 1)) * idx
                    const rounded = Math.round(panVal * 100) / 100
                    newPans[p.userId] = rounded
                    changePeerPan(p.userId, rounded)
                  })
                  setUserStereoPans(newPans)
                  localStorage.setItem('echo-user-stereo-pans', JSON.stringify(newPans))
                  if (!spatialAudioEnabled) {
                    setSpatialAudioEnabledState(true)
                    localStorage.setItem('echo-spatial-audio-enabled', 'true')
                  }
                }}
                style={{
                  flex: 1,
                  background: 'rgba(0, 242, 254, 0.12)',
                  border: '1px solid rgba(0, 242, 254, 0.3)',
                  color: '#00f2fe',
                  padding: '6px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Distribui todos os membros do squad em semicírculo no seu fone"
              >
                🌐 Distribuir Squad 3D
              </button>
            )}
          </div>
        </div>

        {/* Section 3: Voice Moderation (Moderação da Chamada) */}
        {(() => {
          const isOwnerOrAdmin = isSpaceOwner || (canUserDo && spaceId && currentUserId ? canUserDo(spaceId, currentUserId, 'administrator') : false)
          const canMute = isOwnerOrAdmin || (canUserDo && spaceId && currentUserId ? canUserDo(spaceId, currentUserId, 'muteMembers') : false)
          const canDisconnect = isOwnerOrAdmin || (canUserDo && spaceId && currentUserId ? canUserDo(spaceId, currentUserId, 'disconnectMembers') : false)
          const canMove = isOwnerOrAdmin || (canUserDo && spaceId && currentUserId ? canUserDo(spaceId, currentUserId, 'moveMembers') : false)
          const canModerateAny = volumeControlUser.userId !== currentUserId && (canMute || canDisconnect || canMove)

          if (!canModerateAny) return null

          return (
            <div className="volume-moderation-container" style={{ margin: '14px 0', padding: '14px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', fontSize: '13px', fontWeight: 700, color: '#f87171' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <span>Moderação da Chamada</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {canMute && (
                    <button
                      type="button"
                      onClick={() => {
                        serverMuteParticipant?.(volumeControlUser.userId)
                        setMutedFeedback(true)
                        setTimeout(() => setMutedFeedback(false), 2500)
                      }}
                      style={{
                        flex: 1,
                        background: mutedFeedback ? '#10b981' : 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: mutedFeedback ? '#ffffff' : '#fca5a5',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🔇</span>
                      <span>{mutedFeedback ? 'Silenciado!' : 'Mutar no Servidor'}</span>
                    </button>
                  )}

                  {canDisconnect && (
                    <button
                      type="button"
                      onClick={() => {
                        disconnectParticipant?.(volumeControlUser.userId)
                        onClose()
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#fca5a5',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🚪</span>
                      <span>Expulsar da Chamada</span>
                    </button>
                  )}
                </div>

                {canMove && availableVoiceChannels && availableVoiceChannels.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                    <select
                      value={selectedMoveChannelId}
                      onChange={(e) => setSelectedMoveChannelId(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'var(--bg-secondary, #1e1f22)',
                        border: '1px solid var(--border-color, rgba(255,255,255,0.12))',
                        color: 'var(--text-primary, #ffffff)',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">Mover para canal de voz...</option>
                      {availableVoiceChannels.map(ch => (
                        <option key={ch.id} value={ch.id}>🔊 {ch.name}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedMoveChannelId}
                      onClick={() => {
                        const targetCh = availableVoiceChannels.find(c => c.id === selectedMoveChannelId)
                        if (targetCh) {
                          moveParticipant?.(volumeControlUser.userId, targetCh.id, targetCh.name)
                          onClose()
                        }
                      }}
                      style={{
                        background: selectedMoveChannelId ? 'var(--accent-color, #5865f2)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: selectedMoveChannelId ? '#ffffff' : 'var(--text-muted, #72767d)',
                        padding: '7px 14px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: selectedMoveChannelId ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      Mover
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        <button className="picker-close-btn" style={{ width: '100%', margin: '6px 0 0 0' }} onClick={onClose}>
          Pronto
        </button>
      </div>
    </div>
  )
}
