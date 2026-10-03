// Recuperação de conta ("esqueci minha senha"). O app pede o e-mail de redefinição ao Supabase; o link do
// e-mail abre a página docs/recuperar/ (GitHub Pages), onde a pessoa cria a senha nova e volta para entrar.
// É por link e não por código porque o projeto usa o envio de e-mail padrão do Supabase, que não deixa
// editar o modelo do e-mail (só manda o link). A URL abaixo precisa estar nas "Redirect URLs" do projeto.

export const PASSWORD_RECOVERY_URL = 'https://lag9938.github.io/Echo/recuperar/'

/** Mensagens do Supabase (em inglês) → aviso em português para a tela de login */
export function recoveryErrorMessage(error: { message?: string; code?: string; status?: number } | null | undefined): string {
  const message = (error?.message || '').toLowerCase()
  const code = error?.code || ''
  if (code.includes('rate_limit') || error?.status === 429 || message.includes('rate limit') || message.includes('security purposes')) {
    return 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.'
  }
  if (code === 'validation_failed' || message.includes('invalid') || message.includes('valid email')) {
    return 'Confira o e-mail digitado.'
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
  }
  return 'Não foi possível concluir agora. Tente de novo em instantes.'
}
