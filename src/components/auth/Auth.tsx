import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Brand } from '../navigation/Brand'
import { WindowControls } from '../navigation/WindowControls'
import { EchoAtomLogo } from '../icons'
import {
  AUTH_NOTICE_KEY,
  MIN_PASSWORD_LENGTH,
  isSamePasswordError,
  normalizeRecoveryCode,
  recoveryErrorMessage
} from '../../lib/passwordRecovery'

type AuthMode = 'login' | 'signup' | 'recover-request' | 'recover-confirm'

const TITLES: Record<AuthMode, string> = {
  login: 'Bem-vindo de volta',
  signup: 'Crie sua conta',
  'recover-request': 'Recuperar conta',
  'recover-confirm': 'Criar nova senha'
}

const SUBTITLES: Record<AuthMode, string> = {
  login: 'Converse, crie e encontre sua comunidade.',
  signup: 'Converse, crie e encontre sua comunidade.',
  'recover-request': 'Informe o e-mail da sua conta e enviaremos um código.',
  'recover-confirm': 'Digite o código que chegou no seu e-mail e escolha a senha nova.'
}

function takeStoredNotice(): string {
  try {
    const stored = sessionStorage.getItem(AUTH_NOTICE_KEY) || ''
    if (stored) sessionStorage.removeItem(AUTH_NOTICE_KEY)
    return stored
  } catch {
    return ''
  }
}

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [notice, setNotice] = useState(takeStoredNotice)
  const [busy, setBusy] = useState(false)

  const goTo = (next: AuthMode, nextNotice = '') => {
    setMode(next)
    setNotice(nextNotice)
    setPassword('')
    setCode('')
  }

  async function requestRecoveryCode() {
    if (!supabase) return
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim())
    if (error) {
      setNotice(recoveryErrorMessage(error))
      return
    }
    // A resposta é a mesma exista ou não a conta, para ninguém descobrir quais e-mails têm cadastro
    goTo('recover-confirm', 'Se existir uma conta com esse e-mail, o código chega em instantes. Veja também a caixa de spam.')
  }

  async function confirmRecovery() {
    if (!supabase) return
    const token = normalizeRecoveryCode(code)
    if (!token) {
      setNotice('Digite o código numérico que chegou no e-mail.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setNotice(`A senha nova precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`)
      return
    }

    // O código confere a identidade e já abre a sessão; a senha nova é gravada logo em seguida. O app pode
    // trocar esta tela pela principal no meio do caminho, então um erro é guardado para o próximo login.
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: 'recovery' })
    if (verifyError) {
      setNotice(recoveryErrorMessage(verifyError))
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError && !isSamePasswordError(updateError)) {
      const message = `${recoveryErrorMessage(updateError)} A senha não foi alterada: peça um código novo.`
      try { sessionStorage.setItem(AUTH_NOTICE_KEY, message) } catch { /* sem armazenamento: só não mostra o aviso */ }
      await supabase.auth.signOut()
      setNotice(message)
      setMode('recover-request')
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setBusy(true); setNotice('')
    try {
      if (mode === 'signup') {
        const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
        if (error) setNotice(error.message)
        else if (!data.session) setNotice('Conta criada! Faça login para acessar.')
      } else if (mode === 'recover-request') {
        await requestRecoveryCode()
      } else if (mode === 'recover-confirm') {
        await confirmRecovery()
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
    mode === 'recover-request' ? 'Enviar código' :
    'Salvar senha e entrar'

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
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} readOnly={mode === 'recover-confirm'} required /></label>
          {mode === 'recover-confirm' && (
            <label>Código do e-mail<input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={16} autoFocus required /></label>
          )}
          {mode !== 'recover-request' && (
            <label>{mode === 'recover-confirm' ? 'Nova senha' : 'Senha'}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={MIN_PASSWORD_LENGTH} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /></label>
          )}
          {mode === 'login' && (
            <button type="button" className="auth-forgot" onClick={() => goTo('recover-request')}>
              Esqueci minha senha
            </button>
          )}
          {notice && <div className="auth-notice">{notice}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? 'Aguarde…' : submitLabel}</button>
        </form>
        {mode === 'recover-confirm' && (
          <button className="auth-switch" disabled={busy} onClick={() => goTo('recover-request')}>
            Não recebi o código: enviar de novo
          </button>
        )}
        {mode === 'login' || mode === 'signup' ? (
          <button className="auth-switch" onClick={() => goTo(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Ainda não tem conta? Criar agora' : 'Já tenho uma conta'}
          </button>
        ) : (
          <button className="auth-switch" onClick={() => goTo('login')}>
            Voltar para o login
          </button>
        )}
      </section>
    </main>
  )
}
