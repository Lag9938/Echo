import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn()
}))

vi.mock('../../../lib/supabase', () => ({
  supabase: { auth },
  isSupabaseConfigured: true
}))

import { Auth } from '../Auth'

function type(container: HTMLElement, selector: string, value: string) {
  const input = container.querySelector(selector) as HTMLInputElement
  fireEvent.change(input, { target: { value } })
}

function submit(container: HTMLElement) {
  fireEvent.submit(container.querySelector('form') as HTMLFormElement)
}

describe('Tela de login', () => {
  beforeEach(() => {
    auth.signInWithPassword.mockResolvedValue({ error: null })
    auth.signUp.mockResolvedValue({ error: null, data: { session: null } })
    auth.resetPasswordForEmail.mockResolvedValue({ error: null })
  })

  it('entra com e-mail e senha', async () => {
    const { container } = render(<Auth />)
    type(container, 'input[type=email]', 'ana@exemplo.test')
    type(container, 'input[type=password]', 'segredo-1')
    submit(container)

    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'ana@exemplo.test', password: 'segredo-1' }))
    expect(container.querySelector('.auth-notice')).toBeNull()
  })

  it('mostra o erro de login em português, nunca o texto cru do servidor', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials', code: 'invalid_credentials' } })
    const { container } = render(<Auth />)
    type(container, 'input[type=email]', 'ana@exemplo.test')
    type(container, 'input[type=password]', 'errada-1')
    submit(container)

    expect(await screen.findByText('E-mail ou senha incorretos.')).toBeTruthy()
    expect(container.textContent).not.toContain('Invalid login credentials')
  })

  it('cria conta com o nome informado e avisa para fazer login', async () => {
    const { container } = render(<Auth />)
    fireEvent.click(screen.getByText('Ainda não tem conta? Criar agora'))
    type(container, 'input:not([type])', 'Ana')
    type(container, 'input[type=email]', 'ana@exemplo.test')
    type(container, 'input[type=password]', 'segredo-1')
    submit(container)

    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith({
      email: 'ana@exemplo.test',
      password: 'segredo-1',
      options: { data: { display_name: 'Ana' } }
    }))
    expect(await screen.findByText('Conta criada! Faça login para acessar.')).toBeTruthy()
  })

  it('"Esqueci minha senha" pede o link para a página de recuperação e volta ao login com o aviso', async () => {
    const { container } = render(<Auth />)
    fireEvent.click(screen.getByText('Esqueci minha senha'))

    expect(screen.getByText('Recuperar conta')).toBeTruthy()
    expect(container.querySelector('input[type=password]')).toBeNull()

    type(container, 'input[type=email]', '  ana@exemplo.test ')
    submit(container)

    await waitFor(() => expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('ana@exemplo.test', {
      redirectTo: 'https://lag9938.github.io/Echo/recuperar/'
    }))
    expect(await screen.findByText(/Se existir uma conta com esse e-mail/)).toBeTruthy()
    expect(screen.getByText('Bem-vindo de volta')).toBeTruthy()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('recuperação: limite de pedidos aparece em português e a tela continua na recuperação', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'email rate limit exceeded', status: 429 } })
    const { container } = render(<Auth />)
    fireEvent.click(screen.getByText('Esqueci minha senha'))
    type(container, 'input[type=email]', 'ana@exemplo.test')
    submit(container)

    expect(await screen.findByText(/Muitas tentativas em pouco tempo/)).toBeTruthy()
    expect(screen.getByText('Recuperar conta')).toBeTruthy()
  })

  it('falha de rede não derruba a tela: mostra aviso e libera o botão de novo', async () => {
    auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'))
    const { container } = render(<Auth />)
    type(container, 'input[type=email]', 'ana@exemplo.test')
    type(container, 'input[type=password]', 'segredo-1')
    submit(container)

    expect(await screen.findByText(/Sem conexão com o servidor/)).toBeTruthy()
    expect((container.querySelector('.auth-submit') as HTMLButtonElement).disabled).toBe(false)
  })
})
