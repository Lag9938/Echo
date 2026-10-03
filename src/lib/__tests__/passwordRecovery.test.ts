import { describe, it, expect } from 'vitest'
import { PASSWORD_RECOVERY_URL } from '../passwordRecovery'
import { authErrorMessage } from '../authMessages'

describe('PASSWORD_RECOVERY_URL', () => {
  it('aponta para a página de recuperação do site do Echo, em https', () => {
    expect(PASSWORD_RECOVERY_URL).toBe('https://lag9938.github.io/Echo/recuperar/')
  })
})

describe('authErrorMessage', () => {
  it('login errado', () => {
    expect(authErrorMessage({ message: 'Invalid login credentials', code: 'invalid_credentials' })).toBe('E-mail ou senha incorretos.')
  })

  it('e-mail ainda não confirmado', () => {
    expect(authErrorMessage({ message: 'Email not confirmed', code: 'email_not_confirmed' })).toMatch(/Confirme seu e-mail/)
  })

  it('conta que já existe', () => {
    expect(authErrorMessage({ message: 'User already registered', code: 'user_already_exists' })).toMatch(/Já existe uma conta/)
  })

  it('senha fraca', () => {
    expect(authErrorMessage({ message: 'Password should be at least 6 characters.', code: 'weak_password' })).toMatch(/Senha fraca/)
  })

  it('limite de pedidos', () => {
    expect(authErrorMessage({ message: 'For security purposes, you can only request this after 42 seconds.' })).toMatch(/Muitas tentativas/)
    expect(authErrorMessage({ message: 'email rate limit exceeded', code: 'over_email_send_rate_limit', status: 429 })).toMatch(/Muitas tentativas/)
  })

  it('e-mail mal digitado', () => {
    expect(authErrorMessage({ message: 'Unable to validate email address: invalid format', code: 'validation_failed' })).toMatch(/Confira o e-mail/)
  })

  it('sem internet e erro desconhecido nunca mostram a mensagem crua em inglês', () => {
    expect(authErrorMessage({ message: 'Failed to fetch' })).toMatch(/Sem conexão/)
    expect(authErrorMessage({ message: 'something odd' })).toMatch(/Não foi possível concluir/)
    expect(authErrorMessage(undefined)).toMatch(/Não foi possível concluir/)
  })
})
