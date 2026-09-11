import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'

export interface UseEchoScreenShareOptions {
  user: User
  localScreenStream: any
  sfxVolume: number
  startScreenShare: (sourceId?: string, width?: number, height?: number, fps?: number) => Promise<void>
  stopScreenShare: () => Promise<void> | void
  changeScreenShareSettings: (width?: number, height?: number, fps?: number) => Promise<void>
  setIsWatchingStreams: (val: boolean) => void
  setSelectedScreenSharerUserId: (userId: string | null) => void
  setScreenShareViewMode: (mode: 'grid' | 'focus') => void
  setError: (err: string) => void
  playScreenStartSound: (volume: number) => void
  playScreenStopSound: (volume: number) => void
}

export function useEchoScreenShare({
  user,
  localScreenStream,
  sfxVolume,
  startScreenShare,
  stopScreenShare,
  changeScreenShareSettings,
  setIsWatchingStreams,
  setSelectedScreenSharerUserId,
  setScreenShareViewMode,
  setError,
  playScreenStartSound,
  playScreenStopSound
}: UseEchoScreenShareOptions) {
  const [screenSources, setScreenSources] = useState<any[]>([])
  const [showScreenPicker, setShowScreenPicker] = useState(false)
  const [screenPickerTab, setScreenPickerTab] = useState<'windows' | 'screens'>('windows')
  const [screenQuality, setScreenQuality] = useState<'720p' | '1080p' | 'native'>('1080p')
  const [screenFps, setScreenFps] = useState<15 | 30 | 60>(60)
  const [showScreenMenu, setShowScreenMenu] = useState(false)
  const [selectedPickerSourceId, setSelectedPickerSourceId] = useState<string | null>(null)
  const [activeSharingSource, setActiveSharingSource] = useState<any | null>(null)

  // Auto-refresh screen sources while picker modal is open
  useEffect(() => {
    if (!showScreenPicker || !(window as any).electronAPI) return
    const interval = setInterval(async () => {
      try {
        const raw = await (window as any).electronAPI.getSources()
        const seenNames = new Set<string>()
        const sources: any[] = []
        for (const s of (raw || [])) {
          if (s.type === 'screen' || (s.id && s.id.startsWith('screen:'))) {
            sources.push(s)
            continue
          }
          const cleanKey = (s.name || '').toLowerCase().replace(/\s*\(jogo\)\s*/i, '').trim()
          if (!cleanKey || seenNames.has(cleanKey)) continue
          seenNames.add(cleanKey)
          sources.push(s)
        }
        setScreenSources(sources)
      } catch (e) {}
    }, 2500)
    return () => clearInterval(interval)
  }, [showScreenPicker])

  // Intelligent FPS Lock for Screen Picker
  const currentSelectedPickerSource = screenSources.find(s => s.id === selectedPickerSourceId)
  const isPickerGameOrScreen = screenPickerTab === 'screens' || 
    currentSelectedPickerSource?.type === 'screen' || 
    currentSelectedPickerSource?.id?.startsWith('screen:') || 
    currentSelectedPickerSource?.isGame === true || 
    (currentSelectedPickerSource?.name || '').toLowerCase().includes('(jogo)')

  useEffect(() => {
    if (showScreenPicker && !isPickerGameOrScreen && screenFps === 60) {
      setScreenFps(30)
    }
  }, [showScreenPicker, isPickerGameOrScreen, screenFps])

  function getQualityDimensions(quality: '720p' | '1080p' | 'native') {
    if (quality === '720p') return { w: 1280, h: 720 }
    if (quality === '1080p') return { w: 1920, h: 1080 }
    return { w: undefined, h: undefined }
  }

  const openScreenPickerHelper = useCallback(async (quality: '720p' | '1080p' | 'native', fps: 15 | 30 | 60) => {
    if ((window as any).electronAPI) {
      try {
        const rawSources = await (window as any).electronAPI.getSources()
        const seenNames = new Set<string>()
        const sources: any[] = []
        for (const s of (rawSources || [])) {
          if (s.type === 'screen' || (s.id && s.id.startsWith('screen:'))) {
            sources.push(s)
            continue
          }
          const cleanKey = (s.name || '').toLowerCase().replace(/\s*\(jogo\)\s*/i, '').trim()
          if (!cleanKey || seenNames.has(cleanKey)) continue
          seenNames.add(cleanKey)
          sources.push(s)
        }
        setScreenSources(sources)
        if (sources && sources.length > 0) {
          setSelectedPickerSourceId(sources[0].id)
        }
        setShowScreenPicker(true)
      } catch (err) {
        setError('Não foi possível capturar as telas: ' + err)
      }
    } else {
      const { w, h } = getQualityDimensions(quality)
      await startScreenShare(undefined, w, h, fps)
      playScreenStartSound(sfxVolume)
    }
  }, [setError, startScreenShare, playScreenStartSound, sfxVolume])

  const handleQualityChange = useCallback(async (newQuality: '720p' | '1080p' | 'native') => {
    setScreenQuality(newQuality)
    const { w, h } = getQualityDimensions(newQuality)
    if (localScreenStream) {
      await changeScreenShareSettings(w, h, screenFps)
    }
  }, [localScreenStream, changeScreenShareSettings, screenFps])

  const handleFpsChange = useCallback(async (newFps: 15 | 30 | 60) => {
    const isCurrentStreamGameOrScreen = !activeSharingSource || 
      activeSharingSource.type === 'screen' || 
      activeSharingSource.id?.startsWith('screen:') || 
      activeSharingSource.isGame === true || 
      (activeSharingSource.name || '').toLowerCase().includes('(jogo)')
    const targetFps = (!isCurrentStreamGameOrScreen && newFps === 60) ? 30 : newFps
    setScreenFps(targetFps)
    if (localScreenStream) {
      const { w, h } = getQualityDimensions(screenQuality)
      await changeScreenShareSettings(w, h, targetFps)
    }
  }, [activeSharingSource, localScreenStream, screenQuality, changeScreenShareSettings])

  const forceOpenScreenPicker = useCallback(async () => {
    setShowScreenMenu(false)
    await openScreenPickerHelper(screenQuality, screenFps)
  }, [openScreenPickerHelper, screenQuality, screenFps])

  const handleStopScreenShare = useCallback(async () => {
    playScreenStopSound(sfxVolume)
    setActiveSharingSource(null)
    await stopScreenShare()
  }, [playScreenStopSound, sfxVolume, stopScreenShare])

  const openScreenPicker = useCallback(async () => {
    if (localScreenStream) {
      setShowScreenMenu(prev => !prev)
      return
    }
    await openScreenPickerHelper(screenQuality, screenFps)
  }, [localScreenStream, openScreenPickerHelper, screenQuality, screenFps])

  useEffect(() => {
    ;(window as any).__openScreenPicker = () => openScreenPickerHelper(screenQuality, screenFps)
  }, [openScreenPickerHelper, screenQuality, screenFps])

  const selectScreenSource = useCallback(async (sourceId: string) => {
    setShowScreenPicker(false)
    setIsWatchingStreams(true)
    setSelectedScreenSharerUserId(user.id)
    setScreenShareViewMode('focus')
    const { w, h } = getQualityDimensions(screenQuality)
    const targetSource = screenSources.find(s => s.id === sourceId)
    const isGameOrScreen = screenPickerTab === 'screens' || 
      targetSource?.type === 'screen' || 
      targetSource?.id?.startsWith('screen:') || 
      targetSource?.isGame === true || 
      (targetSource?.name || '').toLowerCase().includes('(jogo)')

    const effectiveFps = (!isGameOrScreen && screenFps === 60) ? 30 : screenFps
    if (effectiveFps !== screenFps) {
      setScreenFps(effectiveFps)
    }
    setActiveSharingSource(targetSource || null)
    await startScreenShare(sourceId, w, h, effectiveFps)
    playScreenStartSound(sfxVolume)
  }, [screenSources, screenPickerTab, screenFps, screenQuality, user.id, setIsWatchingStreams, setSelectedScreenSharerUserId, setScreenShareViewMode, startScreenShare, playScreenStartSound, sfxVolume])

  return {
    screenQuality,
    setScreenQuality,
    screenFps,
    setScreenFps,
    screenSources,
    setScreenSources,
    showScreenPicker,
    setShowScreenPicker,
    screenPickerTab,
    setScreenPickerTab,
    showScreenMenu,
    setShowScreenMenu,
    selectedPickerSourceId,
    setSelectedPickerSourceId,
    activeSharingSource,
    setActiveSharingSource,
    getQualityDimensions,
    openScreenPickerHelper,
    handleQualityChange,
    handleFpsChange,
    forceOpenScreenPicker,
    handleStopScreenShare,
    openScreenPicker,
    selectScreenSource
  }
}
