import { useState, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'

export interface BlockedUserProfile {
  id: string
  display_name: string
  avatar_url?: string
}

export interface UseEchoBlockedUsersOptions {
  user: User
  supabase: any
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  removeFriendship?: (friendshipId: string) => void
  friendships?: Array<{ id: string; user: { id: string } }>
}

export function useEchoBlockedUsers({
  user,
  supabase,
  showToast,
  removeFriendship,
  friendships = []
}: UseEchoBlockedUsersOptions) {
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set())
  const [blockedProfiles, setBlockedProfiles] = useState<BlockedUserProfile[]>([])

  const loadBlockedUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error

      const ids = new Set<string>((data || []).map((r: any) => r.blocked_id as string))
      setBlockedUserIds(ids)

      // Load profiles for blocked users
      if (data && data.length > 0) {
        const blockedIds = data.map((r: any) => r.blocked_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', blockedIds)

        const profileMap: Record<string, any> = {}
        ;(profiles || []).forEach((p: any) => { profileMap[p.id] = p })

        setBlockedProfiles(
          (data || []).map((r: any) => ({
            id: r.blocked_id,
            display_name: profileMap[r.blocked_id]?.display_name || 'Usuário',
            avatar_url: profileMap[r.blocked_id]?.avatar_url
          }))
        )
      } else {
        setBlockedProfiles([])
      }
    } catch (err) {
      console.error('[BlockedUsers] Failed to load:', err)
    }
  }, [user.id, supabase])

  const blockUser = useCallback(async (targetId: string, targetName?: string) => {
    if (targetId === user.id) return
    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: user.id, blocked_id: targetId })

      if (error && error.code !== '23505') throw error // ignore unique violation

      setBlockedUserIds(prev => new Set([...prev, targetId]))

      // Auto-remove friendship if exists
      const existingFriendship = friendships.find(f => f.user.id === targetId)
      if (existingFriendship && removeFriendship) {
        removeFriendship(existingFriendship.id)
      }

      showToast(
        '🚫 Usuário bloqueado',
        targetName ? `${targetName} foi bloqueado.` : 'Usuário bloqueado com sucesso.',
        'info'
      )

      // Reload to get profiles
      await loadBlockedUsers()
    } catch (err) {
      console.error('[BlockedUsers] Failed to block:', err)
      showToast('Erro', 'Não foi possível bloquear o usuário.', 'info')
    }
  }, [user.id, supabase, friendships, removeFriendship, showToast, loadBlockedUsers])

  const unblockUser = useCallback(async (targetId: string, targetName?: string) => {
    try {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', targetId)

      if (error) throw error

      setBlockedUserIds(prev => {
        const next = new Set(prev)
        next.delete(targetId)
        return next
      })
      setBlockedProfiles(prev => prev.filter(p => p.id !== targetId))

      showToast(
        '✅ Desbloqueado',
        targetName ? `${targetName} foi desbloqueado.` : 'Usuário desbloqueado.',
        'info'
      )
    } catch (err) {
      console.error('[BlockedUsers] Failed to unblock:', err)
      showToast('Erro', 'Não foi possível desbloquear o usuário.', 'info')
    }
  }, [user.id, supabase, showToast])

  const isBlocked = useCallback((targetId: string) => {
    return blockedUserIds.has(targetId)
  }, [blockedUserIds])

  return {
    blockedUserIds,
    blockedProfiles,
    loadBlockedUsers,
    blockUser,
    unblockUser,
    isBlocked
  }
}
