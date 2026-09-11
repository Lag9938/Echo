import { useState, useEffect } from 'react'

export interface UseEchoPttOptions {
  isConnected: boolean
  setPttMode: (enabled: boolean) => void
  setPttActive: (active: boolean) => void
}

export function useEchoPtt({
  isConnected,
  setPttMode,
  setPttActive
}: UseEchoPttOptions) {
  // Push-to-Talk settings
  const [pttKey, setPttKey] = useState<string>(() => localStorage.getItem('echo-ptt-key') || 'KeyV')
  const [pttModeSetting, setPttModeSetting] = useState<boolean>(() => localStorage.getItem('echo-ptt-mode') === 'true')

  // Sync PTT mode with useVoiceChannel
  useEffect(() => {
    setPttMode(pttModeSetting)
  }, [pttModeSetting, setPttMode])

  // Register Global PTT Shortcut if in Electron
  useEffect(() => {
    if (pttModeSetting && (window as any).electronAPI?.registerGlobalPTT) {
      const electronKey = pttKey === 'KeyV' ? 'V' : pttKey === 'Space' ? 'Space' : pttKey === 'CapsLock' ? 'CapsLock' : pttKey
      ;(window as any).electronAPI.registerGlobalPTT(electronKey)
    } else if ((window as any).electronAPI?.unregisterGlobalPTT) {
      ;(window as any).electronAPI.unregisterGlobalPTT()
    }
  }, [pttModeSetting, pttKey])

  // PTT key listener in window
  useEffect(() => {
    if (!pttModeSetting || !isConnected) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === pttKey && !e.repeat && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setPttActive(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === pttKey) {
        setPttActive(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [pttModeSetting, pttKey, isConnected, setPttActive])

  return {
    pttKey,
    setPttKey,
    pttModeSetting,
    setPttModeSetting
  }
}
