import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import type { User, RealtimeChannel } from '@supabase/supabase-js'
import type { Message, Channel, Space, RolePermissions } from '../types'
import { trackMessageSent } from '../lib/analytics'
import {
  generateTempMessageId,
  createAntiSpamState,
  validateMessageAntiSpam,
  toggleEmojiReactionCore,
  shouldSendTypingNotification
} from './useEchoMessagesCore'

const PAGE_SIZE = 50
const MESSAGE_SELECT = 'id,channel_id,body,created_at,updated_at,author_id,attachment_url,attachment_type,reply_to_message_id,is_edited,message_type,profiles(display_name,avatar_url,avatar_decoration,profile_effect)'
/** Depois disso, uma busca antecipada de um canal é considerada velha e pode ser refeita. */
const PREFETCH_FRESH_MS = 5 * 60_000
/** Quantos canais aquecer de uma vez, para não disputar a rede com o canal aberto. */
const PREFETCH_BATCH = 3
/** Teto de canais aquecidos por espaço (os primeiros da lista); os demais carregam ao clicar. */
const PREFETCH_MAX_CHANNELS = 6
/** Quantos canais ficam guardados em memória; os menos usados são esquecidos. */
const CACHE_MAX_CHANNELS = 24

export interface UseEchoChannelMessagesOptions {
  user: User
  profileDisplayName: string
  profileAvatarUrl?: string
  displayName: string
  selectedChannel: Channel | null
  spaces: Space[]
  /** Canais de cada espaço: os de texto do espaço aberto são aquecidos em segundo plano. */
  spaceChannels?: Record<string, Channel[]>
  sfxVolume: number
  canUserDo: (spaceId: string, userId: string, perm: keyof RolePermissions) => boolean
  showToast: (title: string, message: string, type?: 'info' | 'message' | 'friend') => void
  setError: (err: string) => void
  playDmNotificationSound: (volume: number) => void
  triggerDesktopNotification?: (title: string, body: string, data?: any) => void
  supabase: any
}

export function useEchoChannelMessages({
  user,
  profileDisplayName,
  profileAvatarUrl,
  displayName,
  selectedChannel,
  spaces,
  spaceChannels,
  sfxVolume,
  canUserDo,
  showToast,
  setError,
  playDmNotificationSound,
  triggerDesktopNotification,
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
  // Só é true enquanto o canal aberto não tem NADA para mostrar (sem cache) e a busca está em andamento
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false)
  const [typingUsersMap, setTypingUsersMap] = useState<Record<string, { name: string, timeout: any }>>({})

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const channelBroadcastRef = useRef<RealtimeChannel | null>(null)
  const isPrependingRef = useRef<boolean>(false)
  const messagesCacheRef = useRef<Record<string, Message[]>>({})
  const hasMoreCacheRef = useRef<Record<string, boolean>>({})
  const prefetchedAtRef = useRef<Record<string, number>>({})
  const lastTypingSentRef = useRef<number>(0)

  const activeChannelIdRef = useRef<string | null>(selectedChannel?.id || null)
  activeChannelIdRef.current = selectedChannel?.id || null

  // Valores lidos dentro dos ouvintes em tempo real. Ficam em refs para que mudar o nome do perfil ou o
  // volume dos sons NÃO derrube a conexão do canal e refaça a busca das mensagens.
  const liveRef = useRef({ profileDisplayName, displayName, sfxVolume, selectedChannel, triggerDesktopNotification, playDmNotificationSound })
  liveRef.current = { profileDisplayName, displayName, sfxVolume, selectedChannel, triggerDesktopNotification, playDmNotificationSound }
  const messagesRef = useRef<Message[]>([])
  messagesRef.current = messages

  // Anti-Spam & Rate-Limiting ref
  const antiSpamRef = useRef(createAntiSpamState())

  // Slowmode timer
  useEffect(() => {
    if (slowmodeCooldown <= 0) return
    const interval = setInterval(() => {
      setSlowmodeCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [slowmodeCooldown])

  // Limpa permanentemente todo e qualquer cache legado de mensagens do localStorage
  useEffect(() => {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('echo-msgs-') || key.startsWith('echo-cached-msgs-'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k))
    } catch {}
  }, [])

  // Sincroniza o nome e avatar atualizados do próprio usuário apenas quando o perfil mudar
  useEffect(() => {
    if (!user || !profileDisplayName || !selectedChannel) return
    const currentChId = selectedChannel.id
    setMessages(prev => {
      let changed = false
      const updated = prev.map(m => {
        if (m.author_id === user.id && (!m.channel_id || m.channel_id === currentChId)) {
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
      if (changed) {
        messagesCacheRef.current[currentChId] = updated
        return updated
      }
      return prev
    })
  }, [profileDisplayName, profileAvatarUrl, user?.id])

  /** Busca as últimas mensagens de um canal já na ordem cronológica (mais antigas primeiro). */
  async function fetchLatestMessages(channelId: string): Promise<{ messages: Message[]; hasMore: boolean } | { error: string }> {
    const { data, error: queryError } = await supabase
      .from('messages')
      .select(MESSAGE_SELECT)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (queryError) return { error: queryError.message }

    const rawData = data ?? []
    return {
      hasMore: rawData.length >= PAGE_SIZE,
      messages: [...rawData].reverse().map((row: any) => ({
        ...row,
        channel_id: row.channel_id || channelId,
        profile: Array.isArray(row.profiles) ? row.profiles?.[0] : row.profiles,
        status: 'sent' as const
      }))
    }
  }

  /**
   * Aquece o cache de um canal antes de o usuário abrir: ao clicar, as mensagens já estão na tela
   * e a busca normal só confere o que mudou. Não mexe no canal aberto nem repete busca recente.
   */
  async function prefetchChannelMessages(channelId: string) {
    if (!supabase || activeChannelIdRef.current === channelId) return
    // App minimizado ou em segundo plano: ninguém vai clicar agora, então não gasta rede
    if (typeof document !== 'undefined' && document.hidden) return
    const last = prefetchedAtRef.current[channelId]
    if (last && Date.now() - last < PREFETCH_FRESH_MS) return
    prefetchedAtRef.current[channelId] = Date.now()

    const result = await fetchLatestMessages(channelId)
    if ('error' in result) {
      delete prefetchedAtRef.current[channelId]
      return
    }
    // Se o canal virou o ativo enquanto buscava, quem manda é o carregamento normal dele
    if (activeChannelIdRef.current === channelId) return
    messagesCacheRef.current[channelId] = result.messages
    hasMoreCacheRef.current[channelId] = result.hasMore
    evictOldCache()
  }

  /** Mantém o cache pequeno: esquece os canais mais antigos (ordem de inserção), nunca o aberto. */
  function evictOldCache() {
    const keys = Object.keys(messagesCacheRef.current)
    for (let i = 0; keys.length - i > CACHE_MAX_CHANNELS && i < keys.length; i++) {
      const key = keys[i]
      if (key === activeChannelIdRef.current) continue
      delete messagesCacheRef.current[key]
      delete hasMoreCacheRef.current[key]
      delete prefetchedAtRef.current[key]
    }
  }

  // Busca robusta de mensagens com cache estrito em memória por canal e consulta direta ao Supabase
  async function loadMessages(channelId: string, _forceFullFetch = false) {
    const isMock = typeof window !== 'undefined' && window.location.search.includes('mock=true')
    if (isMock) {
      setMessages([
        { id: 'msg-1', channel_id: channelId, body: 'Olá! Este canal de voz agora possui o chat de texto completo integrado.', created_at: new Date().toISOString(), author_id: 'friend-valkyrie', profile: { display_name: 'Valkyrie_Echo' }, status: 'sent' },
        { id: 'msg-2', channel_id: channelId, body: 'Perfeito! O chat de texto é exibido diretamente, sem tela vazia.', created_at: new Date().toISOString(), author_id: user.id, profile: { display_name: 'Lag9938' }, status: 'sent' }
      ])
      return
    }
    if (!supabase) return

    // 1. Render instantâneo do cache em memória desta sessão (se estritamente deste canal)
    let foundCached = false
    if (messagesCacheRef.current[channelId] && messagesCacheRef.current[channelId].length > 0) {
      const memCached = messagesCacheRef.current[channelId]
      if (memCached.every(m => !m.channel_id || m.channel_id === channelId)) {
        setMessages(memCached)
        foundCached = true
      } else {
        delete messagesCacheRef.current[channelId]
      }
    }

    if (!foundCached) {
      setMessages([])
      setIsLoadingMessages(true)
    }

    // 2. Busca Oficial e Segura das mensagens no Supabase para o canal ativo
    const result = await fetchLatestMessages(channelId)

    // Se o usuário já navegou para outro canal enquanto a busca acontecia, descarte
    if (activeChannelIdRef.current !== channelId) return
    setIsLoadingMessages(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    setHasMoreMessages(result.hasMore)
    hasMoreCacheRef.current[channelId] = result.hasMore
    const loaded = result.messages

    setMessages(prev => {
      if (activeChannelIdRef.current !== channelId) return prev
      const pendingLocal = prev.filter(m => 
        (m.status === 'sending' || m.status === 'failed') &&
        (!m.channel_id || m.channel_id === channelId) &&
        !loaded.some(dbM => dbM.id === m.id || (m.tempId && dbM.id === m.tempId))
      )
      const merged = [...loaded, ...pendingLocal]
      messagesCacheRef.current[channelId] = merged
      evictOldCache()
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
        .select('id,channel_id,body,created_at,updated_at,author_id,attachment_url,attachment_type,reply_to_message_id,is_edited,message_type,profiles(display_name,avatar_url,avatar_decoration,profile_effect)')
        .eq('channel_id', channelId)
        .lt('created_at', oldest.created_at)
        .order('created_at', { ascending: false })
        .limit(50)

      if (queryError) {
        console.error('Error loading older messages:', queryError)
        return
      }

      if (activeChannelIdRef.current !== channelId) return

      const rawData = data ?? []
      if (rawData.length < 50) {
        setHasMoreMessages(false)
      }

      if (rawData.length === 0) return

      const olderMessages: Message[] = [...rawData].reverse().map((row: any) => ({
        ...row,
        channel_id: row.channel_id || channelId,
        profile: Array.isArray(row.profiles) ? row.profiles?.[0] : row.profiles,
        status: 'sent' as const
      }))

      const container = messagesContainerRef.current
      const prevScrollHeight = container ? container.scrollHeight : 0
      const prevScrollTop = container ? container.scrollTop : 0

      setMessages(prev => {
        if (activeChannelIdRef.current !== channelId) return prev
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
  async function handleChatFileUpload(file: File, caption?: string, sizePreference?: string) {
    if (!supabase || !selectedChannel) return
    const uploadSpace = spaces.find(s => s.id === selectedChannel.space_id) ?? null
    if (uploadSpace && !canUserDo(uploadSpace.id, user.id, 'attachFiles')) {
      showToast('Permissão negada', 'Seus cargos não permitem anexar arquivos neste espaço.', 'info')
      return
    }
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
      const baseType = file.type.startsWith('image/') ? 'image' : 'file'
      const fileType = baseType === 'image' && sizePreference ? `image:${sizePreference}` : baseType
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
    setMessageReactions(prev => toggleEmojiReactionCore(prev, messageId, emoji, user.id, supabase))
  }

  // Optimistic message sender with real-time broadcast and DB persistence
  async function postChannelMessage(
    channelId: string, 
    body: string, 
    attachmentUrl?: string, 
    attachmentType?: string, 
    existingTempId?: string,
    replyToMessageId?: string | null
  ) {
    if (!supabase || !user) return

    const tempId = existingTempId || generateTempMessageId('temp')
    const nowIso = new Date().toISOString()

    const optimisticMsg: Message = {
      id: tempId,
      tempId,
      channel_id: channelId,
      body,
      created_at: nowIso,
      author_id: user.id,
      profile: {
        display_name: profileDisplayName || displayName || 'Você',
        avatar_url: profileAvatarUrl
      },
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      reply_to_message_id: replyToMessageId || null,
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
      const timeoutPromise = new Promise<{ data: any; error: any }>((_, reject) =>
        setTimeout(() => reject(new Error('Tempo limite de envio excedido')), 9000)
      )

      const insertPromise = supabase
        .from('messages')
        .insert({
          channel_id: channelId,
          author_id: user.id,
          body,
          attachment_url: attachmentUrl,
          attachment_type: attachmentType,
          reply_to_message_id: replyToMessageId || null
        })
        .select('id,channel_id,body,created_at,updated_at,author_id,attachment_url,attachment_type,reply_to_message_id,is_edited,message_type,profiles(display_name,avatar_url,avatar_decoration,profile_effect)')
        .single()

      const { data: inserted, error: insertError } = (await Promise.race([insertPromise, timeoutPromise])) as any

      if (insertError) {
        console.error('Falha ao salvar mensagem:', insertError)
        setMessages(prev => prev.map(m => (m.id === tempId || m.tempId === tempId) ? { ...m, status: 'failed' } : m))
        setError(insertError.message)
        showToast('Falha no envio', 'Não foi possível salvar sua mensagem. Clique para tentar novamente.', 'info')
        return
      }

      const confirmedMsg: Message = {
        ...inserted,
        channel_id: channelId,
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

      trackMessageSent(attachmentType ? 'attachment' : 'text')

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
    const canManage = currentSp && canUserDo(currentSp.id, user.id, 'manageMessages')
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
    if (currentSp && !canUserDo(currentSp.id, user.id, 'sendMessages')) {
      showToast('Permissão negada', 'Seus cargos não permitem enviar mensagens neste espaço.', 'info')
      return
    }
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

    const trimmedDraft = draft.trim()
    const antiSpam = validateMessageAntiSpam(antiSpamRef.current, trimmedDraft)
    if (!antiSpam.allowed) {
      if (antiSpam.cooldownSeconds) setSlowmodeCooldown(antiSpam.cooldownSeconds)
      if (antiSpam.toastTitle && antiSpam.toastMessage) showToast(antiSpam.toastTitle, antiSpam.toastMessage, 'info')
      return
    }

    let finalBody = trimmedDraft
    const replyTargetId = replyingToMessage ? replyingToMessage.id : null
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

    await postChannelMessage(selectedChannel.id, finalBody, undefined, undefined, undefined, replyTargetId)
  }

  // Realtime subscription for selectedChannel messages (Broadcast + Postgres changes)
  useEffect(() => {
    const client = supabase
    if (!selectedChannel || !client || selectedChannel.type !== 'text') {
      channelBroadcastRef.current = null
      return
    }

    setHasMoreMessages(hasMoreCacheRef.current[selectedChannel.id] ?? true)
    setIsLoadingMore(false)
    isPrependingRef.current = false

    // loadMessages mostra o cache na hora (se houver) e só depois confere no servidor
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
      if (payload.channel_id && payload.channel_id !== selectedChannel.id) return

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
        return updated
      })

      // Alerta sonoro e notificação no Windows caso o usuário seja mencionado
      if (user && payload.author_id !== user.id) {
        const { profileDisplayName, displayName, sfxVolume, selectedChannel, triggerDesktopNotification, playDmNotificationSound } = liveRef.current
        const myName = (profileDisplayName || displayName || '').toLowerCase()
        const bodyLower = (payload.body || '').toLowerCase()
        const isMentioned = 
          (myName && (bodyLower.includes(`@${myName}`) || bodyLower.includes(`@${user.id}`))) ||
          bodyLower.includes('@everyone') ||
          bodyLower.includes('@here')

        if (isMentioned) {
          playDmNotificationSound(sfxVolume)
          const isAppBlurred = typeof document !== 'undefined' && !document.hasFocus()
          if (isAppBlurred) {
            const author = payload.profile?.display_name || payload.authorName || 'Alguém'
            const channelName = selectedChannel?.name ? `#${selectedChannel.name}` : 'canal'
            if (triggerDesktopNotification) {
              triggerDesktopNotification(
                `@${author} mencionou você em ${channelName}`,
                payload.body || '',
                { type: 'channel', channelId: selectedChannel?.id }
              )
            }
            if (typeof (window as any).electronAPI?.flashFrame === 'function') {
              ;(window as any).electronAPI.flashFrame(true)
            }
          }
        }
      }
    })

    live.on('broadcast', { event: 'delete-message' }, ({ payload }: { payload: any }) => {
      if (!payload || !payload.id) return
      setMessages(prev => {
        const updated = prev.filter(m => m.id !== payload.id)
        if (selectedChannel) {
          messagesCacheRef.current[selectedChannel.id] = updated
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
      // Mensagem nova que já chegou pelo broadcast (ou pelo envio confirmado): não precisa rebuscar tudo
      if (payload?.eventType === 'INSERT' && payload.new?.id &&
          messagesRef.current.some(m => m.id === payload.new.id && m.status === 'sent')) {
        return
      }
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
  }, [selectedChannel?.id, user?.id])

  // Aquece em segundo plano os outros canais de texto do espaço aberto
  const activeSpaceId = selectedChannel?.space_id
  const spaceTextChannelIds = (activeSpaceId ? spaceChannels?.[activeSpaceId] : undefined)
    ?.filter(c => c.type === 'text').slice(0, PREFETCH_MAX_CHANNELS).map(c => c.id).join(',') ?? ''
  useEffect(() => {
    if (!supabase || !spaceTextChannelIds) return
    let cancelled = false
    const ids = spaceTextChannelIds.split(',')
    ;(async () => {
      // Espera o canal aberto terminar de carregar antes de disputar a rede
      await new Promise(resolve => setTimeout(resolve, 400))
      for (let i = 0; i < ids.length && !cancelled; i += PREFETCH_BATCH) {
        await Promise.all(ids.slice(i, i + PREFETCH_BATCH).map(id => prefetchChannelMessages(id)))
      }
    })()
    return () => { cancelled = true }
  }, [spaceTextChannelIds, activeSpaceId, user?.id])

  // Broadcast typing indicator with 2s debounce
  const notifyTyping = useCallback(() => {
    if (!channelBroadcastRef.current || !user) return
    if (!shouldSendTypingNotification(lastTypingSentRef, 2000)) return
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
    isLoadingMessages,
    prefetchChannelMessages,
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
