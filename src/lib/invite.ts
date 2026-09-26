/**
 * Utilitários de Convites para Espaços e Canais do Echo
 *
 * Um convite é um CÓDIGO aleatório (12 caracteres) gerado no servidor, com expiração, limite de usos e
 * revogação — não mais o UUID do espaço. Os links HTTPS são clicáveis em qualquer app e abrem a página
 * web que aciona o app desktop (echo://invite/<código>).
 *
 * Links antigos (que traziam o UUID do espaço) ainda são reconhecidos, mas só servem para quem já é
 * membro; quem não é precisa de um convite novo.
 */

export const ECHO_INVITE_WEB_BASE = 'https://lag9938.github.io/Echo/invite/'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CODE_RE = /^[a-z0-9]{10,32}$/i

export function getPublicInviteUrl(code: string, channelId?: string): string {
  if (!code) return ''
  const params = new URLSearchParams()
  params.set('code', code)
  if (channelId) {
    params.set('channel', channelId)
  }
  params.set('v', '3')
  return `${ECHO_INVITE_WEB_BASE}?${params.toString()}`
}

export function getDeepLinkInviteUrl(code: string, channelId?: string): string {
  if (!code) return ''
  return `echo://invite/${code}${channelId ? `?channel=${channelId}` : ''}`
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

export interface ParsedInvite {
  /** Código de convite atual (sempre em minúsculas) */
  code?: string
  /** UUID de um espaço, vindo de um link antigo */
  legacySpaceId?: string
  channelId?: string
}

function classify(token: string): Pick<ParsedInvite, 'code' | 'legacySpaceId'> | null {
  const value = token.trim()
  if (UUID_RE.test(value)) return { legacySpaceId: value.toLowerCase() }
  if (CODE_RE.test(value)) return { code: value.toLowerCase() }
  return null
}

/**
 * Interpreta qualquer formato de convite do Echo: só o código, um link web, um deep link, um link antigo
 * com o UUID do espaço ou uma mensagem inteira colada que contenha um desses.
 */
export function parseInvite(rawInput: string | null | undefined): ParsedInvite | null {
  if (!rawInput || typeof rawInput !== 'string') return null
  const trimmed = rawInput.trim()
  if (!trimmed) return null

  // 1. Só o código (ou o UUID antigo) colado direto
  const bare = classify(trimmed)
  if (bare) return bare

  let token: string | null = null
  let channelId: string | undefined

  // 2. URL padrão ou deep link
  try {
    const href = trimmed.startsWith('echo://')
      ? trimmed.replace(/^echo:\/\//i, 'http://echo/')
      : /^https?:\/\//i.test(trimmed) ? trimmed : null

    if (href) {
      const url = new URL(href)
      token = url.searchParams.get('code') || url.searchParams.get('space') || url.searchParams.get('id')
      const ch = url.searchParams.get('channel')
      if (ch && UUID_RE.test(ch.trim())) channelId = ch.trim().toLowerCase()
      if (!token) {
        const pathMatch = url.pathname.match(/\/invite\/([^/?#]+)/i)
        if (pathMatch) token = decodeURIComponent(pathMatch[1])
      }
    }
  } catch {
    // cai nos fallbacks abaixo
  }

  if (token) {
    const parsed = classify(token)
    if (parsed) return { ...parsed, channelId }
  }

  // 3. Fallbacks para texto solto (ex.: a mensagem de convite inteira colada)
  if (!channelId) {
    const chMatch = trimmed.match(/[?&]channel=([0-9a-f-]{36})/i)
    if (chMatch) channelId = chMatch[1].toLowerCase()
  }

  const codeParam = trimmed.match(/[?&]code=([a-z0-9-]{10,36})/i)
  if (codeParam) {
    const parsed = classify(codeParam[1])
    if (parsed) return { ...parsed, channelId }
  }

  const spaceParam = trimmed.match(/[?&](?:space|id)=([0-9a-f-]{36})/i)
  if (spaceParam) {
    const parsed = classify(spaceParam[1])
    if (parsed) return { ...parsed, channelId }
  }

  const inviteSegment = trimmed.match(/invite\/([a-z0-9-]{10,36})/i)
  if (inviteSegment) {
    const parsed = classify(inviteSegment[1])
    if (parsed) return { ...parsed, channelId }
  }

  const uuidAnywhere = trimmed.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i)
  if (uuidAnywhere) {
    return { legacySpaceId: uuidAnywhere[1].toLowerCase(), channelId }
  }

  return null
}

/**
 * Dispara o processamento do convite internamente na aplicação sem sair do app nem abrir navegador externo
 */
export function triggerInAppInvite(rawInput: string): void {
  if (typeof window !== 'undefined' && rawInput) {
    window.dispatchEvent(new CustomEvent('echo-process-invite', { detail: { input: rawInput.trim() } }))
  }
}
