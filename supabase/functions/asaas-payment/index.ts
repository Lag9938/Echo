import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
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
    const { action } = body || {}

    const apiKey = Deno.env.get("ASAAS_API_KEY") || ""
    const apiUrl = Deno.env.get("ASAAS_API_URL") || "https://api.asaas.com/v3"

    if (action === "create-pix") {
      const { name, email, cpfCnpj, value = 9.90 } = body
      let customerId: string | null = null

      const targetEmail = email || user.email
      if (targetEmail) {
        const searchRes = await fetch(`${apiUrl}/customers?email=${encodeURIComponent(targetEmail)}`, {
          headers: { access_token: apiKey, "User-Agent": "EchoApp" }
        }).then(r => r.json()).catch(() => null)

        if (searchRes && searchRes.data && searchRes.data.length > 0) {
          customerId = searchRes.data[0].id
        }
      }

      if (!customerId) {
        const createCusRes = await fetch(`${apiUrl}/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json", access_token: apiKey, "User-Agent": "EchoApp" },
          body: JSON.stringify({
            name: name || user.user_metadata?.display_name || "Membro Echo",
            email: targetEmail || undefined,
            cpfCnpj: cpfCnpj ? String(cpfCnpj).replace(/\D/g, "") : undefined
          })
        }).then(r => r.json())

        if (createCusRes && createCusRes.id) {
          customerId = createCusRes.id
        } else if (createCusRes && createCusRes.errors) {
          return new Response(JSON.stringify({
            success: false,
            error: createCusRes.errors[0]?.description || "Erro ao cadastrar cliente no Asaas."
          }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          })
        }
      }

      if (customerId && cpfCnpj) {
        await fetch(`${apiUrl}/customers/${customerId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", access_token: apiKey, "User-Agent": "EchoApp" },
          body: JSON.stringify({ cpfCnpj: String(cpfCnpj).replace(/\D/g, "") })
        }).catch(() => {})
      }

      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
      const paymentRes = await fetch(`${apiUrl}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: apiKey, "User-Agent": "EchoApp" },
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          value: Number(value) || 9.90,
          dueDate: tomorrow,
          description: "Assinatura Echo Pro - 60 FPS & Alta Definição (1 Mês)",
          externalReference: user.id
        })
      }).then(r => r.json())

      if (!paymentRes || !paymentRes.id) {
        return new Response(JSON.stringify({
          success: false,
          error: paymentRes?.errors?.[0]?.description || "Erro ao gerar cobrança no Asaas."
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      const qrRes = await fetch(`${apiUrl}/payments/${paymentRes.id}/pixQrCode`, {
        headers: { access_token: apiKey, "User-Agent": "EchoApp" }
      }).then(r => r.json())

      return new Response(JSON.stringify({
        success: true,
        paymentId: paymentRes.id,
        customerId: customerId,
        value: paymentRes.value,
        qrCodeImage: qrRes.encodedImage ? `data:image/png;base64,${qrRes.encodedImage}` : null,
        copyPaste: qrRes.payload || null,
        expirationDate: qrRes.expirationDate || null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    } else if (action === "check-status") {
      const { paymentId } = body
      if (!paymentId) {
        return new Response(JSON.stringify({ success: false, error: "ID de pagamento ausente." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
      }

      const res = await fetch(`${apiUrl}/payments/${paymentId}`, {
        headers: { access_token: apiKey, "User-Agent": "EchoApp" }
      }).then(r => r.json())

      const isPaid = Boolean(res && (res.status === "RECEIVED" || res.status === "CONFIRMED"))

      // Confirma que este pagamento pertence ao usuário autenticado antes de
      // conceder qualquer benefício. Sem isso, qualquer usuário logado
      // poderia informar o paymentId de OUTRA pessoa (adivinhado, vazado ou
      // reaproveitado) e ganhar Echo Pro sem ter pago nada. O externalReference
      // é definido como user.id no momento da criação da cobrança (ação
      // "create-pix" acima) e não pode ser forjado pelo cliente, pois vem da
      // resposta da própria API do Asaas.
      const belongsToUser = Boolean(res && res.externalReference === user.id)
      const grantsPremium = isPaid && belongsToUser

      if (grantsPremium) {
        const premiumUntil = new Date(Date.now() + 30 * 86400000).toISOString()
        // Usa a service role para gravar is_premium/premium_until: essas colunas
        // são protegidas por trigger contra escrita direta de clientes
        // autenticados (ver migration_07_protect_subscription_fields.sql), então
        // a concessão só é possível a partir do servidor, após a verificação acima.
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        )
        await supabaseAdmin
          .from("profiles")
          .update({
            is_premium: true,
            premium_until: premiumUntil,
            asaas_customer_id: typeof res.customer === "string" ? res.customer : undefined
          })
          .eq("id", user.id)
      }

      return new Response(JSON.stringify({
        success: true,
        status: res?.status || "UNKNOWN",
        isPaid: grantsPremium
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (action === "cancel-subscription") {
      // Desativa o Echo Pro do próprio usuário autenticado (nunca de outro,
      // pois usamos user.id do token verificado acima, nunca um id vindo do
      // corpo da requisição). is_premium/premium_until são protegidos por
      // trigger contra escrita direta do cliente, então essa desativação só
      // é possível a partir do servidor, com a service role.
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      )
      await supabaseAdmin
        .from("profiles")
        .update({ is_premium: false, premium_until: null })
        .eq("id", user.id)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    return new Response(JSON.stringify({ success: false, error: "Ação não suportada." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err?.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }
})
