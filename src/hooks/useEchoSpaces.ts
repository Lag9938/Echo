import { useState, useRef, useEffect, useMemo, useCallback, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Space, Channel } from '../types'

export interface UseEchoSpacesOptions {
  user: User
  getProfileDisplayName?: () => string
  getProfileAvatarUrl?: () => string
  displayName: string
  getAvatarDecoration?: () => string
  getProfileEffect?: () => string
  setPage: (page: any) => void
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  setError: (err: string) => void
  handleJoinVoice?: (channelId: string, explicitSpaceId?: string) => Promise<void>
  addAuditLog?: (spaceId: string, action: string) => void
  loadSpaceRoles?: (spaceId: string) => Promise<void>
  loadMemberRoles?: (spaceId: string) => Promise<void>
  setMessages?: (msgs: any[]) => void
  supabase: any
}

export function useEchoSpaces({
  user,
  getProfileDisplayName,
  getProfileAvatarUrl,
  displayName,
  getAvatarDecoration,
  getProfileEffect,
  setPage,
  showToast,
  setError,
  handleJoinVoice,
  addAuditLog,
  loadSpaceRoles,
  loadMemberRoles,
  setMessages,
  supabase,
}: UseEchoSpacesOptions) {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [expandedSpace, setExpandedSpace] = useState<string | null>(null)
  const [spaceChannels, setSpaceChannels] = useState<Record<string, Channel[]>>({})
  const spaceChannelsRef = useRef(spaceChannels)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  
  // Mapa isolado de membros por space_id: Record<spaceId, Member[]>
  const [spaceMembersMap, setSpaceMembersMap] = useState<Record<string, any[]>>({})
  const spaceMembersMapRef = useRef<Record<string, any[]>>({})
  spaceMembersMapRef.current = spaceMembersMap

  const activeSpaceId = expandedSpace || selectedChannel?.space_id || null

  // Lista de membros do espaço ativo atual (estritamente isolado por spaceId)
  const spaceMembers = useMemo(() => {
    if (!activeSpaceId) return []
    return spaceMembersMap[activeSpaceId] || []
  }, [spaceMembersMap, activeSpaceId])

  const setSpaceMembers = useCallback((updater: any[] | ((prev: any[]) => any[])) => {
    const currentId = expandedSpace || selectedChannel?.space_id || null
    if (!currentId) return
    setSpaceMembersMap(prevMap => {
      const currentList = prevMap[currentId] || []
      const nextList = typeof updater === 'function' ? updater(currentList) : updater
      return {
        ...prevMap,
        [currentId]: nextList
      }
    })
  }, [expandedSpace, selectedChannel?.space_id])

  const spaceMembersRef = useRef<any[]>([])
  spaceMembersRef.current = spaceMembers
  const registeredSpacesRef = useRef<Set<string>>(new Set())
  const loadSpaceMembersTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Limpa caches corrompidos de versões anteriores do localStorage na inicialização
  useEffect(() => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i)
        if (key && key.startsWith('echo-space-members-')) {
          localStorage.removeItem(key)
        }
      }
    } catch (e) {}
  }, [])

  // Space Creation & Invitation States
  const [newSpace, setNewSpace] = useState('')
  const [creating, setCreating] = useState(false)
  const [showAddSpaceModal, setShowAddSpaceModal] = useState(false)
  const [joinSpaceCode, setJoinSpaceCode] = useState('')
  const [joining, setJoining] = useState(false)

  // Channel Creation States
  const [showNewChannel, setShowNewChannel] = useState<string | null>(null)
  const [newChannelName, setNewChannelName] = useState('')
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text')
  const [newChannelTopic, setNewChannelTopic] = useState('')
  const [newChannelIsAnnouncement, setNewChannelIsAnnouncement] = useState(false)
  const [newChannelUserLimit, setNewChannelUserLimit] = useState<number>(0)
  const [newChannelSlowmode, setNewChannelSlowmode] = useState<number>(0)
  const [newChannelCategory, setNewChannelCategory] = useState('')
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false)
  const [newChannelAllowedRoles, setNewChannelAllowedRoles] = useState<string[]>([])

  // Keep spaceChannelsRef updated
  useEffect(() => {
    spaceChannelsRef.current = spaceChannels
  }, [spaceChannels])

  async function ensureProfile() {
    if (!supabase) return
    await supabase.from('profiles').upsert({ id: user.id, display_name: displayName }, { onConflict: 'id', ignoreDuplicates: true })
  }

  async function loadSpaces() {
    const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true')
    if (isMock) {
      const mockSp: Space = { id: 'space-mock-1', name: 'Echo Lounge', description: '', creator_id: user.id, created_at: new Date().toISOString() }
      setSpaces([mockSp])
      setExpandedSpace(mockSp.id)
      loadChannelsForSpace(mockSp.id)
      return
    }
    if (!supabase) return
    await ensureProfile()
    const { data, error: queryError } = await supabase.from('space_members').select('spaces(*)').eq('user_id', user.id)
    if (queryError) { setError(queryError.message); return }

    let localMeta: Record<string, { icon_url?: string; banner_url?: string; banner_theme?: string; welcome_channel_id?: string }> = {}
    try {
      localMeta = JSON.parse(localStorage.getItem('echo-spaces-metadata') || '{}')
    } catch {
      localMeta = {}
    }

    const result = (data ?? []).map((row: any) => {
      const sp = Array.isArray(row.spaces) ? row.spaces[0] : row.spaces
      if (!sp) return null
      return {
        ...sp,
        icon_url: sp.icon_url || localMeta[sp.id]?.icon_url || '',
        banner_url: sp.banner_url || localMeta[sp.id]?.banner_url || '',
        banner_theme: sp.banner_theme || localMeta[sp.id]?.banner_theme || 'dark',
        welcome_channel_id: sp.welcome_channel_id || localMeta[sp.id]?.welcome_channel_id || ''
      }
    }).filter((space: any): space is Space => Boolean(space))

    setSpaces(result)
    if (result.length > 0 && !expandedSpace) {
      setExpandedSpace(result[0].id)
    }
  }

  async function loadChannelsForSpace(spaceId: string) {
    const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true')
    if (isMock) {
      const mockChs: Channel[] = [
        { id: 'mock-ch-general', name: 'geral', type: 'text', space_id: spaceId, position: 0, topic: 'Bate-papo da comunidade' },
        { id: 'mock-ch-voice', name: 'Voz & Resenha', type: 'voice', space_id: spaceId, position: 1, topic: 'Canal de voz aberto' }
      ]
      setSpaceChannels(prev => ({ ...prev, [spaceId]: mockChs }))
      if (!selectedChannel) {
        setSelectedChannel(window.location.search.includes('channel=text') ? mockChs[0] : mockChs[1])
      }
      return
    }
    if (!supabase) return
    const { data, error: queryError } = await supabase.from('channels').select('*').eq('space_id', spaceId).order('position')
    if (queryError) { setError(queryError.message); return }

    let localChannelMeta: Record<string, { topic?: string; position?: number; is_announcement?: boolean; user_limit?: number; slowmode_seconds?: number; category?: string; is_private?: boolean; allowed_role_ids?: string[] }> = {}
    try {
      localChannelMeta = JSON.parse(localStorage.getItem('echo-channels-metadata') || '{}')
    } catch {
      localChannelMeta = {}
    }

    const result = ((data ?? []) as any[]).map((ch, idx) => ({
      id: ch.id,
      name: ch.name,
      type: ch.type,
      space_id: ch.space_id,
      topic: ch.topic || localChannelMeta[ch.id]?.topic || '',
      position: ch.position !== undefined ? ch.position : (localChannelMeta[ch.id]?.position !== undefined ? localChannelMeta[ch.id]?.position : idx),
      is_announcement: ch.is_announcement !== undefined ? ch.is_announcement : (localChannelMeta[ch.id]?.is_announcement || false),
      user_limit: ch.user_limit !== undefined ? ch.user_limit : (localChannelMeta[ch.id]?.user_limit || 0),
      slowmode_seconds: ch.slowmode_seconds !== undefined ? ch.slowmode_seconds : (localChannelMeta[ch.id]?.slowmode_seconds || 0),
      category: ch.category || localChannelMeta[ch.id]?.category || '',
      is_private: ch.is_private !== undefined ? ch.is_private : (localChannelMeta[ch.id]?.is_private || false),
      allowed_role_ids: ch.allowed_role_ids !== undefined ? ch.allowed_role_ids : (localChannelMeta[ch.id]?.allowed_role_ids || [])
    }))

    result.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    setSpaceChannels(prev => ({ ...prev, [spaceId]: result }))
    if (result.length > 0) {
      if (!selectedChannel || selectedChannel.space_id !== spaceId) {
        const firstText = result.find(c => c.type === 'text') || result[0]
        if (firstText) {
          setSelectedChannel(firstText)
        }
      }
    }
  }

  async function loadSpaceMembers(spaceId: string) {
    if (!supabase || !spaceId) return
    try {
      const memberMap = new Map<string, any>()

      // 1. Consulta membros do banco de dados na tabela space_members (FONTE REAL DE VERDADE)
      let dbSuccess = false
      try {
        const { data, error: queryError } = await supabase
          .from('space_members')
          .select('role, user:profiles(id, display_name, avatar_url)')
          .eq('space_id', spaceId)

        if (!queryError && data) {
          data.forEach((row: any) => {
            const u = Array.isArray(row.user) ? row.user[0] : row.user
            if (u?.id) {
              memberMap.set(u.id, { role: row.role || 'member', user: u, space_id: spaceId })
              dbSuccess = true
            }
          })
        }
      } catch (dbErr) {
        console.warn("loadSpaceMembers db error", dbErr)
      }

      // 2. Fallback: Se o join direto falhou, busca por user_id e perfis separadamente
      if (!dbSuccess && memberMap.size === 0) {
        try {
          const { data: directMembers } = await supabase
            .from('space_members')
            .select('user_id, role')
            .eq('space_id', spaceId)

          if (directMembers && directMembers.length > 0) {
            const uIds = directMembers.map((d: any) => d.user_id)
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, display_name, avatar_url')
              .in('id', uIds)

            const profMap = new Map((profs || []).map((p: any) => [p.id, p]))
            directMembers.forEach((d: any) => {
              const u = profMap.get(d.user_id) || { id: d.user_id, display_name: 'Membro', avatar_url: '' }
              memberMap.set(d.user_id, { role: d.role || 'member', user: u, space_id: spaceId })
            })
          }
        } catch (fbErr) {
          console.warn("loadSpaceMembers direct fallback error", fbErr)
        }
      }

      // 3. Garante que o Criador/Dono do servidor está na lista
      const spObj = spaces.find(s => s.id === spaceId)
      if (spObj && spObj.creator_id && !memberMap.has(spObj.creator_id)) {
        try {
          const { data: creatorProf } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url')
            .eq('id', spObj.creator_id)
            .maybeSingle()

          if (creatorProf) {
            memberMap.set(spObj.creator_id, { role: 'owner', user: creatorProf, space_id: spaceId })
          }
        } catch (crErr) {}
      }

      // 4. Se o usuário logado for o criador do servidor, garante na lista
      const profName = getProfileDisplayName ? getProfileDisplayName() : displayName
      const profAvatar = getProfileAvatarUrl ? getProfileAvatarUrl() : ''

      if (user && !memberMap.has(user.id) && spObj?.creator_id === user.id) {
        const myMemberObj = {
          role: 'owner',
          user: { id: user.id, display_name: profName || 'Membro', avatar_url: profAvatar },
          space_id: spaceId
        }
        memberMap.set(user.id, myMemberObj)
        if (!registeredSpacesRef.current.has(spaceId)) {
          registeredSpacesRef.current.add(spaceId)
          supabase.from('space_members').upsert({ space_id: spaceId, user_id: user.id, role: 'owner' }).then(() => {})
        }
      }

      const finalList = Array.from(memberMap.values())
      setSpaceMembersMap(prev => ({
        ...prev,
        [spaceId]: finalList
      }))
    } catch (err) {
      console.warn("loadSpaceMembers catch", err)
    }
  }

  // Realtime space members and presence subscription
  useEffect(() => {
    const currentSpaceId = expandedSpace || selectedChannel?.space_id
    if (!supabase || !currentSpaceId) {
      return
    }

    loadSpaceMembers(currentSpaceId)
    loadSpaceRoles?.(currentSpaceId)
    loadMemberRoles?.(currentSpaceId)

    const debouncedLoadMembers = (spId: string) => {
      if (loadSpaceMembersTimeoutRef.current) {
        clearTimeout(loadSpaceMembersTimeoutRef.current)
      }
      loadSpaceMembersTimeoutRef.current = setTimeout(() => {
        loadSpaceMembers(spId)
      }, 600)
    }

    // Canal Realtime para mudanças no banco (Postgres changes)
    const membersChannel = supabase
      .channel(`public-space-members-${currentSpaceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'space_members', filter: `space_id=eq.${currentSpaceId}` }, () => {
        debouncedLoadMembers(currentSpaceId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'space_roles', filter: `space_id=eq.${currentSpaceId}` }, () => {
        loadSpaceRoles?.(currentSpaceId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'space_member_roles', filter: `space_id=eq.${currentSpaceId}` }, () => {
        loadMemberRoles?.(currentSpaceId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'spaces', filter: `id=eq.${currentSpaceId}` }, () => {
        loadSpaces()
      })
      .subscribe()

    // Canal Realtime de Presença do Servidor (WebSockets direto, imune a RLS)
    const spacePresenceChannel = supabase.channel(`space-presence-${currentSpaceId}`, {
      config: { presence: { key: user.id } }
    })

    const handleSpacePresenceSync = () => {
      const state = spacePresenceChannel.presenceState()
      const liveUsers: any[] = []
      Object.keys(state).forEach(key => {
        const presList = state[key]
        if (presList && presList.length > 0) {
          const p = presList[0] as any
          if (p && p.user_id) {
            liveUsers.push({
              role: p.role || 'member',
              user: {
                id: p.user_id,
                display_name: p.display_name || 'Membro',
                avatar_url: p.avatar_url,
                avatar_decoration: p.avatar_decoration
              }
            })
          }
        }
      })

      if (liveUsers.length > 0) {
        setSpaceMembersMap(prevMap => {
          const list = prevMap[currentSpaceId] || []
          if (list.length === 0) return prevMap
          const map = new Map<string, any>()
          list.forEach(m => { if (m?.user?.id) map.set(m.user.id, m) })

          let hasChanges = false
          liveUsers.forEach(liveU => {
            const existing = map.get(liveU.user.id)
            if (existing) {
              // Atualiza cosméticos e display name em tempo real para membros existentes
              const updated = {
                ...existing,
                user: {
                  ...existing.user,
                  display_name: liveU.user.display_name || existing.user.display_name,
                  avatar_url: liveU.user.avatar_url ?? existing.user.avatar_url,
                  avatar_decoration: liveU.user.avatar_decoration ?? existing.user.avatar_decoration
                }
              }
              map.set(liveU.user.id, updated)
              hasChanges = true
            }
          })
          if (!hasChanges) return prevMap
          return {
            ...prevMap,
            [currentSpaceId]: Array.from(map.values())
          }
        })
      }
    }

    const trackSpacePresence = async () => {
      const spObj = spaces.find(s => s.id === currentSpaceId)
      const isOwner = spObj?.creator_id === user.id
      const deco = getAvatarDecoration ? getAvatarDecoration() : ''
      const eff = getProfileEffect ? getProfileEffect() : ''
      const savedDecoration = localStorage.getItem(`echo-avatar-decoration-${user.id}`) || localStorage.getItem('echo-avatar-decoration') || deco || ''
      const savedEffect = localStorage.getItem(`echo-profile-effect-${user.id}`) || localStorage.getItem('echo-profile-effect') || eff || ''
      const profName = getProfileDisplayName ? getProfileDisplayName() : displayName
      const profAvatar = getProfileAvatarUrl ? getProfileAvatarUrl() : ''

      await spacePresenceChannel.track({
        user_id: user.id,
        display_name: profName || displayName,
        avatar_url: profAvatar,
        role: isOwner ? 'owner' : 'member',
        space_id: currentSpaceId,
        avatar_decoration: savedDecoration,
        profile_effect: savedEffect
      }).catch(() => {})
    }

    spacePresenceChannel
      .on('presence', { event: 'sync' }, handleSpacePresenceSync)
      .on('presence', { event: 'join' }, handleSpacePresenceSync)
      .on('presence', { event: 'leave' }, handleSpacePresenceSync)
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await trackSpacePresence()
          handleSpacePresenceSync()
        }
      })

    // Sincronização periódica de redundância (a cada 60s)
    const syncInterval = setInterval(() => {
      loadSpaceMembers(currentSpaceId)
      trackSpacePresence()
    }, 60000)

    return () => {
      if (loadSpaceMembersTimeoutRef.current) {
        clearTimeout(loadSpaceMembersTimeoutRef.current)
      }
      clearInterval(syncInterval)
      spacePresenceChannel.untrack().catch(() => {})
      supabase?.removeChannel(membersChannel)
      supabase?.removeChannel(spacePresenceChannel)
    }
  }, [expandedSpace, selectedChannel?.space_id, user?.id])

  // Sync channels on expandedSpace change
  useEffect(() => {
    if (expandedSpace) {
      if (selectedChannel && selectedChannel.space_id !== expandedSpace) {
        setMessages?.([])
        const chs = spaceChannelsRef.current[expandedSpace] || []
        const firstCh = chs.find(c => c.type === 'text') || chs[0] || null
        setSelectedChannel(firstCh)
      }
      loadChannelsForSpace(expandedSpace)
    }
  }, [expandedSpace])

  async function createSpace(event: FormEvent) {
    event.preventDefault(); if (!supabase || !newSpace.trim()) return
    setCreating(true); setError('')
    const { data: space, error: spaceError } = await supabase.from('spaces').insert({ name: newSpace.trim(), creator_id: user.id }).select().single()
    if (spaceError || !space) { setError(spaceError?.message ?? 'Não foi possível criar o espaço.'); setCreating(false); return }
    await supabase.from('space_members').insert({ space_id: space.id, user_id: user.id, role: 'owner' })
    await supabase.from('channels').insert({ space_id: space.id, name: 'Geral', type: 'text', position: 0 })
    setNewSpace(''); setCreating(false)
    await loadSpaces()
    setExpandedSpace(space.id)
    await loadChannelsForSpace(space.id)
  }

  async function processSpaceInvite(rawInput: string) {
    if (!supabase || !rawInput.trim()) return
    setJoining(true)
    setError('')
    let code = rawInput.trim()
    let targetChannelId: string | null = null

    // Extrai parâmetro de canal se presente no link (?channel=id ou &channel=id)
    const chMatch = rawInput.match(/[?&]channel=([a-f0-9-]{36}|[a-zA-Z0-9_-]{10,})/i)
    if (chMatch && chMatch[1]) {
      targetChannelId = chMatch[1]
    }

    // Suporta links como echo://invite/{id}, https://.../invite/{id} ou UUID puro
    const urlMatch = rawInput.match(/(?:invite\/|^)([a-f0-9-]{36}|[a-zA-Z0-9_-]{10,})/i)
    if (urlMatch && urlMatch[1]) {
      code = urlMatch[1]
    }
    
    try {
      const { data: space, error: spaceError } = await supabase
        .from('spaces')
        .select('id, name')
        .eq('id', code)
        .single()
        
      if (spaceError || !space) {
        setError('Link de convite inválido ou espaço não encontrado.')
        showToast('Convite Inválido', 'Espaço ou canal não encontrado.', 'info')
        setJoining(false)
        return
      }
      
      const { data: member } = await supabase
        .from('space_members')
        .select('space_id')
        .eq('space_id', space.id)
        .eq('user_id', user.id)
        .maybeSingle()
        
      if (member) {
        setShowAddSpaceModal(false)
        setJoinSpaceCode('')
        setJoining(false)
        setPage('Servidores')
        setExpandedSpace(space.id)
        await loadChannelsForSpace(space.id)

        const chs = spaceChannels[space.id] || []
        const chToJoin = targetChannelId 
          ? chs.find(c => c.id === targetChannelId)
          : (chs.find(c => c.type === 'voice') || chs.find(c => c.type === 'text') || chs[0])

        if (chToJoin) {
          setSelectedChannel(chToJoin)
          if (chToJoin.type === 'voice') {
            handleJoinVoice?.(chToJoin.id, space.id)
            showToast("Conectado!", `Você entrou na chamada "${chToJoin.name}".`, "info")
          } else {
            showToast("Canal Aberto", `Navegando para #${chToJoin.name}.`, "info")
          }
        } else {
          showToast("Espaço Aberto", `Você já está no espaço "${space.name}".`, "info")
        }
        return
      }
      
      const { error: insertError } = await supabase
        .from('space_members')
        .insert({ space_id: space.id, user_id: user.id, role: 'member' })
        
      if (insertError) {
        setError(insertError.message)
        setJoining(false)
        return
      }

      // Atribuição automática do Cargo Padrão do Espaço para novos membros
      try {
        const { data: defaultRoles } = await supabase
          .from('space_roles')
          .select('id')
          .eq('space_id', space.id)
          .eq('is_default', true)
          .limit(1)

        if (defaultRoles && defaultRoles.length > 0) {
          await supabase.from('space_member_roles').insert({
            space_id: space.id,
            user_id: user.id,
            role_id: defaultRoles[0].id
          })
        }
      } catch (errDefault) {
        console.warn('Erro ao atribuir cargo padrão ao novo membro:', errDefault)
      }
      
      setShowAddSpaceModal(false)
      setJoinSpaceCode('')
      setJoining(false)
      await loadSpaces()
      setPage('Servidores')
      setExpandedSpace(space.id)
      await loadChannelsForSpace(space.id)

      const chs = spaceChannels[space.id] || []
      const chToJoin = targetChannelId 
        ? chs.find(c => c.id === targetChannelId)
        : (chs.find(c => c.type === 'voice') || chs.find(c => c.type === 'text') || chs[0])

      if (chToJoin) {
        setSelectedChannel(chToJoin)
        if (chToJoin.type === 'voice') {
          handleJoinVoice?.(chToJoin.id, space.id)
        }
      }

      showToast("Bem-vindo!", `Você entrou no espaço "${space.name}".`, "info")
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar no espaço.')
      setJoining(false)
    }
  }

  async function joinSpace(event: FormEvent) {
    event.preventDefault()
    if (!joinSpaceCode.trim()) return
    await processSpaceInvite(joinSpaceCode.trim())
  }

  async function createChannel(event: FormEvent, spaceId: string) {
    event.preventDefault(); if (!supabase || !newChannelName.trim()) return
    setError('')
    const currentChannels = spaceChannels[spaceId] ?? []
    const { data: createdCh, error: channelError } = await supabase.from('channels').insert({
      space_id: spaceId,
      name: newChannelName.trim(),
      type: newChannelType,
      position: currentChannels.length,
      is_private: newChannelIsPrivate,
      allowed_role_ids: newChannelAllowedRoles
    }).select().single()
    if (channelError) { setError(channelError.message); return }

    if (createdCh) {
      let localChannelMeta: Record<string, { topic?: string; position?: number; is_announcement?: boolean; user_limit?: number; slowmode_seconds?: number; category?: string; is_private?: boolean; allowed_role_ids?: string[] }> = {}
      try {
        localChannelMeta = JSON.parse(localStorage.getItem('echo-channels-metadata') || '{}')
      } catch {
        localChannelMeta = {}
      }
      localChannelMeta[createdCh.id] = {
        ...localChannelMeta[createdCh.id],
        topic: newChannelTopic.trim(),
        is_announcement: newChannelIsAnnouncement,
        user_limit: newChannelUserLimit,
        slowmode_seconds: newChannelSlowmode,
        category: newChannelCategory.trim(),
        is_private: newChannelIsPrivate,
        allowed_role_ids: newChannelAllowedRoles
      }
      localStorage.setItem('echo-channels-metadata', JSON.stringify(localChannelMeta))
    }

    addAuditLog?.(spaceId, `Criou o canal "${newChannelName.trim()}" (${newChannelType === 'text' ? 'Texto' : 'Voz'}${newChannelIsPrivate ? ' - Privado' : ''})`)
    setNewChannelName(''); setNewChannelTopic(''); setNewChannelIsAnnouncement(false); setNewChannelUserLimit(0); setNewChannelSlowmode(0); setNewChannelCategory(''); setNewChannelIsPrivate(false); setNewChannelAllowedRoles([]); setShowNewChannel(null); setNewChannelType('text')
    await loadChannelsForSpace(spaceId)
  }

  function getSpaceForChannel(channel: Channel | null) {
    if (!channel) return null
    return spaces.find(s => s.id === channel.space_id) ?? null
  }

  return {
    spaces,
    setSpaces,
    expandedSpace,
    setExpandedSpace,
    spaceChannels,
    setSpaceChannels,
    spaceChannelsRef,
    selectedChannel,
    setSelectedChannel,
    spaceMembers,
    setSpaceMembers,
    newSpace,
    setNewSpace,
    creating,
    setCreating,
    showAddSpaceModal,
    setShowAddSpaceModal,
    joinSpaceCode,
    setJoinSpaceCode,
    joining,
    setJoining,
    showNewChannel,
    setShowNewChannel,
    newChannelName,
    setNewChannelName,
    newChannelType,
    setNewChannelType,
    newChannelTopic,
    setNewChannelTopic,
    newChannelIsAnnouncement,
    setNewChannelIsAnnouncement,
    newChannelUserLimit,
    setNewChannelUserLimit,
    newChannelSlowmode,
    setNewChannelSlowmode,
    newChannelCategory,
    setNewChannelCategory,
    newChannelIsPrivate,
    setNewChannelIsPrivate,
    newChannelAllowedRoles,
    setNewChannelAllowedRoles,
    loadSpaces,
    loadChannelsForSpace,
    loadSpaceMembers,
    createSpace,
    processSpaceInvite,
    joinSpace,
    createChannel,
    getSpaceForChannel
  }
}
