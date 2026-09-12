/**
 * Utilitários de Convites para Espaços e Canais do Echo
 * 
 * Gera links HTTPS universais que são 100% clicáveis no WhatsApp, Discord, Telegram,
 * Instagram, Twitter e navegadores, direcionando para a página web que aciona o app desktop (echo://invite/...).
 */

export const ECHO_INVITE_WEB_BASE = 'https://lag9938.github.io/Echo/invite/'

export function getPublicInviteUrl(spaceId: string, channelId?: string): string {
  if (!spaceId) return ''
  const params = new URLSearchParams()
  params.set('space', spaceId)
  if (channelId) {
    params.set('channel', channelId)
  }
  params.set('v', '2')
  return `${ECHO_INVITE_WEB_BASE}?${params.toString()}`
}

export function getDeepLinkInviteUrl(spaceId: string, channelId?: string): string {
  if (!spaceId) return ''
  return `echo://invite/${spaceId}${channelId ? `?channel=${channelId}` : ''}`
}

/**
 * Verifica se uma URL ou string é um link de convite oficial do Echo (Web ou Deep Link)
 */
export function isEchoInviteUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  return (
    trimmed.startsWith('echo://invite') ||
    trimmed.includes('github.io/Echo/invite') ||
    /\/invite\/?(\?|#|$)/i.test(trimmed) ||
    /\/invite\/[a-f0-9-]{36}/i.test(trimmed) ||
    /[?&]space=[a-f0-9-]{36}/i.test(trimmed)
  )
}

/**
 * Extrai o ID do espaço e opcionalmente o ID do canal a partir de qualquer formato de convite do Echo
 */
export function extractSpaceIdFromInvite(rawInput: string | null | undefined): { spaceId: string; channelId?: string } | null {
  if (!rawInput || typeof rawInput !== 'string') return null
  const trimmed = rawInput.trim()

  let spaceId = ''
  let channelId: string | undefined

  // Extrai parâmetro de canal se presente (?channel=... ou &channel=...)
  const chMatch = trimmed.match(/[?&]channel=([a-f0-9-]{36}|[a-zA-Z0-9_-]{10,})/i)
  if (chMatch && chMatch[1]) {
    channelId = chMatch[1]
  }

  // 1. Tenta parâmetro ?space=UUID ou &space=UUID
  const spMatch = trimmed.match(/[?&]space=([a-f0-9-]{36}|[a-zA-Z0-9_-]{10,})/i)
  if (spMatch && spMatch[1]) {
    spaceId = spMatch[1]
  } else {
    // 2. Tenta echo://invite/UUID ou /invite/UUID
    const urlMatch = trimmed.match(/(?:invite\/|^)([a-f0-9-]{36})/i)
    if (urlMatch && urlMatch[1]) {
      spaceId = urlMatch[1]
    } else {
      // 3. Fallback: UUID puro de 36 caracteres
      const uuidMatch = trimmed.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i)
      if (uuidMatch && uuidMatch[1]) {
        spaceId = uuidMatch[1]
      }
    }
  }

  return spaceId ? { spaceId, channelId } : null
}

/**
 * Dispara o processamento do convite internamente na aplicação sem sair do app nem abrir navegador externo
 */
export function triggerInAppInvite(rawInput: string): void {
  if (typeof window !== 'undefined' && rawInput) {
    window.dispatchEvent(new CustomEvent('echo-process-invite', { detail: { input: rawInput.trim() } }))
  }
}

