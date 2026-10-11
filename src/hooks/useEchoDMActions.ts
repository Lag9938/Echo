import { useCallback, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from 'react'
import { supabase } from '../lib/supabase'
import { uploadAttachment } from '../lib/attachmentUpload'
import type { DirectMessage, Page } from '../types'

export interface UseEchoDMActionsOptions {
  userId: string
  dmDraft: string
  selectedDMUserIdRef: MutableRefObject<string | null>
  setSelectedDMUserId: (userId: string | null) => void
  setUnreadDMs: Dispatch<SetStateAction<Record<string, number>>>
  setDirectMessages: (messages: DirectMessage[]) => void
  setRecentDMUserIds: Dispatch<SetStateAction<string[]>>
  loadDirectMessages: (friendId: string) => unknown
  sendDirectMessage: (body: string, attachmentUrl?: string, attachmentType?: string) => unknown
  setPage: (page: Page) => void
  setIsUploading: (uploading: boolean) => void
  setError: (message: string) => void
  startVoiceNoteRecording: (target?: 'channel' | 'dm') => unknown
  toggleSaveMessage: (msg: any, type: 'channel' | 'dm', extra?: any) => void
  sendGroupMessage?: (groupId: string, body: string, attachmentUrl?: string, attachmentType?: string) => unknown
  showToast?: (title: string, message: string, type?: any) => void
}

/**
 * Ações da tela de mensagens diretas (abrir e fechar conversa, enviar texto, arquivo e figurinha, salvar
 * mensagem). Só costura o que os outros hooks já fazem; o estado das DMs fica em useEchoDirectMessages.
 */
export function useEchoDMActions({
  userId,
  dmDraft,
  selectedDMUserIdRef,
  setSelectedDMUserId,
  setUnreadDMs,
  setDirectMessages,
  setRecentDMUserIds,
  loadDirectMessages,
  sendDirectMessage,
  setPage,
  setIsUploading,
  setError,
  startVoiceNoteRecording,
  toggleSaveMessage,
  sendGroupMessage,
  showToast
}: UseEchoDMActionsOptions) {
  const handleOpenDM = useCallback((friendId: string) => {
    setSelectedDMUserId(friendId)
    setUnreadDMs(prev => {
      if (!prev[friendId]) return prev
      const next = { ...prev }
      delete next[friendId]
      return next
    })
    loadDirectMessages(friendId)
  }, [setSelectedDMUserId, setUnreadDMs, loadDirectMessages])

  const handleOpenDMAndNavigate = useCallback((targetUserId: string) => {
    handleOpenDM(targetUserId)
    setPage('Amigos')
  }, [handleOpenDM, setPage])

  const handleCloseDM = useCallback(() => {
    setSelectedDMUserId(null)
    setDirectMessages([])
  }, [setSelectedDMUserId, setDirectMessages])

  const handleSendDMForm = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = dmDraft.trim()
    if (!trimmed) return
    await sendDirectMessage(trimmed)
  }, [dmDraft, sendDirectMessage])

  const handleUploadDMFile = useCallback(async (file: File, caption?: string) => {
    if (!supabase) return
    setIsUploading(true)
    try {
      // A pasta é a do próprio usuário: é o que a regra de envio do banco exige (migração 13)
      const result = await uploadAttachment(supabase, `dm/${userId}`, file)
      if (!result.ok) {
        if (showToast) showToast('Arquivo não enviado', result.reason, 'info')
        else setError(result.reason)
        return
      }
      const messageText = caption && caption.trim() ? caption.trim() : (file.name || 'Imagem')
      await sendDirectMessage(messageText, result.url, result.attachmentType)
    } finally {
      setIsUploading(false)
    }
  }, [userId, sendDirectMessage, setError, setIsUploading, showToast])

  // Grupos: o arquivo também vai para a pasta pessoal de quem envia
  const handleUploadGroupFile = useCallback(async (groupId: string, file: File) => {
    if (!supabase || !sendGroupMessage) return
    setIsUploading(true)
    try {
      const result = await uploadAttachment(supabase, `dm/${userId}`, file)
      if (!result.ok) {
        if (showToast) showToast('Arquivo não enviado', result.reason, 'info')
        else setError(result.reason)
        return
      }
      await sendGroupMessage(groupId, file.name || 'Arquivo', result.url, result.attachmentType)
    } finally {
      setIsUploading(false)
    }
  }, [userId, sendGroupMessage, setError, setIsUploading, showToast])

  const handleRemoveRecentDM = useCallback((dmId: string) => {
    setRecentDMUserIds(prev => prev.filter(id => id !== dmId))
    if (selectedDMUserIdRef.current === dmId) {
      setSelectedDMUserId(null)
      setDirectMessages([])
    }
  }, [setRecentDMUserIds, setSelectedDMUserId, setDirectMessages, selectedDMUserIdRef])

  const handleStartVoiceNoteDM = useCallback(() => {
    startVoiceNoteRecording('dm')
  }, [startVoiceNoteRecording])

  const handleToggleSaveDM = useCallback((msg: any, targetUser: any) => {
    toggleSaveMessage(msg, 'dm', {
      sourceName: `@${targetUser.display_name}`,
      dmUserId: targetUser.id
    })
  }, [toggleSaveMessage])

  const handleSendDMSticker = useCallback((url: string, name?: string) => {
    sendDirectMessage(name ? `[Sticker: ${name}]` : 'Sticker', url, 'sticker')
  }, [sendDirectMessage])

  return {
    handleOpenDM,
    handleOpenDMAndNavigate,
    handleCloseDM,
    handleSendDMForm,
    handleUploadDMFile,
    handleUploadGroupFile,
    handleRemoveRecentDM,
    handleStartVoiceNoteDM,
    handleToggleSaveDM,
    handleSendDMSticker
  }
}
