import { useState, useRef, useCallback, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Channel } from '../types'

export interface UseEchoVoiceNotesOptions {
  user: User | null
  selectedChannel: Channel | null
  selectedDMUserId: string | null
  supabase: any
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  postChannelMessage: (channelId: string, body: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>
  sendDirectMessage: (body: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>
}

export function useEchoVoiceNotes({
  user,
  selectedChannel,
  selectedDMUserId,
  supabase,
  showToast,
  postChannelMessage,
  sendDirectMessage
}: UseEchoVoiceNotesOptions) {
  // Voice Notes recording state
  const [isVoiceNoteRecording, setIsVoiceNoteRecording] = useState(false)
  const [voiceNoteDuration, setVoiceNoteDuration] = useState(0)
  const [voiceNoteTarget, setVoiceNoteTarget] = useState<'channel' | 'dm'>('channel')
  const voiceNoteRecorderRef = useRef<MediaRecorder | null>(null)
  const voiceNoteChunksRef = useRef<Blob[]>([])
  const voiceNoteTimerRef = useRef<any>(null)

  // Voice Notes playback state
  const [activePlayingVoiceNote, setActivePlayingVoiceNote] = useState<string | null>(null)
  const [voiceNotePlaySpeed, setVoiceNotePlaySpeed] = useState<number>(1)
  const voiceNoteAudioRef = useRef<HTMLAudioElement | null>(null)

  const handleToggleVoicePlay = useCallback((messageId: string, audioUrl: string) => {
    if (activePlayingVoiceNote === messageId) {
      voiceNoteAudioRef.current?.pause()
      setActivePlayingVoiceNote(null)
    } else {
      if (voiceNoteAudioRef.current) {
        voiceNoteAudioRef.current.pause()
      }
      const audio = new Audio(audioUrl)
      audio.playbackRate = voiceNotePlaySpeed
      audio.play().catch(e => console.error('Audio play error:', e))
      audio.onended = () => setActivePlayingVoiceNote(null)
      voiceNoteAudioRef.current = audio
      setActivePlayingVoiceNote(messageId)
    }
  }, [activePlayingVoiceNote, voiceNotePlaySpeed])

  const handleChangeVoiceSpeed = useCallback(() => {
    const nextSpeed = voiceNotePlaySpeed === 1 ? 1.5 : voiceNotePlaySpeed === 1.5 ? 2 : 1
    setVoiceNotePlaySpeed(nextSpeed)
    if (voiceNoteAudioRef.current) {
      voiceNoteAudioRef.current.playbackRate = nextSpeed
    }
  }, [voiceNotePlaySpeed])

  const startVoiceNoteRecording = useCallback(async (target: 'channel' | 'dm' = 'channel') => {
    try {
      setVoiceNoteTarget(target)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      voiceNoteChunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) voiceNoteChunksRef.current.push(e.data)
      }
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (voiceNoteChunksRef.current.length > 0 && supabase && user) {
          const blob = new Blob(voiceNoteChunksRef.current, { type: 'audio/webm' })
          if (target === 'channel') {
            if (!selectedChannel) return
            const audioPath = `voice-notes/${selectedChannel.id}/${Date.now()}-${user.id}.webm`
            try {
              const { error: uploadErr } = await supabase.storage.from('attachments').upload(audioPath, blob, {
                contentType: 'audio/webm'
              })
              if (uploadErr) {
                console.error('Storage upload error for voice note:', uploadErr)
                showToast('Erro no Áudio', 'Falha ao salvar áudio no servidor.', 'info')
                return
              }
              const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(audioPath)
              await postChannelMessage(selectedChannel.id, '🎙️ Mensagem de Voz', urlData.publicUrl, 'audio')
            } catch (err: any) {
              console.error('Failed to send voice note:', err)
              showToast('Erro no Áudio', 'Erro ao processar gravação de voz.', 'info')
            }
          } else if (target === 'dm') {
            if (!selectedDMUserId) return
            const audioPath = `dm/${user.id}/${Date.now()}.webm`
            try {
              const { error: uploadErr } = await supabase.storage.from('attachments').upload(audioPath, blob, {
                contentType: 'audio/webm'
              })
              if (uploadErr) {
                console.error('Storage upload error for DM voice note:', uploadErr)
                showToast('Erro no Áudio', 'Falha ao salvar áudio no servidor.', 'info')
                return
              }
              const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(audioPath)
              await sendDirectMessage('🎙️ Mensagem de Voz', urlData.publicUrl, 'audio')
            } catch (err: any) {
              console.error('Failed to send DM voice note:', err)
              showToast('Erro no Áudio', 'Erro ao processar gravação de voz.', 'info')
            }
          }
        }
      }
      rec.start()
      voiceNoteRecorderRef.current = rec
      setIsVoiceNoteRecording(true)
      setVoiceNoteDuration(0)
      voiceNoteTimerRef.current = setInterval(() => {
        setVoiceNoteDuration(prev => prev + 1)
      }, 1000)
    } catch (e) {
      console.error('Error starting voice note recording:', e)
      showToast('Erro de Microfone', 'Não foi possível acessar o microfone para gravar a mensagem de voz.', 'info')
    }
  }, [user, selectedChannel, selectedDMUserId, supabase, showToast, postChannelMessage, sendDirectMessage])

  const stopVoiceNoteRecording = useCallback(() => {
    if (voiceNoteTimerRef.current) {
      clearInterval(voiceNoteTimerRef.current)
      voiceNoteTimerRef.current = null
    }
    if (voiceNoteRecorderRef.current && voiceNoteRecorderRef.current.state !== 'inactive') {
      voiceNoteRecorderRef.current.stop()
      voiceNoteRecorderRef.current = null
    }
    setIsVoiceNoteRecording(false)
  }, [])

  const cancelVoiceNoteRecording = useCallback(() => {
    if (voiceNoteTimerRef.current) {
      clearInterval(voiceNoteTimerRef.current)
      voiceNoteTimerRef.current = null
    }
    if (voiceNoteRecorderRef.current) {
      voiceNoteChunksRef.current = []
      voiceNoteRecorderRef.current.stop()
      voiceNoteRecorderRef.current = null
    }
    setIsVoiceNoteRecording(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (voiceNoteTimerRef.current) clearInterval(voiceNoteTimerRef.current)
      if (voiceNoteAudioRef.current) {
        voiceNoteAudioRef.current.pause()
      }
    }
  }, [])

  return {
    isVoiceNoteRecording,
    setIsVoiceNoteRecording,
    voiceNoteDuration,
    setVoiceNoteDuration,
    voiceNoteTarget,
    setVoiceNoteTarget,
    voiceNotePlaySpeed,
    setVoiceNotePlaySpeed,
    voiceNoteAudioRef,
    activePlayingVoiceNote,
    setActivePlayingVoiceNote,
    handleToggleVoicePlay,
    handleChangeVoiceSpeed,
    startVoiceNoteRecording,
    stopVoiceNoteRecording,
    cancelVoiceNoteRecording
  }
}
