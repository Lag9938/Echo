import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { authorizeRoom } from "./authorize.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  })
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlEncode(str: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(str))
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
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
    const { room, name, avatarUrl } = body || {}

    // A consulta usa o token do próprio usuário, então a RLS se aplica: canais de servidores dos quais ele
    // não faz parte voltam vazios e authorizeRoom nega. Erros de banco viram exceção (500), nunca acesso.
    const access = await authorizeRoom(room, user.id, {
      getChannel: async (roomId) => {
        const { data, error } = await supabaseClient
          .from("channels")
          .select("id, space_id, type, is_private, allowed_role_ids")
          .eq("id", roomId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        return data ?? null
      },
      getMembershipRole: async (spaceId, userId) => {
        const { data, error } = await supabaseClient
          .from("space_members")
          .select("role")
          .eq("space_id", spaceId)
          .eq("user_id", userId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        return data?.role ?? null
      },
      getMemberRoleIds: async (spaceId, userId) => {
        const { data, error } = await supabaseClient
          .from("space_member_roles")
          .select("role_id")
          .eq("space_id", spaceId)
          .eq("user_id", userId)
        if (error) throw new Error(error.message)
        return (data || []).map((r: { role_id: string }) => r.role_id)
      },
      getChannelPermissions: async (channelId) => {
        const { data, error } = await supabaseClient.rpc("get_my_channel_permissions", { p_channel_id: channelId })
        // Função ainda não existe (banco antes da migração 11): usa a regra antiga
        if (error?.code === "PGRST202") return null
        if (error) throw new Error(error.message)
        return (data ?? {}) as Record<string, boolean>
      }
    })

    if (!access.ok) {
      return json(access.status, { success: false, error: access.error })
    }

    // Sem fallback hardcoded: uma API key/secret fixos no código-fonte ficam
    // expostos a qualquer pessoa com acesso ao repositório, e um secret vazio
    // permitiria que qualquer um assine tokens LiveKit válidos sozinho (HMAC
    // com chave vazia é trivial de reproduzir). Se as variáveis de ambiente
    // não estiverem configuradas na Edge Function, falhamos explicitamente
    // em vez de emitir um token inseguro.
    const livekitUrl = Deno.env.get("LIVEKIT_URL")
    const apiKey = Deno.env.get("LIVEKIT_API_KEY")
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET")

    if (!livekitUrl || !apiKey || !apiSecret) {
      return json(500, {
        success: false,
        error: "LiveKit não está configurado corretamente no servidor (variáveis de ambiente ausentes)."
      })
    }

    // Nome e avatar vêm do cliente: limita o tamanho para não inflar o token
    const safeName = typeof name === "string" && name.trim() ? name.trim().slice(0, 64) : null
    const safeAvatar = typeof avatarUrl === "string" ? avatarUrl.slice(0, 2048) : ""

    const now = Math.floor(Date.now() / 1000)
    const header = { alg: "HS256", typ: "JWT" }
    const payload = {
      exp: now + 24 * 3600,
      iss: apiKey,
      nbf: now - 3600, // Margem para tolerância de relógios locais
      sub: user.id,
      name: safeName || user.user_metadata?.display_name || "Membro",
      metadata: JSON.stringify({ avatarUrl: safeAvatar || user.user_metadata?.avatar_url || "" }),
      video: {
        room,
        roomJoin: true,
        // Sem a permissão "Falar" o token não publica áudio/vídeo (continua ouvindo e mandando dados)
        canPublish: !access.listenOnly,
        canSubscribe: true,
        canPublishData: true
      }
    }

    const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(apiSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(unsigned))
    const signature = base64UrlEncodeBytes(new Uint8Array(signatureBuffer))
    const token = `${unsigned}.${signature}`

    return json(200, { success: true, url: livekitUrl, token })
  } catch (err: any) {
    return json(500, { success: false, error: err?.message || "Internal server error" })
  }
})
