import { describe, it, expect } from 'vitest'
import { isSamePasswordError, normalizeRecoveryCode, recoveryErrorMessage } from '../passwordRecovery'

describe('normalizeRecoveryCode', () => {
  it('aceita o código colado com espaços, traço ou quebra de linha', () => {
    expect(normalizeRecoveryCode('123456')).toBe('123456')
    expect(normalizeRecoveryCode(' 123 456 \n')).toBe('123456')
    expect(normalizeRecoveryCode('123-456')).toBe('123456')
    expect(normalizeRecoveryCode('12345678')).toBe('12345678')
  })

  it('recusa o que não tem tamanho de código', () => {
    expect(normalizeRecoveryCode('')).toBe('')
    expect(normalizeRecoveryCode('12345')).toBe('')
    expect(normalizeRecoveryCode('abcdef')).toBe('')
    expect(normalizeRecoveryCode('12345678901')).toBe('')
  })
})

describe('isSamePasswordError', () => {
  it('reconhece "a senha nova é igual à antiga" pelo código ou pela mensagem', () => {
    expect(isSamePasswordError({ code: 'same_password' })).toBe(true)
    expect(isSamePasswordError({ message: 'New password should be different from the old password.' })).toBe(true)
    expect(isSamePasswordError({ message: 'Password should be at least 6 characters.' })).toBe(false)
    expect(isSamePasswordError(null)).toBe(false)
  })
})

describe('recoveryErrorMessage', () => {
  it('código errado ou vencido', () => {
    expect(recoveryErrorMessage({ message: 'Token has expired or is invalid', code: 'otp_expired' })).toMatch(/Código incorreto ou vencido/)
  })

  it('limite de pedidos', () => {
    expect(recoveryErrorMessage({ message: 'For security purposes, you can only request this after 42 seconds.' })).toMatch(/Muitos pedidos/)
    expect(recoveryErrorMessage({ message: 'email rate limit exceeded', code: 'over_email_send_rate_limit', status: 429 })).toMatch(/Muitos pedidos/)
  })

  it('senha fraca', () => {
    expect(recoveryErrorMessage({ message: 'Password should be at least 6 characters.', code: 'weak_password' })).toMatch(/Senha fraca/)
  })

  it('sem internet e erro desconhecido nunca mostram a mensagem crua em inglês', () => {
    expect(recoveryErrorMessage({ message: 'Failed to fetch' })).toMatch(/Sem conexão/)
    expect(recoveryErrorMessage({ message: 'something odd' })).toMatch(/Não foi possível concluir/)
    expect(recoveryErrorMessage(undefined)).toMatch(/Não foi possível concluir/)
  })
})
