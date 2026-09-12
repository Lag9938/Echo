import { useState, useRef, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import type { DirectMessage, FriendshipRequest, Page } from '../types'

export interface UseEchoDirectMessagesOptions {
  user: User
  profileDisplayName: string
  displayName: string
  friendships: FriendshipRequest[]
  spaceMembers: any[]
  socialChannelRef: React.MutableRefObject<any>
  sfxVolume: number
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  triggerDesktopNotification: (title: string, body: string) => void
  setError: (err: string) => void
  setPage: (page: Page) => void
  setInspectedMember: (m: any) => void
  setHoveredMemberPopover: (p: any) => void
  setKnownProfiles: React.Dispatch<React.SetStateAction<Record<string, any>>>
  playDmNotificationSound: (volume: number) => void
  supabase: any
}

export function useEchoDirectMessages({
  user,
  profileDisplayName,
  displayName,
  friendships,
  spaceMembers,
  socialChannelRef,
  sfxVolume,
  showToast,
  triggerDesktopNotification,
  setError,
  setPage,
  setInspectedMember,
  setHoveredMemberPopover,
  setKnownProfiles,
  playDmNotificationSound,
  supabase
}: UseEchoDirectMessagesOptions) {
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [selectedDMUserId, setSelectedDMUserId] = useState<string | null>(null)
  const selectedDMUserIdRef = useRef<string | null>(null)
  const [unreadDMs, setUnreadDMs] = useState<Record<string, number>>({})
  const [dmDraft, setDmDraft] = useState('')
  const [isFriendTyping, setIsFriendTyping] = useState(false)
  const dmTypingTimeoutRef = useRef<any>(null)
  const lastDMTypingSentRef = useRef<number>(0)

  const [recentDMUserIds, setRecentDMUserIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('echo_recent_dms')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    selectedDMUserIdRef.current = selectedDMUserId
    setIsFriendTyping(false)
    if (dmTypingTimeoutRef.current) {
      clearTimeout(dmTypingTimeoutRef.current)
    }
  }, [selectedDMUserId])

  useEffect(() => {
    try {
      localStorage.setItem('echo_recent_dms', JSON.stringify(recentDMUserIds))
    } catch {}
  }, [recentDMUserIds])

  const loadDirectMessages = useCallback(async (friendId: string) => {
    if (!supabase || !user) return
    const { data, error: queryError } = await supabase
      .from('direct_messages')
      .select('id, sender_id, receiver_id, body, attachment_url, attachment_type, created_at')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at')

    if (queryError) {
      setError(queryError.message)
      return
    }
    setDirectMessages((data ?? []) as DirectMessage[])
  }, [supabase, user, setError])

  const sendDirectMessage = useCallback(async (body: string, attachmentUrl?: string, attachmentType?: string) => {
    if (!supabase || !selectedDMUserId || !user) return
    const targetFriendId = selectedDMUserId
    const { error: sendError } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: user.id,
        receiver_id: targetFriendId,
        body,
        attachment_url: attachmentUrl,
        attachment_type: attachmentType
      })

    if (sendError) {
      setError(sendError.message)
    } else {
      setDmDraft('')

      socialChannelRef.current?.send({
        type: 'broadcast',
        event: 'dm-event',
        payload: {
          receiverId: targetFriendId,
          senderId: user.id,
          senderName: profileDisplayName || displayName || 'Amigo',
          body: attachmentUrl ? `📎 [Anexo] ${body}` : body
        }
      })

      await loadDirectMessages(targetFriendId)
    }
  }, [supabase, selectedDMUserId, user, setError, socialChannelRef, profileDisplayName, displayName, loadDirectMessages])

  const handleDeleteDM = useCallback(async (messageId: string) => {
    if (!supabase || !user) return
    const msg = directMessages.find(m => m.id === messageId)
    if (!msg) return
    if (msg.sender_id !== user.id) {
      showToast('Permissão Negada', 'Você só pode excluir mensagens que você enviou.', 'info')
      return
    }

    try {
      const { error: delErr } = await supabase.from('direct_messages').delete().eq('id', messageId)
      if (delErr) {
        console.error('Error deleting direct message:', delErr)
        showToast('Erro ao Excluir', delErr.message, 'info')
        return
      }

      setDirectMessages(prev => prev.filter(m => m.id !== messageId))

      socialChannelRef.current?.send({
        type: 'broadcast',
        event: 'dm-delete',
        payload: { id: messageId, receiverId: selectedDMUserId, senderId: user.id }
      })

      showToast('Mensagem Excluída', 'Mensagem privada removida.', 'info')
    } catch (err: any) {
      console.error('Failed to delete direct message:', err)
      showToast('Erro', 'Não foi possível excluir a mensagem.', 'info')
    }
  }, [supabase, user, directMessages, showToast, socialChannelRef, selectedDMUserId])

  const handleOpenDirectChat = useCallback((targetId: string, targetProfile?: { id: string; display_name: string; avatar_url?: string }) => {
    setInspectedMember(null)
    setHoveredMemberPopover(null)
    if (targetProfile) {
      setKnownProfiles(prev => ({ ...prev, [targetId]: targetProfile }))
    } else {
      const found = spaceMembers.find((m: any) => (m.user?.id || m.id) === targetId)
      if (found) {
        setKnownProfiles(prev => ({
          ...prev,
          [targetId]: {
            id: targetId,
            display_name: found.user?.display_name || found.name || found.display_name || 'Membro',
            avatar_url: found.user?.avatar_url || found.avatar_url
          }
        }))
      }
    }
    setRecentDMUserIds(prev => Array.from(new Set([targetId, ...prev])))
    setPage('Amigos')
    setSelectedDMUserId(targetId)
    setUnreadDMs(prev => {
      const next = { ...prev }
      delete next[targetId]
      return next
    })
    loadDirectMessages(targetId)
  }, [setInspectedMember, setHoveredMemberPopover, setKnownProfiles, spaceMembers, setPage, loadDirectMessages])

  const handleNewDMPostgresChanges = useCallback((payload: any) => {
    const newMsg = payload.new as DirectMessage
    if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
      if (newMsg.receiver_id === user.id && !document.hasFocus()) {
        const friendObj = friendships.find(f => f.user.id === newMsg.sender_id)
        const senderName = friendObj?.user.display_name || 'Um amigo'
        triggerDesktopNotification(`Mensagem de ${senderName}`, newMsg.body || '')
      }

      if (selectedDMUserIdRef.current && (newMsg.sender_id === selectedDMUserIdRef.current || newMsg.receiver_id === selectedDMUserIdRef.current)) {
        loadDirectMessages(selectedDMUserIdRef.current)
      } else if (newMsg.receiver_id === user.id) {
        playDmNotificationSound(sfxVolume)
        setUnreadDMs(prev => {
          const currentCount = prev[newMsg.sender_id] || 0
          return { ...prev, [newMsg.sender_id]: currentCount + 1 }
        })
        const friendObj = friendships.find(f => f.user.id === newMsg.sender_id)
        const senderName = friendObj?.user.display_name || 'Um amigo'
        showToast(`Nova mensagem de ${senderName}`, newMsg.body.substring(0, 50) + (newMsg.body.length > 50 ? '...' : ''), 'message')
      }
    }
  }, [user.id, friendships, triggerDesktopNotification, loadDirectMessages, playDmNotificationSound, sfxVolume, showToast])

  const handleDMBroadcast = useCallback((data: any) => {
    if (!data) return
    if (data.receiverId === user.id) {
      playDmNotificationSound(sfxVolume)
      if (selectedDMUserIdRef.current === data.senderId) {
        loadDirectMessages(data.senderId)
      } else {
        setUnreadDMs(prev => ({ ...prev, [data.senderId]: (prev[data.senderId] || 0) + 1 }))
        showToast(`Mensagem de ${data.senderName}`, data.body.slice(0, 50), 'message')
        if (!document.hasFocus()) {
          triggerDesktopNotification(`Mensagem de ${data.senderName}`, data.body)
        }
      }
    }
  }, [user.id, playDmNotificationSound, sfxVolume, loadDirectMessages, showToast, triggerDesktopNotification])

  const handleDMDeleteBroadcast = useCallback((data: any) => {
    if (!data) return
    if (data.receiverId === user.id) {
      setDirectMessages(prev => prev.filter(m => m.id !== data.id))
    }
  }, [user.id])

  const notifyDMTyping = useCallback((targetFriendId: string) => {
    if (!socialChannelRef.current || !user || !targetFriendId) return
    const now = Date.now()
    if (now - lastDMTypingSentRef.current < 2000) return
    lastDMTypingSentRef.current = now

    socialChannelRef.current.send({
      type: 'broadcast',
      event: 'dm-typing',
      payload: {
        senderId: user.id,
        receiverId: targetFriendId
      }
    })
  }, [socialChannelRef, user])

  const handleDMTypingBroadcast = useCallback((data: any) => {
    if (!data) return
    if (data.receiverId === user.id && selectedDMUserIdRef.current === data.senderId) {
      setIsFriendTyping(true)
      if (dmTypingTimeoutRef.current) clearTimeout(dmTypingTimeoutRef.current)
      dmTypingTimeoutRef.current = setTimeout(() => {
        setIsFriendTyping(false)
      }, 3500)
    }
  }, [user.id])

  return {
    directMessages,
    setDirectMessages,
    selectedDMUserId,
    setSelectedDMUserId,
    selectedDMUserIdRef,
    unreadDMs,
    setUnreadDMs,
    recentDMUserIds,
    setRecentDMUserIds,
    dmDraft,
    setDmDraft,
    isFriendTyping,
    notifyDMTyping,
    loadDirectMessages,
    sendDirectMessage,
    handleDeleteDM,
    handleOpenDirectChat,
    handleNewDMPostgresChanges,
    handleDMBroadcast,
    handleDMDeleteBroadcast,
    handleDMTypingBroadcast
  }
}
