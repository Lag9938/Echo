import { useState, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'

export interface ActiveDirectCall {
  targetUserId: string
  targetName: string
  targetAvatar?: string
  roomId: string
  status: 'calling' | 'connected'
  startTime?: number
}

export interface IncomingCall {
  callerId: string
  callerName: string
  callerAvatar?: string
  roomId: string
}

export interface UseEchoDirectCallsOptions {
  user: User | null
  profileDisplayName: string
  displayName: string
  profileAvatarUrl: string
  socialChannelRef: React.MutableRefObject<any>
  sfxVolume: number
  handleJoinVoice: (channelId: string, explicitSpaceId?: string) => Promise<void>
  leaveVoice: () => void
  setActiveVoiceChannelId: (channelId: string | null) => void
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  triggerDesktopNotification: (title: string, body: string) => void
  playLeaveSound: (volume: number) => void
}

export function useEchoDirectCalls({
  user,
  profileDisplayName,
  displayName,
  profileAvatarUrl,
  socialChannelRef,
  sfxVolume,
  handleJoinVoice,
  leaveVoice,
  setActiveVoiceChannelId,
  showToast,
  triggerDesktopNotification,
  playLeaveSound
}: UseEchoDirectCallsOptions) {
  const [activeDirectCall, setActiveDirectCall] = useState<ActiveDirectCall | null>(null)
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

  const stopRingtoneRef = useRef<(() => void) | null>(null)

  const startRingtone = useCallback((isIncoming: boolean) => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current()
      stopRingtoneRef.current = null
    }
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      let isPlaying = true
      function beep() {
        if (!isPlaying || audioCtx.state === 'closed') return
        const osc = audioCtx.createOscillator()
        const gain = audioCtx.createGain()
        osc.type = 'sine'
        const baseFreq = isIncoming ? 520 : 440
        osc.frequency.setValueAtTime(baseFreq, audioCtx.currentTime)
        if (isIncoming) {
          osc.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.25)
        }
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.09, audioCtx.currentTime + 0.04)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + (isIncoming ? 0.5 : 0.35))
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()
        osc.stop(audioCtx.currentTime + (isIncoming ? 0.5 : 0.35))
      }
      beep()
      const timer = setInterval(beep, isIncoming ? 1600 : 2400)
      stopRingtoneRef.current = () => {
        isPlaying = false
        clearInterval(timer)
        try { audioCtx.close() } catch (e) {}
      }
    } catch (e) {
      stopRingtoneRef.current = null
    }
  }, [])

  const stopRingtone = useCallback(() => {
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current()
      stopRingtoneRef.current = null
    }
  }, [])

  const startDirectCall = useCallback(async (targetUserId: string, targetName: string, targetAvatar?: string) => {
    if (!user) return
    const roomId = `dm-call-${[user.id, targetUserId].sort().join('-')}`
    setActiveDirectCall({
      targetUserId,
      targetName,
      targetAvatar,
      roomId,
      status: 'calling',
      startTime: Date.now()
    })
    startRingtone(false)
    await handleJoinVoice(roomId, 'direct-call')
    socialChannelRef.current?.send({
      type: 'broadcast',
      event: 'call-event',
      payload: {
        type: 'call-invite',
        callerId: user.id,
        callerName: profileDisplayName || displayName || 'Amigo',
        callerAvatar: profileAvatarUrl,
        targetUserId,
        roomId
      }
    })
    showToast('Chamando...', `Ligando para @${targetName}...`, 'friend')
  }, [user, profileDisplayName, displayName, profileAvatarUrl, socialChannelRef, startRingtone, handleJoinVoice, showToast])

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall || !user) return
    stopRingtone()
    const { callerId, callerName, callerAvatar, roomId } = incomingCall
    setIncomingCall(null)
    await handleJoinVoice(roomId, 'direct-call')
    setActiveDirectCall({
      targetUserId: callerId,
      targetName: callerName,
      targetAvatar: callerAvatar,
      roomId,
      status: 'connected',
      startTime: Date.now()
    })
    socialChannelRef.current?.send({
      type: 'broadcast',
      event: 'call-event',
      payload: {
        type: 'call-accepted',
        callerId,
        targetUserId: user.id
      }
    })
    showToast('Chamada conectada', `Em chamada com @${callerName}`, 'friend')
  }, [incomingCall, user, stopRingtone, handleJoinVoice, socialChannelRef, showToast])

  const rejectIncomingCall = useCallback(() => {
    if (!incomingCall || !user) return
    stopRingtone()
    const { callerId } = incomingCall
    setIncomingCall(null)
    socialChannelRef.current?.send({
      type: 'broadcast',
      event: 'call-event',
      payload: {
        type: 'call-rejected',
        callerId,
        targetUserId: user.id
      }
    })
  }, [incomingCall, user, stopRingtone, socialChannelRef])

  const endDirectCall = useCallback(() => {
    stopRingtone()
    if (activeDirectCall && user) {
      socialChannelRef.current?.send({
        type: 'broadcast',
        event: 'call-event',
        payload: {
          type: 'call-ended',
          targetUserId: activeDirectCall.targetUserId,
          senderId: user.id
        }
      })
    }
    playLeaveSound(sfxVolume)
    leaveVoice()
    setActiveDirectCall(null)
    setActiveVoiceChannelId(null)
  }, [activeDirectCall, user, stopRingtone, socialChannelRef, playLeaveSound, sfxVolume, leaveVoice, setActiveVoiceChannelId])

  const handleCallEvent = useCallback((data: any) => {
    if (!data || !user) return
    if (data.type === 'call-invite' && data.targetUserId === user.id) {
      setIncomingCall({
        callerId: data.callerId,
        callerName: data.callerName,
        callerAvatar: data.callerAvatar,
        roomId: data.roomId
      })
      startRingtone(true)
      triggerDesktopNotification('Chamada de Voz Recebida', `@${data.callerName} está te ligando no Echo!`)
    } else if (data.type === 'call-accepted' && data.callerId === user.id) {
      stopRingtone()
      setActiveDirectCall(prev => prev ? { ...prev, status: 'connected', startTime: Date.now() } : null)
      showToast('Chamada atendida!', 'A chamada foi conectada!', 'friend')
    } else if (data.type === 'call-rejected' && data.callerId === user.id) {
      playLeaveSound(sfxVolume)
      stopRingtone()
      leaveVoice()
      setActiveDirectCall(null)
      setActiveVoiceChannelId(null)
      showToast('Chamada recusada', 'O usuário não pôde atender no momento.', 'info')
    } else if (data.type === 'call-ended' && data.targetUserId === user.id) {
      playLeaveSound(sfxVolume)
      stopRingtone()
      leaveVoice()
      setActiveDirectCall(null)
      setActiveVoiceChannelId(null)
      showToast('Chamada encerrada', 'A chamada foi finalizada.', 'friend')
    }
  }, [user, startRingtone, triggerDesktopNotification, stopRingtone, showToast, playLeaveSound, sfxVolume, leaveVoice, setActiveVoiceChannelId])

  return {
    activeDirectCall,
    setActiveDirectCall,
    incomingCall,
    setIncomingCall,
    startRingtone,
    stopRingtone,
    startDirectCall,
    acceptIncomingCall,
    rejectIncomingCall,
    endDirectCall,
    handleCallEvent
  }
}
