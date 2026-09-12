import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Brand } from '../navigation/Brand'
import { WindowControls } from '../navigation/WindowControls'
import { EchoAtomLogo } from '../icons'

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    setBusy(true); setNotice('')
    if (mode === 'signup') {
      const { error, data } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } })
      if (error) setNotice(error.message)
      else if (!data.session) setNotice('Conta criada! Faça login para acessar.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setNotice(error.message)
    }
    setBusy(false)
  }

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
        <h1>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h1>
        <p>Converse, crie e encontre sua comunidade.</p>
        <form onSubmit={submit}>
          {mode === 'signup' && <label>Seu nome<input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required /></label>}
          <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Senha<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
          {notice && <div className="auth-notice">{notice}</div>}
          <button className="auth-submit" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar no Echo' : 'Criar conta'}</button>
        </form>
        <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setNotice('') }}>
          {mode === 'login' ? 'Ainda não tem conta? Criar agora' : 'Já tenho uma conta'}
        </button>
      </section>
    </main>
  )
}
