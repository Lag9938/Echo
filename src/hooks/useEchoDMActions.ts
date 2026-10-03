import { useCallback, type Dispatch, type FormEvent, type MutableRefObject, type SetStateAction } from 'react'
import { supabase } from '../lib/supabase'
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
  toggleSaveMessage
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
    const rawExt = file.name && file.name.includes('.') ? file.name.split('.').pop() : (file.type.split('/')[1] || 'png')
    const ext = (rawExt || 'png').replace(/[^a-zA-Z0-9]/g, '')
    // O caminho fica dentro da pasta do próprio usuário: é o que a regra de envio do banco exige (migração 13)
    const path = `dm/${userId}/${Date.now()}-${crypto.randomUUID()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
    if (uploadError) { setError(uploadError.message); setIsUploading(false); return }
    const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
    const fileType = file.type.startsWith('image/') ? 'image' : 'file'
    const messageText = caption && caption.trim() ? caption.trim() : (dmDraft.trim() || file.name || 'Imagem')
    await sendDirectMessage(messageText, urlData.publicUrl, fileType)
    setIsUploading(false)
  }, [userId, dmDraft, sendDirectMessage, setError, setIsUploading])

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
    handleRemoveRecentDM,
    handleStartVoiceNoteDM,
    handleToggleSaveDM,
    handleSendDMSticker
  }
}
