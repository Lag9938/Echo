import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { FriendshipRequest } from '../types'

export interface UseEchoFriendshipsOptions {
  user: User
  profileDisplayName: string
  displayName: string
  socialChannelRef: React.MutableRefObject<any>
  sfxVolume: number
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  triggerDesktopNotification: (title: string, body: string) => void
  setError: (err: string) => void
  setOnlineUsers: React.Dispatch<React.SetStateAction<Set<string>>>
  setPresenceData: React.Dispatch<React.SetStateAction<Record<string, any>>>
  playFriendRequestSound: (volume: number) => void
  playFriendAcceptSound: (volume: number) => void
  supabase: any
}

export function useEchoFriendships({
  user,
  profileDisplayName,
  displayName,
  socialChannelRef,
  sfxVolume,
  showToast,
  triggerDesktopNotification,
  setError,
  setOnlineUsers,
  setPresenceData,
  playFriendRequestSound,
  playFriendAcceptSound,
  supabase
}: UseEchoFriendshipsOptions) {
  const [friendships, setFriendships] = useState<FriendshipRequest[]>([])
  const [friendSearchQuery, setFriendSearchQuery] = useState('')
  const [friendSearchNotice, setFriendSearchNotice] = useState('')
  const [pendingFriendCount, setPendingFriendCount] = useState<number>(0)

  const loadFriendships = useCallback(async () => {
    const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true')
    if (isMock) {
      const mockFriendsList: FriendshipRequest[] = [
        {
          id: 'mock-friend-1',
          user: { id: 'friend-valkyrie', display_name: 'Valkyrie_Echo', avatar_url: '' },
          status: 'accepted',
          initiatorId: 'friend-valkyrie'
        },
        {
          id: 'mock-friend-2',
          user: { id: 'friend-gaming', display_name: 'CyberNinja', avatar_url: '' },
          status: 'accepted',
          initiatorId: user.id
        }
      ]
      setFriendships(mockFriendsList)
      setOnlineUsers(new Set(['friend-valkyrie', 'friend-gaming']))
      setPresenceData(prev => ({
        ...prev,
        'friend-valkyrie': {
          presence_status: 'online',
          custom_status: 'Disponível',
          avatar_decoration: 'cyber_hud'
        },
        'friend-gaming': {
          presence_status: 'online',
          custom_status: 'Jogando Cyberpunk 2077',
          current_game: { name: 'Cyberpunk 2077' },
          avatar_decoration: 'fire_storm'
        }
      }))
      return
    }

    if (!supabase || !user) return
    try {
      const { data, error: qError } = await supabase
        .from('friendships')
        .select('id, status, user_id, friend_id, user:profiles!friendships_user_id_fkey(id, display_name, avatar_url), friend:profiles!friendships_friend_id_fkey(id, display_name, avatar_url)')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

      if (qError) {
        console.error('Error loading friendships:', qError)
        return
      }

      const list = (data ?? []).map((row: any) => {
        const isInitiator = row.user_id === user.id
        const targetUser = isInitiator
          ? (row.friend || { id: row.friend_id, display_name: 'Usuário', avatar_url: '' })
          : (row.user || { id: row.user_id, display_name: 'Usuário', avatar_url: '' })
        return {
          id: row.id,
          user: targetUser,
          status: row.status,
          initiatorId: row.user_id
        } as FriendshipRequest
      })
      setFriendships(list)
      const incomingPending = list.filter((r: FriendshipRequest) => r.status === 'pending' && r.initiatorId !== user.id).length
      setPendingFriendCount(incomingPending)
    } catch (e) {
      console.error('Exception in loadFriendships:', e)
    }
  }, [supabase, user, setOnlineUsers, setPresenceData])

  const acceptFriendRequest = useCallback(async (friendshipId: string) => {
    if (!supabase) return
    const req = friendships.find(f => f.id === friendshipId)
    const targetUserId = req?.initiatorId
    const friendName = req?.user?.display_name || 'Amigo'

    const { error: fError } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', friendshipId)

    if (fError) {
      setError(fError.message)
    } else {
      playFriendAcceptSound(sfxVolume)
      showToast('Amizade Aceita!', `Você agora é amigo de ${friendName}!`, 'friend')

      if (targetUserId) {
        socialChannelRef.current?.send({
          type: 'broadcast',
          event: 'friend-event',
          payload: {
            type: 'friend-request-accepted',
            targetUserId,
            senderId: user.id,
            senderName: profileDisplayName || displayName || 'Seu amigo'
          }
        })
      }

      await loadFriendships()
    }
  }, [supabase, friendships, setError, playFriendAcceptSound, sfxVolume, showToast, socialChannelRef, user.id, profileDisplayName, displayName, loadFriendships])

  const sendFriendRequest = useCallback(async (event: FormEvent) => {
    event.preventDefault()
    if (!supabase || !friendSearchQuery.trim()) return
    setFriendSearchNotice('')
    const targetName = friendSearchQuery.trim().replace(/^@/, '')

    try {
      const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .ilike('display_name', targetName)

      if (pError || !profiles || profiles.length === 0) {
        setFriendSearchNotice('Usuário não encontrado. Verifique o nome de exibição.')
        return
      }

      const targetProfile = profiles[0]
      const targetUserId = targetProfile.id

      if (targetUserId === user.id) {
        setFriendSearchNotice('Você não pode adicionar a si mesmo.')
        return
      }

      const { data: existing } = await supabase
        .from('friendships')
        .select('id, status, user_id, friend_id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)

      if (existing && existing.length > 0) {
        const rel = existing[0]
        if (rel.status === 'accepted') {
          setFriendSearchNotice(`Você e @${targetProfile.display_name} já são amigos!`)
          return
        }
        if (rel.user_id === user.id) {
          setFriendSearchNotice('Você já enviou uma solicitação para este usuário.')
          return
        } else {
          await acceptFriendRequest(rel.id)
          setFriendSearchNotice(`Você aceitou a solicitação pendente de @${targetProfile.display_name}!`)
          setFriendSearchQuery('')
          return
        }
      }

      const { error: fError } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending'
        })

      if (fError) {
        if (fError.code === '23505') {
          setFriendSearchNotice('Vocês já são amigos ou já existe uma solicitação pendente.')
        } else {
          setFriendSearchNotice(fError.message)
        }
      } else {
        playFriendRequestSound(sfxVolume)
        setFriendSearchNotice(`Solicitação de amizade enviada com sucesso para @${targetProfile.display_name}!`)
        setFriendSearchQuery('')

        socialChannelRef.current?.send({
          type: 'broadcast',
          event: 'friend-event',
          payload: {
            type: 'friend-request-sent',
            targetUserId,
            senderId: user.id,
            senderName: profileDisplayName || displayName || user.email || 'Alguém'
          }
        })

        await loadFriendships()
      }
    } catch (e: any) {
      console.error('Error in sendFriendRequest:', e)
      setFriendSearchNotice('Erro ao processar solicitação de amizade.')
    }
  }, [supabase, friendSearchQuery, user, acceptFriendRequest, playFriendRequestSound, sfxVolume, socialChannelRef, profileDisplayName, displayName, loadFriendships])

  const sendFriendRequestToUser = useCallback(async (targetUserId: string, targetName?: string) => {
    if (!user || targetUserId === user.id) return
    const name = targetName || 'usuário'

    const existing = friendships.find(f => f.user.id === targetUserId)
    if (existing) {
      if (existing.status === 'accepted') {
        showToast('Já são amigos', `Você e @${name} já são amigos!`, 'info')
        return
      }
      if (existing.initiatorId === user.id) {
        showToast('Solicitação já enviada', `Você já enviou um pedido de amizade para @${name}.`, 'info')
        return
      } else {
        await acceptFriendRequest(existing.id)
        return
      }
    }

    if (!supabase) return

    try {
      const { data: existingRows } = await supabase
        .from('friendships')
        .select('id, status, user_id, friend_id')
        .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`)

      if (existingRows && existingRows.length > 0) {
        const rel = existingRows[0]
        if (rel.status === 'accepted') {
          showToast('Já são amigos', `Você e @${name} já são amigos!`, 'info')
          await loadFriendships()
          return
        }
        if (rel.user_id === user.id) {
          showToast('Solicitação já enviada', `Você já enviou um pedido de amizade para @${name}.`, 'info')
          await loadFriendships()
          return
        } else {
          await acceptFriendRequest(rel.id)
          return
        }
      }

      const { error: fError } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending'
        })

      if (fError) {
        if (fError.code === '23505') {
          showToast('Aviso', 'Vocês já possuem uma solicitação pendente.', 'info')
        } else {
          showToast('Erro', fError.message, 'info')
        }
      } else {
        playFriendRequestSound(sfxVolume)
        showToast('Solicitação enviada!', `Pedido de amizade enviado para @${name}!`, 'friend')

        socialChannelRef.current?.send({
          type: 'broadcast',
          event: 'friend-event',
          payload: {
            type: 'friend-request-sent',
            targetUserId,
            senderId: user.id,
            senderName: profileDisplayName || displayName || user.email || 'Alguém'
          }
        })

        await loadFriendships()
      }
    } catch (e: any) {
      console.error('Error in sendFriendRequestToUser:', e)
      showToast('Erro', 'Não foi possível enviar a solicitação de amizade.', 'info')
    }
  }, [user, friendships, supabase, showToast, acceptFriendRequest, loadFriendships, playFriendRequestSound, sfxVolume, socialChannelRef, profileDisplayName, displayName])

  const removeFriendship = useCallback(async (friendshipId: string) => {
    if (!supabase) return
    const req = friendships.find(f => f.id === friendshipId)
    const targetUserId = req?.user?.id

    const { error: fError } = await supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)

    if (fError) {
      setError(fError.message)
    } else {
      if (targetUserId) {
        socialChannelRef.current?.send({
          type: 'broadcast',
          event: 'friend-event',
          payload: {
            type: 'friend-removed',
            targetUserId,
            senderId: user.id
          }
        })
      }
      await loadFriendships()
    }
  }, [supabase, friendships, setError, socialChannelRef, user.id, loadFriendships])

  const handleFriendshipPostgresChanges = useCallback((payload: any) => {
    loadFriendships()
    if (payload.eventType === 'INSERT') {
      const newFriendship = payload.new
      if (newFriendship?.friend_id === user.id) {
        playFriendRequestSound(sfxVolume)
        showToast('Solicitação de Amizade', 'Você recebeu um novo convite de amizade.', 'friend')
        triggerDesktopNotification('Solicitação de Amizade', 'Você recebeu um novo convite de amizade.')
      }
    } else if (payload.eventType === 'UPDATE') {
      const updatedFriendship = payload.new
      if (updatedFriendship?.status === 'accepted' && (updatedFriendship.user_id === user.id || updatedFriendship.friend_id === user.id)) {
        playFriendAcceptSound(sfxVolume)
        showToast('Amizade Aceita!', 'Um amigo aceitou sua solicitação!', 'friend')
      }
    }
  }, [loadFriendships, user.id, playFriendRequestSound, sfxVolume, showToast, triggerDesktopNotification, playFriendAcceptSound])

  const handleFriendEvent = useCallback((data: any) => {
    if (!data) return
    if (data.targetUserId === user.id) {
      if (data.type === 'friend-request-sent') {
        playFriendRequestSound(sfxVolume)
        showToast('Nova Solicitação de Amizade', `🎮 @${data.senderName} enviou uma solicitação de amizade!`, 'friend')
        triggerDesktopNotification('Solicitação de Amizade', `@${data.senderName} enviou um pedido de amizade.`)
        loadFriendships()
      } else if (data.type === 'friend-request-accepted') {
        playFriendAcceptSound(sfxVolume)
        showToast('Amizade Aceita!', `🎉 @${data.senderName} aceitou sua solicitação de amizade!`, 'friend')
        triggerDesktopNotification('Amizade Aceita!', `@${data.senderName} agora é seu amigo no Echo.`)
        loadFriendships()
      } else if (data.type === 'friend-removed') {
        loadFriendships()
      }
    }
  }, [user.id, playFriendRequestSound, sfxVolume, showToast, triggerDesktopNotification, loadFriendships, playFriendAcceptSound])

  return {
    friendships,
    setFriendships,
    friendSearchQuery,
    setFriendSearchQuery,
    friendSearchNotice,
    setFriendSearchNotice,
    pendingFriendCount,
    setPendingFriendCount,
    loadFriendships,
    sendFriendRequest,
    sendFriendRequestToUser,
    acceptFriendRequest,
    removeFriendship,
    handleFriendshipPostgresChanges,
    handleFriendEvent
  }
}
