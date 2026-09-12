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
  return `${ECHO_INVITE_WEB_BASE}?${params.toString()}`
}

export function getDeepLinkInviteUrl(spaceId: string, channelId?: string): string {
  if (!spaceId) return ''
  return `echo://invite/${spaceId}${channelId ? `?channel=${channelId}` : ''}`
}
