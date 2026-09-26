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
  F: 'ffffffff-0000-4000-8000-00000000000f',
  G: '11111111-0000-4000-8000-000000000001',
  H: '22222222-0000-4000-8000-000000000002'
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
create table public.channels (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null, position integer not null default 0, created_at timestamptz not null default now(),
  type text not null default 'text', topic text not null default '', is_announcement boolean not null default false,
  user_limit integer not null default 0, slowmode_seconds integer not null default 0, category text not null default '',
  is_private boolean default false, allowed_role_ids text[] default '{}'::text[]
);
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  body text not null default '', created_at timestamptz not null default now(), updated_at timestamptz,
  attachment_url text, attachment_type text, reply_to_message_id uuid, is_edited boolean default false, message_type text
);
create table public.pinned_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  message_id uuid not null, body text, author_name text, author_avatar text, pinned_by_name text, pinned_by_id uuid,
  pinned_at timestamptz not null default now(), attachment_url text, attachment_type text
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
create policy "space owners insert roles" on public.space_roles for insert to authenticated with check (is_space_creator(space_id));
create policy "space owners update roles" on public.space_roles for update to authenticated using (is_space_creator(space_id)) with check (is_space_creator(space_id));
create policy "space owners delete roles" on public.space_roles for delete to authenticated using (is_space_creator(space_id));
create policy "space members read member roles" on public.space_member_roles for select to authenticated using (is_space_member(space_id));
create policy "space owners insert member roles" on public.space_member_roles for insert to authenticated with check (is_space_creator(space_id));
create policy "space owners update member roles" on public.space_member_roles for update to authenticated using (is_space_creator(space_id)) with check (is_space_creator(space_id));
create policy "space owners delete member roles" on public.space_member_roles for delete to authenticated using (is_space_creator(space_id));

alter table public.channels enable row level security;
alter table public.messages enable row level security;
alter table public.pinned_messages enable row level security;
create function public.can_delete_message(p_channel_id uuid, p_author_id uuid) returns boolean language sql stable security definer set search_path to 'public' as $$
  select (p_author_id = auth.uid()
    or exists (select 1 from public.channels c join public.spaces s on s.id = c.space_id where c.id = p_channel_id and s.creator_id = auth.uid())
    or exists (select 1 from public.channels c join public.space_member_roles smr on smr.space_id = c.space_id join public.space_roles sr on sr.id = smr.role_id
               where c.id = p_channel_id and smr.user_id = auth.uid()
                 and (coalesce((sr.permissions->>'administrator')::boolean, false) or coalesce((sr.permissions->>'manageMessages')::boolean, false)))); $$;
create policy "space members read channels" on public.channels for select to authenticated using (is_space_member(space_id));
create policy "owners insert channels" on public.channels for insert to authenticated with check (is_space_creator(space_id));
create policy "owners update channels" on public.channels for update to authenticated using (is_space_creator(space_id)) with check (is_space_creator(space_id));
create policy "owners delete channels" on public.channels for delete to authenticated using (is_space_creator(space_id));
create policy "space members read messages" on public.messages for select to authenticated
  using (is_space_member((select channels.space_id from public.channels where channels.id = messages.channel_id)));
create policy "space members send messages" on public.messages for insert to authenticated
  with check ((author_id = (select auth.uid())) and is_space_member((select channels.space_id from public.channels where channels.id = messages.channel_id)));
create policy "authorized delete messages" on public.messages for delete to authenticated using (can_delete_message(channel_id, author_id));
create policy "authors edit messages" on public.messages for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "members manage pinned" on public.pinned_messages for all to authenticated
  using (exists (select 1 from public.channels c where c.id = pinned_messages.channel_id and is_space_member(c.space_id)))
  with check (exists (select 1 from public.channels c where c.id = pinned_messages.channel_id and is_space_member(c.space_id)));

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

// ---------------------------------------------------------------------------
console.log('\n[Migração 11 — cargos e permissões estilo Discord]')
const sql11 = fs.readFileSync(`${REPO}/migration_11_discord_roles.sql`, 'utf8')
const rolesOf = async (space) => (await admin(
  'select id, name, position, is_everyone, is_default, hoist, permissions from public.space_roles where space_id = $1 order by is_everyone, position', [space]
)).rows
{
  // Duplicatas criadas pela semeadura concorrente do cliente antigo
  await admin("insert into public.space_roles(space_id, name, color, position, permissions) values ($1, 'Dup', '#123456', 5, '{\"kickMembers\": true}'), ($1, 'Dup', '#123456', 5, '{\"kickMembers\": true}')", [S1])
  const before = (await admin("select count(*)::int as n from public.space_roles where space_id = $1 and name = 'Dup'", [S1])).rows[0].n

  const r = await applyScript(sql11)
  check('migração 11 aplica sem erros', !r.error, r.error)
  const again = await applyScript(sql11)
  check('migração 11 é idempotente (roda 2x)', !again.error, again.error)

  const after = (await admin("select count(*)::int as n from public.space_roles where space_id = $1 and name = 'Dup'", [S1])).rows[0].n
  check('cargos duplicados sem membros são removidos (fica 1)', before === 2 && after === 1, `${before} -> ${after}`)
  const everyoneCount = (await admin('select count(*)::int as n from public.spaces s where (select count(*) from public.space_roles r where r.space_id = s.id and r.is_everyone) <> 1')).rows[0].n
  check('todo espaço existente ganhou exatamente um @everyone', everyoneCount === 0)
  const s1 = await rolesOf(S1)
  check('posições ficam contíguas a partir de 0', s1.filter(x => !x.is_everyone).every((x, i) => x.position === i), JSON.stringify(s1))
  check('@everyone vem com as permissões base', s1.find(x => x.is_everyone)?.permissions?.sendMessages === true)
}

// Espaço novo do A: o trigger semeia @everyone + Moderador
const S4 = (await asUser('A', "insert into public.spaces(name, creator_id) values ('Servidor 4', $1) returning id", [U.A])).rows[0].id
await asUser('A', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'owner')", [S4, U.A])
await admin("insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member'), ($1, $3, 'member'), ($1, $4, 'member'), ($1, $5, 'member'), ($1, $6, 'member')", [S4, U.B, U.C, U.D, U.E, U.F])
const roleRpc = async (u, fn, ...args) => rpc(u, fn, ...args)
{
  const seeded = await rolesOf(S4)
  check('espaço novo nasce com @everyone e Moderador (sem duplicar)', seeded.length === 2 && seeded.some(x => x.is_everyone) && seeded.some(x => x.name.includes('Moderador')), JSON.stringify(seeded))
}
const EVERYONE = (await rolesOf(S4)).find(x => x.is_everyone).id
const MOD = (await rolesOf(S4)).find(x => x.name.includes('Moderador')).id
let GESTOR, BAIXO
console.log('\n[Criar, editar e ordenar cargos]')
{
  check('acesso direto: dono NÃO insere em space_roles (só via função)', !!(await asUser('A', "insert into public.space_roles(space_id, name) values ($1, 'x')", [S4])).error)
  check('acesso direto: dono NÃO atribui cargo direto', !!(await asUser('A', 'insert into public.space_member_roles(space_id, user_id, role_id) values ($1, $2, $3)', [S4, U.B, MOD])).error)

  const g = await roleRpc('A', 'create_space_role', S4, 'Gestor', '#22c55e', JSON.stringify({ manageRoles: true, manageChannels: true, kickMembers: true, createInvite: true, bogus: true, speak: false }), true)
  GESTOR = g.data?.id
  check('dono cria cargo (nasce acima do @everyone)', !g.error && g.data?.position === 1, g.error)
  check('permissões desconhecidas ou falsas são descartadas', g.data && !('bogus' in g.data.permissions) && !('speak' in g.data.permissions))
  BAIXO = (await roleRpc('A', 'create_space_role', S4, 'Baixo', '#ef4444', '{}', false)).data?.id
  check('nome inválido é recusado', !!(await roleRpc('A', 'create_space_role', S4, '   ', '#ef4444', '{}', false)).error)
  check('nome @everyone é reservado', !!(await roleRpc('A', 'create_space_role', S4, '@everyone', '#ef4444', '{}', false)).error)
  check('cor inválida é recusada', !!(await roleRpc('A', 'create_space_role', S4, 'x', 'red', '{}', false)).error)

  const re = await roleRpc('A', 'reorder_space_roles', S4, `{${GESTOR},${MOD},${BAIXO}}`)
  check('dono reordena os cargos', !re.error, re.error)
  const order = (await rolesOf(S4)).filter(x => !x.is_everyone).map(x => x.id)
  check('ordem nova: Gestor, Moderador, Baixo', order.join() === [GESTOR, MOD, BAIXO].join())
  check('reordenar com lista incompleta é recusado', !!(await roleRpc('A', 'reorder_space_roles', S4, `{${GESTOR},${MOD}}`)).error)

  check('dono dá Gestor a B', !(await roleRpc('A', 'set_space_member_role', S4, U.B, GESTOR, true)).error)
  check('dono dá Baixo a C', !(await roleRpc('A', 'set_space_member_role', S4, U.C, BAIXO, true)).error)
  check('@everyone não pode ser atribuído', !!(await roleRpc('A', 'set_space_member_role', S4, U.D, EVERYONE, true)).error)
  check('não dá cargo a quem não é membro', !!(await roleRpc('A', 'set_space_member_role', S4, U.G, BAIXO, true)).error)
}

console.log('\n[Hierarquia: B (Gestor, topo) gerencia só o que está abaixo]')
{
  const created = await roleRpc('B', 'create_space_role', S4, 'Do B', '#abcdef', JSON.stringify({ manageChannels: true }), false)
  check('B cria cargo com permissão que tem', !created.error && created.data?.position === 3, created.error)
  const adminTry = await roleRpc('B', 'create_space_role', S4, 'Hack', '#abcdef', JSON.stringify({ administrator: true }), false)
  check('B NÃO cria cargo com Administrador (não tem)', adminTry.error?.includes('missing_permission'), adminTry.error)
  check('B edita cargo abaixo dele (Moderador)', !(await roleRpc('B', 'update_space_role', MOD, JSON.stringify({ color: '#000000' }))).error)
  const own = await roleRpc('B', 'update_space_role', GESTOR, JSON.stringify({ name: 'Supremo' }))
  check('B NÃO edita o próprio cargo mais alto', own.error?.includes('role_hierarchy'), own.error)
  const grant = await roleRpc('B', 'update_space_role', MOD, JSON.stringify({ permissions: { administrator: true } }))
  check('B NÃO concede Administrador a um cargo abaixo', grant.error?.includes('missing_permission'), grant.error)
  const keep = await roleRpc('B', 'update_space_role', MOD, JSON.stringify({ permissions: { kickMembers: true, muteMembers: true } }))
  check('B pode manter/remover permissões que o cargo já tinha', !keep.error, keep.error)

  check('B dá Baixo para D', !(await roleRpc('B', 'set_space_member_role', S4, U.D, BAIXO, true)).error)
  check('B NÃO dá Gestor (o nível dele) para D', (await roleRpc('B', 'set_space_member_role', S4, U.D, GESTOR, true)).error?.includes('role_hierarchy'))
  check('C (sem Gerenciar Cargos) NÃO dá cargos', (await roleRpc('C', 'set_space_member_role', S4, U.D, BAIXO, false)).error?.includes('forbidden'))
  check('B NÃO mexe nos cargos do dono', (await roleRpc('B', 'set_space_member_role', S4, U.A, BAIXO, true)).error?.includes('member_hierarchy'))

  await roleRpc('A', 'set_space_member_role', S4, U.E, GESTOR, true)
  check('B NÃO mexe em quem está no mesmo nível (E também é Gestor)', (await roleRpc('B', 'set_space_member_role', S4, U.E, BAIXO, true)).error?.includes('member_hierarchy'))

  const all = (await rolesOf(S4)).filter(x => !x.is_everyone).map(x => x.id)
  const moveTop = await roleRpc('B', 'reorder_space_roles', S4, `{${[all[1], all[0], ...all.slice(2)].join(',')}}`)
  check('B NÃO move o cargo dele nem os de cima', moveTop.error?.includes('role_hierarchy'), moveTop.error)
  const moveLow = await roleRpc('B', 'reorder_space_roles', S4, `{${[all[0], all[2], all[1], ...all.slice(3)].join(',')}}`)
  check('B reordena os cargos abaixo dele', !moveLow.error, moveLow.error)
  await roleRpc('A', 'reorder_space_roles', S4, `{${all.join(',')}}`)

  const ev = await roleRpc('B', 'update_space_role', EVERYONE, JSON.stringify({ name: 'todos' }))
  check('@everyone não pode ser renomeado', ev.error?.includes('everyone_locked'), ev.error)
  check('@everyone não pode ser excluído', (await roleRpc('A', 'delete_space_role', EVERYONE)).error?.includes('everyone_locked'))
  check('@everyone não pode virar cargo automático', (await roleRpc('A', 'update_space_role', EVERYONE, JSON.stringify({ is_default: true }))).error?.includes('everyone_locked'))

  const doB = created.data.id
  const del = await roleRpc('B', 'delete_space_role', doB)
  check('B exclui cargo abaixo dele', del.data === true, del.error)
  check('B NÃO exclui o próprio cargo', (await roleRpc('B', 'delete_space_role', GESTOR)).error?.includes('role_hierarchy'))
  check('posições continuam contíguas depois de excluir', (await rolesOf(S4)).filter(x => !x.is_everyone).every((x, i) => x.position === i))
}

console.log('\n[Canais e mensagens]')
let PUB, PRIV, NEWS
{
  PUB = (await admin("insert into public.channels(space_id, name) values ($1, 'geral') returning id", [S4])).rows[0].id
  PRIV = (await admin("insert into public.channels(space_id, name, is_private, allowed_role_ids) values ($1, 'secreto', true, $2) returning id", [S4, `{${BAIXO}}`])).rows[0].id
  NEWS = (await admin("insert into public.channels(space_id, name, is_announcement) values ($1, 'avisos', true) returning id", [S4])).rows[0].id

  check('F (só @everyone) NÃO cria canal', !!(await asUser('F', "insert into public.channels(space_id, name) values ($1, 'x')", [S4])).error)
  check('B (Gerenciar Canais) cria canal', !(await asUser('B', "insert into public.channels(space_id, name) values ($1, 'do-b')", [S4])).error)
  check('B renomeia canal', (await asUser('B', "update public.channels set name = 'geral-2' where id = $1 returning id", [PUB])).rows.length === 1)
  check('F NÃO renomeia canal', (await asUser('F', "update public.channels set name = 'hack' where id = $1 returning id", [PUB])).rows.length === 0)

  const sees = async (u) => (await asUser(u, 'select id from public.channels where space_id = $1', [S4])).rows.map(r => r.id)
  check('C (cargo liberado) vê o canal privado', (await sees('C')).includes(PRIV))
  check('F NÃO vê o canal privado', !(await sees('F')).includes(PRIV))
  check('B (Gestor, sem admin) NÃO vê o canal privado', !(await sees('B')).includes(PRIV))
  check('dono vê o canal privado', (await sees('A')).includes(PRIV))

  const send = (u, ch, att = null) => asUser(u, 'insert into public.messages(channel_id, author_id, body, attachment_url) values ($1, $2, $3, $4) returning id', [ch, U[u], 'oi', att])
  check('F manda mensagem no canal público', !(await send('F', PUB)).error)
  check('F NÃO manda no canal privado', !!(await send('F', PRIV)).error)
  check('C manda no canal privado', !(await send('C', PRIV)).error)
  await admin("insert into public.messages(channel_id, author_id, body) values ($1, $2, 'segredo')", [PRIV, U.A])
  check('F NÃO lê mensagens do canal privado', (await asUser('F', 'select id from public.messages where channel_id = $1', [PRIV])).rows.length === 0)
  check('C lê mensagens do canal privado', (await asUser('C', 'select id from public.messages where channel_id = $1', [PRIV])).rows.length >= 1)
  check('F NÃO posta em anúncios', !!(await send('F', NEWS)).error)
  check('dono posta em anúncios', !(await send('A', NEWS)).error)

  await roleRpc('A', 'update_space_role', MOD, JSON.stringify({ permissions: { sendInAnnouncementChannels: true, manageMessages: true } }))
  await roleRpc('A', 'set_space_member_role', S4, U.D, MOD, true)
  check('D (Moderador) posta em anúncios', !(await send('D', NEWS)).error)

  await roleRpc('A', 'update_space_role', EVERYONE, JSON.stringify({ permissions: { viewChannels: true, sendMessages: true, connect: true, speak: true, createInvite: true } }))
  check('sem Enviar Arquivos no @everyone, F NÃO manda anexo', !!(await send('F', PUB, 'https://x/y.png')).error)
  check('…mas manda texto', !(await send('F', PUB)).error)
  await roleRpc('A', 'update_space_role', EVERYONE, JSON.stringify({ permissions: { viewChannels: true, connect: true, speak: true, createInvite: true, attachFiles: true } }))
  check('sem Enviar Mensagens no @everyone, F NÃO manda nada', !!(await send('F', PUB)).error)
  await roleRpc('A', 'update_space_role', EVERYONE, JSON.stringify({ permissions: { viewChannels: false, sendMessages: true, connect: true, speak: true, createInvite: true, attachFiles: true } }))
  check('sem Ver Canais, F não vê canal nenhum', (await sees('F')).length === 0)
  await roleRpc('A', 'update_space_role', EVERYONE, JSON.stringify({ permissions: { viewChannels: true, sendMessages: true, connect: true, speak: true, createInvite: true, attachFiles: true } }))

  const fMsg = (await send('F', PUB)).rows[0].id
  check('C (sem Gerenciar Mensagens) NÃO apaga mensagem de F', (await asUser('C', 'delete from public.messages where id = $1 returning id', [fMsg])).rows.length === 0)
  check('D (Moderador) apaga mensagem de F', (await asUser('D', 'delete from public.messages where id = $1 returning id', [fMsg])).rows.length === 1)
  check('autor apaga a própria mensagem', (await asUser('F', 'delete from public.messages where id = (select id from public.messages where author_id = $1 limit 1) returning id', [U.F])).rows.length === 1)

  const pin = (u) => asUser(u, "insert into public.pinned_messages(channel_id, message_id, body) values ($1, gen_random_uuid(), 'x') returning id", [PUB])
  check('F NÃO fixa mensagens', !!(await pin('F')).error)
  check('D (Gerenciar Mensagens) fixa mensagens', !(await pin('D')).error)
  check('F lê as fixadas do canal público', (await asUser('F', 'select id from public.pinned_messages where channel_id = $1', [PUB])).rows.length === 1)

  const perms = await rpc('C', 'get_my_channel_permissions', PRIV)
  check('get_my_channel_permissions: C pode conectar no privado', perms.data?.connect === true, JSON.stringify(perms))
  check('get_my_channel_permissions: F recebe vazio no privado', JSON.stringify((await rpc('F', 'get_my_channel_permissions', PRIV)).data) === '{}')
}

console.log('\n[Administrador]')
{
  const adm = (await roleRpc('A', 'create_space_role', S4, 'Admin', '#ffffff', JSON.stringify({ administrator: true }), true)).data.id
  await roleRpc('A', 'reorder_space_roles', S4, `{${[adm, ...(await rolesOf(S4)).filter(x => !x.is_everyone && x.id !== adm).map(x => x.id)].join(',')}}`)
  await roleRpc('A', 'set_space_member_role', S4, U.F, adm, true)
  check('F (Admin) vê o canal privado', (await asUser('F', 'select id from public.channels where id = $1', [PRIV])).rows.length === 1)
  check('F (Admin) edita o espaço', (await asUser('F', "update public.spaces set description = 'novo' where id = $1 returning id", [S4])).rows.length === 1)
  check('F (Admin) NÃO toma a posse do espaço', !!(await asUser('F', 'update public.spaces set creator_id = $1 where id = $2', [U.F, S4])).error)
  check('B (sem Gerenciar Espaço) NÃO edita o espaço', (await asUser('B', "update public.spaces set description = 'x' where id = $1 returning id", [S4])).rows.length === 0)
  check('B NÃO mexe no Admin (acima dele)', (await roleRpc('B', 'update_space_role', adm, JSON.stringify({ color: '#000000' }))).error?.includes('role_hierarchy'))
}

console.log('\n[Expulsar]')
{
  const kick = (u, target) => asUser(u, 'delete from public.space_members where space_id = $1 and user_id = $2 returning user_id', [S4, U[target]])
  check('C (sem Expulsar) NÃO expulsa', (await kick('C', 'D')).rows.length === 0)
  check('B NÃO expulsa E (mesmo nível)', (await kick('B', 'E')).rows.length === 0)
  check('B NÃO expulsa o dono', (await kick('B', 'A')).rows.length === 0)
  check('B NÃO expulsa F (Admin, acima)', (await kick('B', 'F')).rows.length === 0)
  check('B expulsa D (abaixo dele)', (await kick('B', 'D')).rows.length === 1)
  check('quem sai perde os cargos', (await admin('select count(*)::int as n from public.space_member_roles where space_id = $1 and user_id = $2', [S4, U.D])).rows[0].n === 0)
  check('membro ainda sai sozinho', (await kick('C', 'C')).rows.length === 1)
}

console.log('\n[Convites, registro de ações e cargo automático]')
{
  await admin("insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member')", [S4, U.G])
  await roleRpc('A', 'update_space_role', EVERYONE, JSON.stringify({ permissions: { viewChannels: true, sendMessages: true } }))
  check('sem Criar Convite, G NÃO cria convite', (await rpc('G', 'get_or_create_space_invite', S4)).error?.includes('forbidden_create_invite'))
  check('B (Gestor com Criar Convite) cria convite', !!(await rpc('B', 'get_or_create_space_invite', S4)).data?.code)
  check('B (sem Gerenciar Espaço) NÃO cria convite permanente', (await rpc('B', 'get_or_create_space_invite', S4, 0)).error?.includes('forbidden_never_expires'))
  check('F (Admin) cria convite permanente', (await rpc('F', 'get_or_create_space_invite', S4, 0)).data?.expires_at === null)

  await admin("insert into public.space_audit_logs(space_id, author_name, action) values ($1, 'A', 'teste')", [S4])
  check('G NÃO lê o registro de ações', (await asUser('G', 'select id from public.space_audit_logs where space_id = $1', [S4])).rows.length === 0)
  check('F (Admin) lê o registro de ações', (await asUser('F', 'select id from public.space_audit_logs where space_id = $1', [S4])).rows.length === 1)

  check('B marca Baixo como cargo automático', !(await roleRpc('B', 'update_space_role', BAIXO, JSON.stringify({ is_default: true }))).error)
  const code = (await rpc('A', 'get_or_create_space_invite', S4, 0)).data.code
  check('H entra pelo convite', (await rpc('H', 'join_space_with_invite', code)).data?.already_member === false)
  const hRoles = (await admin('select role_id from public.space_member_roles where space_id = $1 and user_id = $2', [S4, U.H])).rows.map(r => r.role_id)
  check('H ganhou o cargo automático (e não o @everyone)', hRoles.length === 1 && hRoles[0] === BAIXO, JSON.stringify(hRoles))
}

console.log('\n[Transferência de posse continua funcionando]')
{
  check('dono transfere a posse para B', !(await rpc('A', 'transfer_space_ownership', S4, U.B)).error)
  check('B agora tem tudo (é o dono)', (await rpc('B', 'has_space_permission', S4, 'manageSpace')).data === true)
  check('A virou membro comum sem Gerenciar Cargos', (await rpc('A', 'has_space_permission', S4, 'manageRoles')).data === false)
}

console.log('\n[Reversão 11]')
{
  const rb = await applyScript(fs.readFileSync(`${REPO}/rollback_11_discord_roles.sql`, 'utf8'))
  check('rollback 11 aplica sem erros', !rb.error, rb.error)
  const re08 = await applyScript(sql08)
  check('migração 08 reaplicada após o rollback', !re08.error, re08.error)
  const re11 = await applyScript(sql11)
  check('migração 11 reaplica depois do rollback', !re11.error, re11.error)
}

console.log(`\n${passed} passaram, ${failed} falharam`)
process.exit(failed ? 1 : 0)
