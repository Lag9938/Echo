import { useState, useCallback } from 'react'
import type { SavedMessageItem, Channel, Page } from '../types'

export interface UseEchoSavedMessagesOptions {
  userId: string
  profileDisplayName: string
  profileAvatarUrl?: string | null
  showToast: (title: string, message: string, type?: any) => void
  spaceChannels: Record<string, Channel[]>
  setExpandedSpace: (spaceId: string) => void
  setSelectedChannel: (channel: Channel) => void
  setSelectedDMUserId: (userId: string) => void
  setPage: (page: Page) => void
}

export function useEchoSavedMessages({
  userId,
  profileDisplayName,
  profileAvatarUrl,
  showToast,
  spaceChannels,
  setExpandedSpace,
  setSelectedChannel,
  setSelectedDMUserId,
  setPage
}: UseEchoSavedMessagesOptions) {
  // Saved Messages State & Handlers
  const [savedMessages, setSavedMessages] = useState<SavedMessageItem[]>(() => {
    try {
      const raw = localStorage.getItem(`echo-saved-messages-${userId}`) || localStorage.getItem('echo-saved-messages')
      if (raw) return JSON.parse(raw)
    } catch (e) {}
    return []
  })
  const [showSavedMessagesModal, setShowSavedMessagesModal] = useState(false)

  const isMessageSaved = useCallback((msgId: string) => {
    return savedMessages.some(m => m.id === msgId)
  }, [savedMessages])

  const toggleSaveMessage = useCallback((
    msg: any,
    sourceType: 'channel' | 'dm',
    meta: { sourceName: string; spaceId?: string; channelId?: string; dmUserId?: string }
  ) => {
    setSavedMessages(prev => {
      const exists = prev.some(m => m.id === msg.id)
      let next: SavedMessageItem[]
      if (exists) {
        next = prev.filter(m => m.id !== msg.id)
        showToast('Estrela removida', 'Mensagem removida dos seus itens salvos.', 'info')
      } else {
        const newItem: SavedMessageItem = {
          id: msg.id,
          sourceType,
          sourceName: meta.sourceName,
          spaceId: meta.spaceId,
          channelId: meta.channelId,
          dmUserId: meta.dmUserId,
          authorName: msg.profile?.display_name || (sourceType === 'dm' ? (msg.sender_id === userId ? profileDisplayName : meta.sourceName.replace('@', '')) : 'Membro'),
          authorAvatar: msg.profile?.avatar_url || (sourceType === 'dm' && msg.sender_id === userId ? profileAvatarUrl : undefined),
          authorId: msg.author_id || msg.sender_id,
          body: msg.body || '',
          attachmentUrl: msg.attachment_url,
          attachmentType: msg.attachment_type,
          createdAt: msg.created_at || new Date().toISOString(),
          savedAt: Date.now()
        }
        next = [newItem, ...prev]
        showToast('Mensagem salva ⭐', 'Item guardado na sua aba privada de favoritos.', 'info')
      }
      try {
        localStorage.setItem(`echo-saved-messages-${userId}`, JSON.stringify(next))
        localStorage.setItem('echo-saved-messages', JSON.stringify(next))
      } catch (e) {}
      return next
    })
  }, [userId, profileDisplayName, profileAvatarUrl, showToast])

  const handleJumpToSavedMessage = useCallback((item: SavedMessageItem) => {
    setShowSavedMessagesModal(false)
    if (item.sourceType === 'channel' && item.spaceId && item.channelId) {
      setExpandedSpace(item.spaceId)
      const ch = (spaceChannels[item.spaceId] || []).find(c => c.id === item.channelId)
      if (ch) {
        setSelectedChannel(ch)
      }
      setPage('Servidores')
    } else if (item.sourceType === 'dm' && item.dmUserId) {
      setSelectedDMUserId(item.dmUserId)
      setPage('Amigos')
    }
  }, [spaceChannels, setExpandedSpace, setSelectedChannel, setSelectedDMUserId, setPage])

  return {
    savedMessages,
    setSavedMessages,
    showSavedMessagesModal,
    setShowSavedMessagesModal,
    isMessageSaved,
    toggleSaveMessage,
    handleJumpToSavedMessage
  }
}
