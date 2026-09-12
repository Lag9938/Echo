import { useState, useCallback } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel, ServerAuditLog, FriendshipRequest, RolePermissions } from '../types'
import { getPublicInviteUrl } from '../lib/invite'

export interface UseEchoSpaceSettingsOptions {
  user: User
  profileDisplayName?: string
  getProfileDisplayName?: () => string
  displayName?: string
  spaces: Space[]
  setSpaces: React.Dispatch<React.SetStateAction<Space[]>>
  spaceChannels: Record<string, Channel[]>
  setSpaceChannels: React.Dispatch<React.SetStateAction<Record<string, Channel[]>>>
  selectedChannel: Channel | null
  setSelectedChannel: React.Dispatch<React.SetStateAction<Channel | null>>
  expandedSpace: string | null
  setExpandedSpace: React.Dispatch<React.SetStateAction<string | null>>
  setSpaceMembers: React.Dispatch<React.SetStateAction<any[]>>
  socialChannelRef: React.MutableRefObject<any>
  canUserDo: (spaceId: string, userId: string, permissionKey: keyof RolePermissions) => boolean
  loadSpaces: () => Promise<any>
  loadChannelsForSpace: (spaceId: string) => Promise<any>
  loadSpaceMembers: (spaceId: string) => Promise<any>
  loadSpaceRoles: (spaceId: string) => Promise<any>
  loadMemberRoles: (spaceId: string) => Promise<any>
  loadSpaceEmojis: (spaceId: string) => void
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  setConfirmModalConfig: (config: any) => void
  setError: (err: string) => void
  presenceStatus?: string
  supabase: any
}

export function useEchoSpaceSettings({
  user,
  profileDisplayName,
  getProfileDisplayName,
  displayName,
  spaces,
  setSpaces,
  spaceChannels,
  setSpaceChannels,
  selectedChannel,
  setSelectedChannel,
  expandedSpace,
  setExpandedSpace,
  setSpaceMembers,
  socialChannelRef,
  canUserDo,
  loadSpaces,
  loadChannelsForSpace,
  loadSpaceMembers,
  loadSpaceRoles,
  loadMemberRoles,
  loadSpaceEmojis,
  showToast,
  setConfirmModalConfig,
  setError,
  presenceStatus,
  supabase
}: UseEchoSpaceSettingsOptions) {
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const [editingSpaceName, setEditingSpaceName] = useState('')
  const [editingSpaceDescription, setEditingSpaceDescription] = useState('')
  const [editingSpaceIconUrl, setEditingSpaceIconUrl] = useState('')
  const [editingSpaceBannerUrl, setEditingSpaceBannerUrl] = useState('')
  const [editingSpaceBannerTheme, setEditingSpaceBannerTheme] = useState('dark')
  const [editingSpaceWelcomeChannelId, setEditingSpaceWelcomeChannelId] = useState('')
  const [uploadingSpaceIcon, setUploadingSpaceIcon] = useState(false)
  const [uploadingSpaceBanner, setUploadingSpaceBanner] = useState(false)
  const [activeSpaceTab, setActiveSpaceTab] = useState<'geral' | 'roles' | 'emojis' | 'channels' | 'members' | 'audit' | 'invites' | 'danger'>('geral')
  const [editingSpaceMembers, setEditingSpaceMembers] = useState<any[]>([])
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [loadingEditingMembers, setLoadingEditingMembers] = useState(false)
  const [showSpaceSettingsModal, setShowSpaceSettingsModal] = useState(false)

  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [serverAuditLogs, setServerAuditLogs] = useState<ServerAuditLog[]>([])

  const [mutedSpaces, setMutedSpaces] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('echo-muted-spaces')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  const loadEditingSpaceMembers = useCallback(async (spaceId: string) => {
    if (!supabase) return
    setLoadingEditingMembers(true)
    const { data, error: qErr } = await supabase
      .from('space_members')
      .select('role, joined_at, user:profiles(id, display_name, avatar_url)')
      .eq('space_id', spaceId)

    if (qErr) {
      console.warn('loadEditingSpaceMembers error', qErr)
      setLoadingEditingMembers(false)
      return
    }

    const members = (data ?? []).map((row: any) => ({
      role: row.role,
      joined_at: row.joined_at,
      user: Array.isArray(row.user) ? row.user[0] : row.user
    })).filter((m: any) => m.user !== null)

    setEditingSpaceMembers(members)
    setLoadingEditingMembers(false)
  }, [supabase])

  const addAuditLog = useCallback(async (spaceId: string, action: string, details?: string) => {
    const effectiveProfileName = getProfileDisplayName ? getProfileDisplayName() : profileDisplayName
    const authorName = effectiveProfileName || displayName || 'Você'
    const newEntry: ServerAuditLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      author_name: authorName,
      action,
      details
    }
    let logsMap: Record<string, ServerAuditLog[]> = {}
    try {
      logsMap = JSON.parse(localStorage.getItem('echo-spaces-audit-logs') || '{}')
    } catch {
      logsMap = {}
    }
    const currentLogs = logsMap[spaceId] || []
    const updated = [newEntry, ...currentLogs].slice(0, 100)
    logsMap[spaceId] = updated
    localStorage.setItem('echo-spaces-audit-logs', JSON.stringify(logsMap))
    setEditingSpace(current => {
      if (current?.id === spaceId) {
        setServerAuditLogs(updated)
      }
      return current
    })

    if (supabase) {
      try {
        await supabase.from('space_audit_logs').insert({
          space_id: spaceId,
          author_name: authorName,
          author_id: user.id,
          action,
          details
        })
      } catch (err) {
        console.warn('Supabase insert audit log error:', err)
      }
    }
  }, [profileDisplayName, displayName, supabase, user?.id])

  const loadSpaceAuditLogs = useCallback(async (spaceId: string) => {
    try {
      const logsMap = JSON.parse(localStorage.getItem('echo-spaces-audit-logs') || '{}')
      setServerAuditLogs(logsMap[spaceId] || [])
    } catch {
      setServerAuditLogs([])
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('space_audit_logs')
          .select('*')
          .eq('space_id', spaceId)
          .order('created_at', { ascending: false })
          .limit(100)

        if (!error && data && data.length > 0) {
          const formatted: ServerAuditLog[] = data.map((d: any) => ({
            id: d.id,
            timestamp: d.created_at,
            author_name: d.author_name,
            action: d.action,
            details: d.details
          }))
          setServerAuditLogs(formatted)
        }
      } catch (err) {
        console.warn('Supabase load audit logs error:', err)
      }
    }
  }, [supabase])

  const handleSpaceIconUpload = useCallback(async (file: File) => {
    if (!editingSpace) return
    setUploadingSpaceIcon(true)
    try {
      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `spaces/${editingSpace.id}/icon_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          setEditingSpaceIconUrl(urlData.publicUrl)
          setUploadingSpaceIcon(false)
          addAuditLog(editingSpace.id, 'Alterou o ícone/avatar do espaço')
          return
        }
      }
      const reader = new FileReader()
      reader.onload = () => {
        setEditingSpaceIconUrl(reader.result as string)
        setUploadingSpaceIcon(false)
        addAuditLog(editingSpace.id, 'Alterou o ícone/avatar do espaço')
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      showToast('Erro', err.message || 'Erro ao carregar imagem', 'info')
      setUploadingSpaceIcon(false)
    }
  }, [editingSpace, supabase, addAuditLog, showToast])

  const handleRemoveSpaceIcon = useCallback(() => {
    setEditingSpaceIconUrl('')
    if (editingSpace) addAuditLog(editingSpace.id, 'Removeu o ícone do espaço')
  }, [editingSpace, addAuditLog])

  const handleSpaceBannerUpload = useCallback(async (file: File) => {
    if (!editingSpace) return
    setUploadingSpaceBanner(true)
    try {
      if (supabase) {
        const ext = file.name.split('.').pop()
        const path = `spaces/${editingSpace.id}/banner_${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
          setEditingSpaceBannerUrl(urlData.publicUrl)
          setUploadingSpaceBanner(false)
          addAuditLog(editingSpace.id, 'Alterou o banner/capa do espaço')
          return
        }
      }
      const reader = new FileReader()
      reader.onload = () => {
        setEditingSpaceBannerUrl(reader.result as string)
        setUploadingSpaceBanner(false)
        addAuditLog(editingSpace.id, 'Alterou o banner/capa do espaço')
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      showToast('Erro', err.message || 'Erro ao carregar banner', 'info')
      setUploadingSpaceBanner(false)
    }
  }, [editingSpace, supabase, addAuditLog, showToast])

  const handleRemoveSpaceBanner = useCallback(() => {
    setEditingSpaceBannerUrl('')
    if (editingSpace) addAuditLog(editingSpace.id, 'Removeu o banner personalizado do espaço')
  }, [editingSpace, addAuditLog])

  const toggleCategoryCollapse = useCallback((spaceId: string, category: string) => {
    const key = `${spaceId}::${category}`
    setCollapsedCategories(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const handleRoleChange = useCallback((memberUserId: string, newRole: 'owner' | 'moderator' | 'member', memberName: string) => {
    if (!editingSpace || !supabase) return
    const client = supabase
    const currentSpace = editingSpace

    if (currentSpace.creator_id !== user.id) {
      showToast('Permissão Negada', 'Apenas o Dono pode alterar cargos ou transferir a posse.', 'info')
      return
    }

    if (newRole === 'owner') {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Transferir Posse do Espaço',
        message: `Tem certeza de que deseja transferir a posse do espaço "${currentSpace.name}" para "${memberName}"? Você deixará de ser o Dono e passará a ser um Moderador.`,
        confirmText: 'Sim, Transferir',
        cancelText: 'Não, Cancelar',
        isDanger: false,
        onConfirm: async () => {
          await client.from('spaces').update({ creator_id: memberUserId }).eq('id', currentSpace.id)
          await client.from('space_members').update({ role: 'owner' }).eq('space_id', currentSpace.id).eq('user_id', memberUserId)
          await client.from('space_members').update({ role: 'moderator' }).eq('space_id', currentSpace.id).eq('user_id', user.id)

          addAuditLog(currentSpace.id, `Transferiu a posse do espaço para ${memberName}`)
          showToast('Posse Transferida!', `${memberName} agora é o dono do espaço.`, 'info')
          setEditingSpace(prev => prev ? { ...prev, creator_id: memberUserId } : null)
          await loadEditingSpaceMembers(currentSpace.id)
          await loadSpaces()
          setConfirmModalConfig(null)
        }
      })
      return
    }

    client.from('space_members').update({ role: newRole }).eq('space_id', currentSpace.id).eq('user_id', memberUserId).then(({ error }: any) => {
      if (error) {
        showToast('Erro ao mudar cargo', error.message, 'info')
      } else {
        addAuditLog(currentSpace.id, `Alterou o cargo básico de ${memberName} para ${newRole === 'moderator' ? 'Moderador' : 'Membro'}`)
        showToast('Cargo Atualizado', `O cargo de ${memberName} foi alterado para ${newRole === 'moderator' ? 'Moderador' : 'Membro'}.`, 'info')
        loadEditingSpaceMembers(currentSpace.id)
        loadSpaceMembers(currentSpace.id)
      }
    })
  }, [editingSpace, supabase, user?.id, showToast, setConfirmModalConfig, addAuditLog, loadEditingSpaceMembers, loadSpaces, loadSpaceMembers])

  const handleKickMember = useCallback((memberUserId: string, memberName: string) => {
    if (!editingSpace || !supabase) return
    const client = supabase
    const currentSpace = editingSpace

    const canKick = canUserDo(currentSpace.id, user.id, 'kickMembers') || currentSpace.creator_id === user.id
    if (!canKick) {
      showToast('Permissão Negada', 'Você não tem permissão para expulsar membros deste espaço.', 'info')
      return
    }

    setConfirmModalConfig({
      isOpen: true,
      title: 'Expulsar Membro',
      message: `Tem certeza de que deseja expulsar "${memberName}" do espaço "${currentSpace.name}"? O usuário precisará de um convite para retornar.`,
      confirmText: 'Sim, Expulsar',
      cancelText: 'Não, Cancelar',
      isDanger: true,
      onConfirm: async () => {
        const { error: kickErr } = await client
          .from('space_members')
          .delete()
          .eq('space_id', currentSpace.id)
          .eq('user_id', memberUserId)

        if (kickErr) {
          showToast('Erro ao expulsar', kickErr.message, 'info')
        } else {
          addAuditLog(currentSpace.id, `Expulsou o membro "${memberName}" do espaço`)
          showToast('Membro Expulso', `${memberName} foi removido do espaço.`, 'info')
          await loadEditingSpaceMembers(currentSpace.id)
          await loadSpaceMembers(currentSpace.id)
        }
        setConfirmModalConfig(null)
      }
    })
  }, [editingSpace, supabase, canUserDo, user?.id, showToast, setConfirmModalConfig, addAuditLog, loadEditingSpaceMembers, loadSpaceMembers])

  const moveChannel = useCallback(async (channelId: string, direction: 'up' | 'down') => {
    if (!editingSpace) return
    const currentList = [...(spaceChannels[editingSpace.id] ?? [])]
    const index = currentList.findIndex(c => c.id === channelId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === currentList.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const temp = currentList[index]
    currentList[index] = currentList[targetIndex]
    currentList[targetIndex] = temp

    currentList.forEach((c, idx) => {
      c.position = idx
    })

    const localChannelMeta: Record<string, any> = JSON.parse(localStorage.getItem('echo-channels-metadata') || '{}')
    currentList.forEach(c => {
      localChannelMeta[c.id] = { ...localChannelMeta[c.id], position: c.position }
      if (supabase) {
        supabase.from('channels').update({ position: c.position }).eq('id', c.id).then(() => {})
      }
    })
    localStorage.setItem('echo-channels-metadata', JSON.stringify(localChannelMeta))

    setSpaceChannels(prev => ({ ...prev, [editingSpace.id]: currentList }))
  }, [editingSpace, spaceChannels, supabase, setSpaceChannels])

  const updateChannelSettings = useCallback((channelId: string, updates: { 
    topic?: string; 
    is_announcement?: boolean; 
    user_limit?: number; 
    slowmode_seconds?: number; 
    category?: string;
    is_private?: boolean;
    allowed_role_ids?: string[];
  }) => {
    // Persiste no localStorage como cache local imediato
    const localChannelMeta: Record<string, any> = JSON.parse(localStorage.getItem('echo-channels-metadata') || '{}')
    localChannelMeta[channelId] = { ...localChannelMeta[channelId], ...updates }
    localStorage.setItem('echo-channels-metadata', JSON.stringify(localChannelMeta))

    // Persiste no banco de dados para sincronizar com todos os membros
    if (supabase) {
      supabase.from('channels').update(updates).eq('id', channelId).then(({ error }: any) => {
        if (error) console.warn('updateChannelSettings db error:', error)
      })
    }

    if (editingSpace) {
      setSpaceChannels(prev => ({
        ...prev,
        [editingSpace.id]: (prev[editingSpace.id] ?? []).map(c => c.id === channelId ? { ...c, ...updates } : c)
      }))
    }
    if (selectedChannel?.id === channelId) {
      setSelectedChannel(prev => prev ? { ...prev, ...updates } : null)
    }
  }, [editingSpace, selectedChannel?.id, supabase, setSpaceChannels, setSelectedChannel])

  const toggleMuteSpace = useCallback((spaceId: string) => {
    setMutedSpaces(prev => {
      const next = new Set(prev)
      if (next.has(spaceId)) {
        next.delete(spaceId)
        showToast('Notificações Ativadas', 'Você voltará a receber alertas deste espaço.', 'info')
      } else {
        next.add(spaceId)
        showToast('Espaço Silenciado', 'As notificações deste espaço foram silenciadas.', 'info')
      }
      localStorage.setItem('echo-muted-spaces', JSON.stringify(Array.from(next)))
      return next
    })
  }, [showToast])

  const triggerDesktopNotification = useCallback((title: string, body: string) => {
    if (presenceStatus === 'dnd') return
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        if ((window as any).electronAPI?.showNotification) {
          (window as any).electronAPI.showNotification({ title, body })
        } else {
          new Notification(title, { body, icon: '/favicon.ico' })
        }
      } catch (e) {
        console.warn('Failed to trigger desktop notification:', e)
      }
    }
  }, [presenceStatus])

  const openSpaceSettings = useCallback((space: Space) => {
    setEditingSpace(space)
    setEditingSpaceName(space.name)
    setEditingSpaceDescription(space.description || '')
    setEditingSpaceIconUrl(space.icon_url || '')
    setEditingSpaceBannerUrl(space.banner_url || '')
    setEditingSpaceBannerTheme(space.banner_theme || 'dark')
    setEditingSpaceWelcomeChannelId(space.welcome_channel_id || '')
    setActiveSpaceTab('geral')
    setMemberSearchQuery('')
    loadEditingSpaceMembers(space.id)
    loadSpaceRoles(space.id)
    loadMemberRoles(space.id)
    loadSpaceAuditLogs(space.id)
    loadSpaceEmojis(space.id)
    setShowSpaceSettingsModal(true)
  }, [loadEditingSpaceMembers, loadSpaceRoles, loadMemberRoles, loadSpaceAuditLogs, loadSpaceEmojis])

  const handleSaveSpaceSettings = useCallback(async (event?: FormEvent) => {
    if (event) event.preventDefault()
    if (!supabase || !editingSpace || !editingSpaceName.trim()) return
    setError('')

    const payload = {
      name: editingSpaceName.trim(),
      description: editingSpaceDescription.trim(),
      icon_url: editingSpaceIconUrl || null,
      banner_url: editingSpaceBannerUrl || null,
      banner_theme: editingSpaceBannerTheme || 'dark',
      welcome_channel_id: editingSpaceWelcomeChannelId || null
    }

    let localMeta: Record<string, any> = {}
    try {
      localMeta = JSON.parse(localStorage.getItem('echo-spaces-metadata') || '{}')
    } catch {
      localMeta = {}
    }
    localMeta[editingSpace.id] = payload
    localStorage.setItem('echo-spaces-metadata', JSON.stringify(localMeta))

    addAuditLog(editingSpace.id, 'Atualizou as configurações gerais do espaço')

    try {
      await supabase
        .from('spaces')
        .update(payload)
        .eq('id', editingSpace.id)
    } catch (e) {
      console.warn('Update spaces DB error:', e)
    }

    setEditingSpace(prev => prev ? { ...prev, ...payload } : null)
    showToast('Espaço Atualizado!', 'Configurações salvas com sucesso.', 'info')
    await loadSpaces()
  }, [supabase, editingSpace, editingSpaceName, editingSpaceDescription, editingSpaceIconUrl, editingSpaceBannerUrl, editingSpaceBannerTheme, editingSpaceWelcomeChannelId, setError, addAuditLog, showToast, loadSpaces])

  const renameChannel = useCallback(async (channelId: string, newName: string) => {
    if (!supabase || !newName.trim()) return
    setError('')
    const { error: err } = await supabase
      .from('channels')
      .update({ name: newName.trim() })
      .eq('id', channelId)

    if (err) {
      setError(err.message)
    } else {
      if (editingSpace) {
        await loadChannelsForSpace(editingSpace.id)
      }
    }
  }, [supabase, setError, editingSpace, loadChannelsForSpace])

  const executeDeleteChannel = useCallback(async (channelId: string) => {
    if (!supabase || !editingSpace) return
    setError('')
    const { error: err } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)

    if (err) {
      setError(err.message)
    } else {
      if (selectedChannel?.id === channelId) {
        setSelectedChannel(null)
      }
      await loadChannelsForSpace(editingSpace.id)
    }
    setConfirmModalConfig(null)
  }, [supabase, editingSpace, setError, selectedChannel?.id, setSelectedChannel, loadChannelsForSpace, setConfirmModalConfig])

  const deleteChannel = useCallback((channelId: string) => {
    if (!editingSpace) return
    const ch = (spaceChannels[editingSpace.id] ?? []).find(c => c.id === channelId)
    if (!ch) return

    setConfirmModalConfig({
      isOpen: true,
      title: 'Excluir Canal',
      message: `Tem certeza de que deseja excluir o canal "# ${ch.name}"? Todas as mensagens dele serão perdidas permanentemente e esta ação não poderá ser desfeita.`,
      confirmText: 'Sim, Excluir',
      cancelText: 'Não, Cancelar',
      isDanger: true,
      onConfirm: () => {
        executeDeleteChannel(channelId)
      }
    })
  }, [editingSpace, spaceChannels, setConfirmModalConfig, executeDeleteChannel])

  const executeDeleteSpace = useCallback(async () => {
    if (!supabase || !editingSpace) return
    setError('')
    const { error: err } = await supabase
      .from('spaces')
      .delete()
      .eq('id', editingSpace.id)

    if (err) {
      setError(err.message)
    } else {
      setShowSpaceSettingsModal(false)
      setExpandedSpace(null)
      setSelectedChannel(null)
      await loadSpaces()
    }
    setConfirmModalConfig(null)
  }, [supabase, editingSpace, setError, setExpandedSpace, setSelectedChannel, loadSpaces, setConfirmModalConfig])

  const handleDeleteSpace = useCallback(() => {
    if (!editingSpace) return
    setConfirmModalConfig({
      isOpen: true,
      title: 'Encerrar Espaço',
      message: `Tem certeza de que deseja encerrar permanentemente o espaço "${editingSpace.name}"? Todos os canais e mensagens dele serão perdidos de forma irreversível e esta ação não poderá ser desfeita.`,
      confirmText: 'Sim, Encerrar',
      cancelText: 'Não, Cancelar',
      isDanger: true,
      onConfirm: () => {
        executeDeleteSpace()
      }
    })
  }, [editingSpace, setConfirmModalConfig, executeDeleteSpace])

  const handleLeaveSpace = useCallback((space: Space) => {
    const client = supabase
    if (!space || !client) return
    setConfirmModalConfig({
      isOpen: true,
      title: 'Sair do Espaço',
      message: `Tem certeza de que deseja sair do espaço "${space.name}"? Você precisará de um convite para retornar.`,
      confirmText: 'Sim, Sair',
      cancelText: 'Não, Cancelar',
      isDanger: true,
      onConfirm: async () => {
        await client.from('space_members').delete().eq('space_id', space.id).eq('user_id', user.id)
        if (expandedSpace === space.id) {
          setExpandedSpace(null)
          setSelectedChannel(null)
        }
        await loadSpaces()
        setConfirmModalConfig(null)
        showToast('Você saiu do espaço', `Você não faz mais parte de "${space.name}".`, 'info')
      }
    })
  }, [supabase, setConfirmModalConfig, user?.id, expandedSpace, setExpandedSpace, setSelectedChannel, loadSpaces, showToast])

  const handleAddMemberToSpace = useCallback(async (spaceId: string, friend: FriendshipRequest): Promise<boolean> => {
    if (!supabase || !user) return false
    try {
      const { error: insertError } = await supabase
        .from('space_members')
        .insert({ space_id: spaceId, user_id: friend.user.id, role: 'member' })

      if (insertError) {
        if (!insertError.message?.includes('duplicate') && !insertError.message?.includes('unique')) {
          throw insertError
        }
      }

      try {
        const { data: defaultRoles } = await supabase
          .from('space_roles')
          .select('id')
          .eq('space_id', spaceId)
          .eq('is_default', true)
        if (defaultRoles && defaultRoles.length > 0) {
          for (const dr of defaultRoles) {
            await supabase.from('space_member_roles').insert({
              space_id: spaceId,
              user_id: friend.user.id,
              role_id: dr.id
            })
          }
        }
      } catch (roleErr) {
        console.warn('Erro ao atribuir cargo padrão ao novo membro:', roleErr)
      }

      setSpaceMembers(prev => {
        if (prev.some((m: any) => (m?.user?.id || m?.id) === friend.user.id)) return prev
        return [...prev, { role: 'member', user: friend.user, space_id: spaceId }]
      })

      setSpaces(prev => prev.map(s => s.id === spaceId ? { ...s, member_count: (s.member_count || 1) + 1 } : s))

      try {
        const spObj = spaces.find(s => s.id === spaceId)
        const spaceName = spObj?.name || 'servidor'
        const inviteUrl = getPublicInviteUrl(spaceId)
        const msg = `👋 Olá! Adicionei você ao espaço "${spaceName}" no Echo!
🔗 Entre diretamente por aqui: ${inviteUrl}
🔑 Código do Espaço: ${spaceId}`
        await supabase.from('direct_messages').insert({
          sender_id: user.id,
          receiver_id: friend.user.id,
          body: msg
        })
        const effectiveProfileName = getProfileDisplayName ? getProfileDisplayName() : profileDisplayName
        socialChannelRef.current?.send({
          type: 'broadcast',
          event: 'dm-event',
          payload: {
            receiverId: friend.user.id,
            senderId: user.id,
            senderName: effectiveProfileName || displayName || 'Amigo',
            body: msg
          }
        })
      } catch (dmErr) {}

      showToast('Membro Adicionado!', `@${friend.user.display_name} agora faz parte do espaço.`, 'friend')
      return true
    } catch (err: any) {
      console.error('handleAddMemberToSpace error:', err)
      showToast('Erro ao adicionar', err?.message || 'Não foi possível adicionar o membro.', 'info')
      return false
    }
  }, [supabase, user, setSpaceMembers, setSpaces, spaces, socialChannelRef, profileDisplayName, displayName, showToast])

  return {
    editingSpace,
    setEditingSpace,
    editingSpaceName,
    setEditingSpaceName,
    editingSpaceDescription,
    setEditingSpaceDescription,
    editingSpaceIconUrl,
    setEditingSpaceIconUrl,
    editingSpaceBannerUrl,
    setEditingSpaceBannerUrl,
    editingSpaceBannerTheme,
    setEditingSpaceBannerTheme,
    editingSpaceWelcomeChannelId,
    setEditingSpaceWelcomeChannelId,
    uploadingSpaceIcon,
    setUploadingSpaceIcon,
    uploadingSpaceBanner,
    setUploadingSpaceBanner,
    activeSpaceTab,
    setActiveSpaceTab,
    editingSpaceMembers,
    setEditingSpaceMembers,
    memberSearchQuery,
    setMemberSearchQuery,
    loadingEditingMembers,
    setLoadingEditingMembers,
    showSpaceSettingsModal,
    setShowSpaceSettingsModal,
    collapsedCategories,
    setCollapsedCategories,
    serverAuditLogs,
    setServerAuditLogs,
    mutedSpaces,
    setMutedSpaces,
    loadEditingSpaceMembers,
    addAuditLog,
    loadSpaceAuditLogs,
    handleSpaceIconUpload,
    handleRemoveSpaceIcon,
    handleSpaceBannerUpload,
    handleRemoveSpaceBanner,
    toggleCategoryCollapse,
    handleRoleChange,
    handleKickMember,
    moveChannel,
    updateChannelSettings,
    toggleMuteSpace,
    triggerDesktopNotification,
    openSpaceSettings,
    handleSaveSpaceSettings,
    renameChannel,
    executeDeleteChannel,
    deleteChannel,
    executeDeleteSpace,
    handleDeleteSpace,
    handleLeaveSpace,
    handleAddMemberToSpace
  }
}
