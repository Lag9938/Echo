// Testes das migrações 08 (convites) e 09 (fechamento de acesso) contra um Postgres local em memória (PGlite).
// NÃO toca no banco de produção: recria as tabelas, funções e policies como estavam antes das migrações e
// aplica os arquivos .sql desta pasta.
//
// Como rodar (na raiz do projeto):
//   npm i --no-save @electric-sql/pglite
//   node supabase/tests/migrations.test.mjs
//
// Se o esquema de produção mudar (tabelas/policies de spaces, space_members etc.), atualize o bloco
// "Estado atual do banco de produção" abaixo.
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const REPO = fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]+$/, '')
const db = new PGlite()

const U = {
  A: 'aaaaaaaa-0000-4000-8000-00000000000a', // criador/dono
  B: 'bbbbbbbb-0000-4000-8000-00000000000b',
  C: 'cccccccc-0000-4000-8000-00000000000c',
  D: 'dddddddd-0000-4000-8000-00000000000d',
  E: 'eeeeeeee-0000-4000-8000-00000000000e',
  F: 'ffffffff-0000-4000-8000-00000000000f'
}

let passed = 0
let failed = 0
function check(name, cond, extra = '') {
  if (cond) { passed++; console.log(`  ✔ ${name}`) } else { failed++; console.log(`  ✖ ${name} ${extra}`) }
}

// Executa SQL como um papel do Supabase (anon/authenticated) com um usuário (auth.uid())
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
const asAnon = (sql, p) => as('anon', null, sql, p)
const admin = (sql, p) => as('postgres', null, sql, p)
// Aplica um script SQL com vários comandos (arquivo de migração)
async function applyScript(sql) {
  await db.exec('reset role')
  try { await db.exec(sql); return { error: null } } catch (e) { return { error: String(e.message || e) } }
}
const rpc = async (u, fn, ...args) => {
  const ph = args.map((_, i) => `$${i + 1}`).join(', ')
  const r = await (u === 'anon' ? asAnon : (s, p) => asUser(u, s, p))(`select public.${fn}(${ph}) as r`, args)
  return { data: r.rows[0]?.r ?? null, error: r.error }
}

// ---------------------------------------------------------------------------
// Estado atual do banco de produção (tabelas, funções e policies levantadas via SQL de leitura)
// ---------------------------------------------------------------------------
await db.exec(`
create role anon nologin; create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth, public to anon, authenticated;

create table public.profiles (id uuid primary key);
create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) >= 2 and char_length(name) <= 80),
  description text not null default '',
  creator_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  icon_url text, banner_url text, banner_theme text default 'gradient-1', welcome_channel_id uuid
);
create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role = any (array['owner','member'])),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);
create table public.space_roles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null, color text not null default '#99aab5', position integer not null default 0,
  permissions jsonb not null default '{}', created_at timestamptz not null default now(), is_default boolean not null default false
);
create table public.space_member_roles (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.space_roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (space_id, user_id, role_id)
);
create table public.space_audit_logs (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  author_name text not null, author_id uuid, action text not null, details text,
  created_at timestamptz not null default now()
);

create function public.is_space_member(p_space_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.space_members where space_id = p_space_id and user_id = auth.uid()); $$;
create function public.is_space_creator(p_space_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.spaces where id = p_space_id and creator_id = auth.uid()); $$;
create function public.get_space_invite_details(p_space_id uuid) returns json language plpgsql security definer set search_path to 'public' as $$
declare v_space record; v_count integer;
begin
  select id, name, description, icon_url, banner_url, banner_theme into v_space from public.spaces where id = p_space_id;
  if not found then return null; end if;
  select count(*) into v_count from public.space_members where space_id = p_space_id;
  return json_build_object('id', v_space.id, 'name', v_space.name, 'member_count', v_count);
end; $$;

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_roles enable row level security;
alter table public.space_member_roles enable row level security;
alter table public.space_audit_logs enable row level security;

create policy "authenticated users read spaces" on public.spaces for select to authenticated using (true);
create policy "anon_read_spaces" on public.spaces for select to anon using (true);
create policy "users create spaces" on public.spaces for insert to authenticated with check ((select auth.uid()) = creator_id);
create policy "owners update spaces" on public.spaces for update to authenticated using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "owners delete spaces" on public.spaces for delete to authenticated using (creator_id = (select auth.uid()));

create policy "space members read memberships" on public.space_members for select to authenticated using (is_space_member(space_id));
create policy "members join spaces" on public.space_members for insert to authenticated
  with check (((select auth.uid()) = user_id) and (((role = 'owner') and is_space_creator(space_id)) or (role = 'member')));
create policy "owners remove members" on public.space_members for delete to authenticated using (is_space_creator(space_id));

create policy "space members read roles" on public.space_roles for select to authenticated using (is_space_member(space_id));
create policy "space members read member roles" on public.space_member_roles for select to authenticated using (is_space_member(space_id));
create policy "space owners insert member roles" on public.space_member_roles for insert to authenticated with check (is_space_creator(space_id));

create policy "authenticated read space_audit_logs" on public.space_audit_logs for select to authenticated using (true);
create policy "authenticated insert space_audit_logs" on public.space_audit_logs for insert to authenticated with check (true);

-- Padrão do Supabase: anon/authenticated com privilégios nas tabelas (o RLS é quem restringe)
grant all on all tables in schema public to anon, authenticated;
`)

for (const [k, id] of Object.entries(U)) await admin('insert into public.profiles(id) values ($1)', [id])

const sql08 = fs.readFileSync(`${REPO}/migration_08_space_invites.sql`, 'utf8')
const sql09 = fs.readFileSync(`${REPO}/migration_09_lock_space_access.sql`, 'utf8')

// ---------------------------------------------------------------------------
console.log('\n[Antes das migrações — estado atual de produção]')
{
  const r = await asUser('A', 'insert into public.spaces(name, creator_id) values ($1, $2) returning id', ['Servidor 1', U.A])
  check('A cria um espaço (returning)', !r.error && r.rows.length === 1, r.error)
}
const S1 = (await admin("select id from public.spaces where name = 'Servidor 1'")).rows[0].id
await asUser('A', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'owner')", [S1, U.A])
await admin("insert into public.space_roles(space_id, name, is_default) values ($1, 'Membro', true)", [S1])
{
  const anon = await asAnon('select id from public.spaces')
  check('VULNERABILIDADE reproduzida: anon lista os servidores', anon.rows.length === 1)
  const join = await asUser('E', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member')", [S1, U.E])
  check('VULNERABILIDADE reproduzida: usuário qualquer entra só com o UUID', !join.error)
  await admin('delete from public.space_members where user_id = $1', [U.E])
}

// ---------------------------------------------------------------------------
console.log('\n[Migração 08 — convites]')
{
  const r = await applyScript(sql08)
  check('migração 08 aplica sem erros', !r.error, r.error)
  const again = await applyScript(sql08)
  check('migração 08 é idempotente (roda 2x)', !again.error, again.error)
}

let code1, code2
{
  const a = await rpc('A', 'get_or_create_space_invite', S1, 0)
  code1 = a.data?.code
  check('dono cria convite permanente (expires_at nulo)', !a.error && /^[a-z2-9]{12}$/.test(code1 ?? '') && a.data.expires_at === null, a.error)
  const a2 = await rpc('A', 'get_or_create_space_invite', S1, 0)
  check('dono reaproveita o mesmo convite permanente', a2.data?.code === code1)

  const b = await rpc('A', 'get_or_create_space_invite', S1)
  code2 = b.data?.code
  const days = (new Date(b.data.expires_at) - Date.now()) / 86400000
  check('convite padrão expira em ~7 dias e é outro código', code2 && code2 !== code1 && days > 6.9 && days < 7.1, `days=${days}`)
  check('convite padrão também é reaproveitado', (await rpc('A', 'get_or_create_space_invite', S1)).data?.code === code2)

  check('não-membro NÃO cria convite (not_a_member)', (await rpc('B', 'get_or_create_space_invite', S1)).error?.includes('not_a_member'))
  check('anon NÃO executa get_or_create_space_invite', !!(await rpc('anon', 'get_or_create_space_invite', S1)).error)
  check('validade inválida é rejeitada', (await rpc('A', 'get_or_create_space_invite', S1, 9999)).error?.includes('invalid_expiration'))
  check('validade negativa é rejeitada', (await rpc('A', 'get_or_create_space_invite', S1, -1)).error?.includes('invalid_expiration'))

  const codes = new Set()
  for (let i = 0; i < 300; i++) codes.add((await admin('select public.generate_invite_code() as c')).rows[0].c)
  check('gerador produz códigos únicos (300 amostras)', codes.size === 300)
  check('gerador só usa o alfabeto sem ambíguos', [...codes].every(c => /^[a-hj-km-np-z2-9]{12}$/.test(c)))
  check('generate_invite_code não é chamável por anon/authenticated', !!(await asUser('A', 'select public.generate_invite_code()')).error)
}

console.log('\n[Detalhes públicos do convite]')
{
  const d = await rpc('anon', 'get_invite_details', code1)
  check('anon vê detalhes de um convite válido', d.data?.name === 'Servidor 1' && d.data?.member_count === 1, JSON.stringify(d))
  check('código inexistente → null', (await rpc('anon', 'get_invite_details', 'zzzzzzzzzzzz')).data === null)
  check('código curto/lixo → null', (await rpc('anon', 'get_invite_details', "x' or '1'='1")).data === null)
  check('texto em maiúsculas/espaços é normalizado', (await rpc('anon', 'get_invite_details', `  ${code1.toUpperCase()} `)).data?.name === 'Servidor 1')
}

console.log('\n[Entrada por convite]')
{
  const j = await rpc('B', 'join_space_with_invite', code1)
  check('B entra com o convite', j.data?.already_member === false && j.data?.space_id === S1, j.error)
  const m = await admin('select role from public.space_members where space_id=$1 and user_id=$2', [S1, U.B])
  check('B virou membro (role member)', m.rows[0]?.role === 'member')
  const r = await admin('select count(*)::int as n from public.space_member_roles where space_id=$1 and user_id=$2', [S1, U.B])
  check('cargo padrão atribuído no servidor', r.rows[0].n === 1)
  const j2 = await rpc('B', 'join_space_with_invite', code1)
  check('entrar de novo → already_member sem erro', j2.data?.already_member === true)
  const u = await admin('select uses from public.space_invites where code = $1', [code1])
  check('uso só é contado uma vez', u.rows[0].uses === 1)
  check('anon NÃO executa join_space_with_invite', !!(await rpc('anon', 'join_space_with_invite', code1)).error)
  check('código inexistente → invite_not_found', (await rpc('D', 'join_space_with_invite', 'zzzzzzzzzzzz')).error?.includes('invite_not_found'))
}

console.log('\n[Membro comum]')
{
  check('membro NÃO cria convite permanente', (await rpc('B', 'get_or_create_space_invite', S1, 0)).error?.includes('forbidden_never_expires'))
  const b = await rpc('B', 'get_or_create_space_invite', S1)
  check('membro cria convite de 7 dias', !!b.data?.code && b.data.expires_at !== null, b.error)
}

console.log('\n[Limite de usos]')
{
  await admin('update public.space_invites set max_uses = 1 where code = $1', [code2])
  check('C entra (1º uso)', (await rpc('C', 'join_space_with_invite', code2)).data?.already_member === false)
  check('D barrado: invite_exhausted', (await rpc('D', 'join_space_with_invite', code2)).error?.includes('invite_exhausted'))
  check('C de novo → already_member (não é erro)', (await rpc('C', 'join_space_with_invite', code2)).data?.already_member === true)
  check('convite esgotado some dos detalhes públicos', (await rpc('anon', 'get_invite_details', code2)).data === null)
  const reuse = await rpc('A', 'get_or_create_space_invite', S1)
  check('convite esgotado NÃO é reaproveitado (gera outro)', reuse.data?.code && reuse.data.code !== code2)
}

console.log('\n[Expiração]')
{
  const c = (await rpc('B', 'get_or_create_space_invite', S1)).data.code
  await admin("update public.space_invites set expires_at = now() - interval '1 minute' where code = $1", [c])
  check('convite expirado: invite_expired', (await rpc('D', 'join_space_with_invite', c)).error?.includes('invite_expired'))
  check('convite expirado some dos detalhes', (await rpc('anon', 'get_invite_details', c)).data === null)
}

console.log('\n[Revogação]')
{
  check('quem não é dono nem criador NÃO revoga', (await rpc('D', 'revoke_space_invite', code1)).error?.includes('forbidden'))
  check('membro que não criou NÃO revoga', (await rpc('B', 'revoke_space_invite', code1)).error?.includes('forbidden'))
  check('dono revoga', (await rpc('A', 'revoke_space_invite', code1)).data === true)
  check('convite revogado: invite_not_found', (await rpc('E', 'join_space_with_invite', code1)).error?.includes('invite_not_found'))
  check('convite revogado some dos detalhes', (await rpc('anon', 'get_invite_details', code1)).data === null)
  check('membro NÃO revoga tudo', (await rpc('B', 'revoke_all_space_invites', S1)).error?.includes('forbidden'))
  const all = await rpc('A', 'revoke_all_space_invites', S1)
  check('dono revoga todos os convites ativos', typeof all.data === 'number' && all.data >= 1, JSON.stringify(all))
  const active = await admin('select count(*)::int as n from public.space_invites where revoked_at is null')
  check('nenhum convite ativo sobra', active.rows[0].n === 0)
}

console.log('\n[Acesso direto à tabela de convites]')
{
  const fresh = (await rpc('B', 'get_or_create_space_invite', S1)).data.code
  const fresh2 = (await rpc('A', 'get_or_create_space_invite', S1, 0)).data.code
  check('anon NÃO lê space_invites', !!(await asAnon('select * from public.space_invites')).error)
  const bSees = await asUser('B', 'select code, created_by from public.space_invites')
  check(
    'membro vê só os próprios convites (e não os do dono)',
    bSees.rows.length >= 1 &&
      bSees.rows.every(r => r.created_by === U.B) &&
      bSees.rows.some(r => r.code === fresh) &&
      !bSees.rows.some(r => r.code === fresh2),
    JSON.stringify(bSees.rows)
  )
  const aSees = await asUser('A', 'select code from public.space_invites')
  check('dono vê todos os convites do espaço', aSees.rows.some(r => r.code === fresh) && aSees.rows.some(r => r.code === fresh2))
  check('outsider não vê nenhum convite', (await asUser('D', 'select code from public.space_invites')).rows.length === 0)
  check('authenticated NÃO insere direto', !!(await asUser('B', "insert into public.space_invites(code, space_id, created_by) values ('abcdefghjkmn', $1, $2)", [S1, U.B])).error)
  check('authenticated NÃO altera direto', !!(await asUser('A', "update public.space_invites set max_uses = 999")).error)
  check('authenticated NÃO apaga direto', !!(await asUser('A', 'delete from public.space_invites')).error)
}

// ---------------------------------------------------------------------------
console.log('\n[Migração 09 — fechamento do acesso]')
{
  const r = await applyScript(sql09)
  check('migração 09 aplica sem erros', !r.error, r.error)
  const again = await applyScript(sql09)
  check('migração 09 é idempotente (roda 2x)', !again.error, again.error)
}

console.log('\n[spaces]')
{
  check('anon NÃO lista spaces', (await asAnon('select id from public.spaces')).rows.length === 0)
  check('não-membro NÃO lista spaces', (await asUser('F', 'select id from public.spaces')).rows.length === 0)
  check('membro vê o próprio espaço', (await asUser('B', 'select id from public.spaces')).rows.length === 1)
  check('dono vê o próprio espaço', (await asUser('A', 'select id from public.spaces')).rows.length === 1)
  const created = await asUser('C', 'insert into public.spaces(name, creator_id) values ($1, $2) returning id', ['Servidor do C', U.C])
  check('fluxo de criar espaço (insert ... returning) continua funcionando', !created.error && created.rows.length === 1, created.error)
  const S2 = created.rows[0].id
  const own = await asUser('C', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'owner')", [S2, U.C])
  check('criador se insere como owner', !own.error, own.error)
  check('criador não consegue criar espaço em nome de outro', !!(await asUser('C', 'insert into public.spaces(name, creator_id) values ($1, $2)', ['x2', U.D])).error)
  check('join embutido space_members → spaces funciona para membro', (await asUser('C', 'select s.id from public.space_members m join public.spaces s on s.id = m.space_id where m.user_id = $1', [U.C])).rows.length >= 1)

  console.log('\n[space_members]')
  check('usuário NÃO se insere como member direto', !!(await asUser('F', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member')", [S1, U.F])).error)
  check('usuário NÃO se insere como owner em espaço alheio', !!(await asUser('F', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'owner')", [S1, U.F])).error)
  check('criador NÃO insere outro usuário como owner', !!(await asUser('A', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'owner')", [S1, U.F])).error)
  check('criador NÃO insere outro usuário como member (só via convite)', !!(await asUser('A', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member')", [S1, U.F])).error)
  const inv = (await rpc('A', 'get_or_create_space_invite', S1, 0)).data.code
  const join = await rpc('F', 'join_space_with_invite', inv)
  check('entrada por convite continua funcionando após o fechamento', join.data?.already_member === false, join.error)
  check('quem entrou por convite passa a ver o espaço', (await asUser('F', 'select id from public.spaces')).rows.length === 1)
  const leave = await asUser('F', 'delete from public.space_members where space_id = $1 and user_id = $2 returning user_id', [S1, U.F])
  check('membro consegue sair do espaço', leave.rows.length === 1, leave.error)
  const kick = await asUser('B', 'delete from public.space_members where space_id = $1 and user_id = $2 returning user_id', [S1, U.C])
  check('membro NÃO remove outro membro', kick.rows.length === 0)
  const kickOwner = await asUser('A', 'delete from public.space_members where space_id = $1 and user_id = $2 returning user_id', [S1, U.B])
  check('dono ainda remove membros', kickOwner.rows.length === 1)
  check('space_members: membro ainda lê a lista do próprio espaço', (await asUser('A', 'select user_id from public.space_members where space_id = $1', [S1])).rows.length >= 1)
  check('space_members: não-membro não lê a lista', (await asUser('D', 'select user_id from public.space_members where space_id = $1', [S1])).rows.length === 0)

  console.log('\n[space_audit_logs]')
  await admin("insert into public.space_audit_logs(space_id, author_name, action) values ($1, 'A', 'teste')", [S1])
  check('não-membro NÃO lê logs de auditoria', (await asUser('D', 'select id from public.space_audit_logs')).rows.length === 0)
  check('membro lê logs do próprio espaço', (await asUser('A', 'select id from public.space_audit_logs')).rows.length === 1)
  check('não-membro NÃO forja log', !!(await asUser('D', "insert into public.space_audit_logs(space_id, author_name, author_id, action) values ($1, 'x', $2, 'fake')", [S1, U.D])).error)
  check('membro NÃO forja log em nome de outro', !!(await asUser('A', "insert into public.space_audit_logs(space_id, author_name, author_id, action) values ($1, 'x', $2, 'fake')", [S1, U.D])).error)
  check('membro grava o próprio log', !(await asUser('A', "insert into public.space_audit_logs(space_id, author_name, author_id, action, details) values ($1, 'A', $2, 'ok', 'd')", [S1, U.A])).error)

  console.log('\n[função antiga get_space_invite_details(uuid)]')
  check('não-membro recebe null', (await rpc('D', 'get_space_invite_details', S1)).data === null)
  check('membro recebe os detalhes', (await rpc('A', 'get_space_invite_details', S1)).data?.name === 'Servidor 1')
  check('anon NÃO executa mais', !!(await rpc('anon', 'get_space_invite_details', S1)).error)

  console.log('\n[detalhes públicos continuam abertos para a página web]')
  check('anon ainda lê detalhes de convite válido', (await rpc('anon', 'get_invite_details', inv)).data?.name === 'Servidor 1')
}

// ---------------------------------------------------------------------------
console.log('\n[Migração 10 — transferência de posse]')
const sql10 = fs.readFileSync(`${REPO}/migration_10_transfer_space_ownership.sql`, 'utf8')
const S3 = (await admin("insert into public.spaces(name, creator_id) values ('Servidor 3', $1) returning id", [U.A])).rows[0].id
await admin("insert into public.space_members(space_id, user_id, role) values ($1, $2, 'owner'), ($1, $3, 'member'), ($1, $4, 'member')", [S3, U.A, U.B, U.D])
const roleOf = async (u) => (await admin('select role from public.space_members where space_id = $1 and user_id = $2', [S3, u])).rows[0]?.role
const creatorOf = async () => (await admin('select creator_id from public.spaces where id = $1', [S3])).rows[0].creator_id
{
  // O que o app fazia antes: passos soltos, e os dois falham (um com erro, o outro em silêncio)
  const directOwner = await asUser('A', 'update public.spaces set creator_id = $1 where id = $2 returning id', [U.B, S3])
  check('ANTES: o dono NÃO consegue trocar spaces.creator_id direto (RLS exige creator_id = ele mesmo)', !!directOwner.error, directOwner.error)
  const directRole = await asUser('A', "update public.space_members set role = 'owner' where space_id = $1 and user_id = $2 returning user_id", [S3, U.B])
  check('ANTES: UPDATE em space_members altera 0 linhas, sem erro (o bug silencioso)', !directRole.error && directRole.rows.length === 0, directRole.error)

  const r = await applyScript(sql10)
  check('migração 10 aplica sem erros', !r.error, r.error)
  const again = await applyScript(sql10)
  check('migração 10 é idempotente (roda 2x)', !again.error, again.error)

  check('membro NÃO transfere a posse', !!(await rpc('B', 'transfer_space_ownership', S3, U.B)).error)
  check('não-membro NÃO transfere a posse', !!(await rpc('F', 'transfer_space_ownership', S3, U.F)).error)
  check('anon NÃO executa', !!(await rpc('anon', 'transfer_space_ownership', S3, U.B)).error)
  check('dono NÃO transfere para si mesmo', !!(await rpc('A', 'transfer_space_ownership', S3, U.A)).error)
  check('dono NÃO transfere para quem não é membro', !!(await rpc('A', 'transfer_space_ownership', S3, U.F)).error)
  check('nada mudou depois das tentativas recusadas', (await creatorOf()) === U.A && (await roleOf(U.A)) === 'owner' && (await roleOf(U.B)) === 'member')

  const done = await rpc('A', 'transfer_space_ownership', S3, U.B)
  check('dono transfere a posse para um membro', !done.error, done.error)
  check('spaces.creator_id passou para o novo dono', (await creatorOf()) === U.B)
  check('novo dono ficou com cargo owner e o antigo virou member', (await roleOf(U.B)) === 'owner' && (await roleOf(U.A)) === 'member')
  check('o antigo dono NÃO transfere de novo', !!(await rpc('A', 'transfer_space_ownership', S3, U.A)).error)
  check('o novo dono consegue transferir', !(await rpc('B', 'transfer_space_ownership', S3, U.D)).error)
  check('depois da segunda transferência D é o dono', (await creatorOf()) === U.D && (await roleOf(U.D)) === 'owner' && (await roleOf(U.B)) === 'member')

  // Não abriu nenhuma brecha nova
  check('space_members continua sem UPDATE direto (dono)', (await asUser('D', "update public.space_members set role = 'owner' where space_id = $1 and user_id = $2 returning user_id", [S3, U.A])).rows.length === 0)
  check('função não é executável por anon nem por public', (await admin("select has_function_privilege('anon', 'public.transfer_space_ownership(uuid, uuid)', 'execute') as a")).rows[0].a === false)
}

console.log(`\n${passed} passaram, ${failed} falharam`)
process.exit(failed ? 1 : 0)
