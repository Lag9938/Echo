#!/usr/bin/env node
// Script de configuração ÚNICA: cria a conta "Echo Music Bot" (um usuário
// de auth + a linha correspondente em public.profiles) e imprime o UUID
// pra você colar em BOT_AUTHOR_ID no music-bot/.env.
//
// Por quê via Admin API e não INSERT direto em auth.users? Porque o Supabase
// gerencia esse schema internamente (senha criptografada, tokens de
// confirmação, etc.) — inserir via SQL bruto é frágil e não suportado.
//
// Rode uma vez, depois de preencher SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
// no music-bot/.env:
//
//   cd music-bot && node scripts/create-bot-account.mjs

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no music-bot/.env antes de rodar este script.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const BOT_EMAIL = 'echo-music-bot@echo.internal'
const BOT_DISPLAY_NAME = 'Echo Music Bot'

async function main() {
  console.log('Criando usuário de autenticação para o bot...')

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: BOT_EMAIL,
    password: crypto.randomUUID(), // nunca usada pra login — o bot fala com o Supabase via service role key
    email_confirm: true,
    user_metadata: { display_name: BOT_DISPLAY_NAME, is_bot: true }
  })

  let userId

  if (createError) {
    // Já existe (rodou o script de novo)? Busca em vez de falhar.
    const alreadyExists = createError.status === 422 || /already/i.test(createError.message || '')
    if (!alreadyExists) throw createError

    console.log('Usuário do bot já existe, buscando UUID existente...')
    const { data: list, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError
    const existing = list.users.find(u => u.email === BOT_EMAIL)
    if (!existing) throw new Error('Não encontrei o usuário existente do bot — verifique manualmente no painel do Supabase.')
    userId = existing.id
  } else {
    userId = created.user.id
  }

  console.log(`Usuário do bot: ${userId}`)

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: BOT_DISPLAY_NAME }, { onConflict: 'id' })

  if (profileError) throw profileError

  console.log('\n✅ Pronto! Adicione isso ao seu music-bot/.env:\n')
  console.log(`BOT_AUTHOR_ID=${userId}\n`)
}

main().catch(err => {
  console.error('Falha ao criar conta do bot:', err.message || err)
  process.exit(1)
})
