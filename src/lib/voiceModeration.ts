// Moderação de voz (silenciar, desconectar e mover membros). Quem decide e executa é o servidor
// (Edge Function voice-moderation): o app só pede e, do lado do alvo, reage a sinais que só o servidor
// consegue produzir — nunca a mensagens de outros participantes, que qualquer um poderia forjar.
import type { SupabaseClient } from '@supabase/supabase-js'

export type VoiceModerationAction = 'mute' | 'disconnect' | 'move'

export interface VoiceModerationRequest {
  action: VoiceModerationAction
  /** Canal de voz onde o alvo está (a sala LiveKit) */
  channelId: string
  targetUserId: string
  /** Só para mover */
  targetChannelId?: string
}

export type VoiceModerationResult = { ok: true } | { ok: false; error: string }

/** Chave dos metadados do participante com o aviso de moderação (mesma de supabase/functions/voice-moderation/livekit.ts) */
export const MODERATION_METADATA_KEY = 'echoModeration'

export interface ModerationNotice {
  id: string
  type: VoiceModerationAction
  at: number
  channelId?: string
  channelName?: string
}

export async function requestVoiceModeration(
  client: SupabaseClient | null | undefined,
  request: VoiceModerationRequest
): Promise<VoiceModerationResult> {
  if (!client) return { ok: false, error: 'Sem conexão com o servidor.' }
  try {
    const { data, error } = await client.functions.invoke('voice-moderation', { body: request })
    if (error) {
      // Resposta HTTP de erro: a mensagem para a pessoa vem no corpo
      const body = await (error as any).context?.json?.().catch(() => null)
      return { ok: false, error: body?.error || 'Não foi possível concluir a moderação agora.' }
    }
    if (!data?.success) return { ok: false, error: data?.error || 'Não foi possível concluir a moderação agora.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Falha de conexão.' }
  }
}

/**
 * Lê o aviso de moderação dos metadados do PRÓPRIO participante. Esses metadados só são escritos pela API
 * de servidor do LiveKit (o token do app não concede canUpdateOwnMetadata), então o aviso é confiável.
 */
export function parseModerationNotice(metadata: string | undefined | null): ModerationNotice | null {
  if (!metadata) return null
  try {
    const notice = JSON.parse(metadata)?.[MODERATION_METADATA_KEY]
    if (!notice || typeof notice.id !== 'string' || !notice.id) return null
    if (notice.type !== 'mute' && notice.type !== 'disconnect' && notice.type !== 'move') return null
    if (notice.type === 'move' && (typeof notice.channelId !== 'string' || !notice.channelId)) return null
    return {
      id: notice.id,
      type: notice.type,
      at: typeof notice.at === 'number' ? notice.at : 0,
      ...(notice.type === 'move'
        ? { channelId: notice.channelId, channelName: typeof notice.channelName === 'string' ? notice.channelName : undefined }
        : {})
    }
  } catch {
    return null
  }
}
