import { useCallback, useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { Channel, Message } from '../types'
import { generateTempMessageId } from './useEchoMessagesCore'
import { useThreadsStore } from '../stores/useThreadsStore'
import {
  MESSAGE_DELETED_EVENT,
  THREAD_MESSAGE_EVENT,
  applyThreadMessage,
  applyThreadReplyDeleted,
  applyThreadRootDeleted,
  mergeThreadReply,
  summariesFromRows,
  type ThreadSummaries
} from '../lib/threads'

const REPLY_SELECT = 'id,channel_id,body,created_at,updated_at,author_id,attachment_url,attachment_type,reply_to_message_id,thread_root_id,is_edited,message_type,profiles(display_name,avatar_url,avatar_decoration,profile_effect)'
/** Um tópico carrega até este número de respostas (as mais antigas primeiro) */
const MAX_REPLIES = 200
const SEND_TIMEOUT_MS = 9000

export interface UseEchoThreadsOptions {
  supabase: any
  user: User
  /** Canal de texto aberto; os tópicos são sempre do canal que está na tela */
  channel: Channel | null
  profileDisplayName: string
  profileAvatarUrl?: string
  showToast?: (title: string, message: string, type?: any) => void
}

function toMessage(row: any, fallbackChannelId: string): Message {
  return {
    ...row,
    channel_id: row.channel_id || fallbackChannelId,
    profile: Array.isArray(row.profiles) ? row.profiles?.[0] : (row.profiles ?? row.profile),
    status: 'sent' as const
  }
}

/**
 * Respostas em tópico do canal aberto: o resumo de cada tópico (para o chat principal mostrar "3 respostas"),
 * o tópico aberto no painel lateral com as respostas dele, e enviar/apagar resposta.
 * O que chega em tempo real vem repassado pelo canal de mensagens (useEchoChannelMessages), por evento.
 */
export function useEchoThreads({ supabase, user, channel, profileDisplayName, profileAvatarUrl, showToast }: UseEchoThreadsOptions) {
  const channelId = channel?.type === 'text' ? channel.id : null

  /** false enquanto o banco não tiver a migração 14: o app esconde tudo de tópico e segue como antes */
  const [enabled, setEnabled] = useState(false)
  const [summaries, setSummaries] = useState<ThreadSummaries>({})
  const [openRoot, setOpenRoot] = useState<Message | null>(null)
  const [replies, setReplies] = useState<Message[]>([])
  const [isLoadingReplies, setIsLoadingReplies] = useState(false)
  /** Aviso para o painel do tópico (falha ao carregar, enviar ou apagar); '' = nada a avisar */
  const [notice, setNotice] = useState('')
  const inform = useCallback((title: string, message: string) => {
    setNotice(message)
    showToast?.(title, message, 'info')
  }, [showToast])

  const openRootIdRef = useRef<string | null>(null)
  const channelIdRef = useRef<string | null>(channelId)
  useEffect(() => {
    channelIdRef.current = channelId
  }, [channelId])

  const closeThread = useCallback(() => {
    openRootIdRef.current = null
    useThreadsStore.getState().setOpenRootId(null)
    setOpenRoot(null)
    setReplies([])
    setIsLoadingReplies(false)
    setNotice('')
  }, [])

  // Trocar de canal fecha o tópico e busca os resumos do canal novo
  useEffect(() => {
    closeThread()
    setSummaries({})
    if (!supabase || !channelId) {
      setEnabled(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('get_thread_summaries', { p_channel_id: channelId })
      if (cancelled) return
      if (error) {
        // Função inexistente = banco sem a migração 14; qualquer outro erro também desliga os tópicos por ora
        setEnabled(false)
        return
      }
      setEnabled(true)
      setSummaries(summariesFromRows(data))
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, channelId, closeThread])

  // Tempo real, repassado pelo canal de mensagens
  useEffect(() => {
    const onThreadMessage = (event: Event) => {
      const payload = (event as CustomEvent).detail
      if (!payload?.id || (payload.channel_id && payload.channel_id !== channelIdRef.current)) return
      setSummaries((prev) => applyThreadMessage(prev, payload))
      const rootId = payload.thread?.root_id ?? payload.thread_root_id
      if (rootId && rootId === openRootIdRef.current) {
        setReplies((prev) => mergeThreadReply(prev, toMessage(payload, channelIdRef.current || '')))
      }
    }
    const onDeleted = (event: Event) => {
      const payload = (event as CustomEvent).detail
      if (!payload?.id) return
      if (payload.thread_root_id) {
        setSummaries((prev) => applyThreadReplyDeleted(prev, payload.thread_root_id))
        setReplies((prev) => (prev.some((reply) => reply.id === payload.id) ? prev.filter((reply) => reply.id !== payload.id) : prev))
        return
      }
      // Mensagem comum apagada: se era a raiz de um tópico, o tópico inteiro foi junto
      setSummaries((prev) => applyThreadRootDeleted(prev, payload.id))
      useThreadsStore.getState().markRead(payload.id)
      if (payload.id === openRootIdRef.current) closeThread()
    }
    window.addEventListener(THREAD_MESSAGE_EVENT, onThreadMessage)
    window.addEventListener(MESSAGE_DELETED_EVENT, onDeleted)
    return () => {
      window.removeEventListener(THREAD_MESSAGE_EVENT, onThreadMessage)
      window.removeEventListener(MESSAGE_DELETED_EVENT, onDeleted)
    }
  }, [closeThread])

  // Sair da tela do canal não deixa "tópico aberto" pendurado (o aviso de resposta voltaria a contar)
  useEffect(() => () => useThreadsStore.getState().setOpenRootId(null), [])

  const openThread = useCallback(async (root: Message) => {
    if (!supabase || !root?.id || root.status === 'sending' || root.status === 'failed') return
    openRootIdRef.current = root.id
    useThreadsStore.getState().setOpenRootId(root.id)
    useThreadsStore.getState().markRead(root.id)
    setOpenRoot(root)
    setReplies([])
    setNotice('')
    setIsLoadingReplies(true)

    const { data, error } = await supabase
      .from('messages')
      .select(REPLY_SELECT)
      .eq('thread_root_id', root.id)
      .order('created_at', { ascending: true })
      .limit(MAX_REPLIES)

    // A pessoa pode ter aberto outro tópico (ou fechado) enquanto buscava
    if (openRootIdRef.current !== root.id) return
    setIsLoadingReplies(false)
    if (error) {
      inform('Tópico', 'Não foi possível carregar as respostas. Tente abrir de novo.')
      return
    }
    const loaded = (data ?? []).map((row: any) => toMessage(row, root.channel_id || ''))
    // Junta com o que chegou em tempo real (ou foi enviado) durante a busca
    setReplies((prev) => prev.reduce((list, reply) => mergeThreadReply(list, reply), loaded))
  }, [supabase, inform])

  const sendReply = useCallback(async (body: string, existingTempId?: string): Promise<boolean> => {
    const root = openRoot
    const text = body.trim()
    if (!supabase || !root || !text) return false
    const targetChannelId = root.channel_id || channelIdRef.current
    if (!targetChannelId) return false

    const tempId = existingTempId || generateTempMessageId('temp')
    const optimistic: Message = {
      id: tempId,
      tempId,
      channel_id: targetChannelId,
      thread_root_id: root.id,
      body: text,
      created_at: new Date().toISOString(),
      author_id: user.id,
      profile: { display_name: profileDisplayName || 'Você', avatar_url: profileAvatarUrl },
      status: 'sending'
    }
    setReplies((prev) => mergeThreadReply(prev, optimistic))
    setNotice('')

    const fail = (message: string) => {
      setReplies((prev) => prev.map((reply) => (reply.tempId === tempId ? { ...reply, status: 'failed' as const } : reply)))
      inform('Falha no envio', message)
      return false
    }

    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), SEND_TIMEOUT_MS))
      const insert = supabase
        .from('messages')
        .insert({ channel_id: targetChannelId, author_id: user.id, body: text, thread_root_id: root.id })
        .select(REPLY_SELECT)
        .single()
      const { data, error } = (await Promise.race([insert, timeout])) as { data: any; error: any }
      if (error || !data) return fail('Não foi possível enviar a resposta. Clique nela para tentar de novo.')

      const confirmed: Message = { ...toMessage(data, targetChannelId), tempId }
      setReplies((prev) => mergeThreadReply(prev, confirmed))
      // O resumo certo chega pelo aviso do banco; isto só garante que o chat principal já mostre o tópico
      // mesmo se o tempo real estiver fora
      setSummaries((prev) => (prev[root.id]
        ? prev
        : applyThreadMessage(prev, { ...data, thread: { root_id: root.id, reply_count: 1, last_reply_at: data.created_at, participant_ids: [root.author_id, user.id] } })))
      return true
    } catch {
      return fail('Erro de conexão ao enviar a resposta.')
    }
  }, [supabase, openRoot, user.id, profileDisplayName, profileAvatarUrl, inform])

  const retryReply = useCallback((reply: Message) => {
    void sendReply(reply.body, reply.tempId || reply.id)
  }, [sendReply])

  const deleteReply = useCallback(async (replyId: string) => {
    if (!supabase) return
    const reply = replies.find((item) => item.id === replyId)
    if (!reply) return
    // Resposta que nem chegou ao banco: só sai da tela
    if (reply.status === 'sending' || reply.status === 'failed') {
      setReplies((prev) => prev.filter((item) => item.id !== replyId))
      return
    }
    const { error } = await supabase.from('messages').delete().eq('id', replyId)
    if (error) {
      inform('Erro ao excluir', 'Não foi possível excluir a resposta.')
      return
    }
    // O resumo é corrigido pelo aviso de exclusão do banco; aqui a resposta só sai da lista
    setReplies((prev) => prev.filter((item) => item.id !== replyId))
  }, [supabase, replies, inform])

  return {
    enabled,
    summaries,
    openRoot,
    replies,
    isLoadingReplies,
    notice,
    openThread,
    closeThread,
    sendReply,
    retryReply,
    deleteReply
  }
}
