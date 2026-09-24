import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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
      return new Response(JSON.stringify({ success: false, error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const body = await req.json().catch(() => ({}))
    const { room, identity, name, avatarUrl } = body || {}

    // Validação estrita de autorização para a sala solicitada
    if (room && typeof room === "string") {
      if (room.startsWith("dm-call-")) {
        // Para chamadas diretas privadas, garante que o usuário requisitante é um dos participantes
        if (!room.includes(user.id)) {
          return new Response(JSON.stringify({ success: false, error: "Acesso negado a esta chamada direta." }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          })
        }
      } else {
        // Consulta se é um canal de servidor registrado no banco
        const { data: channel } = await supabaseClient
          .from("channels")
          .select("id, space_id, is_private, allowed_role_ids")
          .eq("id", room)
          .maybeSingle()

        if (channel && channel.space_id) {
          // Checa se o usuário é membro do servidor
          const { data: membership } = await supabaseClient
            .from("space_members")
            .select("role")
            .eq("space_id", channel.space_id)
            .eq("user_id", user.id)
            .maybeSingle()

          if (!membership) {
            return new Response(JSON.stringify({ success: false, error: "Você não é membro deste servidor." }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
          }

          // Se for canal privado, valida se o usuário possui cargo autorizado ou privilégios de administração
          if (channel.is_private && membership.role !== "owner" && membership.role !== "admin") {
            const allowedRoles: string[] = Array.isArray(channel.allowed_role_ids) ? channel.allowed_role_ids : []
            if (allowedRoles.length > 0) {
              const { data: memberRoles } = await supabaseClient
                .from("space_member_roles")
                .select("role_id")
                .eq("space_id", channel.space_id)
                .eq("user_id", user.id)

              const userRoleIds = (memberRoles || []).map((r: any) => r.role_id)
              const hasRoleAccess = allowedRoles.some((rid: string) => userRoleIds.includes(rid))
              if (!hasRoleAccess) {
                return new Response(JSON.stringify({ success: false, error: "Acesso não autorizado a este canal privado." }), {
                  status: 403,
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                })
              }
            }
          }
        }
      }
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
      return new Response(JSON.stringify({
        success: false,
        error: "LiveKit não está configurado corretamente no servidor (variáveis de ambiente ausentes)."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const now = Math.floor(Date.now() / 1000)
    const header = { alg: "HS256", typ: "JWT" }
    const payload = {
      exp: now + 24 * 3600,
      iss: apiKey,
      nbf: now - 3600, // Margem para tolerância de relógios locais
      sub: user.id || identity || "anonymous",
      name: name || user.user_metadata?.display_name || "Membro",
      metadata: JSON.stringify({ avatarUrl: avatarUrl || user.user_metadata?.avatar_url || "" }),
      video: {
        room: room || "general",
        roomJoin: true,
        canPublish: true,
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

    return new Response(JSON.stringify({ success: true, url: livekitUrl, token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
