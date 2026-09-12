import { useState, useEffect, useRef } from 'react'
import type { Message, PinnedMessage } from '../types'

export interface UseEchoPinnedMessagesOptions {
  profileDisplayName: string
  profileId: string
  supabase: any
  addAuditLog: (spaceId: string, action: string) => void
  showToast: (title: string, message: string, type?: any) => void
}

export function useEchoPinnedMessages({
  profileDisplayName,
  profileId,
  supabase,
  addAuditLog,
  showToast
}: UseEchoPinnedMessagesOptions) {
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, PinnedMessage[]>>({})
  const [showPinnedMessagesPanel, setShowPinnedMessagesPanel] = useState(false)
  const pinnedSubRef = useRef<any>(null)

  async function loadPinnedMessages(channelId: string) {
    // 1. Carrega cache local imediatamente (sem flicker)
    try {
      const cached = localStorage.getItem(`echo-pinned-messages-${channelId}`)
      if (cached) {
        const list: PinnedMessage[] = JSON.parse(cached)
        setPinnedMessages(prev => ({ ...prev, [channelId]: list }))
      }
    } catch {}

    // 2. Busca do banco de dados (fonte de verdade compartilhada)
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('pinned_at', { ascending: false })

      if (!error && data) {
        const list: PinnedMessage[] = data.map((row: any) => ({
          id: row.id,
          channel_id: row.channel_id,
          message_id: row.message_id,
          body: row.body,
          author_name: row.author_name,
          author_avatar: row.author_avatar,
          created_at: row.pinned_at,
          pinned_at: row.pinned_at,
          pinned_by_name: row.pinned_by_name,
          attachment_url: row.attachment_url,
          attachment_type: row.attachment_type
        }))
        setPinnedMessages(prev => ({ ...prev, [channelId]: list }))
        try {
          localStorage.setItem(`echo-pinned-messages-${channelId}`, JSON.stringify(list))
        } catch {}
      }
    } catch (err) {
      console.warn('loadPinnedMessages error:', err)
    }

    // 3. Subscrição realtime para sincronizar com outros membros
    if (pinnedSubRef.current) {
      supabase.removeChannel(pinnedSubRef.current)
    }
    pinnedSubRef.current = supabase
      .channel(`pinned-messages-${channelId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pinned_messages',
        filter: `channel_id=eq.${channelId}`
      }, () => {
        // Recarrega ao detectar qualquer mudança
        loadPinnedMessagesQuiet(channelId)
      })
      .subscribe()
  }

  async function loadPinnedMessagesQuiet(channelId: string) {
    if (!supabase) return
    try {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('pinned_at', { ascending: false })

      if (!error && data) {
        const list: PinnedMessage[] = data.map((row: any) => ({
          id: row.id,
          channel_id: row.channel_id,
          message_id: row.message_id,
          body: row.body,
          author_name: row.author_name,
          author_avatar: row.author_avatar,
          created_at: row.pinned_at,
          pinned_at: row.pinned_at,
          pinned_by_name: row.pinned_by_name,
          attachment_url: row.attachment_url,
          attachment_type: row.attachment_type
        }))
        setPinnedMessages(prev => ({ ...prev, [channelId]: list }))
        try {
          localStorage.setItem(`echo-pinned-messages-${channelId}`, JSON.stringify(list))
        } catch {}
      }
    } catch {}
  }

  async function togglePinMessage(msg: Message, spaceId: string, channelId: string) {
    const currentList = pinnedMessages[channelId] || []
    const isAlreadyPinned = currentList.some(p => p.message_id === msg.id)

    if (isAlreadyPinned) {
      const updated = currentList.filter(p => p.message_id !== msg.id)
      setPinnedMessages(prev => ({ ...prev, [channelId]: updated }))
      try {
        localStorage.setItem(`echo-pinned-messages-${channelId}`, JSON.stringify(updated))
      } catch {}

      if (supabase) {
        const { error } = await supabase
          .from('pinned_messages')
          .delete()
          .eq('channel_id', channelId)
          .eq('message_id', msg.id)
        if (error) console.warn('unpin error:', error)
      }
      addAuditLog(spaceId, `Desafixou uma mensagem no canal`)
      showToast('Mensagem Desafixada', 'A mensagem foi removida dos fixados.', 'info')
    } else {
      // Fixar
      const newPin: PinnedMessage = {
        id: `pin-${Date.now()}`,
        channel_id: channelId,
        message_id: msg.id,
        body: msg.body,
        author_name: msg.profile?.display_name || 'Membro',
        author_avatar: msg.profile?.avatar_url,
        created_at: msg.created_at,
        pinned_at: new Date().toISOString(),
        pinned_by_name: profileDisplayName,
        attachment_url: msg.attachment_url,
        attachment_type: msg.attachment_type
      }
      const updated = [newPin, ...currentList]
      setPinnedMessages(prev => ({ ...prev, [channelId]: updated }))
      try {
        localStorage.setItem(`echo-pinned-messages-${channelId}`, JSON.stringify(updated))
      } catch {}

      if (supabase) {
        const { error } = await supabase.from('pinned_messages').insert({
          channel_id: channelId,
          message_id: msg.id,
          body: msg.body,
          author_name: msg.profile?.display_name || 'Membro',
          author_avatar: msg.profile?.avatar_url || null,
          pinned_by_name: profileDisplayName,
          pinned_by_id: profileId || null,
          attachment_url: msg.attachment_url || null,
          attachment_type: msg.attachment_type || null
        })
        if (error) console.warn('pin error:', error)
      }
      addAuditLog(spaceId, `Fixou uma mensagem de ${msg.profile?.display_name || 'Membro'}`)
      showToast('Mensagem Fixada!', 'A mensagem foi adicionada aos fixados do canal.', 'info')
    }
  }

  // Cleanup da subscrição ao desmontar
  useEffect(() => {
    return () => {
      if (pinnedSubRef.current && supabase) {
        supabase.removeChannel(pinnedSubRef.current)
      }
    }
  }, [supabase])

  return {
    pinnedMessages,
    setPinnedMessages,
    showPinnedMessagesPanel,
    setShowPinnedMessagesPanel,
    loadPinnedMessages,
    togglePinMessage
  }
}
