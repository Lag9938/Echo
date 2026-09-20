/**
 * useEchoMessagesCore
 * Funções e utilitários compartilhados entre mensagens de canal (useEchoChannelMessages)
 * e mensagens diretas (useEchoDirectMessages).
 */

export function generateTempMessageId(prefix = 'temp'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export interface AntiSpamState {
  recentTimestamps: number[]
  lastMessageText: string
  lastSentTime: number
}

export interface AntiSpamResult {
  allowed: boolean
  cooldownSeconds?: number
  toastTitle?: string
  toastMessage?: string
}

export function createAntiSpamState(): AntiSpamState {
  return {
    recentTimestamps: [],
    lastMessageText: '',
    lastSentTime: 0
  }
}

/**
 * Validação de anti-flood e repetição de mensagens idênticas.
 */
export function validateMessageAntiSpam(
  state: AntiSpamState,
  text: string,
  now: number = Date.now()
): AntiSpamResult {
  const trimmed = text.trim()

  // 1. Limpa timestamps com mais de 4 segundos
  state.recentTimestamps = state.recentTimestamps.filter(t => now - t < 4000)

  // 2. Proteção de Flood (máximo 4 mensagens em 4 segundos)
  if (state.recentTimestamps.length >= 4) {
    return {
      allowed: false,
      cooldownSeconds: 4,
      toastTitle: 'Calma aí!',
      toastMessage: 'Você está enviando mensagens rápido demais. Aguarde 4s.'
    }
  }

  // 3. Proteção contra repetição idêntica consecutiva em menos de 2 segundos
  if (trimmed === state.lastMessageText && now - state.lastSentTime < 2000) {
    return {
      allowed: false,
      cooldownSeconds: 2,
      toastTitle: 'Spam Detectado',
      toastMessage: 'Evite enviar a mesma mensagem repetidamente.'
    }
  }

  // Registra o envio bem-sucedido
  state.recentTimestamps.push(now)
  state.lastMessageText = trimmed
  state.lastSentTime = now

  return { allowed: true }
}

/**
 * Alterna reação de emoji para uma mensagem de forma otimista
 * e persiste no banco Supabase e no localStorage.
 */
export function toggleEmojiReactionCore(
  prevReactions: Record<string, Record<string, string[]>>,
  messageId: string,
  emoji: string,
  userId: string,
  supabase: any,
  storageKey = 'echo-message-reactions'
): Record<string, Record<string, string[]>> {
  const msgReactions = prevReactions[messageId] ? { ...prevReactions[messageId] } : {}
  const userList = msgReactions[emoji] ? [...msgReactions[emoji]] : []
  const alreadyReacted = userList.includes(userId)

  if (alreadyReacted) {
    const filtered = userList.filter(id => id !== userId)
    if (filtered.length === 0) {
      delete msgReactions[emoji]
    } else {
      msgReactions[emoji] = filtered
    }
    if (supabase) {
      supabase.from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .then(({ error }: any) => {
          if (error) console.warn('reaction delete error:', error)
        })
    }
  } else {
    msgReactions[emoji] = [...userList, userId]
    if (supabase) {
      supabase.from('message_reactions')
        .upsert(
          { message_id: messageId, user_id: userId, emoji },
          { onConflict: 'message_id,user_id,emoji' }
        )
        .then(({ error }: any) => {
          if (error) console.warn('reaction upsert error:', error)
        })
    }
  }

  const next = { ...prevReactions, [messageId]: msgReactions }
  try {
    localStorage.setItem(storageKey, JSON.stringify(next))
  } catch {}

  return next
}

/**
 * Throttle para envio de evento de digitação ("digitando...").
 */
export function shouldSendTypingNotification(
  lastSentRef: { current: number },
  intervalMs = 3000,
  now = Date.now()
): boolean {
  if (now - lastSentRef.current < intervalMs) {
    return false
  }
  lastSentRef.current = now
  return true
}
