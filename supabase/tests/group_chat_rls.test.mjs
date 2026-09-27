// Teste da migração 12 (RLS dos grupos de conversa) contra um Postgres local em memória (PGlite).
// NÃO toca no banco de produção: recria as tabelas e as policies como estão hoje em produção
// (com a recursão infinita), confirma o erro e aplica o arquivo .sql desta pasta.
//
//   node supabase/tests/group_chat_rls.test.mjs
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]+$/, '')
const db = new PGlite()

const U = {
  A: 'aaaaaaaa-0000-4000-8000-00000000000a', // criador
  B: 'bbbbbbbb-0000-4000-8000-00000000000b', // membro
  C: 'cccccccc-0000-4000-8000-00000000000c' // de fora
}

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✔ ${name}`) } else { failed++; console.log(`  ✖ ${name} ${extra}`) }
}

async function as(role, uid, sql, params = []) {
  await db.exec('reset role')
  if (role !== 'postgres') await db.exec(`set role ${role}`)
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid || ''])
  try {
    const res = await db.query(sql, params)
    return { rows: res.rows, error: null }
  } catch (e) {
    return { rows: [], error: String(e.message || e) }
  } finally {
    await db.exec('reset role')
  }
}
const asUser = (u, sql, p) => as('authenticated', U[u], sql, p)
const admin = (sql, p) => as('postgres', null, sql, p)
async function applyScript(sql) {
  await db.exec('reset role')
  try { await db.exec(sql); return { error: null } } catch (e) { return { error: String(e.message || e) } }
}

// Estado de produção antes da migração (levantado via pg_policies)
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table auth.users (id uuid primary key);
grant usage on schema auth, public to anon, authenticated;

create table public.group_chats (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  creator_id uuid not null references auth.users(id) on delete cascade,
  avatar_url text,
  created_at timestamptz not null default now()
);
create table public.group_chat_members (
  id uuid primary key default gen_random_uuid(),
  group_chat_id uuid not null references public.group_chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (group_chat_id, user_id)
);
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_chat_id uuid not null references public.group_chats(id) on delete cascade,
  author_id uuid not null,
  body text
);
alter table public.group_chats enable row level security;
alter table public.group_chat_members enable row level security;
alter table public.group_messages enable row level security;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy "Creator can create group" on public.group_chats for insert with check ((select auth.uid()) = creator_id);
create policy "Members can see their groups" on public.group_chats for select using (exists (select 1 from public.group_chat_members where group_chat_members.group_chat_id = group_chats.id and group_chat_members.user_id = (select auth.uid())));
create policy "Members can update their groups" on public.group_chats for update using (exists (select 1 from public.group_chat_members where group_chat_members.group_chat_id = group_chats.id and group_chat_members.user_id = (select auth.uid()))) with check (exists (select 1 from public.group_chat_members where group_chat_members.group_chat_id = group_chats.id and group_chat_members.user_id = (select auth.uid())));
create policy "Members can delete their groups" on public.group_chats for delete using (exists (select 1 from public.group_chat_members where group_chat_members.group_chat_id = group_chats.id and group_chat_members.user_id = (select auth.uid())));

create policy "Members see group membership" on public.group_chat_members for select using ((user_id = (select auth.uid())) or exists (select 1 from public.group_chat_members m2 where m2.group_chat_id = group_chat_members.group_chat_id and m2.user_id = (select auth.uid())));
create policy "Members join or are added by creator" on public.group_chat_members for insert with check ((user_id = (select auth.uid())) or exists (select 1 from public.group_chats gc where gc.id = group_chat_members.group_chat_id and gc.creator_id = (select auth.uid())));
create policy "Members can leave groups" on public.group_chat_members for delete using (user_id = (select auth.uid()));

create policy "Group members can read messages" on public.group_messages for select using (exists (select 1 from public.group_chat_members m where m.group_chat_id = group_messages.group_chat_id and m.user_id = (select auth.uid())));
create policy "Group members can send messages" on public.group_messages for insert with check (author_id = (select auth.uid()) and exists (select 1 from public.group_chat_members m where m.group_chat_id = group_messages.group_chat_id and m.user_id = (select auth.uid())));

insert into auth.users(id) values ('${U.A}'), ('${U.B}'), ('${U.C}');
`)

console.log('\n[Antes da migração — estado atual de produção]')
{
  const r = await asUser('A', 'select group_chat_id from public.group_chat_members where user_id = auth.uid()')
  check('ler group_chat_members dá "infinite recursion" (o erro dos logs)', !!r.error?.includes('infinite recursion'), r.error || 'sem erro')
  const c = await asUser('A', "insert into public.group_chats(name, creator_id) values ('g', auth.uid()) returning id")
  check('criar grupo também falha', !!c.error, JSON.stringify(c.rows))
}

console.log('\n[Migração 12]')
const sql12 = fs.readFileSync(`${REPO}/migration_12_fix_group_chat_rls.sql`, 'utf8')
{
  const r = await applyScript(sql12)
  check('migração 12 aplica sem erros', !r.error, r.error)
}

let G1
console.log('\n[Criar e listar grupos]')
{
  const c = await asUser('A', "insert into public.group_chats(name, creator_id) values ('Os amigos', auth.uid()) returning id")
  check('criador cria o grupo e recebe a linha de volta (INSERT ... RETURNING)', !c.error && c.rows.length === 1, c.error)
  G1 = c.rows[0]?.id
  const m = await asUser('A', 'insert into public.group_chat_members(group_chat_id, user_id) values ($1, $2), ($1, $3)', [G1, U.A, U.B])
  check('criador adiciona a si e a B como membros', !m.error, m.error)

  const own = await asUser('A', 'select group_chat_id from public.group_chat_members where user_id = auth.uid()')
  check('A lista as próprias participações (a consulta que dava 500)', !own.error && own.rows.length === 1, own.error)
  const all = await asUser('A', 'select user_id from public.group_chat_members where group_chat_id = $1', [G1])
  check('A vê todos os membros do grupo', all.rows.length === 2, JSON.stringify(all.rows))
  const bView = await asUser('B', 'select user_id from public.group_chat_members where group_chat_id = $1', [G1])
  check('B (membro) também vê os membros', bView.rows.length === 2)
  const grp = await asUser('B', 'select id from public.group_chats where id = $1', [G1])
  check('B vê o grupo', grp.rows.length === 1)
}

console.log('\n[Quem é de fora não vê nada]')
{
  check('C não vê o grupo', (await asUser('C', 'select id from public.group_chats where id = $1', [G1])).rows.length === 0)
  check('C não vê os membros', (await asUser('C', 'select id from public.group_chat_members where group_chat_id = $1', [G1])).rows.length === 0)
  const join = await asUser('C', 'insert into public.group_chat_members(group_chat_id, user_id) values ($1, $2)', [G1, U.B])
  check('C não adiciona outra pessoa a um grupo que não é dele', !!join.error)
  check('C não apaga o grupo', (await asUser('C', 'delete from public.group_chats where id = $1 returning id', [G1])).rows.length === 0)
  check('C não renomeia o grupo', (await asUser('C', "update public.group_chats set name = 'x' where id = $1 returning id", [G1])).rows.length === 0)
}

console.log('\n[Mensagens do grupo e saída]')
{
  const send = await asUser('B', "insert into public.group_messages(group_chat_id, author_id, body) values ($1, $2, 'oi')", [G1, U.B])
  check('B (membro) envia mensagem', !send.error, send.error)
  check('C não envia mensagem', !!(await asUser('C', "insert into public.group_messages(group_chat_id, author_id, body) values ($1, $2, 'oi')", [G1, U.C])).error)
  check('B lê as mensagens', (await asUser('B', 'select id from public.group_messages where group_chat_id = $1', [G1])).rows.length === 1)
  check('C não lê as mensagens', (await asUser('C', 'select id from public.group_messages where group_chat_id = $1', [G1])).rows.length === 0)
  check('B renomeia o grupo (membro pode)', (await asUser('B', "update public.group_chats set name = 'Novo nome' where id = $1 returning id", [G1])).rows.length === 1)
  const leave = await asUser('B', 'delete from public.group_chat_members where group_chat_id = $1 and user_id = auth.uid() returning id', [G1])
  check('B sai do grupo', leave.rows.length === 1)
  check('depois de sair, B não vê mais o grupo', (await asUser('B', 'select id from public.group_chats where id = $1', [G1])).rows.length === 0)
}

console.log('\n[Função auxiliar]')
{
  const anon = await as('anon', null, 'select public.is_group_chat_member($1) as r', [G1])
  check('anônimo não executa a função', !!anon.error)
  const noGroup = await asUser('A', 'select public.is_group_chat_member(gen_random_uuid()) as r')
  check('grupo inexistente devolve false', noGroup.rows[0]?.r === false)
}

console.log('\n[Reversão 12]')
{
  const rb = await applyScript(fs.readFileSync(`${REPO}/rollback_12_fix_group_chat_rls.sql`, 'utf8'))
  check('rollback 12 aplica sem erros', !rb.error, rb.error)
  const again = await asUser('A', 'select group_chat_id from public.group_chat_members where user_id = auth.uid()')
  check('após o rollback a recursão volta (estado anterior restaurado)', !!again.error?.includes('infinite recursion'))
  const re = await applyScript(sql12)
  check('migração 12 reaplica depois do rollback', !re.error, re.error)
  check('e volta a funcionar', !(await asUser('A', 'select group_chat_id from public.group_chat_members where user_id = auth.uid()')).error)
}

console.log(`\n${passed} passaram, ${failed} falharam`)
process.exit(failed ? 1 : 0)
