import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import type { Message, Channel, Space, RolePermissions } from '../types'

export interface UseEchoChannelMessagesOptions {
  user: User
  profileDisplayName: string
  profileAvatarUrl?: string
  displayName: string
  selectedChannel: Channel | null
  spaces: Space[]
  sfxVolume: number
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  setError: (err: string) => void
  playDmNotificationSound: (volume: number) => void
  supabase: any
}

export function useEchoChannelMessages({
  user,
  profileDisplayName,
  profileAvatarUrl,
  displayName,
  selectedChannel,
  spaces,
  sfxVolume,
  canUserDo,
  showToast,
  setError,
  playDmNotificationSound,
  supabase
}: UseEchoChannelMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null)
  const [messageReactions, setMessageReactions] = useState<Record<string, Record<string, string[]>>>(() => {
    try {
      return JSON.parse(localStorage.getItem('echo-message-reactions') || '{}')
    } catch {
      return {}
    }
  })
  const [slowmodeCooldown, setSlowmodeCooldown] = useState<number>(0)
  const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const [typingUsersMap, setTypingUsersMap] = useState<Record<string, { name: string, timeout: any }>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelBroadcastRef = useRef<RealtimeChannel | null>(null)
  const isPrependingRef = useRef<boolean>(false)
  const messagesCacheRef = useRef<Record<string, Message[]>>({})
  const lastTypingSentRef = useRef<number>(0)

  // Slowmode timer
  useEffect(() => {
    if (slowmodeCooldown <= 0) return
    const interval = setInterval(() => {
      setSlowmodeCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [slowmodeCooldown])

  // Sincroniza o nome e avatar atualizados do próprio usuário no estado de mensagens e no cache local
  useEffect(() => {
    if (!user || !profileDisplayName) return
    setMessages(prev => {
      let changed = false
      const updated = prev.map(m => {
        if (m.author_id === user.id) {
          if (m.profile?.display_name !== profileDisplayName || (profileAvatarUrl && m.profile?.avatar_url !== profileAvatarUrl)) {
            changed = true
            return {
              ...m,
              profile: {
                ...m.profile,
                display_name: profileDisplayName,
                avatar_url: profileAvatarUrl || m.profile?.avatar_url
              }
            }
          }
        }
        return m
      })
      if (changed && selectedChannel) {
        messagesCacheRef.current[selectedChannel.id] = updated
        try {
          localStorage.setItem(`echo-msgs-${selectedChannel.id}`, JSON.stringify(updated.slice(-50)))
        } catch (e) {}
        return updated
      }
      return prev
    })
  }, [profileDisplayName, profileAvatarUrl, user?.id, selectedChannel?.id])

  // Resilient load messages function with instant memory + localStorage cache & delta query
  async function loadMessages(channelId: string, forceFullFetch = false) {
    const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true')
    if (isMock) {
      setMessages([
        { id: 'msg-1', body: 'Olá! Este canal de voz agora possui o chat de texto completo integrado.', created_at: new Date().toISOString(), author_id: 'friend-valkyrie', profile: { display_name: 'Valkyrie_Echo' }, status: 'sent' },
        { id: 'msg-2', body: 'Perfeito! O chat de texto é exibido diretamente, sem tela vazia.', created_at: new Date().toISOString(), author_id: user.id, profile: { display_name: 'Lag9938' }, status: 'sent' }
      ])
      return
    }
    if (!supabase) return

    // 1. Render instantâneo do cache local (0ms e 0 requisições desnecessárias)
    let currentCached: Message[] = []
    let foundCached = false
    if (messagesCacheRef.current[channelId] && messagesCacheRef.current[channelId].length > 0) {
      currentCached = messagesCacheRef.current[channelId]
      setMessages(currentCached)
      foundCached = true
    } else {
      try {
        const cached = localStorage.getItem(`echo-msgs-${channelId}`)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentCached = parsed
            messagesCacheRef.current[channelId] = parsed
            setMessages(parsed)
            foundCached = true
          }
        }
      } catch (e) {}
    }

    // Se o canal ainda não possui cache, limpa a tela de mensagens antigas imediatamente
    if (!foundCached) {
      setMessages([])
    }

    // 2. Busca Delta Inteligente (Supabase Query Optimization)
    const newestCached = !forceFullFetch && currentCached.length > 0
      ? [...currentCached].reverse().find(m => m.status === 'sent' && m.created_at)
      : null

    if (newestCached && newestCached.created_at) {
      try {
        const { data: deltaData, error: deltaErr } = await supabase
          .from('messages')
          .select('id,body,created_at,author_id,attachment_url,attachment_type,profiles(display_name,avatar_url)')
          .eq('channel_id', channelId)
          .gt('created_at', newestCached.created_at)
          .order('created_at', { ascending: true })
          .limit(50)

        if (!deltaErr && deltaData) {
          if (deltaData.length === 0) {
            return
          }

          const newLoaded: Message[] = deltaData.map((row: any) => ({
            ...row,
            profile: Array.isArray(row.profiles) ? row.profiles?.[0] : row.profiles,
            status: 'sent' as const
          }))

          setMessages(prev => {
            const existingMap = new Map(prev.map(m => [m.id, m]))
            newLoaded.forEach(nm => {
              existingMap.set(nm.id, nm)
            })
            const merged = Array.from(existingMap.values()).sort((a, b) => {
              const tA = a.created_at ? new Date(a.created_at).getTime() : 0
              const tB = b.created_at ? new Date(b.created_at).getTime() : 0
              return tA - tB
            })
            messagesCacheRef.current[channelId] = merged
            try {
              localStorage.setItem(`echo-msgs-${channelId}`, JSON.stringify(merged.slice(-50)))
            } catch (e) {}
            return merged
          })
          return
        }
      } catch (deltaCatchErr) {
        console.warn('[Cache] Erro no fetch delta, caindo para busca completa:', deltaCatchErr)
      }
    }

    // 3. Busca Completa Paginada (Fallback ou primeira abertura do canal)
    const { data, error: queryError } = await supabase
      .from('messages')
      .select('id,body,created_at,author_id,attachment_url,attachment_type,profiles(display_name,avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (queryError) { setError(queryError.message); return }

    const rawData = data ?? []
    setHasMoreMessages(rawData.length >= 50)

    // Reverte para manter a ordem cronológica correta (mais antigas no topo)
    const loaded: Message[] = [...rawData].reverse().map((row: any) => ({
      ...row,
      profile: Array.isArray(row.profiles) ? row.profiles?.[0] : row.profiles,
      status: 'sent' as const
    }))

    setMessages(prev => {
      const pendingLocal = prev.filter(m => 
        (m.status === 'sending' || m.status === 'failed') &&
        !loaded.some(dbM => dbM.id === m.id || (m.tempId && dbM.id === m.tempId))
      )
      const merged = [...loaded, ...pendingLocal]
      messagesCacheRef.current[channelId] = merged
      try {
        localStorage.setItem(`echo-msgs-${channelId}`, JSON.stringify(merged.slice(-50)))
      } catch (e) {}
      return merged
    })

    // Carrega reações do banco para as mensagens visíveis
    loadReactionsForChannel(channelId)
  }

  // Carrega reações do Supabase para todas as mensagens de um canal
  async function loadReactionsForChannel(channelId: string) {
    if (!supabase) return
    try {
      // Busca IDs das mensagens do cache atual para o canal
      const msgs = messagesCacheRef.current[channelId] || []
      if (msgs.length === 0) return
      const msgIds = msgs.filter(m => m.status === 'sent').map(m => m.id)
      if (msgIds.length === 0) return

      const { data, error } = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', msgIds)

      if (error || !data) return

      // Agrega reações no formato { [messageId]: { [emoji]: userId[] } }
      const aggregated: Record<string, Record<string, string[]>> = {}
      for (const row of data) {
        if (!aggregated[row.message_id]) aggregated[row.message_id] = {}
        if (!aggregated[row.message_id][row.emoji]) aggregated[row.message_id][row.emoji] = []
        aggregated[row.message_id][row.emoji].push(row.user_id)
      }

      setMessageReactions(prev => {
        const next = { ...prev, ...aggregated }
        try {
          localStorage.setItem('echo-message-reactions', JSON.stringify(next))
        } catch {}
        return next
      })
    } catch (err) {
      console.warn('loadReactionsForChannel error:', err)
    }
  }

  // Infinite scroll pagination for older messages
  async function loadMoreMessages(channelId: string) {
    if (!supabase || isLoadingMore || !hasMoreMessages) return

    const oldest = messages.find(m => m.status === 'sent') || messages[0]
    if (!oldest || !oldest.created_at) return

    setIsLoadingMore(true)
    isPrependingRef.current = true

    try {
      const { data, error: queryError } = await supabase
        .from('messages')
        .select('id,body,created_at,author_id,attachment_url,attachment_type,profiles(display_name,avatar_url)')
        .eq('channel_id', channelId)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(50)

      if (queryError) {
        console.error('Error loading older messages:', queryError)
        return
      }

      const rawData = data ?? []
      if (rawData.length < 50) {
        setHasMoreMessages(false)
      }

      if (rawData.length === 0) return

      const olderMessages: Message[] = [...rawData].reverse().map((row: any) => ({
        ...row,
        profile: Array.isArray(row.profiles) ? row.profiles?.[0] : row.profiles,
        status: 'sent' as const
      }))

      const container = messagesContainerRef.current
      const prevScrollHeight = container ? container.scrollHeight : 0
      const prevScrollTop = container ? container.scrollTop : 0

      setMessages(prev => {
        const newItems = olderMessages.filter(om => !prev.some(pm => pm.id === om.id))
        const updated = [...newItems, ...prev]
        messagesCacheRef.current[channelId] = updated
        return updated
      })

      requestAnimationFrame(() => {
        if (container) {
          const diff = container.scrollHeight - prevScrollHeight
          container.scrollTop = prevScrollTop + diff
        }
        setTimeout(() => {
          isPrependingRef.current = false
        }, 120)
      })

    } catch (e) {
      console.error('Failed to load more messages:', e)
      isPrependingRef.current = false
    } finally {
      setIsLoadingMore(false)
    }
  }

  // Upload attachment file (images or documents)
  async function handleChatFileUpload(file: File, caption?: string) {
    if (!supabase || !selectedChannel) return
    setIsUploading(true)
    setError('')
    try {
      const rawExt = file.name && file.name.includes('.') ? file.name.split('.').pop() : (file.type.split('/')[1] || 'png')
      const ext = (rawExt || 'png').replace(/[^a-zA-Z0-9]/g, '')
      const path = `channels/${selectedChannel.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file)
      if (uploadError) {
        setError(uploadError.message)
        setIsUploading(false)
        return
      }
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
      const fileType = file.type.startsWith('image/') ? 'image' : 'file'
      const messageText = caption && caption.trim() ? caption.trim() : (file.name || 'Imagem')
      await postChannelMessage(selectedChannel.id, messageText, urlData.publicUrl, fileType)
    } catch (err: any) {
      setError(err.message || 'Erro no upload.')
    } finally {
      setIsUploading(false)
    }
  }

  // Toggle emoji reactions — persiste no Supabase e atualiza localmente de forma otimista
  function toggleReaction(messageId: string, emoji: string) {
    setMessageReactions(prev => {
      const msgReactions = prev[messageId] ? { ...prev[messageId] } : {}
      const userList = msgReactions[emoji] ? [...msgReactions[emoji]] : []
      const alreadyReacted = userList.includes(user.id)
      if (alreadyReacted) {
        const filtered = userList.filter(id => id !== user.id)
        if (filtered.length === 0) {
          delete msgReactions[emoji]
        } else {
          msgReactions[emoji] = filtered
        }
        // Remove do banco de dados
        if (supabase) {
          supabase.from('message_reactions')
            .delete()
            .eq('message_id', messageId)
            .eq('user_id', user.id)
            .eq('emoji', emoji)
            .then(({ error }: any) => { if (error) console.warn('reaction delete error:', error) })
        }
      } else {
        msgReactions[emoji] = [...userList, user.id]
        // Salva no banco de dados
        if (supabase) {
          supabase.from('message_reactions')
            .upsert({ message_id: messageId, user_id: user.id, emoji }, { onConflict: 'message_id,user_id,emoji' })
            .then(({ error }: any) => { if (error) console.warn('reaction upsert error:', error) })
        }
      }
      const next = { ...prev, [messageId]: msgReactions }
      try {
        localStorage.setItem('echo-message-reactions', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  // Optimistic message sender with real-time broadcast and DB persistence
  async function postChannelMessage(
    channelId: string, 
    body: string, 
    attachmentUrl?: string, 
    attachmentType?: string,
    existingTempId?: string
  ) {
    if (!supabase || !user) return

    const tempId = existingTempId || `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const nowIso = new Date().toISOString()

    const optimisticMsg: Message = {
      id: tempId,
      tempId,
      body,
      created_at: nowIso,
      author_id: user.id,
      profile: {
        display_name: profileDisplayName || displayName || 'Você',
        avatar_url: profileAvatarUrl
      },
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      status: 'sending'
    }

    if (existingTempId) {
      setMessages(prev => prev.map(m => (m.id === existingTempId || m.tempId === existingTempId) ? { ...m, status: 'sending' } : m))
    } else {
      setMessages(prev => [...prev, optimisticMsg])
    }

    // Broadcast instantâneo via WebSocket (0ms) para todos os conectados no canal
    channelBroadcastRef.current?.send({
      type: 'broadcast',
      event: 'new-message',
      payload: optimisticMsg
    }).catch(e => console.warn('Broadcast error:', e))

    try {
      const { data: inserted, error: insertError } = await supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          author_id: user.id,
          body,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType
        })
        .select('id,body,created_at,author_id,attachment_url,attachment_type,profiles(display_name,avatar_url)')
        .single()

      if (insertError) {
        console.error('Falha ao salvar mensagem:', insertError)
        setMessages(prev => prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, status: 'failed' } : m))
        setError(insertError.message)
        showToast('Falha no envio', 'Não foi possível salvar sua mensagem. Clique para tentar novamente.', 'info')
        return
      }

      const confirmedMsg: Message = {
        ...inserted,
        profile: Array.isArray(inserted.profiles) ? inserted.profiles?.[0] : (inserted.profiles || { display_name: profileDisplayName, avatar_url: profileAvatarUrl }),
        status: 'sent',
        tempId
      }

      // Atualiza a mensagem temporária com o ID oficial do banco
      setMessages(prev => prev.map(m => (m.id === tempId || m.tempId === tempId) ? confirmedMsg : m))

      // Notifica os pares do canal com a mensagem confirmada
      channelBroadcastRef.current?.send({
        type: 'broadcast',
        event: 'new-message',
        payload: confirmedMsg
      }).catch(() => {})

    } catch (err: any) {
      console.error('Erro na requisição de envio:', err)
      setMessages(prev => prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, status: 'failed' } : m))
      showToast('Falha no envio', 'Erro de conexão ao enviar mensagem.', 'info')
    }
  }

  function retrySendMessage(msg: Message) {
    if (!selectedChannel) return
    postChannelMessage(selectedChannel.id, msg.body, msg.attachment_url, msg.attachment_type, msg.tempId || msg.id)
  }

  async function handleDeleteMessage(messageId: string) {
    if (!supabase || !selectedChannel) return
    const msgToDelete = messages.find(m => m.id === messageId)
    if (!msgToDelete) return

    const currentSp = spaces.find(s => s.id === selectedChannel.space_id) ?? null
    const isAuthor = msgToDelete.author_id === user.id
    const canManage = currentSp && (canUserDo(currentSp.id, user.id, 'manageMessages') || currentSp.creator_id === user.id)
    if (!isAuthor && !canManage) {
      showToast('Permissão Negada', 'Você só pode excluir suas próprias mensagens.', 'info')
      return
    }

    try {
      const { error: delErr } = await supabase.from('messages').delete().eq('id', messageId)
      if (delErr) {
        console.error('Error deleting message:', delErr)
        showToast('Erro ao Excluir', delErr.message, 'info')
        return
      }

      setMessages(prev => {
        const next = prev.filter(m => m.id !== messageId)
        messagesCacheRef.current[selectedChannel.id] = next
        try {
          localStorage.setItem(`echo-msgs-${selectedChannel.id}`, JSON.stringify(next.slice(-50)))
        } catch (e) {}
        return next
      })

      channelBroadcastRef.current?.send({
        type: 'broadcast',
        event: 'delete-message',
        payload: { id: messageId }
      }).catch(() => {})

      showToast('Mensagem Excluída', 'A mensagem foi removida do canal.', 'info')
    } catch (err: any) {
      console.error('Failed to delete message:', err)
      showToast('Erro', 'Não foi possível excluir a mensagem.', 'info')
    }
  }

  async function send(event: FormEvent) {
    event.preventDefault(); if (!supabase || !selectedChannel || !draft.trim()) return
    const currentSp = spaces.find(s => s.id === selectedChannel.space_id) ?? null
    if (currentSp && selectedChannel.is_announcement && !canUserDo(currentSp.id, user.id, 'sendInAnnouncementChannels')) {
      showToast('Canal de Anúncios', 'Apenas administradores e moderadores podem enviar mensagens neste canal.', 'info')
      return
    }
    const isImmuneToSlowmode = currentSp && (canUserDo(currentSp.id, user.id, 'administrator') || canUserDo(currentSp.id, user.id, 'manageChannels'))
    if (selectedChannel.slowmode_seconds && selectedChannel.slowmode_seconds > 0 && !isImmuneToSlowmode) {
      if (slowmodeCooldown > 0) {
        showToast('Modo Lento', `Aguarde ${slowmodeCooldown}s antes de enviar outra mensagem.`, 'info')
        return
      }
    }

    let finalBody = draft.trim()
    if (replyingToMessage) {
      const authorName = replyingToMessage.profile?.display_name || 'Membro'
      const quoteSnippet = replyingToMessage.body.slice(0, 60).replace(/\n/g, ' ')
      finalBody = `> @${authorName}: "${quoteSnippet}"\n${finalBody}`
      setReplyingToMessage(null)
    }

    setDraft('')
    if (selectedChannel.slowmode_seconds && selectedChannel.slowmode_seconds > 0 && !isImmuneToSlowmode) {
      setSlowmodeCooldown(selectedChannel.slowmode_seconds)
    }

    await postChannelMessage(selectedChannel.id, finalBody)
  }

  // Realtime subscription for selectedChannel messages (Broadcast + Postgres changes)
  useEffect(() => {
    const client = supabase
    if (!selectedChannel || !client || selectedChannel.type !== 'text') {
      channelBroadcastRef.current = null
      return
    }

    setHasMoreMessages(true)
    setIsLoadingMore(false)
    isPrependingRef.current = false

    const initialCache = messagesCacheRef.current[selectedChannel.id] || []
    if (initialCache.length > 0) {
      setMessages(initialCache)
    } else {
      setMessages([])
    }

    loadMessages(selectedChannel.id)

    const channelTopic = `room-messages-${selectedChannel.id}`
    const live = client.channel(channelTopic, {
      config: {
        broadcast: { ack: false }
      }
    })

    // 1. WebSocket Broadcast em tempo real (0ms entre todos conectados no canal)
    live.on('broadcast', { event: 'new-message' }, ({ payload }: { payload: any }) => {
      if (!payload || !payload.id) return

      setMessages(prev => {
        const matchIdx = prev.findIndex(m => 
          m.id === payload.id || 
          (payload.tempId && (m.id === payload.tempId || m.tempId === payload.tempId))
        )
        let updated: Message[]
        if (matchIdx !== -1) {
          updated = [...prev]
          updated[matchIdx] = { ...updated[matchIdx], ...payload, status: 'sent' }
        } else {
          updated = [...prev, { ...payload, status: 'sent' }]
        }
        messagesCacheRef.current[selectedChannel.id] = updated
        try {
          localStorage.setItem(`echo-msgs-${selectedChannel.id}`, JSON.stringify(updated.slice(-50)))
        } catch (e) {}
        return updated
      })

      // Alerta sonoro caso o usuário seja mencionado
      if (user && payload.author_id !== user.id) {
        if (payload.body && profileDisplayName && payload.body.toLowerCase().includes(`@${profileDisplayName.toLowerCase()}`)) {
          playDmNotificationSound(sfxVolume)
        }
      }
    })

    live.on('broadcast', { event: 'delete-message' }, ({ payload }: { payload: any }) => {
      if (!payload || !payload.id) return
      setMessages(prev => {
        const updated = prev.filter(m => m.id !== payload.id)
        if (selectedChannel) {
          messagesCacheRef.current[selectedChannel.id] = updated
          try {
            localStorage.setItem(`echo-msgs-${selectedChannel.id}`, JSON.stringify(updated.slice(-50)))
          } catch (e) {}
        }
        return updated
      })
    })

    // 2. Typing indicator broadcast listener
    live.on('broadcast', { event: 'typing' }, ({ payload }: { payload: any }) => {
      if (!payload || !payload.userId || payload.userId === user?.id) return
      setTypingUsersMap(prev => {
        if (prev[payload.userId]?.timeout) {
          clearTimeout(prev[payload.userId].timeout)
        }
        const timeout = setTimeout(() => {
          setTypingUsersMap(current => {
            const next = { ...current }
            delete next[payload.userId]
            return next
          })
        }, 3000)
        return { ...prev, [payload.userId]: { name: payload.displayName || 'Membro', timeout } }
      })
    })

    // 3. PostgreSQL Changes — mensagens (DELETE/UPDATE)
    live.on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'messages', 
      filter: `channel_id=eq.${selectedChannel.id}` 
    }, (payload: any) => {
      const isDeleteOrUpdate = payload && (payload.eventType === 'DELETE' || payload.eventType === 'UPDATE')
      loadMessages(selectedChannel.id, isDeleteOrUpdate)
    })

    // 4. PostgreSQL Changes — reações em tempo real (todos os membros veem as reações sincronizadas)
    live.on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_reactions'
    }, (_payload: any) => {
      // Recarrega as reações para o canal atual quando qualquer reação mudar
      loadReactionsForChannel(selectedChannel.id)
    })

    live.subscribe()
    channelBroadcastRef.current = live

    return () => {
      channelBroadcastRef.current = null
      client.removeChannel(live)
      setTypingUsersMap({})
    }
  }, [selectedChannel?.id, user?.id, profileDisplayName, sfxVolume])

  // Broadcast typing indicator with 2s debounce
  const notifyTyping = useCallback(() => {
    if (!channelBroadcastRef.current || !user) return
    const now = Date.now()
    if (now - lastTypingSentRef.current < 2000) return
    lastTypingSentRef.current = now
    channelBroadcastRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: user.id, displayName: profileDisplayName || displayName || 'Você' }
    }).catch(() => {})
  }, [user?.id, profileDisplayName, displayName])

  // Scroll to bottom on new messages (com suporte a renderização dinâmica do virtualizador)
  useEffect(() => {
    if (isPrependingRef.current) return
    const el = messagesContainerRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
      const timer1 = setTimeout(() => {
        if (el) el.scrollTop = el.scrollHeight
      }, 50)
      const timer2 = setTimeout(() => {
        if (el) el.scrollTop = el.scrollHeight
      }, 150)
      return () => {
        clearTimeout(timer1)
        clearTimeout(timer2)
      }
    }
  }, [messages])

  const typingUsers = Object.values(typingUsersMap).map(u => u.name)

  return {
    messages,
    setMessages,
    draft,
    setDraft,
    isUploading,
    setIsUploading,
    replyingToMessage,
    setReplyingToMessage,
    messageReactions,
    setMessageReactions,
    slowmodeCooldown,
    setSlowmodeCooldown,
    hasMoreMessages,
    setHasMoreMessages,
    isLoadingMore,
    setIsLoadingMore,
    messagesEndRef,
    messagesContainerRef,
    messagesCacheRef,
    channelBroadcastRef,
    loadMessages,
    loadMoreMessages,
    handleChatFileUpload,
    toggleReaction,
    postChannelMessage,
    retrySendMessage,
    handleDeleteMessage,
    send,
    typingUsers,
    notifyTyping
  }
}
