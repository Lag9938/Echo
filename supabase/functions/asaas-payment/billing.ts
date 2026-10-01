// Regras de cobrança do Echo Pro. Módulo puro (sem APIs do Deno nem do Supabase) para poder ser testado
// com o vitest; o index.ts só busca os dados no Asaas e grava o resultado.
//
// Antes: o valor da cobrança vinha do app (dava para gerar um PIX de centavos), a liberação não conferia o
// valor pago, e cada consulta do mesmo pagamento renovava o Pro por mais 30 dias a partir de AGORA (pagar
// uma vez e consultar todo mês = Pro para sempre). Agora o preço é fixo aqui, o valor pago é conferido e a
// validade é contada a partir da data do pagamento, então consultar de novo nunca estende nada.

/** Preço do Echo Pro (1 mês) em reais. O app não escolhe o valor. */
export const PRO_PRICE = 9.9
/** Dias de Pro que um pagamento confirmado libera */
export const PRO_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000
const PAID_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])

/** Campos do pagamento do Asaas que importam aqui (GET /payments/{id}) */
export interface AsaasPayment {
  id?: string
  status?: string
  value?: number
  externalReference?: string | null
  paymentDate?: string | null
  confirmedDate?: string | null
  clientPaymentDate?: string | null
  dateCreated?: string | null
}

export type PaymentDecision =
  | { grant: true; premiumUntil: string }
  | { grant: false; reason: 'not_paid' | 'not_owner' | 'wrong_value' | 'expired' | 'invalid' }

/** "2026-10-01" (data do Asaas, sem hora) ou ISO completo → milissegundos; null se não der para ler */
function parseDate(value: string | null | undefined): number | null {
  if (!value || typeof value !== 'string') return null
  const ms = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value)
  return Number.isFinite(ms) ? ms : null
}

/**
 * Decide se um pagamento libera o Pro para este usuário, e até quando.
 * `currentPremiumUntil` é o premium_until atual do perfil: a validade nunca diminui por causa de um
 * pagamento antigo, e um pagamento já usado devolve a mesma data (consultar de novo não estende).
 */
export function evaluatePayment(
  payment: AsaasPayment | null | undefined,
  userId: string,
  now: number,
  currentPremiumUntil?: string | null
): PaymentDecision {
  if (!payment || typeof payment !== 'object' || !userId) return { grant: false, reason: 'invalid' }
  if (!payment.status || !PAID_STATUSES.has(payment.status)) return { grant: false, reason: 'not_paid' }
  // O externalReference é gravado como user.id na criação da cobrança (pelo servidor), então o
  // paymentId de outra pessoa nunca libera nada para quem consultou
  if (payment.externalReference !== userId) return { grant: false, reason: 'not_owner' }
  // Centavos de folga para arredondamento; menos que o preço não libera
  if (typeof payment.value !== 'number' || payment.value + 0.005 < PRO_PRICE) return { grant: false, reason: 'wrong_value' }

  const paidAt =
    parseDate(payment.paymentDate) ??
    parseDate(payment.confirmedDate) ??
    parseDate(payment.clientPaymentDate) ??
    parseDate(payment.dateCreated)
  if (paidAt === null) return { grant: false, reason: 'invalid' }

  const until = paidAt + PRO_DAYS * DAY_MS
  if (until <= now) return { grant: false, reason: 'expired' }

  const current = parseDate(currentPremiumUntil)
  const finalUntil = current !== null && current > until ? current : until
  return { grant: true, premiumUntil: new Date(finalUntil).toISOString() }
}

/** CPF/CNPJ só com dígitos e no tamanho certo (11 ou 14); qualquer outra coisa é ignorada */
export function normalizeCpfCnpj(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const digits = String(value).replace(/\D/g, '')
  return digits.length === 11 || digits.length === 14 ? digits : undefined
}
