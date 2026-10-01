import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { PRO_PRICE, evaluatePayment, normalizeCpfCnpj, type AsaasPayment } from "./billing.ts"

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
    const { action } = body || {}

    const apiKey = Deno.env.get("ASAAS_API_KEY") || ""
    const apiUrl = Deno.env.get("ASAAS_API_URL") || "https://api.asaas.com/v3"
    const asaasHeaders = { "Content-Type": "application/json", access_token: apiKey, "User-Agent": "EchoApp" }

    // Service role: is_premium/premium_until e os IDs do Asaas não podem ser escritos pelo cliente
    // (trigger da migração 07 e tabela billing_accounts sem política de escrita), só daqui
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const saveCustomerId = async (customerId: string) => {
      const { error } = await supabaseAdmin
        .from("billing_accounts")
        .upsert({ user_id: user.id, asaas_customer_id: customerId, updated_at: new Date().toISOString() })
      if (error) console.error("[asaas-payment] Falha ao salvar o cliente do Asaas:", error.message)
    }

    if (action === "create-pix") {
      // Só dados da própria conta: o e-mail verificado do login (nunca um e-mail vindo do app, que
      // deixava achar o cadastro de cobrança de OUTRA pessoa e gravar um CPF nele)
      const name = typeof body.name === "string" && body.name.trim() ? body.name.trim().slice(0, 100) : null
      const cpfCnpj = normalizeCpfCnpj(body.cpfCnpj)
      const targetEmail = user.email || undefined

      let customerId: string | null = null

      const { data: account } = await supabaseAdmin
        .from("billing_accounts")
        .select("asaas_customer_id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (account?.asaas_customer_id) customerId = account.asaas_customer_id

      if (!customerId && targetEmail) {
        const searchRes = await fetch(`${apiUrl}/customers?email=${encodeURIComponent(targetEmail)}`, {
          headers: asaasHeaders
        }).then(r => r.json()).catch(() => null)
        if (searchRes?.data?.length > 0) customerId = searchRes.data[0].id
      }

      if (!customerId) {
        const createCusRes = await fetch(`${apiUrl}/customers`, {
          method: "POST",
          headers: asaasHeaders,
          body: JSON.stringify({
            name: name || user.user_metadata?.display_name || "Membro Echo",
            email: targetEmail,
            cpfCnpj
          })
        }).then(r => r.json())

        if (createCusRes?.id) {
          customerId = createCusRes.id
        } else {
          return json(400, {
            success: false,
            error: createCusRes?.errors?.[0]?.description || "Erro ao cadastrar cliente no Asaas."
          })
        }
      } else if (cpfCnpj) {
        await fetch(`${apiUrl}/customers/${customerId}`, {
          method: "POST",
          headers: asaasHeaders,
          body: JSON.stringify({ cpfCnpj })
        }).catch(() => {})
      }

      await saveCustomerId(customerId as string)

      const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0]
      const paymentRes = await fetch(`${apiUrl}/payments`, {
        method: "POST",
        headers: asaasHeaders,
        body: JSON.stringify({
          customer: customerId,
          billingType: "PIX",
          // Preço fixo no servidor: o valor que o app manda é ignorado
          value: PRO_PRICE,
          dueDate: tomorrow,
          description: "Assinatura Echo Pro - 60 FPS & Alta Definição (1 Mês)",
          externalReference: user.id
        })
      }).then(r => r.json())

      if (!paymentRes?.id) {
        return json(400, {
          success: false,
          error: paymentRes?.errors?.[0]?.description || "Erro ao gerar cobrança no Asaas."
        })
      }

      const qrRes = await fetch(`${apiUrl}/payments/${paymentRes.id}/pixQrCode`, {
        headers: asaasHeaders
      }).then(r => r.json())

      return json(200, {
        success: true,
        paymentId: paymentRes.id,
        value: paymentRes.value,
        qrCodeImage: qrRes.encodedImage ? `data:image/png;base64,${qrRes.encodedImage}` : null,
        copyPaste: qrRes.payload || null,
        expirationDate: qrRes.expirationDate || null
      })
    }

    if (action === "check-status") {
      const { paymentId } = body
      if (typeof paymentId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(paymentId)) {
        return json(400, { success: false, error: "ID de pagamento inválido." })
      }

      const payment: AsaasPayment | null = await fetch(`${apiUrl}/payments/${paymentId}`, {
        headers: asaasHeaders
      }).then(r => r.json()).catch(() => null)

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("premium_until")
        .eq("id", user.id)
        .maybeSingle()

      const decision = evaluatePayment(payment, user.id, Date.now(), profile?.premium_until)

      if (decision.grant) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({ is_premium: true, premium_until: decision.premiumUntil })
          .eq("id", user.id)
        if (error) throw new Error(error.message)
        const customer = (payment as { customer?: unknown } | null)?.customer
        if (typeof customer === "string") await saveCustomerId(customer)
      }

      return json(200, {
        success: true,
        status: payment?.status || "UNKNOWN",
        isPaid: decision.grant,
        premiumUntil: decision.grant ? decision.premiumUntil : null
      })
    }

    if (action === "cancel-subscription") {
      // Só do próprio usuário (user.id do token verificado, nunca um id vindo do corpo)
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_premium: false, premium_until: null })
        .eq("id", user.id)
      if (error) throw new Error(error.message)
      return json(200, { success: true })
    }

    return json(400, { success: false, error: "Ação não suportada." })
  } catch (err: unknown) {
    console.error("[asaas-payment]", err)
    return json(500, { success: false, error: "Não foi possível concluir agora. Tente de novo em instantes." })
  }
})
