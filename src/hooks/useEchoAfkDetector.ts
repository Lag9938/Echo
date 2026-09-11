import { useState, useRef, useEffect, useCallback } from 'react'
import type { VoiceParticipant } from '../lib/useVoiceChannel'
import type { Channel } from '../types'

export interface UseEchoAfkDetectorOptions {
  isConnected: boolean
  participants: VoiceParticipant[]
  userId?: string
  activeVoiceChannelId: string | null
  spaceId?: string
  spaceChannels: Record<string, Channel[]>
  handleLeaveVoice: () => void
}

export function useEchoAfkDetector({
  isConnected,
  participants,
  userId,
  activeVoiceChannelId,
  spaceId,
  spaceChannels,
  handleLeaveVoice
}: UseEchoAfkDetectorOptions) {
  const [showAfkPrompt, setShowAfkPrompt] = useState(false)
  const [afkCountdown, setAfkCountdown] = useState(180)
  const [showAfkDisconnectedModal, setShowAfkDisconnectedModal] = useState(false)
  const lastActivityRef = useRef<number>(Date.now())
  const lastAfkChannelRef = useRef<{ channelId: string; spaceId?: string } | null>(null)

  // Passive activity listeners (mouse, clicks, keyboard, wheel, touch)
  useEffect(() => {
    const handleActivity = () => {
      if (!showAfkPrompt) {
        lastActivityRef.current = Date.now()
      }
    }

    window.addEventListener('mousemove', handleActivity, { passive: true })
    window.addEventListener('mousedown', handleActivity, { passive: true })
    window.addEventListener('keydown', handleActivity, { passive: true })
    window.addEventListener('wheel', handleActivity, { passive: true })
    window.addEventListener('touchstart', handleActivity, { passive: true })

    return () => {
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('wheel', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [showAfkPrompt])

  // Refresh activity when the local user speaks in voice
  useEffect(() => {
    if (!isConnected) return
    const isMeSpeaking = participants.some(p => p.userId === userId && p.isSpeaking)
    if (isMeSpeaking && !showAfkPrompt) {
      lastActivityRef.current = Date.now()
    }
  }, [isConnected, participants, userId, showAfkPrompt])

  // Check for 2 hours of continuous inactivity while connected to voice/stream
  useEffect(() => {
    if (!isConnected && !(window as any).__isAfkSimulating) {
      if (showAfkPrompt) setShowAfkPrompt(false)
      return
    }

    const interval = setInterval(() => {
      if (showAfkPrompt) return
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= 2 * 60 * 60 * 1000) {
        setShowAfkPrompt(true)
        setAfkCountdown(180)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [isConnected, showAfkPrompt])

  // 1-second countdown when AFK prompt is active (180s -> 0)
  useEffect(() => {
    if (!showAfkPrompt || (!isConnected && !(window as any).__isAfkSimulating)) return

    const timer = setInterval(() => {
      setAfkCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          if (activeVoiceChannelId) {
            const currentSpaceId = spaceId || Object.keys(spaceChannels).find(sId => (spaceChannels[sId] || []).some(c => c.id === activeVoiceChannelId))
            lastAfkChannelRef.current = {
              channelId: activeVoiceChannelId,
              spaceId: currentSpaceId
            }
          }
          handleLeaveVoice()
          setShowAfkPrompt(false)
          setShowAfkDisconnectedModal(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showAfkPrompt, isConnected, activeVoiceChannelId, spaceId, spaceChannels, handleLeaveVoice])

  // Reset AFK when staying
  const handleAfkStay = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowAfkPrompt(false)
    setAfkCountdown(180)
  }, [])

  // Expose AFK simulation on window for testing
  useEffect(() => {
    ;(window as any).__triggerAfkPrompt = () => {
      ;(window as any).__isAfkSimulating = true
      setShowAfkPrompt(true)
      setAfkCountdown(180)
    }
    ;(window as any).__triggerAfkDisconnect = () => {
      if (activeVoiceChannelId) {
        const currentSpaceId = spaceId || Object.keys(spaceChannels).find(sId => (spaceChannels[sId] || []).some(c => c.id === activeVoiceChannelId))
        lastAfkChannelRef.current = {
          channelId: activeVoiceChannelId,
          spaceId: currentSpaceId
        }
      } else {
        lastAfkChannelRef.current = {
          channelId: 'mock-channel-id',
          spaceId: 'mock-space-id'
        }
      }
      handleLeaveVoice()
      setShowAfkPrompt(false)
      setShowAfkDisconnectedModal(true)
    }
  }, [activeVoiceChannelId, spaceId, spaceChannels, handleLeaveVoice])

  return {
    showAfkPrompt,
    setShowAfkPrompt,
    afkCountdown,
    setAfkCountdown,
    showAfkDisconnectedModal,
    setShowAfkDisconnectedModal,
    lastActivityRef,
    lastAfkChannelRef,
    handleAfkStay
  }
}
