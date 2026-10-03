// Recuperação de conta ("esqueci minha senha") por código enviado ao e-mail. O app é desktop: um link de
// redefinição abriria o navegador, fora do Echo, então a pessoa digita aqui o código que chegou no e-mail.
// Depende de o modelo de e-mail "Reset Password" do Supabase mostrar o código ({{ .Token }}).

export const MIN_PASSWORD_LENGTH = 6
/** Guarda um aviso para a tela de login mostrar depois que ela é recriada (ex.: a troca de senha falhou) */
export const AUTH_NOTICE_KEY = 'echo-auth-notice'

/** Só os dígitos do código (a pessoa pode colar com espaços ou traço); '' se não tiver o tamanho de um código */
export function normalizeRecoveryCode(input: string): string {
  const digits = (input || '').replace(/\D/g, '')
  return digits.length >= 6 && digits.length <= 10 ? digits : ''
}

/** A senha nova é a mesma de antes: para quem estava recuperando a conta, isso é sucesso (ela já entrou) */
export function isSamePasswordError(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false
  return error.code === 'same_password' || /different from the old password/i.test(error.message || '')
}

/** Mensagens do Supabase (em inglês) → aviso em português para a tela de login */
export function recoveryErrorMessage(error: { message?: string; code?: string; status?: number } | null | undefined): string {
  const message = (error?.message || '').toLowerCase()
  const code = error?.code || ''
  if (code === 'otp_expired' || message.includes('expired') || message.includes('invalid')) {
    return 'Código incorreto ou vencido. Confira o e-mail ou peça um código novo.'
  }
  if (code.includes('rate_limit') || error?.status === 429 || message.includes('rate limit') || message.includes('security purposes')) {
    return 'Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.'
  }
  if (code === 'weak_password' || message.includes('password should')) {
    return `Senha fraca demais. Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  }
  if (message.includes('fetch') || message.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.'
  }
  return 'Não foi possível concluir agora. Tente de novo em instantes.'
}
