import { useState, useRef, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import type { GroupChat, GroupChatMember, GroupMessage } from '../types'

export interface UseEchoGroupChatsOptions {
  user: User
  profileDisplayName: string
  supabase: any
  socialChannelRef: React.MutableRefObject<any>
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend', onClickOrData?: any) => void
  triggerDesktopNotification: (title: string, body: string, data?: any) => void
  setKnownProfiles: React.Dispatch<React.SetStateAction<Record<string, any>>>
  playDmNotificationSound: (volume: number) => void
  sfxVolume: number
}

export function useEchoGroupChats({
  user,
  profileDisplayName,
  supabase,
  socialChannelRef,
  showToast,
  triggerDesktopNotification,
  setKnownProfiles,
  playDmNotificationSound,
  sfxVolume
}: UseEchoGroupChatsOptions) {
  const [groupChats, setGroupChats] = useState<GroupChat[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const selectedGroupIdRef = useRef<string | null>(null)
  const [groupMessages, setGroupMessages] = useState<Record<string, GroupMessage[]>>({})
  const [groupDraft, setGroupDraft] = useState('')
  const [groupTypingUsers, setGroupTypingUsers] = useState<Record<string, string[]>>({})
  const [unreadGroups, setUnreadGroups] = useState<Record<string, number>>({})
  const groupTypingTimeoutsRef = useRef<Record<string, any>>({})

  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId
  }, [selectedGroupId])

  // ── LOAD GROUP CHATS ──
  const loadGroupChats = useCallback(async () => {
    try {
      // Get all group memberships for this user
      const { data: memberships, error } = await supabase
        .from('group_chat_members')
        .select('group_chat_id, joined_at')
        .eq('user_id', user.id)

      if (error) throw error
      if (!memberships || memberships.length === 0) {
        setGroupChats([])
        return
      }

      const groupIds = memberships.map((m: any) => m.group_chat_id)

      // Fetch group details
      const { data: groups, error: gErr } = await supabase
        .from('group_chats')
        .select('id, name, creator_id, avatar_url, created_at')
        .in('id', groupIds)
        .order('created_at', { ascending: false })

      if (gErr) throw gErr

      // Fetch members for each group
      const { data: allMembers, error: mErr } = await supabase
        .from('group_chat_members')
        .select('id, group_chat_id, user_id, joined_at')
        .in('group_chat_id', groupIds)

      if (mErr) throw mErr

      // Fetch profiles for all member user_ids
      const allUserIds = [...new Set((allMembers || []).map((m: any) => m.user_id as string))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, avatar_decoration')
        .in('id', allUserIds)

      const profileMap: Record<string, any> = {}
      ;(profiles || []).forEach((p: any) => {
        profileMap[p.id] = p
        setKnownProfiles(prev => ({ ...prev, [p.id]: p }))
      })

      // Attach members to groups
      const membersByGroup: Record<string, GroupChatMember[]> = {}
      ;(allMembers || []).forEach((m: any) => {
        if (!membersByGroup[m.group_chat_id]) membersByGroup[m.group_chat_id] = []
        membersByGroup[m.group_chat_id].push({ ...m, profile: profileMap[m.user_id] })
      })

      const enriched: GroupChat[] = (groups || []).map((g: any) => ({
        ...g,
        members: membersByGroup[g.id] || []
      }))

      setGroupChats(enriched)
    } catch (err) {
      console.error('[GroupChats] Failed to load:', err)
    }
  }, [user.id, supabase, setKnownProfiles])

  // ── LOAD MESSAGES FOR A GROUP ──
  const loadGroupMessages = useCallback(async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('group_messages')
        .select('id, group_chat_id, sender_id, body, attachment_url, attachment_type, created_at')
        .eq('group_chat_id', groupId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error

      const msgs: GroupMessage[] = (data || []).reverse()

      // Enrich with profiles
      const senderIds = [...new Set(msgs.map(m => m.sender_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', senderIds)

      const profileMap: Record<string, any> = {}
      ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })

      const enriched = msgs.map(m => ({ ...m, profile: profileMap[m.sender_id] }))

      setGroupMessages(prev => ({ ...prev, [groupId]: enriched }))

      // Clear unread
      setUnreadGroups(prev => ({ ...prev, [groupId]: 0 }))
    } catch (err) {
      console.error('[GroupChats] Failed to load messages:', err)
    }
  }, [supabase])

  // ── SEND MESSAGE ──
  const sendGroupMessage = useCallback(async (
    groupId: string,
    body: string,
    attachmentUrl?: string,
    attachmentType?: string
  ) => {
    if (!body.trim() && !attachmentUrl) return

    const tempId = `temp-${Date.now()}`
    const tempMsg: GroupMessage = {
      id: tempId,
      group_chat_id: groupId,
      sender_id: user.id,
      body,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      created_at: new Date().toISOString(),
      profile: { display_name: profileDisplayName }
    }

    // Optimistic update
    setGroupMessages(prev => ({
      ...prev,
      [groupId]: [...(prev[groupId] || []), tempMsg]
    }))

    try {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_chat_id: groupId,
          sender_id: user.id,
          body: body || '',
          attachment_url: attachmentUrl || null,
          attachment_type: attachmentType || null
        })
        .select()
        .single()

      if (error) throw error

      // Replace temp with real
      setGroupMessages(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map(m =>
          m.id === tempId ? { ...data, profile: { display_name: profileDisplayName } } : m
        )
      }))

      // Broadcast
      if (socialChannelRef.current) {
        socialChannelRef.current.send({
          type: 'broadcast',
          event: 'group-message',
          payload: {
            groupId,
            messageId: data.id,
            senderId: user.id,
            senderName: profileDisplayName,
            body,
            attachmentUrl,
            attachmentType,
            created_at: data.created_at
          }
        })
      }
    } catch (err) {
      console.error('[GroupChats] Failed to send message:', err)
      // Mark as failed
      setGroupMessages(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).map(m =>
          m.id === tempId ? { ...m, id: `failed-${tempId}` } : m
        )
      }))
    }
  }, [user.id, profileDisplayName, supabase, socialChannelRef])

  // ── CREATE GROUP ──
  const createGroupChat = useCallback(async (name: string, memberIds: string[]) => {
    try {
      // Insert group
      const { data: group, error: gErr } = await supabase
        .from('group_chats')
        .insert({ name, creator_id: user.id })
        .select()
        .single()

      if (gErr) throw gErr

      // Insert members (creator + selected friends)
      const allMemberIds = [user.id, ...memberIds.filter(id => id !== user.id)]
      const memberInserts = allMemberIds.map(uid => ({
        group_chat_id: group.id,
        user_id: uid
      }))

      const { error: mErr } = await supabase
        .from('group_chat_members')
        .insert(memberInserts)

      if (mErr) throw mErr

      showToast('🎉 Grupo criado!', `"${name}" foi criado com ${allMemberIds.length} membros.`, 'friend')

      await loadGroupChats()
      setSelectedGroupId(group.id)
      await loadGroupMessages(group.id)

      return group.id
    } catch (err) {
      console.error('[GroupChats] Failed to create group:', err)
      showToast('Erro', 'Não foi possível criar o grupo.', 'info')
      return null
    }
  }, [user.id, supabase, showToast, loadGroupChats, loadGroupMessages])

  // ── LEAVE GROUP ──
  const leaveGroupChat = useCallback(async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('group_chat_members')
        .delete()
        .eq('group_chat_id', groupId)
        .eq('user_id', user.id)

      if (error) throw error

      setGroupChats(prev => prev.filter(g => g.id !== groupId))
      setGroupMessages(prev => {
        const next = { ...prev }
        delete next[groupId]
        return next
      })
      if (selectedGroupIdRef.current === groupId) {
        setSelectedGroupId(null)
      }

      showToast('👋 Saiu do grupo', 'Você saiu do grupo.', 'info')
    } catch (err) {
      console.error('[GroupChats] Failed to leave:', err)
    }
  }, [user.id, supabase, showToast])

  // ── HANDLE INCOMING BROADCAST ──
  const handleGroupMessageBroadcast = useCallback((data: any) => {
    const { groupId, messageId, senderId, senderName, body, attachmentUrl, attachmentType, created_at } = data

    const newMsg: GroupMessage = {
      id: messageId,
      group_chat_id: groupId,
      sender_id: senderId,
      body: body || '',
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      created_at: created_at || new Date().toISOString(),
      profile: { display_name: senderName }
    }

    setGroupMessages(prev => {
      const existing = prev[groupId] || []
      // Deduplicate
      if (existing.some(m => m.id === messageId)) return prev
      return { ...prev, [groupId]: [...existing, newMsg] }
    })

    // Unread / notification if not currently viewing this group
    if (selectedGroupIdRef.current !== groupId) {
      setUnreadGroups(prev => ({ ...prev, [groupId]: (prev[groupId] || 0) + 1 }))

      const groupName = groupChats.find(g => g.id === groupId)?.name || 'Grupo'
      const notifBody = attachmentType === 'sticker' ? '🖼️ Sticker' : (body || '📎 Anexo')

      showToast(`💬 ${groupName}`, `${senderName}: ${notifBody}`, 'message', { type: 'group', groupId })
      playDmNotificationSound(sfxVolume)
      triggerDesktopNotification(`${senderName} em ${groupName}`, notifBody, { type: 'group', groupId })
    }
  }, [groupChats, showToast, playDmNotificationSound, sfxVolume, triggerDesktopNotification])

  // ── HANDLE GROUP TYPING BROADCAST ──
  const handleGroupTypingBroadcast = useCallback((data: any) => {
    const { groupId, senderId, senderName } = data
    if (senderId === user.id) return

    setGroupTypingUsers(prev => {
      const current = prev[groupId] || []
      if (current.includes(senderName)) return prev
      return { ...prev, [groupId]: [...current, senderName] }
    })

    // Clear after 3s
    const key = `${groupId}-${senderId}`
    if (groupTypingTimeoutsRef.current[key]) clearTimeout(groupTypingTimeoutsRef.current[key])
    groupTypingTimeoutsRef.current[key] = setTimeout(() => {
      setGroupTypingUsers(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(n => n !== senderName)
      }))
    }, 3000)
  }, [user.id])

  // ── NOTIFY TYPING IN GROUP ──
  const notifyGroupTyping = useCallback((groupId: string) => {
    if (!socialChannelRef.current) return
    socialChannelRef.current.send({
      type: 'broadcast',
      event: 'group-typing',
      payload: { groupId, senderId: user.id, senderName: profileDisplayName }
    })
  }, [user.id, profileDisplayName, socialChannelRef])

  // ── OPEN GROUP ──
  const handleOpenGroup = useCallback(async (groupId: string) => {
    setSelectedGroupId(groupId)
    setGroupDraft('')
    setUnreadGroups(prev => ({ ...prev, [groupId]: 0 }))
    if (!groupMessages[groupId] || groupMessages[groupId].length === 0) {
      await loadGroupMessages(groupId)
    }
  }, [groupMessages, loadGroupMessages])

  // ── DELETE GROUP MESSAGE ──
  const deleteGroupMessage = useCallback(async (messageId: string, groupId: string) => {
    try {
      await supabase.from('group_messages').delete().eq('id', messageId)
      setGroupMessages(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(m => m.id !== messageId)
      }))
    } catch (err) {
      console.error('[GroupChats] Failed to delete message:', err)
    }
  }, [supabase])

  return {
    groupChats,
    setGroupChats,
    selectedGroupId,
    setSelectedGroupId,
    selectedGroupIdRef,
    groupMessages,
    groupDraft,
    setGroupDraft,
    groupTypingUsers,
    unreadGroups,
    setUnreadGroups,
    loadGroupChats,
    loadGroupMessages,
    sendGroupMessage,
    createGroupChat,
    leaveGroupChat,
    handleOpenGroup,
    handleGroupMessageBroadcast,
    handleGroupTypingBroadcast,
    notifyGroupTyping,
    deleteGroupMessage
  }
}
