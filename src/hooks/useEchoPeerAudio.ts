import { useState, useEffect } from 'react'
import type { VoiceParticipant } from '../lib/useVoiceChannel'

export interface UseEchoPeerAudioOptions {
  userId: string
  participants: VoiceParticipant[]
  changePeerVolume: (peerId: string, volume: number) => void
  changePeerPan: (peerId: string, pan: number) => void
  setSpatialAudioEnabled: (enabled: boolean) => void
  changePeerScreenVolume: (peerId: string, volume: number) => void
}

export function useEchoPeerAudio({
  userId,
  participants,
  changePeerVolume,
  changePeerPan,
  setSpatialAudioEnabled,
  changePeerScreenVolume
}: UseEchoPeerAudioOptions) {
  // Local volumes state
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('echo-user-volumes')
    return saved ? JSON.parse(saved) : {}
  })

  // Selected participant for local volume control modal
  const [volumeControlUser, setVolumeControlUser] = useState<VoiceParticipant | null>(null)

  // Sincronizar volumes locais sempre que participantes ou volumes mudarem
  useEffect(() => {
    participants.forEach(p => {
      if (p.userId !== userId) {
        const vol = userVolumes[p.userId] !== undefined ? userVolumes[p.userId] : 100
        changePeerVolume(p.userId, vol / 100)
      }
    })
  }, [participants, userVolumes, changePeerVolume, userId])

  // 3D Spatial Audio & Stereo Panning state
  const [spatialAudioEnabled, setSpatialAudioEnabledState] = useState<boolean>(() => {
    return localStorage.getItem('echo-spatial-audio-enabled') === 'true'
  })
  const [userStereoPans, setUserStereoPans] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('echo-user-stereo-pans')
    return saved ? JSON.parse(saved) : {}
  })

  // Sincronizar ativação global do Áudio Espacial 3D
  useEffect(() => {
    setSpatialAudioEnabled(spatialAudioEnabled)
  }, [spatialAudioEnabled, setSpatialAudioEnabled])

  // Sincronizar balanço estéreo (Pan) de cada participante
  useEffect(() => {
    participants.forEach(p => {
      if (p.userId !== userId) {
        const pan = userStereoPans[p.userId] !== undefined ? userStereoPans[p.userId] : 0
        changePeerPan(p.userId, pan)
      }
    })
  }, [participants, userStereoPans, changePeerPan, userId])

  // Local screenshare volumes state
  const [peerScreenVolumes, setPeerScreenVolumes] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('echo-peer-screen-volumes')
    return saved ? JSON.parse(saved) : {}
  })

  // Synchronize peer screenshare volumes
  useEffect(() => {
    participants.forEach(p => {
      if (p.userId !== userId) {
        const vol = peerScreenVolumes[p.userId] !== undefined ? peerScreenVolumes[p.userId] : 100
        changePeerScreenVolume(p.userId, vol / 100)
      }
    })
  }, [participants, peerScreenVolumes, changePeerScreenVolume, userId])

  return {
    userVolumes,
    setUserVolumes,
    volumeControlUser,
    setVolumeControlUser,
    spatialAudioEnabled,
    setSpatialAudioEnabledState,
    userStereoPans,
    setUserStereoPans,
    peerScreenVolumes,
    setPeerScreenVolumes
  }
}
