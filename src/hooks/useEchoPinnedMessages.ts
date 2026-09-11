import { useState } from 'react'
import type { Message, PinnedMessage } from '../types'

export interface UseEchoPinnedMessagesOptions {
  profileDisplayName: string
  addAuditLog: (spaceId: string, action: string) => void
  showToast: (title: string, message: string, type?: any) => void
}

export function useEchoPinnedMessages({
  profileDisplayName,
  addAuditLog,
  showToast
}: UseEchoPinnedMessagesOptions) {
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, PinnedMessage[]>>({})
  const [showPinnedMessagesPanel, setShowPinnedMessagesPanel] = useState(false)

  function loadPinnedMessages(channelId: string) {
    try {
      const saved = localStorage.getItem(`echo-pinned-messages-${channelId}`)
      const list: PinnedMessage[] = saved ? JSON.parse(saved) : []
      setPinnedMessages(prev => ({ ...prev, [channelId]: list }))
    } catch {
      setPinnedMessages(prev => ({ ...prev, [channelId]: [] }))
    }
  }

  function togglePinMessage(msg: Message, spaceId: string, channelId: string) {
    const currentList = pinnedMessages[channelId] || []
    const isAlreadyPinned = currentList.some(p => p.message_id === msg.id)
    let updated: PinnedMessage[] = []
    if (isAlreadyPinned) {
      updated = currentList.filter(p => p.message_id !== msg.id)
      addAuditLog(spaceId, `Desafixou uma mensagem no canal`)
      showToast("Mensagem Desafixada", "A mensagem foi removida dos fixados.", "info")
    } else {
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
      updated = [newPin, ...currentList]
      addAuditLog(spaceId, `Fixou uma mensagem de ${msg.profile?.display_name || 'Membro'}`)
      showToast("Mensagem Fixada!", "A mensagem foi adicionada aos fixados do canal.", "info")
    }
    setPinnedMessages(prev => ({ ...prev, [channelId]: updated }))
    localStorage.setItem(`echo-pinned-messages-${channelId}`, JSON.stringify(updated))
  }

  return {
    pinnedMessages,
    setPinnedMessages,
    showPinnedMessagesPanel,
    setShowPinnedMessagesPanel,
    loadPinnedMessages,
    togglePinMessage
  }
}
