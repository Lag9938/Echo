import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { authorizeVoiceModeration } from "./authorize.ts"
import {
  createRoomService,
  isNotFound,
  microphoneTrackSids,
  withModerationNotice,
  type ModerationNotice
} from "./livekit.ts"

// Moderação de voz autorizada no servidor: confere cargo e hierarquia (authorize.ts) e só então executa a
// ação pela API de servidor do LiveKit. O app do alvo reage ao aviso nos metadados do participante e aos
// efeitos que só o servidor produz (microfone silenciado pelo SFU, remoção da sala).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}

// Ao mover, o app do alvo sai da sala sozinho ao ver o aviso; a remoção depois desse prazo só garante que
// ele saia mesmo que ignore o aviso (sem atropelar a troca de canal de quem obedece)
const MOVE_GRACE_MS = 3000

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return json(405, { success: false, error: "Method not allowed" })
  }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return json(401, { success: false, error: "Missing authorization header" })
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return json(401, { success: false, error: "Invalid or expired session" })
    }

    const body = await req.json().catch(() => ({}))

    // Tudo com o token de quem pede: a RLS e as funções do banco (auth.uid()) decidem por ele.
    // Erros de banco viram exceção (500), nunca permissão.
    const auth = await authorizeVoiceModeration(body, user.id, {
      getChannel: async (channelId) => {
        const { data, error } = await supabaseClient
          .from("channels")
          .select("id, space_id, type, name")
          .eq("id", channelId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        return data ?? null
      },
      getMyChannelPermissions: async (channelId) => {
        const { data, error } = await supabaseClient.rpc("get_my_channel_permissions", { p_channel_id: channelId })
        // Função ainda não existe (banco antes da migração 11): authorize nega
        if (error?.code === "PGRST202") return null
        if (error) throw new Error(error.message)
        return (data ?? {}) as Record<string, boolean>
      },
      getTopPosition: async (spaceId, userId) => {
        const { data, error } = await supabaseClient.rpc("space_member_top_position", {
          p_space_id: spaceId,
          p_user_id: userId
        })
        if (error) throw new Error(error.message)
        if (typeof data !== "number") throw new Error("space_member_top_position sem resultado")
        return data
      }
    })

    if (!auth.ok) {
      return json(auth.status, { success: false, error: auth.error })
    }

    const livekitUrl = Deno.env.get("LIVEKIT_API_URL") || Deno.env.get("LIVEKIT_URL")
    const apiKey = Deno.env.get("LIVEKIT_API_KEY")
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET")
    if (!livekitUrl || !apiKey || !apiSecret) {
      return json(500, {
        success: false,
        error: "LiveKit não está configurado corretamente no servidor (variáveis de ambiente ausentes)."
      })
    }

    const rooms = createRoomService({ url: livekitUrl, apiKey, apiSecret })
    const { room, targetUserId, action } = auth

    let participant
    try {
      participant = await rooms.getParticipant(room, targetUserId)
    } catch (err) {
      if (isNotFound(err)) {
        return json(404, { success: false, error: "Essa pessoa não está mais nessa chamada." })
      }
      throw err
    }

    const notice: ModerationNotice = {
      id: crypto.randomUUID(),
      type: action,
      at: Date.now(),
      ...(auth.targetChannel ? { channelId: auth.targetChannel.id, channelName: auth.targetChannel.name } : {})
    }
    await rooms.updateParticipantMetadata(room, targetUserId, withModerationNotice(participant.metadata, notice))

    if (action === "mute") {
      for (const trackSid of microphoneTrackSids(participant)) {
        await rooms.mutePublishedTrack(room, targetUserId, trackSid, true)
      }
    } else if (action === "disconnect") {
      await rooms.removeParticipant(room, targetUserId).catch((err) => {
        if (!isNotFound(err)) throw err
      })
    } else {
      const removeLater = new Promise<void>((resolve) => setTimeout(resolve, MOVE_GRACE_MS))
        .then(() => rooms.removeParticipant(room, targetUserId))
        .catch((err) => {
          // Já saiu sozinho ao obedecer o aviso: é o caminho normal
          if (!isNotFound(err)) console.error("[voice-moderation] Falha ao remover após mover:", err)
        })
      EdgeRuntime.waitUntil(removeLater)
    }

    return json(200, { success: true })
  } catch (err: any) {
    console.error("[voice-moderation]", err)
    return json(500, { success: false, error: "Não foi possível concluir a moderação agora." })
  }
})
