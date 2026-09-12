import { useState, useEffect, useCallback } from 'react'
import type { SavedMessageItem, Channel, Page } from '../types'

export interface UseEchoSavedMessagesOptions {
  userId: string
  profileDisplayName: string
  profileAvatarUrl?: string | null
  supabase: any
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
  supabase,
  showToast,
  spaceChannels,
  setExpandedSpace,
  setSelectedChannel,
  setSelectedDMUserId,
  setPage
}: UseEchoSavedMessagesOptions) {
  // Inicia com cache local para renderização imediata
  const [savedMessages, setSavedMessages] = useState<SavedMessageItem[]>(() => {
    try {
      const raw = localStorage.getItem(`echo-saved-messages-${userId}`) || localStorage.getItem('echo-saved-messages')
      if (raw) return JSON.parse(raw)
    } catch {}
    return []
  })
  const [showSavedMessagesModal, setShowSavedMessagesModal] = useState(false)

  // Carrega do banco ao iniciar (fonte de verdade sincronizada)
  useEffect(() => {
    if (!supabase || !userId) return
    supabase
      .from('saved_messages')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .then(({ data, error }: any) => {
        if (!error && data && data.length > 0) {
          const items: SavedMessageItem[] = data.map((row: any) => ({
            id: row.message_id,
            sourceType: row.source_type as 'channel' | 'dm',
            sourceName: row.source_name,
            spaceId: row.space_id,
            channelId: row.channel_id,
            dmUserId: row.dm_user_id,
            authorName: row.author_name,
            authorAvatar: row.author_avatar,
            authorId: row.author_id,
            body: row.body,
            attachmentUrl: row.attachment_url,
            attachmentType: row.attachment_type,
            createdAt: row.created_at,
            savedAt: new Date(row.saved_at).getTime()
          }))
          setSavedMessages(items)
          try {
            localStorage.setItem(`echo-saved-messages-${userId}`, JSON.stringify(items))
            localStorage.setItem('echo-saved-messages', JSON.stringify(items))
          } catch {}
        }
      })
  }, [supabase, userId])

  const isMessageSaved = useCallback((msgId: string) => {
    return savedMessages.some(m => m.id === msgId)
  }, [savedMessages])

  const toggleSaveMessage = useCallback((
    msg: any,
    sourceType: 'channel' | 'dm',
    meta: { sourceName: string; spaceId?: string; channelId?: string; dmUserId?: string }
  ) => {
    const exists = savedMessages.some(m => m.id === msg.id)

    if (exists) {
      // Remover dos salvos
      const next = savedMessages.filter(m => m.id !== msg.id)
      setSavedMessages(next)
      try {
        localStorage.setItem(`echo-saved-messages-${userId}`, JSON.stringify(next))
        localStorage.setItem('echo-saved-messages', JSON.stringify(next))
      } catch {}

      if (supabase) {
        supabase.from('saved_messages')
          .delete()
          .eq('user_id', userId)
          .eq('message_id', msg.id)
          .then(({ error }: any) => { if (error) console.warn('unsave error:', error) })
      }
      showToast('Estrela removida', 'Mensagem removida dos seus itens salvos.', 'info')
    } else {
      // Adicionar aos salvos
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
      const next = [newItem, ...savedMessages]
      setSavedMessages(next)
      try {
        localStorage.setItem(`echo-saved-messages-${userId}`, JSON.stringify(next))
        localStorage.setItem('echo-saved-messages', JSON.stringify(next))
      } catch {}

      if (supabase) {
        supabase.from('saved_messages').insert({
          user_id: userId,
          message_id: msg.id,
          source_type: sourceType,
          source_name: meta.sourceName,
          space_id: meta.spaceId || null,
          channel_id: meta.channelId || null,
          dm_user_id: meta.dmUserId || null,
          author_name: newItem.authorName,
          author_avatar: newItem.authorAvatar || null,
          author_id: newItem.authorId || null,
          body: newItem.body,
          attachment_url: newItem.attachmentUrl || null,
          attachment_type: newItem.attachmentType || null,
          created_at: newItem.createdAt
        }).then(({ error }: any) => { if (error) console.warn('save error:', error) })
      }
      showToast('Mensagem salva ⭐', 'Item guardado na sua aba privada de favoritos.', 'info')
    }
  }, [userId, profileDisplayName, profileAvatarUrl, savedMessages, supabase, showToast])

  const handleJumpToSavedMessage = useCallback((item: SavedMessageItem) => {
    setShowSavedMessagesModal(false)
    if (item.sourceType === 'channel' && item.spaceId && item.channelId) {
      setExpandedSpace(item.spaceId)
      const ch = (spaceChannels[item.spaceId] || []).find(c => c.id === item.channelId)
      if (ch) setSelectedChannel(ch)
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
