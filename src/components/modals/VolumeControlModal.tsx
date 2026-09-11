export interface VolumeControlUser {
  userId: string
  displayName: string
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
  currentUserId
}: {
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
}) {
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

        <button className="picker-close-btn" style={{ width: '100%', margin: '6px 0 0 0' }} onClick={onClose}>
          Pronto
        </button>
      </div>
    </div>
  )
}
