// Mensagens de erro do login, cadastro e recuperação de conta. O Supabase responde em inglês
// ("Invalid login credentials"); a tela de login mostra sempre um aviso em português, nunca o texto cru.

export interface AuthErrorLike {
  message?: string
  code?: string
  status?: number
}

export function authErrorMessage(error: AuthErrorLike | null | undefined): string {
  const message = (error?.message || '').toLowerCase()
  const code = error?.code || ''

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos.'
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Confirme seu e-mail antes de entrar: abra o link que enviamos quando a conta foi criada.'
  }
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) {
    return 'Já existe uma conta com esse e-mail. Entre com ela ou use "Esqueci minha senha".'
  }
  if (code === 'weak_password' || message.includes('password should')) {
    return 'Senha fraca demais. Use pelo menos 6 caracteres e evite senhas muito comuns.'
  }
  if (code === 'signup_disabled' || message.includes('signups not allowed')) {
    return 'A criação de contas está desativada no momento.'
  }
  if (code === 'user_banned' || message.includes('banned')) {
    return 'Esta conta está suspensa.'
  }
  if (code.includes('rate_limit') || error?.status === 429 || message.includes('rate limit') || message.includes('security purposes')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.'
  }
  if (code === 'validation_failed' || code === 'email_address_invalid' || message.includes('invalid') || message.includes('valid email')) {
    return 'Confira o e-mail digitado.'
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
  }
  return 'Não foi possível concluir agora. Tente de novo em instantes.'
}
