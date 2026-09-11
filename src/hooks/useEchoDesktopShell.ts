import { useState, useRef, useEffect, useCallback } from 'react'
import type { VoiceParticipant } from '../lib/useVoiceChannel'
import type { Channel } from '../types'

export interface UseEchoDesktopShellOptions {
  channelSearchInputRef: React.MutableRefObject<HTMLInputElement | null>
  showSpaceSettingsModal: boolean
  setShowSpaceSettingsModal: (show: boolean) => void
  showToast: (title: string, message: string, type?: 'info' | 'success' | 'warning' | 'error') => void
  participants: VoiceParticipant[]
  isConnected: boolean
  selectedChannel: Channel | null
  activeVoiceChannelId: string | null
  page: string
  updateScreenSubscriptions: (options: { activeSharerId: string | null; viewMode: 'focus' | 'grid'; isWatching: boolean }) => void
}

export function useEchoDesktopShell({
  channelSearchInputRef,
  showSpaceSettingsModal,
  setShowSpaceSettingsModal,
  showToast,
  participants,
  isConnected,
  selectedChannel,
  activeVoiceChannelId,
  page,
  updateScreenSubscriptions
}: UseEchoDesktopShellOptions) {
  // Mini Overlay Flutuante Control
  const handleToggleOverlay = useCallback(() => {
    if ((window as any).electronAPI?.toggleOverlay) {
      (window as any).electronAPI.toggleOverlay()
    } else {
      showToast('Mini Overlay', 'O Mini Overlay flutuante está disponível no aplicativo Echo para Windows.', 'info')
    }
  }, [showToast])

  // Global Shortcut: Ctrl+K / Cmd+K to search channels
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (channelSearchInputRef.current) {
          channelSearchInputRef.current.focus()
          channelSearchInputRef.current.select()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [channelSearchInputRef])

  // Topbar Auto-Hide & Pin State
  const [topbarPinned, setTopbarPinned] = useState<boolean>(() => {
    return localStorage.getItem('echo-topbar-pinned') === 'true'
  })
  const [topbarHovered, setTopbarHovered] = useState<boolean>(false)
  const topbarHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTopbar = useCallback(() => {
    if (topbarHideTimeoutRef.current) {
      clearTimeout(topbarHideTimeoutRef.current)
      topbarHideTimeoutRef.current = null
    }
    setTopbarHovered(true)
  }, [])

  const hideTopbar = useCallback((delay = 800) => {
    if (topbarHideTimeoutRef.current) {
      clearTimeout(topbarHideTimeoutRef.current)
    }
    topbarHideTimeoutRef.current = setTimeout(() => {
      setTopbarHovered(false)
    }, delay)
  }, [])

  // Detect mouse near the top edge to smoothly reveal topbar
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (showSpaceSettingsModal) return
      if (e.clientY <= 14) {
        showTopbar()
      }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [showSpaceSettingsModal, showTopbar])

  const isTopbarVisible = topbarPinned || topbarHovered

  // Screen Share & Stream View States
  const [selectedScreenSharerUserId, setSelectedScreenSharerUserId] = useState<string | null>(null)
  const [screenShareViewMode, setScreenShareViewMode] = useState<'focus' | 'grid'>('focus')
  const [isWatchingStreams, setIsWatchingStreams] = useState(true)
  const [isPiPActive, setIsPiPActive] = useState(false)

  // Filter participants who have an active screenshare stream with live video track
  const activeScreenSharers = participants.filter(p => p.screenStream && p.screenStream.getVideoTracks().length > 0)
  const activeScreenSharer = (selectedScreenSharerUserId && activeScreenSharers.find(p => p.userId === selectedScreenSharerUserId)) || activeScreenSharers[0] || null
  const [isScreenFullScreen, setIsScreenFullScreen] = useState(false)

  // Auto-switch to watching streams when a stream becomes available
  useEffect(() => {
    if (activeScreenSharers.length > 0 && !isWatchingStreams) {
      setIsWatchingStreams(true)
    }
  }, [activeScreenSharers.length, isWatchingStreams])

  // Native Fullscreen Controller for Streams (Hides Windows Taskbar)
  const toggleScreenFullScreen = useCallback((targetVal?: boolean) => {
    const next = typeof targetVal === 'boolean' ? targetVal : !isScreenFullScreen
    setIsScreenFullScreen(next)

    // 1. Electron Native OS Fullscreen (removes taskbar completely at OS level)
    try {
      if ((window as any).electronAPI?.setFullScreen) {
        (window as any).electronAPI.setFullScreen(next).catch(() => {})
      }
    } catch (e) {}

    // 2. Synchronous HTML5 Fullscreen API (standard Chromium fullscreen, hides taskbar instantly)
    try {
      if (next) {
        if (!document.fullscreenElement) {
          const el = document.documentElement || document.body
          if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {})
          } else if ((el as any).webkitRequestFullscreen) {
            (el as any).webkitRequestFullscreen()
          }
        }
      } else {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {})
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen()
          }
        }
      }
    } catch (e) {}
  }, [isScreenFullScreen])

  // Sync state if user exits fullscreen via browser / system shortcut
  useEffect(() => {
    const onFullscreenChange = () => {
      const isFull = !!document.fullscreenElement
      setIsScreenFullScreen(isFull)
      if (!isFull) {
        try {
          if ((window as any).electronAPI?.setFullScreen) {
            (window as any).electronAPI.setFullScreen(false).catch(() => {})
          }
        } catch (e) {}
      }
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Exit fullscreen / settings on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSpaceSettingsModal) {
          setShowSpaceSettingsModal(false)
        } else if (isScreenFullScreen) {
          toggleScreenFullScreen(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showSpaceSettingsModal, isScreenFullScreen, toggleScreenFullScreen])

  // Automatically exit fullscreen if stream ends or call disconnects
  useEffect(() => {
    if ((!isConnected || activeScreenSharers.length === 0) && isScreenFullScreen) {
      toggleScreenFullScreen(false)
    }
  }, [isConnected, activeScreenSharers.length, isScreenFullScreen, toggleScreenFullScreen])

  // ── Otimização Discord: Assinatura Dinâmica de Vídeo (Economia de Banda Oracle Cloud) ──
  useEffect(() => {
    const isVoiceChannelSelected = selectedChannel?.id === activeVoiceChannelId
    const isPageActive = page === 'Servidores'
    const isDocVisible = typeof document !== 'undefined' ? document.visibilityState === 'visible' : true

    const shouldWatch = isWatchingStreams && isVoiceChannelSelected && isPageActive && isDocVisible

    updateScreenSubscriptions({
      activeSharerId: selectedScreenSharerUserId,
      viewMode: screenShareViewMode,
      isWatching: shouldWatch
    })

    const handleVisibilityChange = () => {
      const nowVisible = document.visibilityState === 'visible'
      updateScreenSubscriptions({
        activeSharerId: selectedScreenSharerUserId,
        viewMode: screenShareViewMode,
        isWatching: isWatchingStreams && isVoiceChannelSelected && isPageActive && nowVisible
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [
    isWatchingStreams,
    selectedScreenSharerUserId,
    screenShareViewMode,
    selectedChannel?.id,
    activeVoiceChannelId,
    page,
    updateScreenSubscriptions
  ])

  return {
    handleToggleOverlay,
    topbarPinned,
    setTopbarPinned,
    topbarHovered,
    setTopbarHovered,
    showTopbar,
    hideTopbar,
    isTopbarVisible,
    selectedScreenSharerUserId,
    setSelectedScreenSharerUserId,
    screenShareViewMode,
    setScreenShareViewMode,
    isWatchingStreams,
    setIsWatchingStreams,
    isPiPActive,
    setIsPiPActive,
    activeScreenSharers,
    activeScreenSharer,
    isScreenFullScreen,
    setIsScreenFullScreen,
    toggleScreenFullScreen
  }
}
