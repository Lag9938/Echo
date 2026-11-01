import { isAutoImageCaption } from './attachmentCaption'

export const FORWARD_PREFIX = '↪ Encaminhada\n'

export interface ForwardableMessage {
  id: string
  body: string
  attachment_url?: string
  attachment_type?: string
  authorName: string
  authorAvatar?: string
  sourceLabel?: string
}

export interface UnwrappedMessageBody {
  replyQuoteText: string | null
  isForwarded: boolean
  cleanBody: string
}

/**
 * Separa os cabeçalhos de resposta (`> @Autor: "trecho"\n`) e de encaminhamento (`↪ Encaminhada\n`)
 * do texto real da mensagem. Funciona em qualquer ordem e evita duplicar cabeçalhos ao reencaminhar
 * ou responder uma mensagem que já era resposta.
 */
export function unwrapMessageBody(rawBody: string | null | undefined): UnwrappedMessageBody {
  let text = String(rawBody ?? '')
  let replyQuoteText: string | null = null
  let isForwarded = false

  for (let i = 0; i < 3; i++) {
    if (text.startsWith('> @') && replyQuoteText === null) {
      const firstLineEnd = text.indexOf('\n')
      if (firstLineEnd !== -1) {
        replyQuoteText = text.slice(2, firstLineEnd)
        text = text.slice(firstLineEnd + 1)
        continue
      }
    }
    if (text.startsWith(FORWARD_PREFIX)) {
      isForwarded = true
      text = text.slice(FORWARD_PREFIX.length)
      continue
    }
    break
  }

  return {
    replyQuoteText,
    isForwarded,
    cleanBody: text
  }
}

/** "@Nome: "trecho"" → autor e trecho */
export function parseReplyQuote(text: string): { author: string; snippet: string } {
  const match = text.match(/^@(.*?): "([\s\S]*)"$/)
  return match ? { author: match[1], snippet: match[2] } : { author: '', snippet: text.replace(/^@/, '') }
}

/**
 * O que mostrar como resumo da mensagem respondida ou encaminhada:
 * o texto limpo, ou um rótulo amigável quando era só foto, figurinha, áudio ou arquivo.
 */
export function getMessageSnippetLabel(
  msg: { body?: string | null; attachment_url?: string | null; attachment_type?: string | null } | undefined,
  fallbackQuoted = ''
): string {
  if (msg) {
    const { cleanBody } = unwrapMessageBody(msg.body)
    if (msg.attachment_type === 'audio') return '🎤 Mensagem de voz'
    if (msg.attachment_type === 'sticker') return '✨ Figurinha'
    if (msg.attachment_url && (msg.attachment_type === 'image' || msg.attachment_type?.startsWith('image') || !msg.attachment_type)) {
      if (isAutoImageCaption(cleanBody)) return '📷 Foto'
    }
    if (msg.attachment_url && (cleanBody === 'Arquivo' || isAutoImageCaption(cleanBody))) return '📎 Anexo'
    if (cleanBody.trim()) return cleanBody.trim().replace(/\s+/g, ' ').slice(0, 60)
  }
  if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(fallbackQuoted.trim())) return '📷 Foto'
  if (/\.[a-z0-9]{2,5}$/i.test(fallbackQuoted.trim()) && !/\s/.test(fallbackQuoted.trim())) return '📎 Anexo'
  return fallbackQuoted
}

/** Monta a linha de citação que vai no topo do body ao responder uma mensagem */
export function buildReplyPrefix(
  authorName: string,
  targetMsg: { body?: string | null; attachment_url?: string | null; attachment_type?: string | null }
): string {
  const snippet = getMessageSnippetLabel(targetMsg)
  return `> @${authorName}: "${snippet}"\n`
}

/** Monta o corpo de uma mensagem encaminhada preservando o texto limpo original */
export function buildForwardedBody(
  targetMsg: { body?: string | null; attachment_url?: string | null; attachment_type?: string | null }
): string {
  const { cleanBody } = unwrapMessageBody(targetMsg.body)
  return `${FORWARD_PREFIX}${cleanBody}`
}

/**
 * Localiza a mensagem original respondida numa lista (por ID explícito ou pelo autor + trecho nas mensagens anteriores),
 * permitindo clicar na resposta e rolar até a original mesmo em DMs e grupos que não têm coluna reply_to_message_id.
 */
export function findRepliedMessage<
  T extends { id: string; body: string; attachment_url?: string; attachment_type?: string }
>(
  messages: T[],
  currentIndex: number,
  quote: string,
  getAuthorName?: (m: T) => string,
  explicitReplyId?: string | null
): T | undefined {
  if (explicitReplyId) {
    const byId = messages.find((m) => m.id === explicitReplyId)
    if (byId) return byId
  }
  const { author, snippet } = parseReplyQuote(quote)
  const normSnippet = snippet.trim().toLowerCase()
  const normAuthor = author.trim().toLowerCase()
  const startIdx = currentIndex >= 0 ? Math.min(currentIndex - 1, messages.length - 1) : messages.length - 1

  for (let i = startIdx; i >= 0; i--) {
    const candidate = messages[i]
    const candLabel = getMessageSnippetLabel(candidate).trim().toLowerCase()
    const candClean = unwrapMessageBody(candidate.body).cleanBody.trim().replace(/\s+/g, ' ').toLowerCase()
    const snippetMatches =
      Boolean(normSnippet) &&
      (candLabel === normSnippet ||
        candLabel.startsWith(normSnippet) ||
        candClean.startsWith(normSnippet))

    if (!snippetMatches) continue
    if (!normAuthor || typeof getAuthorName !== 'function') return candidate
    const candAuthor = getAuthorName(candidate).trim().toLowerCase()
    if (candAuthor === normAuthor || candAuthor.includes(normAuthor) || normAuthor.includes(candAuthor)) {
      return candidate
    }
  }

  return undefined
}
