// Respostas em tópico: conversa paralela presa a uma mensagem do canal (migração 14).
// Aqui fica só a lógica pura: o resumo de cada tópico (quantas respostas, a última, quem participa) e como
// ele muda quando chega ou some uma resposta. Quem busca e ouve o banco é o hook useEchoThreads.

import type { Message } from '../types'

export interface ThreadSummary {
  rootId: string
  replyCount: number
  /** ISO da resposta mais recente; null se o tópico ficou sem respostas */
  lastReplyAt: string | null
  /** Autor da raiz e quem já respondeu (quem recebe aviso de resposta nova) */
  participantIds: string[]
}

export type ThreadSummaries = Record<string, ThreadSummary>

/** Linhas da função get_thread_summaries → mapa por mensagem-raiz */
export function summariesFromRows(rows: unknown): ThreadSummaries {
  const summaries: ThreadSummaries = {}
  if (!Array.isArray(rows)) return summaries
  for (const row of rows) {
    if (!row || typeof row.root_id !== 'string') continue
    const count = Number(row.reply_count)
    if (!Number.isFinite(count) || count <= 0) continue
    summaries[row.root_id] = {
      rootId: row.root_id,
      replyCount: Math.round(count),
      lastReplyAt: typeof row.last_reply_at === 'string' ? row.last_reply_at : null,
      participantIds: Array.isArray(row.participant_ids) ? row.participant_ids.filter((id: unknown) => typeof id === 'string') : []
    }
  }
  return summaries
}

/**
 * Aviso "thread-message" do banco: a resposta nova já vem com o resumo atualizado do tópico (contagem feita
 * no servidor), então o app não precisa contar por conta própria.
 */
export function applyThreadMessage(summaries: ThreadSummaries, payload: any): ThreadSummaries {
  const rootId = payload?.thread?.root_id ?? payload?.thread_root_id
  if (typeof rootId !== 'string') return summaries
  const previous = summaries[rootId]
  const serverCount = Number(payload?.thread?.reply_count)
  const replyCount = Number.isFinite(serverCount) && serverCount > 0 ? Math.round(serverCount) : (previous?.replyCount ?? 0) + 1
  const participants = Array.isArray(payload?.thread?.participant_ids)
    ? payload.thread.participant_ids.filter((id: unknown) => typeof id === 'string')
    : Array.from(new Set([...(previous?.participantIds ?? []), payload?.author_id].filter((id): id is string => typeof id === 'string')))
  return {
    ...summaries,
    [rootId]: {
      rootId,
      replyCount,
      lastReplyAt: payload?.thread?.last_reply_at ?? payload?.created_at ?? previous?.lastReplyAt ?? null,
      participantIds: participants
    }
  }
}

/** Uma resposta foi apagada: o tópico perde uma resposta e some do resumo quando chega a zero */
export function applyThreadReplyDeleted(summaries: ThreadSummaries, rootId: string | null | undefined): ThreadSummaries {
  if (!rootId || !summaries[rootId]) return summaries
  const next = { ...summaries }
  const remaining = summaries[rootId].replyCount - 1
  if (remaining <= 0) delete next[rootId]
  else next[rootId] = { ...summaries[rootId], replyCount: remaining }
  return next
}

/** A mensagem-raiz foi apagada: o tópico inteiro some */
export function applyThreadRootDeleted(summaries: ThreadSummaries, messageId: string | null | undefined): ThreadSummaries {
  if (!messageId || !summaries[messageId]) return summaries
  const next = { ...summaries }
  delete next[messageId]
  return next
}

/** "1 resposta" / "12 respostas" */
export function formatReplyCount(count: number): string {
  return count === 1 ? '1 resposta' : `${count} respostas`
}

/** Junta uma resposta na lista do tópico aberto sem duplicar (a mesma chega pelo envio e pelo tempo real) */
export function mergeThreadReply(replies: Message[], incoming: Message): Message[] {
  const index = replies.findIndex((reply) =>
    reply.id === incoming.id || (incoming.tempId !== undefined && (reply.id === incoming.tempId || reply.tempId === incoming.tempId)))
  if (index === -1) return [...replies, incoming]
  const next = [...replies]
  next[index] = { ...next[index], ...incoming }
  return next
}

/** Aviso "thread-reply" que o banco manda para a caixa de entrada de quem participa do tópico (sem o texto) */
export interface ThreadReplyNotice {
  channelId?: string
  rootId?: string
  messageId?: string
  senderId?: string
  senderName?: string
}

export interface ThreadReplyNoticeContext {
  myUserId: string | undefined
  /** Canais que este app conhece (ou seja, que a pessoa pode ver) */
  knownChannels: Array<{ id: string; name?: string; space_id?: string | null }>
  currentChannelId: string | null | undefined
  /** Tópico aberto no painel agora */
  openThreadRootId: string | null
  mutedSpaceIds: Set<string>
  appFocused: boolean
}

export interface ThreadReplyNoticeAction {
  rootId: string
  channelId: string
  /** Marcar o canal como não lido na barra lateral (só se não é o canal aberto) */
  markChannelUnread: boolean
  /** Notificação do sistema, quando o app está em segundo plano e o espaço não está silenciado */
  notification: { title: string; body: string } | null
}

/**
 * O que fazer com um aviso de resposta em tópico. Devolve null quando não há nada a fazer: aviso
 * incompleto, resposta minha, canal que este app não conhece, ou o tópico já está aberto na tela.
 */
export function planThreadReplyNotice(
  notice: ThreadReplyNotice | null | undefined,
  context: ThreadReplyNoticeContext
): ThreadReplyNoticeAction | null {
  if (!notice || typeof notice.rootId !== 'string' || typeof notice.channelId !== 'string') return null
  if (notice.senderId && notice.senderId === context.myUserId) return null
  const channel = context.knownChannels.find((item) => item.id === notice.channelId)
  if (!channel) return null

  const viewingThread = context.openThreadRootId === notice.rootId && context.currentChannelId === notice.channelId
  if (viewingThread && context.appFocused) return null

  const muted = Boolean(channel.space_id && context.mutedSpaceIds.has(channel.space_id))
  const sender = notice.senderName || 'Alguém'
  const where = channel.name ? `#${channel.name}` : 'um canal'
  return {
    rootId: notice.rootId,
    channelId: notice.channelId,
    markChannelUnread: context.currentChannelId !== notice.channelId,
    notification: !context.appFocused && !muted
      ? { title: `Nova resposta em um tópico de ${where}`, body: `${sender} respondeu em um tópico de que você participa.` }
      : null
  }
}

/**
 * O banco ainda não tem a migração 14? O app descobre na primeira busca (a coluna não existe) e passa a
 * funcionar como antes, sem tópicos, em vez de quebrar o chat. Assim a ordem "migração → versão do app"
 * pode ter um intervalo sem ninguém ficar sem mensagens.
 */
export const threadSupport = { columnMissing: false }

export function isMissingThreadColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const message = error.message || ''
  // 42703 = coluna inexistente (Postgres); PGRST204 = coluna fora do cache de esquema (PostgREST)
  return (error.code === '42703' || error.code === 'PGRST204' || /does not exist|could not find/i.test(message)) && message.includes('thread_root_id')
}

/** Eventos internos do app: o canal de mensagens repassa o que chega do banco para quem cuida dos tópicos */
export const THREAD_MESSAGE_EVENT = 'echo-thread-message'
export const MESSAGE_DELETED_EVENT = 'echo-channel-message-deleted'
