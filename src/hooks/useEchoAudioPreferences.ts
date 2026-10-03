import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Preferências de áudio que ficam salvas no aparelho: supressão de ruído, cancelamento de eco, portão de
 * ruído (ligado e limiar) e volume dos efeitos sonoros do app.
 */
export function useEchoAudioPreferences() {
  const [noiseSuppressionEnabled, setNoiseSuppressionEnabled] = useState(() => localStorage.getItem('echo-noise-suppression') !== 'false')
  const [echoCancellationEnabled, setEchoCancellationEnabled] = useState(() => localStorage.getItem('echo-echo-cancellation') !== 'false')
  const [noiseGateEnabled, setNoiseGateEnabled] = useState(() => localStorage.getItem('echo-noise-gate-enabled') !== 'false')
  const [noiseGateThreshold, setNoiseGateThreshold] = useState(() => parseFloat(localStorage.getItem('echo-noise-gate-threshold') || '-45'))
  const [sfxVolume, setSfxVolume] = useState(() => {
    const val = localStorage.getItem('echo-sfx-volume')
    return val !== null ? parseFloat(val) : 0.5
  })
  // Para quem toca som fora da renderização (aviso de DM) ler sempre o volume atual
  const sfxVolumeRef = useRef(sfxVolume)
  useEffect(() => {
    sfxVolumeRef.current = sfxVolume
  }, [sfxVolume])

  const handleSfxVolumeChange = useCallback((val: number) => {
    setSfxVolume(val)
    localStorage.setItem('echo-sfx-volume', val.toString())
  }, [])

  const handleNoiseGateEnabledChange = useCallback((val: boolean) => {
    setNoiseGateEnabled(val)
    localStorage.setItem('echo-noise-gate-enabled', val ? 'true' : 'false')
  }, [])

  const handleNoiseGateThresholdChange = useCallback((val: number) => {
    setNoiseGateThreshold(val)
    localStorage.setItem('echo-noise-gate-threshold', val.toString())
  }, [])

  return {
    noiseSuppressionEnabled,
    setNoiseSuppressionEnabled,
    echoCancellationEnabled,
    setEchoCancellationEnabled,
    noiseGateEnabled,
    noiseGateThreshold,
    sfxVolume,
    sfxVolumeRef,
    handleSfxVolumeChange,
    handleNoiseGateEnabledChange,
    handleNoiseGateThresholdChange
  }
}

export interface UseEchoAudioSettingsActionsOptions {
  activeVoiceChannelId: string | null
  selectedInputId: string
  changeInputDevice: (deviceId: string, noiseSuppression: boolean, echoCancellation: boolean) => unknown
  noiseSuppressionEnabled: boolean
  setNoiseSuppressionEnabled: (enabled: boolean) => void
  echoCancellationEnabled: boolean
  setEchoCancellationEnabled: (enabled: boolean) => void
  setSpatialAudioEnabledState: (enabled: boolean) => void
  setUserStereoPans: Dispatch<SetStateAction<Record<string, number>>>
  participants: { userId: string }[]
  changePeerPan: (peerId: string, pan: number) => void
}

/**
 * Ações de áudio que dependem da chamada em andamento: trocar supressão de ruído ou cancelamento de eco
 * reabre o microfone na hora (se a pessoa estiver em chamada), e o áudio espacial mexe em quem está nela.
 */
export function useEchoAudioSettingsActions({
  activeVoiceChannelId,
  selectedInputId,
  changeInputDevice,
  noiseSuppressionEnabled,
  setNoiseSuppressionEnabled,
  echoCancellationEnabled,
  setEchoCancellationEnabled,
  setSpatialAudioEnabledState,
  setUserStereoPans,
  participants,
  changePeerPan
}: UseEchoAudioSettingsActionsOptions) {
  const handleNoiseSuppressionChange = useCallback((val: boolean) => {
    setNoiseSuppressionEnabled(val)
    localStorage.setItem('echo-noise-suppression', val ? 'true' : 'false')
    if (activeVoiceChannelId) {
      changeInputDevice(selectedInputId, val, echoCancellationEnabled)
    }
  }, [activeVoiceChannelId, changeInputDevice, selectedInputId, echoCancellationEnabled, setNoiseSuppressionEnabled])

  const handleEchoCancellationChange = useCallback((val: boolean) => {
    setEchoCancellationEnabled(val)
    localStorage.setItem('echo-echo-cancellation', val ? 'true' : 'false')
    if (activeVoiceChannelId) {
      changeInputDevice(selectedInputId, noiseSuppressionEnabled, val)
    }
  }, [activeVoiceChannelId, changeInputDevice, selectedInputId, noiseSuppressionEnabled, setEchoCancellationEnabled])

  const handleToggleSpatialAudio = useCallback((val: boolean) => {
    setSpatialAudioEnabledState(val)
    localStorage.setItem('echo-spatial-audio-enabled', val ? 'true' : 'false')
  }, [setSpatialAudioEnabledState])

  const handleResetAllPans = useCallback(() => {
    setUserStereoPans({})
    localStorage.removeItem('echo-user-stereo-pans')
    participants.forEach(p => {
      changePeerPan(p.userId, 0)
    })
  }, [setUserStereoPans, participants, changePeerPan])

  return {
    handleNoiseSuppressionChange,
    handleEchoCancellationChange,
    handleToggleSpatialAudio,
    handleResetAllPans
  }
}
