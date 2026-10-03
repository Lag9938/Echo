import { describe, it, expect } from 'vitest'
import { PASSWORD_RECOVERY_URL, recoveryErrorMessage } from '../passwordRecovery'

describe('PASSWORD_RECOVERY_URL', () => {
  it('aponta para a página de recuperação do site do Echo, em https', () => {
    expect(PASSWORD_RECOVERY_URL).toBe('https://lag9938.github.io/Echo/recuperar/')
  })
})

describe('recoveryErrorMessage', () => {
  it('limite de pedidos', () => {
    expect(recoveryErrorMessage({ message: 'For security purposes, you can only request this after 42 seconds.' })).toMatch(/Muitos pedidos/)
    expect(recoveryErrorMessage({ message: 'email rate limit exceeded', code: 'over_email_send_rate_limit', status: 429 })).toMatch(/Muitos pedidos/)
  })

  it('e-mail mal digitado', () => {
    expect(recoveryErrorMessage({ message: 'Unable to validate email address: invalid format', code: 'validation_failed' })).toMatch(/Confira o e-mail/)
  })

  it('sem internet e erro desconhecido nunca mostram a mensagem crua em inglês', () => {
    expect(recoveryErrorMessage({ message: 'Failed to fetch' })).toMatch(/Sem conexão/)
    expect(recoveryErrorMessage({ message: 'something odd' })).toMatch(/Não foi possível concluir/)
    expect(recoveryErrorMessage(undefined)).toMatch(/Não foi possível concluir/)
  })
})
