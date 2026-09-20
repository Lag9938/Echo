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

      if (isPaid) {
        const premiumUntil = new Date(Date.now() + 30 * 86400000).toISOString()
        await supabaseClient
          .from("profiles")
          .update({ is_premium: true, premium_until: premiumUntil })
          .eq("id", user.id)
      }

      return new Response(JSON.stringify({
        success: true,
        status: res?.status || "UNKNOWN",
        isPaid
      }), {
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
