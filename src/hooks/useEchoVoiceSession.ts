import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { useVoiceChannel, type VoiceParticipant } from '../lib/useVoiceChannel'
import type { Space, Channel } from '../types'
import {
  playJoinSound,
  playLeaveSound,
  playMuteSound,
  playUnmuteSound,
  playDeafenSound,
  playUndeafenSound
} from '../lib/soundEffects'

export interface UseEchoVoiceSessionOptions {
  user: User
  profileDisplayName: string
  profileAvatarUrl?: string
  sfxVolume: number
  selectedInputId?: string
  selectedOutputId?: string
  noiseSuppressionEnabled?: boolean
  echoCancellationEnabled?: boolean
  getSelectedInputId?: () => string
  getSelectedOutputId?: () => string
  getNoiseSuppressionEnabled?: () => boolean
  getEchoCancellationEnabled?: () => boolean
  spaces: Space[]
  spaceChannelsRef: React.MutableRefObject<Record<string, Channel[]>>
  selectedChannel: Channel | null
  spaceChannels: Record<string, Channel[]>
  activeSharingSource?: any
  getActiveSharingSource?: () => any
  setActiveSharingSource?: (src: any) => void
  onLeaveVoice?: () => void
  lastActivityRef?: React.MutableRefObject<number>
  setShowAfkPrompt?: (show: boolean) => void
  setShowAfkDisconnectedModal?: (show: boolean) => void
  onBeforeJoinVoice?: () => void
  showToast?: (title: string, message: string, type?: any) => void
  supabase: any
}

export function useEchoVoiceSession({
  user,
  profileDisplayName,
  profileAvatarUrl,
  sfxVolume,
  selectedInputId,
  selectedOutputId,
  noiseSuppressionEnabled,
  echoCancellationEnabled,
  getSelectedInputId,
  getSelectedOutputId,
  getNoiseSuppressionEnabled,
  getEchoCancellationEnabled,
  spaces,
  spaceChannelsRef,
  selectedChannel,
  spaceChannels,
  activeSharingSource,
  getActiveSharingSource,
  setActiveSharingSource,
  onLeaveVoice,
  lastActivityRef,
  setShowAfkPrompt,
  setShowAfkDisconnectedModal,
  onBeforeJoinVoice,
  showToast,
  supabase
}: UseEchoVoiceSessionOptions) {
  const [activeVoiceChannelId, setActiveVoiceChannelId] = useState<string | null>(null)
  const [spaceVoiceUsers, setSpaceVoiceUsers] = useState<Record<string, VoiceParticipant[]>>({})

  const handleJoinVoiceRef = useRef<(channelId: string, explicitSpaceId?: string) => Promise<void>>(async () => {})
  const handleLeaveVoiceRef = useRef<() => void>(() => {})

  // Voice disconnect handler (chamado apenas quando a conexão for realmente perdida pelo SFU/rede)
  const handleVoiceDisconnected = useCallback(() => {
    playLeaveSound(sfxVolume)
    setActiveVoiceChannelId(prevChId => {
      if (prevChId && user?.id) {
        setSpaceVoiceUsers(prev => {
          if (!prev[prevChId]) return prev
          return {
            ...prev,
            [prevChId]: prev[prevChId].filter(u => u.userId !== user.id)
          }
        })
      }
      return null
    })
  }, [user?.id, sfxVolume])

  // Voice hook and state
  const { 
    participants, 
    isMuted, 
    isDeafened,
    isConnected, 
    localScreenStream,
    rtcStats,
    isPttMode,
    isPttActive,
    lastSoundboardEvent,
    isRecordingCall,
    recordingDuration,
    joinVoice, 
    leaveVoice, 
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    changeInputDevice,
    changeOutputDevice,
    changeScreenShareSettings,
    changePeerVolume,
    changePeerPan,
    setSpatialAudioEnabled,
    changePeerScreenVolume,
    setPttMode,
    setPttActive,
    playSoundboard,
    startCallRecording,
    stopCallRecording,
    isAiDenoiseEnabled,
    toggleAiDenoise,
    updateScreenSubscriptions,
    updateLocalProfile,
    screenAudioSyncDelayMs,
    changeScreenAudioSyncDelay,
    isReconnecting: isVoiceReconnecting,
    reconnectCountdown: voiceReconnectCountdown,
    reconnectAttempt: voiceReconnectAttempt,
    retryVoiceReconnect,
    cancelVoiceReconnect,
    serverMuteParticipant,
    disconnectParticipant,
    moveParticipant
  } = useVoiceChannel({
    onDisconnected: handleVoiceDisconnected,
    sfxVolume,
    onServerMuted: () => {
      showToast?.('Silenciado no Servidor', 'Um moderador silenciou seu microfone.', 'info')
    },
    onKickedFromVoice: () => {
      showToast?.('Desconectado da Chamada', 'Você foi desconectado da chamada por um moderador.', 'info')
      handleLeaveVoiceRef.current?.()
    },
    onMovedToVoiceChannel: (targetChannelId, targetChannelName) => {
      showToast?.('Movido de Canal', `Você foi movido para o canal ${targetChannelName || ''}.`, 'info')
      handleJoinVoiceRef.current?.(targetChannelId)
    }
  })

  // Voice Presence per space
  useEffect(() => {
    const sb = supabase
    if (!sb || spaces.length === 0) return

    const activeSubscriptions: any[] = []

    spaces.forEach(sp => {
      const channel = sb.channel(`space-voice-${sp.id}`, {
        config: { presence: { key: user.id } }
      })

      const handlePresenceSync = () => {
        const state = channel.presenceState()
        const byChannel: Record<string, VoiceParticipant[]> = {}

        Object.values(state).forEach(presences => {
          for (const pres of presences as any[]) {
            if (pres && pres.channel_id) {
              if (!byChannel[pres.channel_id]) {
                byChannel[pres.channel_id] = []
              }
              if (!byChannel[pres.channel_id].some(u => u.userId === pres.user_id)) {
                byChannel[pres.channel_id].push({
                  userId: pres.user_id,
                  displayName: pres.display_name || 'Membro',
                  avatarUrl: pres.avatar_url,
                  isSpeaking: !!pres.is_speaking,
                  isMuted: !!pres.is_muted,
                  isDeafened: !!pres.is_deafened,
                  screenStream: pres.has_screen ? (new MediaStream()) : undefined
                })
              }
            }
          }
        })

        setSpaceVoiceUsers(prev => {
          const next = { ...prev }
          const spaceChs = (spaceChannelsRef.current[sp.id] || []).filter(c => c.type === 'voice')
          
          spaceChs.forEach(c => {
            if (byChannel[c.id] && byChannel[c.id].length > 0) {
              next[c.id] = byChannel[c.id]
            } else {
              delete next[c.id]
            }
          })

          Object.entries(byChannel).forEach(([chId, users]) => {
            if (users && users.length > 0) {
              next[chId] = users
            }
          })

          return next
        })
      }

      channel
        .on('presence', { event: 'sync' }, handlePresenceSync)
        .on('presence', { event: 'join' }, handlePresenceSync)
        .on('presence', { event: 'leave' }, handlePresenceSync)
        .subscribe()

      activeSubscriptions.push(channel)
    })

    return () => {
      activeSubscriptions.forEach(ch => {
        sb.removeChannel(ch)
      })
    }
  }, [spaces, user.id])

  handleJoinVoiceRef.current = handleJoinVoice
  handleLeaveVoiceRef.current = handleLeaveVoice

  async function handleJoinVoice(channelId: string, explicitSpaceId?: string) {
    if (lastActivityRef) lastActivityRef.current = Date.now()
    if (setShowAfkPrompt) setShowAfkPrompt(false)
    if (setShowAfkDisconnectedModal) setShowAfkDisconnectedModal(false)
    if (onBeforeJoinVoice) onBeforeJoinVoice()
    setActiveVoiceChannelId(channelId)
    const spaceId = explicitSpaceId 
      || selectedChannel?.space_id 
      || Object.keys(spaceChannels).find(sId => (spaceChannels[sId] || []).some(c => c.id === channelId))
      || Object.keys(spaceChannelsRef.current).find(sId => (spaceChannelsRef.current[sId] || []).some(c => c.id === channelId))
      || spaces.find(s => (spaceChannelsRef.current[s.id] || []).some(c => c.id === channelId))?.id
    try {
      playJoinSound(sfxVolume)
      const inputId = selectedInputId || (getSelectedInputId ? getSelectedInputId() : '')
      const outputId = selectedOutputId || (getSelectedOutputId ? getSelectedOutputId() : '')
      const ns = noiseSuppressionEnabled !== undefined ? noiseSuppressionEnabled : (getNoiseSuppressionEnabled ? getNoiseSuppressionEnabled() : true)
      const ec = echoCancellationEnabled !== undefined ? echoCancellationEnabled : (getEchoCancellationEnabled ? getEchoCancellationEnabled() : true)
      await joinVoice(channelId, user.id, profileDisplayName, profileAvatarUrl, inputId, outputId, ns, ec, spaceId)
    } catch (err) {
      console.error('handleJoinVoice error:', err)
      setActiveVoiceChannelId(null)
    }
  }

  function handleLeaveVoice() {
    playLeaveSound(sfxVolume)
    const prevChId = activeVoiceChannelId
    cancelVoiceReconnect()
    leaveVoice()
    setActiveVoiceChannelId(null)
    if (setActiveSharingSource) setActiveSharingSource(null)
    if (onLeaveVoice) onLeaveVoice()
    if (prevChId && user?.id) {
      setSpaceVoiceUsers(prev => {
        if (!prev[prevChId]) return prev
        return {
          ...prev,
          [prevChId]: prev[prevChId].filter(u => u.userId !== user.id)
        }
      })
    }
  }

  function handleToggleMute() {
    if (isMuted) {
      playUnmuteSound(sfxVolume)
    } else {
      playMuteSound(sfxVolume)
    }
    toggleMute()
  }

  function handleToggleDeafen() {
    if (isDeafened) {
      playUndeafenSound(sfxVolume)
    } else {
      playDeafenSound(sfxVolume)
    }
    toggleDeafen()
  }

  const activeVoiceChannel = useMemo(() => {
    return activeVoiceChannelId
      ? Object.values(spaceChannels).flat().find(c => c.id === activeVoiceChannelId) || null
      : null
  }, [activeVoiceChannelId, spaceChannels])

  // Synchronize Live Voice State with Mini Overlay
  useEffect(() => {
    const channel = new BroadcastChannel('echo-voice-overlay-sync')

    const broadcastState = () => {
      const channelName = activeVoiceChannel?.name || 'Chamada de Voz'
      const parts = participants.map(p => ({
        userId: p.userId,
        displayName: p.displayName,
        avatarUrl: p.avatarUrl,
        isSpeaking: Boolean(p.isSpeaking),
        isMuted: Boolean(p.isMuted),
        isDeafened: Boolean(p.isDeafened),
        hasScreen: Boolean(p.screenStream)
      }))

      if (activeVoiceChannelId && user?.id && !parts.some(p => p.userId === user.id)) {
        parts.unshift({
          userId: user.id,
          displayName: profileDisplayName || 'Você',
          avatarUrl: profileAvatarUrl,
          isSpeaking: false,
          isMuted: Boolean(isMuted),
          isDeafened: Boolean(isDeafened),
          hasScreen: Boolean(activeSharingSource !== undefined ? activeSharingSource : (getActiveSharingSource ? getActiveSharingSource() : null))
        })
      }

      const payload = {
        channelName,
        participants: parts,
        isMuted: Boolean(isMuted),
        isDeafened: Boolean(isDeafened),
        activeVoiceChannelId
      }

      try {
        localStorage.setItem('echo-voice-overlay-cache', JSON.stringify(payload))
      } catch (e) {}

      channel.postMessage({
        type: 'VOICE_STATE_UPDATE',
        payload
      })
    }

    broadcastState()

    channel.onmessage = (event) => {
      if (event.data?.type === 'REQUEST_SYNC' || event.data?.type === 'REQUEST_STATE') {
        broadcastState()
      } else if (event.data?.type === 'OVERLAY_ACTION') {
        if (event.data.action === 'toggleMute') {
          handleToggleMute()
        } else if (event.data.action === 'toggleDeafen') {
          handleToggleDeafen()
        } else if (event.data.action === 'leaveVoice') {
          handleLeaveVoice()
        }
      } else if (event.data?.type === 'TOGGLE_MUTE') {
        handleToggleMute()
      } else if (event.data?.type === 'TOGGLE_DEAFEN') {
        handleToggleDeafen()
      } else if (event.data?.type === 'LEAVE_CALL') {
        handleLeaveVoice()
      }
    }

    return () => {
      channel.close()
    }
  }, [participants, isMuted, isDeafened, activeVoiceChannelId, activeVoiceChannel?.name, user?.id, profileDisplayName, profileAvatarUrl, activeSharingSource])

  return {
    activeVoiceChannelId,
    setActiveVoiceChannelId,
    spaceVoiceUsers,
    setSpaceVoiceUsers,
    activeVoiceChannel,
    participants, 
    isMuted, 
    isDeafened,
    isConnected, 
    localScreenStream,
    rtcStats,
    isPttMode,
    isPttActive,
    lastSoundboardEvent,
    isRecordingCall,
    recordingDuration,
    joinVoice, 
    leaveVoice, 
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    changeInputDevice,
    changeOutputDevice,
    changeScreenShareSettings,
    changePeerVolume,
    changePeerPan,
    setSpatialAudioEnabled,
    changePeerScreenVolume,
    setPttMode,
    setPttActive,
    playSoundboard,
    startCallRecording,
    stopCallRecording,
    isAiDenoiseEnabled,
    toggleAiDenoise,
    updateScreenSubscriptions,
    updateLocalProfile,
    screenAudioSyncDelayMs,
    changeScreenAudioSyncDelay,
    isVoiceReconnecting,
    voiceReconnectCountdown,
    voiceReconnectAttempt,
    retryVoiceReconnect,
    cancelVoiceReconnect,
    handleVoiceDisconnected,
    handleJoinVoice,
    handleLeaveVoice,
    handleToggleMute,
    handleToggleDeafen,
    serverMuteParticipant,
    disconnectParticipant,
    moveParticipant
  }
}
