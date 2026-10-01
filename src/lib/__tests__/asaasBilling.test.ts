import { describe, it, expect } from 'vitest'
import {
  PRO_DAYS,
  PRO_PRICE,
  evaluatePayment,
  normalizeCpfCnpj,
  type AsaasPayment
} from '../../../supabase/functions/asaas-payment/billing.ts'

const USER = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-01T12:00:00Z')

const paid = (over: Partial<AsaasPayment> = {}): AsaasPayment => ({
  id: 'pay_1',
  status: 'RECEIVED',
  value: PRO_PRICE,
  externalReference: USER,
  paymentDate: '2026-09-30',
  ...over
})

describe('evaluatePayment — quando libera', () => {
  it('libera o Pro por PRO_DAYS a partir da data do pagamento (não de agora)', () => {
    const res = evaluatePayment(paid(), USER, NOW)
    expect(res).toEqual({ grant: true, premiumUntil: new Date(Date.parse('2026-09-30T00:00:00Z') + PRO_DAYS * DAY).toISOString() })
  })

  it.each(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'])('aceita o status %s', (status) => {
    expect(evaluatePayment(paid({ status }), USER, NOW).grant).toBe(true)
  })

  it('usa confirmedDate quando não há paymentDate', () => {
    const res = evaluatePayment(paid({ paymentDate: null, confirmedDate: '2026-09-29' }), USER, NOW)
    expect(res).toMatchObject({ grant: true, premiumUntil: new Date(Date.parse('2026-09-29T00:00:00Z') + PRO_DAYS * DAY).toISOString() })
  })
})

describe('evaluatePayment — ataques do relatório', () => {
  it('NEGA um PIX de valor menor que o preço (o app escolhia o valor)', () => {
    expect(evaluatePayment(paid({ value: 0.01 }), USER, NOW)).toEqual({ grant: false, reason: 'wrong_value' })
    expect(evaluatePayment(paid({ value: PRO_PRICE - 0.1 }), USER, NOW)).toEqual({ grant: false, reason: 'wrong_value' })
  })

  it('consultar o MESMO pagamento de novo não estende o Pro (antes: +30 dias a cada consulta)', () => {
    const first = evaluatePayment(paid(), USER, NOW)
    expect(first.grant).toBe(true)
    const until = (first as { premiumUntil: string }).premiumUntil
    // um mês depois, consultando o mesmo pagamento com o premium_until que ele gerou
    const later = evaluatePayment(paid(), USER, NOW + 25 * DAY, until)
    expect(later).toEqual({ grant: true, premiumUntil: until })
    // e depois que vence, o mesmo pagamento não libera mais nada
    expect(evaluatePayment(paid(), USER, NOW + 40 * DAY, until)).toEqual({ grant: false, reason: 'expired' })
  })

  it('NEGA o pagamento de outra pessoa', () => {
    expect(evaluatePayment(paid({ externalReference: OTHER }), USER, NOW)).toEqual({ grant: false, reason: 'not_owner' })
    expect(evaluatePayment(paid({ externalReference: null }), USER, NOW)).toEqual({ grant: false, reason: 'not_owner' })
  })

  it('NEGA pagamento pendente, vencido ou estornado', () => {
    for (const status of ['PENDING', 'OVERDUE', 'REFUNDED', 'CHARGEBACK_REQUESTED', undefined]) {
      expect(evaluatePayment(paid({ status }), USER, NOW)).toEqual({ grant: false, reason: 'not_paid' })
    }
  })

  it('NEGA pagamento antigo cuja validade já passou', () => {
    expect(evaluatePayment(paid({ paymentDate: '2026-07-01' }), USER, NOW)).toEqual({ grant: false, reason: 'expired' })
  })
})

describe('evaluatePayment — validade existente', () => {
  it('nunca diminui uma validade maior que já existe', () => {
    const longer = '2027-01-01T00:00:00.000Z'
    expect(evaluatePayment(paid(), USER, NOW, longer)).toEqual({ grant: true, premiumUntil: longer })
  })

  it('NEGA entradas inválidas', () => {
    expect(evaluatePayment(null, USER, NOW)).toEqual({ grant: false, reason: 'invalid' })
    expect(evaluatePayment(paid(), '', NOW)).toEqual({ grant: false, reason: 'invalid' })
    expect(evaluatePayment(paid({ value: '9.90' as unknown as number }), USER, NOW)).toEqual({ grant: false, reason: 'wrong_value' })
    expect(evaluatePayment(paid({ paymentDate: 'lixo', confirmedDate: null, clientPaymentDate: null, dateCreated: null }), USER, NOW))
      .toEqual({ grant: false, reason: 'invalid' })
  })
})

describe('normalizeCpfCnpj', () => {
  it('aceita CPF e CNPJ com ou sem máscara', () => {
    expect(normalizeCpfCnpj('123.456.789-09')).toBe('12345678909')
    expect(normalizeCpfCnpj('12.345.678/0001-95')).toBe('12345678000195')
  })
  it('ignora tamanhos errados e valores vazios', () => {
    for (const v of ['123', '', null, undefined, '1234567890123456']) expect(normalizeCpfCnpj(v)).toBeUndefined()
  })
})
