import { createClient } from '@supabase/supabase-js'
import { config } from './config.js'

// Service Role Key: ignora RLS de propósito, porque o bot precisa postar
// mensagens e ler canais de qualquer espaço. Por isso este client só existe
// aqui, no processo do servidor — nunca deve ir para o Electron/web.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const channelTypeCache = new Map()

/**
 * Retorna 'voice' | 'text' | null para um channel_id, com cache simples
 * em memória (canais raramente mudam de tipo).
 */
export async function getChannelType(channelId) {
  if (channelTypeCache.has(channelId)) return channelTypeCache.get(channelId)

  const { data, error } = await supabase
    .from('channels')
    .select('type')
    .eq('id', channelId)
    .maybeSingle()

  if (error || !data) return null
  channelTypeCache.set(channelId, data.type)
  return data.type
}

/**
 * Posta uma mensagem do bot em um canal, no mesmo formato que o app espera
 * (mesma tabela/colunas usadas em postChannelMessage no useEchoChannelMessages.ts).
 */
export async function postBotMessage(channelId, body) {
  const { error } = await supabase.from('messages').insert({
    channel_id: channelId,
    author_id: config.botAuthorId,
    body
  })
  if (error) {
    console.error('[Supabase] Falha ao postar mensagem do bot:', error.message)
  }
}
