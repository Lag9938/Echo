import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Brand } from '../navigation/Brand'
import { WindowControls } from '../navigation/WindowControls'
import { EchoAtomLogo } from '../icons'
import { PASSWORD_RECOVERY_URL, recoveryErrorMessage } from '../../lib/passwordRecovery'

type AuthMode = 'login' | 'signup' | 'recover'

const TITLES: Record<AuthMode, string> = {
  login: 'Bem-vindo de volta',
  signup: 'Crie sua conta',
  recover: 'Recuperar conta'
}

const SUBTITLES: Record<AuthMode, string> = {
  login: 'Converse, crie e encontre sua comunidade.',
  signup: 'Converse, crie e encontre sua comunidade.',
  recover: 'Informe o e-mail da sua conta e enviaremos um link para criar uma senha nova.'
}

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const goTo = (next: AuthMode, nextNotice = '') => {
    setMode(next)
    setNotice(nextNotice)
    setPassword('')
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setBusy(true); setNotice('')
    try {
      if (mode === 'signup') {
        const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
        if (error) setNotice(error.message)
        else if (!data.session) setNotice('Conta criada! Faça login para acessar.')
      } else if (mode === 'recover') {
        // O link do e-mail abre a página de recuperação no navegador (veja lib/passwordRecovery.ts)
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: PASSWORD_RECOVERY_URL })
        if (error) setNotice(recoveryErrorMessage(error))
        // A resposta é a mesma exista ou não a conta, para ninguém descobrir quais e-mails têm cadastro
        else goTo('login', 'Se existir uma conta com esse e-mail, o link chega em instantes (veja também o spam). Abra o link, crie a senha nova e volte aqui para entrar.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setNotice(error.message)
      }
    } catch (error) {
      setNotice(recoveryErrorMessage(error as { message?: string }))
    }
    setBusy(false)
  }

  const submitLabel =
    mode === 'login' ? 'Entrar no Echo' :
    mode === 'signup' ? 'Criar conta' :
    'Enviar link de recuperação'

  return (
    <main className="auth-page">
      <header className="auth-titlebar">
        <div className="auth-titlebar-drag">
          <div className="auth-titlebar-brand">
            <EchoAtomLogo size={14} />
            <span>Echo</span>
          </div>
        </div>
        <WindowControls isQuitOnClose />
      </header>

      <div className="auth-bg-blob auth-bg-blob-1"></div>
      <div className="auth-bg-blob auth-bg-blob-2"></div>
      <div className="auth-bg-blob auth-bg-blob-3"></div>

      <section className="auth-card">
        <Brand />
        <h1>{TITLES[mode]}</h1>
        <p>{SUBTITLES[mode]}</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Seu nome<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></label>}
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          {mode !== 'recover' && (
            <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
          )}
          {mode === 'login' && (
            <button type="button" className="auth-forgot" onClick={() => goTo('recover')}>
              Esqueci minha senha
            </button>
          )}
          {notice && <div className="auth-notice">{notice}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? 'Aguarde…' : submitLabel}</button>
        </form>
        {mode === 'recover' ? (
          <button className="auth-switch" onClick={() => goTo('login')}>
            Voltar para o login
          </button>
        ) : (
          <button className="auth-switch" onClick={() => goTo(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Ainda não tem conta? Criar agora' : 'Já tenho uma conta'}
          </button>
        )}
      </section>
    </main>
  )
}
