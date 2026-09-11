import { useState, useEffect } from 'react'
import type { Page } from '../types'

export interface UseEchoAudioDevicesOptions {
  page: Page
  noiseSuppressionEnabled: boolean
  echoCancellationEnabled: boolean
  changeInputDevice: (id: string, ns: boolean, ec: boolean) => void
  changeOutputDevice: (id: string) => void
}

export function useEchoAudioDevices({
  page,
  noiseSuppressionEnabled,
  echoCancellationEnabled,
  changeInputDevice,
  changeOutputDevice
}: UseEchoAudioDevicesOptions) {
  // Audio settings configuration
  const [audioInputs, setAudioInputs] = useState<MediaDeviceInfo[]>([])
  const [audioOutputs, setAudioOutputs] = useState<MediaDeviceInfo[]>([])
  const [selectedInputId, setSelectedInputId] = useState<string>(() => localStorage.getItem('echo-input-id') || 'default')
  const [selectedOutputId, setSelectedOutputId] = useState<string>(() => localStorage.getItem('echo-output-id') || 'default')
  const [audioError, setAudioError] = useState<string | null>(null)

  async function loadAudioDevices() {
    try {
      setAudioError(null)
      // Trigger permission request to read labels properly
      let gotStream = false
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        stream.getTracks().forEach(t => t.stop())
        gotStream = true
      } catch (err: any) {
        console.error("getUserMedia error:", err)
        setAudioError(`Erro de Permissão/Hardware: ${err.name} - ${err.message}`)
      }

      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices.filter(d => d.kind === 'audioinput')
      const outputs = devices.filter(d => d.kind === 'audiooutput')
      setAudioInputs(inputs)
      setAudioOutputs(outputs)

      if (gotStream && inputs.length === 0) {
        setAudioError("Permissão concedida, mas nenhum dispositivo de entrada de áudio (microfone) foi detectado.")
      }
    } catch (err: any) {
      console.error('Error loading devices:', err)
      setAudioError(`Erro geral: ${err.message}`)
    }
  }

  useEffect(() => {
    if (page === 'Configurações') {
      loadAudioDevices()
    }
  }, [page])

  function handleInputDeviceChange(id: string) {
    setSelectedInputId(id)
    localStorage.setItem('echo-input-id', id)
    changeInputDevice(id, noiseSuppressionEnabled, echoCancellationEnabled)
  }

  function handleOutputDeviceChange(id: string) {
    setSelectedOutputId(id)
    localStorage.setItem('echo-output-id', id)
    changeOutputDevice(id)
  }

  return {
    audioInputs,
    setAudioInputs,
    audioOutputs,
    setAudioOutputs,
    selectedInputId,
    setSelectedInputId,
    selectedOutputId,
    setSelectedOutputId,
    audioError,
    setAudioError,
    loadAudioDevices,
    handleInputDeviceChange,
    handleOutputDeviceChange
  }
}
