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

console.log('\n[Brechas fechadas: hierarquia, concessão, edição de mensagens, posse e consultas de fora]')
{
  // Espaço novo: A dono; Topo (Administrador) no topo, Meio (Gerenciar Cargos) e Baixo embaixo
  const S6 = (await asUser('A', "insert into public.spaces(name, creator_id) values ('Servidor 6', $1) returning id", [U.A])).rows[0].id
  await asUser('A', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'owner')", [S6, U.A])
  await admin("insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member'), ($1, $3, 'member'), ($1, $4, 'member')", [S6, U.B, U.C, U.F])
  const roles6 = async () => (await admin('select id, position, is_everyone, is_default from public.space_roles where space_id = $1 order by is_everyone, position', [S6])).rows
  await roleRpc('A', 'delete_space_role', (await roles6()).find(x => !x.is_everyone).id) // Moderador semeado
  const TOPO = (await roleRpc('A', 'create_space_role', S6, 'Topo', '#111111', JSON.stringify({ administrator: true }), true)).data.id
  const MEIO = (await roleRpc('A', 'create_space_role', S6, 'Meio', '#222222', JSON.stringify({ manageRoles: true, kickMembers: true }), true)).data.id
  const BAIXO6 = (await roleRpc('A', 'create_space_role', S6, 'Baixo', '#333333', '{}', true)).data.id
  await roleRpc('A', 'set_space_member_role', S6, U.B, MEIO, true)
  await roleRpc('A', 'set_space_member_role', S6, U.C, TOPO, true)

  const bounds = await roleRpc('B', 'reorder_space_roles', S6, `[3:5]={${TOPO},${MEIO},${BAIXO6}}`)
  const topoPos = (await roles6()).find(x => x.id === TOPO).position
  check('array com outro índice inicial NÃO rebaixa cargo acima de quem reordena', topoPos === 0, `${bounds.error} pos=${topoPos}`)
  check('…e B continua sem conseguir pegar o cargo Topo', (await roleRpc('B', 'set_space_member_role', S6, U.B, TOPO, true)).error?.includes('role_hierarchy'))
  check('B continua NÃO expulsando C (Topo)', (await asUser('B', 'delete from public.space_members where space_id = $1 and user_id = $2 returning user_id', [S6, U.C])).rows.length === 0)

  const admin2 = (await roleRpc('A', 'create_space_role', S6, 'Admin novo', '#444444', JSON.stringify({ administrator: true }), true)).data.id
  const selfAdmin = await roleRpc('B', 'set_space_member_role', S6, U.B, admin2, true)
  check('B NÃO se dá um cargo abaixo dele com Administrador (não tem a permissão)', selfAdmin.error?.includes('missing_permission'), selfAdmin.error)
  check('B NÃO dá esse cargo a outro membro', (await roleRpc('B', 'set_space_member_role', S6, U.F, admin2, true)).error?.includes('missing_permission'))
  check('B NÃO marca esse cargo como automático', (await roleRpc('B', 'update_space_role', admin2, JSON.stringify({ is_default: true }))).error?.includes('missing_permission'))
  check('B ainda dá Baixo (sem permissões) para F', !(await roleRpc('B', 'set_space_member_role', S6, U.F, BAIXO6, true)).error)
  await roleRpc('A', 'delete_space_role', admin2)

  await roleRpc('A', 'update_space_role', TOPO, JSON.stringify({ is_default: true }))
  const clearAbove = await roleRpc('B', 'update_space_role', BAIXO6, JSON.stringify({ is_default: true }))
  check('B NÃO tira a marca de automático de um cargo acima dele', clearAbove.error?.includes('role_hierarchy') && (await roles6()).find(x => x.id === TOPO).is_default === true, clearAbove.error)
  await roleRpc('A', 'update_space_role', TOPO, JSON.stringify({ is_default: false }))

  const everyone6 = (await roles6()).find(x => x.is_everyone).id
  await roleRpc('A', 'update_space_role', everyone6, JSON.stringify({ permissions: { viewChannels: true, sendMessages: true, manageRoles: true } }))
  const order6 = (await roles6()).filter(x => !x.is_everyone).map(x => x.id)
  const sameOrder = await roleRpc('G', 'reorder_space_roles', S6, `{${order6.join(',')}}`)
  await admin("insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member')", [S6, U.G])
  const noRoles = await roleRpc('G', 'reorder_space_roles', S6, `{${order6.join(',')}}`)
  check('reordenar sem cargos (Gerenciar Cargos só no @everyone) não estoura integer', sameOrder.error?.includes('forbidden') && !noRoles.error, `${sameOrder.error} / ${noRoles.error}`)
  await roleRpc('A', 'update_space_role', everyone6, JSON.stringify({ permissions: { viewChannels: true, sendMessages: true, connect: true, speak: true } }))

  const PUB6 = (await admin("insert into public.channels(space_id, name) values ($1, 'geral') returning id", [S6])).rows[0].id
  const NEWS6 = (await admin("insert into public.channels(space_id, name, is_announcement) values ($1, 'avisos', true) returning id", [S6])).rows[0].id
  const msg = (await asUser('F', 'insert into public.messages(channel_id, author_id, body) values ($1, $2, $3) returning id', [PUB6, U.F, 'oi'])).rows[0].id
  const moved = await asUser('F', 'update public.messages set channel_id = $1 where id = $2 returning id', [NEWS6, msg])
  check('autor NÃO move a própria mensagem para um canal de anúncios', !!moved.error || moved.rows.length === 0, moved.error)
  const attach = await asUser('F', 'update public.messages set attachment_url = $1 where id = $2 returning id', ['https://x/y.exe', msg])
  check('autor NÃO inclui anexo por edição sem Anexar Arquivos', !!attach.error || attach.rows.length === 0, attach.error)
  const edit = await asUser('F', "update public.messages set body = 'editado' where id = $1 returning id", [msg])
  check('autor ainda edita o texto da própria mensagem', !edit.error && edit.rows.length === 1, edit.error)

  const outsiderPerms = await rpc('H', 'space_member_permissions', S6, U.B)
  check('quem não é do espaço NÃO lê as permissões de um membro', JSON.stringify(outsiderPerms.data) === '{}', JSON.stringify(outsiderPerms))
  check('quem não é do espaço NÃO descobre o dono pela posição', (await rpc('H', 'space_member_top_position', S6, U.A)).data === 2147483647)
  check('membro ainda consulta a posição do dono', (await rpc('B', 'space_member_top_position', S6, U.A)).data === -1)

  const direct = await asUser('A', 'update public.spaces set creator_id = $1 where id = $2 returning id', [U.H, S6])
  check('dono NÃO troca creator_id direto (nem para quem não é membro)', !!direct.error, direct.error)
  check('mensagem de erro da transferência sem caracteres quebrados', (await rpc('B', 'transfer_space_ownership', S6, U.B)).error?.includes('Só o dono do espaço'))
  check('transferência pela função continua funcionando', !(await rpc('A', 'transfer_space_ownership', S6, U.F)).error)
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

console.log('\n[Migração 13: tempo real privado, avisos do banco, cobrança e anexos]')
{
  // Estado de produção que a migração 13 usa e que os blocos acima não criaram (levantado via SQL de leitura)
  const setup13 = await applyScript(`
    alter table public.profiles add column if not exists display_name text;
    alter table public.profiles add column if not exists avatar_url text;
    alter table public.profiles add column if not exists avatar_decoration text;
    alter table public.profiles add column if not exists profile_effect text;
    alter table public.profiles add column if not exists asaas_customer_id text;
    alter table public.profiles add column if not exists asaas_subscription_id text;

    create table public.blocked_users (id uuid primary key default gen_random_uuid(), blocker_id uuid, blocked_id uuid, created_at timestamptz default now());
    alter table public.blocked_users enable row level security;
    create policy "Users manage own blocks" on public.blocked_users for all to authenticated
      using ((select auth.uid()) = blocker_id) with check ((select auth.uid()) = blocker_id);

    create table public.direct_messages (id uuid primary key default gen_random_uuid(), sender_id uuid, receiver_id uuid, body text,
      attachment_url text, attachment_type text, created_at timestamptz default now(), read_at timestamptz);
    alter table public.direct_messages enable row level security;
    create policy "Users read their direct messages" on public.direct_messages for select to authenticated
      using (sender_id = (select auth.uid()) or receiver_id = (select auth.uid()));
    create policy "Users send direct messages as themselves" on public.direct_messages for insert to authenticated
      with check (sender_id = (select auth.uid()));

    create table public.friendships (id uuid primary key default gen_random_uuid(), user_id uuid, friend_id uuid, status text, created_at timestamptz default now());
    alter table public.friendships enable row level security;
    create policy "read" on public.friendships for select to authenticated using (user_id = (select auth.uid()) or friend_id = (select auth.uid()));
    create policy "insert" on public.friendships for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
    create policy "accept" on public.friendships for update to authenticated using (friend_id = (select auth.uid())) with check (friend_id = (select auth.uid()) and status = 'accepted');
    create policy "delete" on public.friendships for delete to authenticated using (user_id = (select auth.uid()) or friend_id = (select auth.uid()));

    create table public.group_chats (id uuid primary key default gen_random_uuid(), name text, creator_id uuid, avatar_url text, created_at timestamptz default now());
    create table public.group_chat_members (id uuid primary key default gen_random_uuid(), group_chat_id uuid, user_id uuid, joined_at timestamptz default now());
    create table public.group_messages (id uuid primary key default gen_random_uuid(), group_chat_id uuid, sender_id uuid, body text,
      attachment_url text, attachment_type text, created_at timestamptz default now());
    alter table public.group_messages enable row level security;
    create policy "send" on public.group_messages for insert to authenticated with check (sender_id = (select auth.uid())
      and exists (select 1 from public.group_chat_members m where m.group_chat_id = group_messages.group_chat_id and m.user_id = (select auth.uid())));
    create policy "read" on public.group_messages for select to authenticated using (true);

    grant select, insert, update, delete on public.blocked_users, public.direct_messages, public.friendships,
      public.group_chats, public.group_chat_members, public.group_messages to authenticated;

    -- Imitação mínima do Realtime do Supabase: realtime.topic() lê o tópico do canal e realtime.send() publica
    create schema realtime;
    create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb, event text, private boolean);
    alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as $$ select nullif(current_setting('realtime.topic', true), '') $$;
    create table realtime.sent (topic text, event text, payload jsonb, private boolean);
    create function realtime.send(payload jsonb, event text, topic text, private boolean) returns void language sql
      as $$ insert into realtime.sent values (topic, event, payload, private) $$;
    grant usage on schema realtime to anon, authenticated;
    grant select, insert on realtime.messages to anon, authenticated;
    grant usage, select on sequence realtime.messages_id_seq to anon, authenticated;
    insert into realtime.messages (topic, extension) values ('qualquer', 'broadcast');

    -- Imitação mínima do Storage com as regras de produção de antes da migração
    create schema storage;
    create table storage.buckets (id text primary key, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    insert into storage.buckets values ('attachments', true, null, null);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text,
      owner_id text default (auth.uid())::text);
    alter table storage.objects enable row level security;
    create policy "Permitir leitura pública de anexos" on storage.objects for select to authenticated using (bucket_id = 'attachments');
    create policy "Permitir upload para usuários autenticados" on storage.objects for insert to authenticated with check (bucket_id = 'attachments');
    grant usage on schema storage to authenticated;
    grant select, insert, update on storage.objects to authenticated;
  `)
  check('estado de produção para a migração 13 montado', !setup13.error, setup13.error)
  for (const [k, id] of Object.entries(U)) await admin('update public.profiles set display_name = $1 where id = $2', [`nome ${k}`, id])
  await admin("update public.profiles set asaas_customer_id = 'cus_A', asaas_subscription_id = 'sub_A' where id = $1", [U.A])

  // Espaço novo: A dono, B membro, D de fora; um canal público e um privado sem cargos autorizados
  const S7 = (await asUser('A', "insert into public.spaces(name, creator_id) values ('Servidor 7', $1) returning id", [U.A])).rows[0].id
  await asUser('A', "insert into public.space_members(space_id, user_id, role) values ($1, $2, 'owner')", [S7, U.A])
  await admin("insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member')", [S7, U.B])
  const PUB7 = (await admin("insert into public.channels(space_id, name) values ($1, 'geral') returning id", [S7])).rows[0].id
  const PRIV7 = (await admin("insert into public.channels(space_id, name, is_private, allowed_role_ids) values ($1, 'staff', true, '{}') returning id", [S7])).rows[0].id

  const sql13 = fs.readFileSync(`${REPO}/migration_13_privacidade_tempo_real.sql`, 'utf8')
  const m13 = await applyScript(sql13)
  check('migração 13 aplica sem erros', !m13.error, m13.error)

  // ---- Canais do Realtime ----
  const topic = async (t) => { await db.query("select set_config('realtime.topic', $1, false)", [t]) }
  const canRead = async (u, t) => { await topic(t); return (await (u === 'anon' ? asAnon : (s, p) => asUser(u, s, p))('select count(*)::int as n from realtime.messages')).rows[0]?.n > 0 }
  const canWrite = async (u, t, ext = 'broadcast') => { await topic(t); return !(await asUser(u, 'insert into realtime.messages(topic, extension) values ($1, $2)', [t, ext])).error }

  check('dono ouve a própria caixa de entrada', await canRead('A', `user:${U.A}`))
  check('NINGUÉM ouve a caixa de entrada de outro', !(await canRead('B', `user:${U.A}`)))
  check('ninguém publica pelo app nem na própria caixa (avisos vêm do banco)', !(await canWrite('A', `user:${U.A}`)))
  check('ninguém publica na caixa de outro', !(await canWrite('B', `user:${U.A}`)))
  check('quem está logado entra na presença geral', await canRead('B', 'global-presence') && await canWrite('B', 'global-presence', 'presence'))
  check('anônimo (só com a chave pública) NÃO entra na presença geral', !(await canRead('anon', 'global-presence')))
  check('membro entra na voz do espaço', await canRead('B', `space-voice-${S7}`) && await canWrite('B', `space-voice-${S7}`, 'presence'))
  check('quem não é do espaço NÃO ouve a voz nem a presença do espaço', !(await canRead('D', `space-voice-${S7}`)) && !(await canRead('D', `space-presence-${S7}`)))
  check('quem não é do espaço NÃO publica na voz do espaço', !(await canWrite('D', `space-voice-${S7}`)))
  check('membro ouve o canal de texto público', await canRead('B', `room-messages-${PUB7}`))
  check('membro sem cargo NÃO ouve o canal privado', !(await canRead('B', `room-messages-${PRIV7}`)))
  check('dono ouve o canal privado', await canRead('A', `room-messages-${PRIV7}`))
  check('quem não é do espaço NÃO ouve o canal público', !(await canRead('D', `room-messages-${PUB7}`)))
  check('membro manda "digitando" no canal público', await canWrite('B', `room-messages-${PUB7}`))
  check('membro NÃO publica no canal privado', !(await canWrite('B', `room-messages-${PRIV7}`)))
  const [lo, hi] = [U.A, U.B].sort()
  check('participantes entram na chamada direta', await canRead('A', `voice-dm-call-${lo}-${hi}`) && await canRead('B', `voice-dm-call-${lo}-${hi}`))
  check('terceiro NÃO entra na chamada direta', !(await canRead('D', `voice-dm-call-${lo}-${hi}`)))
  check('canal antigo "echo-social-events" e nomes desconhecidos são negados', !(await canRead('A', 'echo-social-events')) && !(await canRead('A', 'room-messages-lixo')) && !(await canWrite('A', 'echo-social-events')))
  check('publicar com extensão desconhecida é negado', !(await canWrite('A', 'global-presence', 'postgres_changes')))
  check('presença voice-<canal>: quem vê o canal entra, quem é de fora não', await canRead('B', `voice-${PUB7}`) && !(await canRead('D', `voice-${PUB7}`)))

  // ---- Mensagens dos canais de texto publicadas pelo banco ----
  await admin('delete from realtime.sent')
  const msg7 = (await asUser('B', "insert into public.messages(channel_id, author_id, body) values ($1, $2, 'oi canal') returning id", [PUB7, U.B])).rows[0]?.id
  let ms = (await admin('select topic, event, payload from realtime.sent')).rows
  check('mensagem no canal é publicada pelo banco no canal privado, com o perfil do autor verdadeiro',
    ms.length === 1 && ms[0].topic === `room-messages-${PUB7}` && ms[0].event === 'new-message' && ms[0].payload.author_id === U.B && ms[0].payload.profile?.display_name === 'nome B', JSON.stringify(ms))
  await admin('delete from realtime.sent')
  await asUser('B', 'delete from public.messages where id = $1', [msg7])
  ms = (await admin('select topic, event, payload from realtime.sent')).rows
  check('exclusão de mensagem é publicada pelo banco', ms.length === 1 && ms[0].event === 'delete-message' && ms[0].payload.id === msg7, JSON.stringify(ms))

  // ---- Avisos gerados pelo banco ----
  const sent = async () => (await admin('select topic, event, payload from realtime.sent')).rows
  const clearSent = () => admin('delete from realtime.sent')

  await clearSent()
  check('DM gravada', !(await asUser('A', "insert into public.direct_messages(sender_id, receiver_id, body) values ($1, $2, 'segredo')", [U.A, U.B])).error)
  let s = await sent()
  check('DM avisa SÓ a caixa do destinatário', s.length === 1 && s[0].topic === `user:${U.B}` && s[0].event === 'dm-event', JSON.stringify(s))
  check('o remetente do aviso é o verdadeiro (vem do banco)', s[0]?.payload.senderId === U.A && s[0]?.payload.senderName === 'nome A' && s[0]?.payload.body === 'segredo')
  check('ninguém grava DM em nome de outro', !!(await asUser('D', "insert into public.direct_messages(sender_id, receiver_id, body) values ($1, $2, 'falso')", [U.A, U.B])).error)

  await asUser('B', 'insert into public.blocked_users(blocker_id, blocked_id) values ($1, $2)', [U.B, U.A])
  await clearSent()
  await asUser('A', "insert into public.direct_messages(sender_id, receiver_id, body) values ($1, $2, 'oi')", [U.A, U.B])
  check('quem bloqueou não recebe aviso de DM', (await sent()).length === 0)
  await admin('delete from public.blocked_users')
  const dm1 = (await admin("insert into public.direct_messages(sender_id, receiver_id, body) values ($1, $2, 'apagar') returning id", [U.A, U.B])).rows[0].id
  check('destinatário NÃO apaga a DM que recebeu', (await asUser('B', 'delete from public.direct_messages where id = $1 returning id', [dm1])).rows.length === 0)
  check('remetente apaga a própria DM (antes não apagava nada)', (await asUser('A', 'delete from public.direct_messages where id = $1 returning id', [dm1])).rows.length === 1)

  const GRP = (await admin("insert into public.group_chats(name, creator_id) values ('g', $1) returning id", [U.A])).rows[0].id
  await admin('insert into public.group_chat_members(group_chat_id, user_id) values ($1, $2), ($1, $3)', [GRP, U.A, U.B])
  await clearSent()
  check('membro manda mensagem no grupo', !(await asUser('A', "insert into public.group_messages(group_chat_id, sender_id, body) values ($1, $2, 'olá grupo')", [GRP, U.A])).error)
  s = await sent()
  check('mensagem de grupo avisa SÓ os outros membros (antes: todo mundo recebia)', s.length === 1 && s[0].topic === `user:${U.B}` && s[0].payload.groupId === GRP, JSON.stringify(s))
  check('quem não é do grupo NÃO manda mensagem nele', !!(await asUser('C', "insert into public.group_messages(group_chat_id, sender_id, body) values ($1, $2, 'x')", [GRP, U.C])).error)

  await clearSent()
  await asUser('A', "insert into public.friendships(user_id, friend_id, status) values ($1, $2, 'pending')", [U.A, U.C])
  s = await sent()
  check('pedido de amizade avisa o destinatário', s.length === 1 && s[0].topic === `user:${U.C}` && s[0].payload.type === 'friend-request-sent' && s[0].payload.senderId === U.A)
  await clearSent()
  await asUser('C', "update public.friendships set status = 'accepted' where user_id = $1 and friend_id = $2", [U.A, U.C])
  s = await sent()
  check('aceite avisa quem pediu', s.length === 1 && s[0].topic === `user:${U.A}` && s[0].payload.type === 'friend-request-accepted' && s[0].payload.senderId === U.C)

  // ---- Chamadas e "digitando" pelo servidor ----
  await clearSent()
  check('amigo liga para amigo', !(await rpc('A', 'send_call_event', 'call-invite', U.C)).error)
  s = await sent()
  const room = `dm-call-${[U.A, U.C].sort().join('-')}`
  check('convite de chamada vai só para o destinatário, com a sala certa e o nome verdadeiro',
    s.length === 1 && s[0].topic === `user:${U.C}` && s[0].payload.callerId === U.A && s[0].payload.roomId === room && s[0].payload.callerName === 'nome A', JSON.stringify(s))
  check('quem não é amigo NÃO liga', (await rpc('D', 'send_call_event', 'call-invite', U.A)).error?.includes('not_friends'))
  check('tipo de evento inventado é recusado', (await rpc('A', 'send_call_event', 'call-hack', U.C)).error?.includes('invalid_call_event'))
  check('anônimo NÃO chama a função de chamada', !!(await rpc('anon', 'send_call_event', 'call-invite', U.C)).error)
  await clearSent()
  await rpc('C', 'send_call_event', 'call-accepted', U.A)
  s = await sent()
  check('aceitar a chamada avisa quem ligou', s.length === 1 && s[0].topic === `user:${U.A}` && s[0].payload.callerId === U.A && s[0].payload.targetUserId === U.C)

  await clearSent()
  await rpc('A', 'send_typing', 'dm', U.C)
  await rpc('D', 'send_typing', 'dm', U.C)
  await rpc('C', 'send_typing', 'group', GRP)
  s = await sent()
  check('"digitando" só entre quem conversa; estranho e não-membro do grupo não avisam ninguém',
    s.length === 1 && s[0].topic === `user:${U.C}` && s[0].event === 'dm-typing' && s[0].payload.senderId === U.A, JSON.stringify(s))

  // ---- Cobrança ----
  const prof = (await admin('select asaas_customer_id, asaas_subscription_id from public.profiles where id = $1', [U.A])).rows[0]
  check('IDs do Asaas saíram de profiles', prof.asaas_customer_id === null && prof.asaas_subscription_id === null)
  check('…e foram para billing_accounts', (await admin('select asaas_customer_id from public.billing_accounts where user_id = $1', [U.A])).rows[0]?.asaas_customer_id === 'cus_A')
  check('dono lê a própria conta de cobrança', (await asUser('A', 'select user_id from public.billing_accounts')).rows.length === 1)
  check('outro usuário NÃO lê a conta de cobrança de ninguém', (await asUser('B', 'select user_id from public.billing_accounts')).rows.length === 0)
  check('ninguém grava a própria conta de cobrança pelo app', !!(await asUser('B', "insert into public.billing_accounts(user_id, asaas_customer_id) values ($1, 'cus_falso')", [U.B])).error)

  // ---- Anexos ----
  const up = (u, name) => asUser(u, "insert into storage.objects(bucket_id, name) values ('attachments', $1) returning id", [name])
  const ok = async (u, name) => !(await up(u, name)).error
  check('bucket ganhou limite de 25 MB e lista de tipos', (await admin("select file_size_limit, allowed_mime_types from storage.buckets where id = 'attachments'")).rows[0]?.file_size_limit === '26214400' || (await admin("select file_size_limit from storage.buckets where id = 'attachments'")).rows[0]?.file_size_limit == 26214400)
  check('envia na própria pasta de DM, avatar, banner e figurinha',
    await ok('A', `dm/${U.A}/f.png`) && await ok('A', `avatars/${U.A}/f.png`) && await ok('A', `banners/${U.A}/f.png`) && await ok('A', `stickers/${U.A}_1_f.png`))
  check('NÃO envia na pasta de outra pessoa', !(await ok('B', `dm/${U.A}/f.png`)) && !(await ok('B', `avatars/${U.A}/f.png`)) && !(await ok('B', `stickers/${U.A}_1_f.png`)))
  check('membro anexa no canal público (e áudio)', await ok('B', `channels/${PUB7}/f.png`) && await ok('B', `voice-notes/${PUB7}/a.webm`))
  check('membro sem acesso NÃO anexa no canal privado; quem é de fora NÃO anexa em nada',
    !(await ok('B', `channels/${PRIV7}/f.png`)) && !(await ok('D', `channels/${PUB7}/f.png`)))
  check('dono troca ícone e emojis do espaço; membro comum NÃO', await ok('A', `spaces/${S7}/icon_1.png`) && await ok('A', `spaces/${S7}/emojis/x.png`)
    && !(await ok('B', `spaces/${S7}/icon_1.png`)) && !(await ok('B', `spaces/${S7}/emojis/x.png`)))
  check('pastas inventadas e caminhos com ".." são recusados', !(await ok('A', `outra/${U.A}/f.png`)) && !(await ok('A', `dm/${U.A}/../x.png`)) && !(await ok('A', 'f.png')))
  check('ninguém lista os arquivos dos outros (só os próprios)', (await asUser('B', "select name from storage.objects where name like 'dm/%'")).rows.length === 0
    && (await asUser('A', "select name from storage.objects where name like 'dm/%'")).rows.length === 1)

  // ---- Reversão ----
  const rb13 = await applyScript(fs.readFileSync(`${REPO}/rollback_13_privacidade_tempo_real.sql`, 'utf8'))
  check('rollback 13 aplica sem erros', !rb13.error, rb13.error)
  check('rollback 13 devolve os IDs do Asaas para profiles', (await admin('select asaas_customer_id from public.profiles where id = $1', [U.A])).rows[0]?.asaas_customer_id === 'cus_A')
  const re13 = await applyScript(sql13)
  check('migração 13 reaplica depois do rollback', !re13.error, re13.error)

  // =========================================================================
  console.log('\n[Migração 14: respostas em tópico]')
  // =========================================================================
  const sql14 = fs.readFileSync(`${REPO}/migration_14_topicos.sql`, 'utf8')
  const m14 = await applyScript(sql14)
  check('migração 14 aplica sem erros', !m14.error, m14.error)
  const m14again = await applyScript(sql14)
  check('migração 14 pode ser reaplicada', !m14again.error, m14again.error)

  // C entra no espaço para ser um terceiro participante; D continua de fora
  await admin("insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member')", [S7, U.C])
  const post = async (u, channel, body, root = null) =>
    asUser(u, 'insert into public.messages(channel_id, author_id, body, thread_root_id) values ($1, $2, $3, $4) returning id', [channel, U[u], body, root])

  await clearSent()
  const ROOT = (await post('A', PUB7, 'vamos marcar o jogo?')).rows[0]?.id
  let t = await sent()
  check('mensagem comum continua saindo como "new-message" (apps antigos não mudam)',
    !!ROOT && t.length === 1 && t[0].event === 'new-message' && t[0].payload.thread_root_id === null, JSON.stringify(t))

  await clearSent()
  const R1 = (await post('B', PUB7, 'sexta às 21h', ROOT)).rows[0]?.id
  t = await sent()
  const room14 = t.filter(x => x.topic === `room-messages-${PUB7}`)
  const inbox14 = t.filter(x => x.topic.startsWith('user:'))
  check('membro responde no tópico', !!R1)
  check('a resposta sai como "thread-message" no canal privado (não entra no chat principal)',
    room14.length === 1 && room14[0].event === 'thread-message' && room14[0].payload.thread_root_id === ROOT
      && room14[0].payload.profile?.display_name === 'nome B', JSON.stringify(room14))
  check('o aviso leva o resumo do tópico: 1 resposta e os participantes (autor da raiz + quem respondeu)',
    room14[0]?.payload.thread?.root_id === ROOT && room14[0]?.payload.thread?.reply_count === 1
      && [...(room14[0]?.payload.thread?.participant_ids ?? [])].sort().join() === [U.A, U.B].sort().join(), JSON.stringify(room14[0]?.payload.thread))
  check('o autor da raiz é avisado na própria caixa de entrada; quem respondeu não avisa a si mesmo',
    inbox14.length === 1 && inbox14[0].topic === `user:${U.A}` && inbox14[0].event === 'thread-reply'
      && inbox14[0].payload.rootId === ROOT && inbox14[0].payload.senderId === U.B && inbox14[0].payload.senderName === 'nome B', JSON.stringify(inbox14))
  check('o aviso da caixa de entrada NÃO leva o texto da resposta',
    !JSON.stringify(inbox14[0]?.payload ?? {}).includes('sexta'))

  await clearSent()
  const R2 = (await post('C', PUB7, 'eu topo', ROOT)).rows[0]?.id
  t = await sent()
  const inboxR2 = t.filter(x => x.topic.startsWith('user:')).map(x => x.topic).sort()
  check('segunda resposta avisa o autor da raiz e quem já respondeu, menos quem escreveu',
    !!R2 && inboxR2.join() === [`user:${U.A}`, `user:${U.B}`].sort().join(), JSON.stringify(inboxR2))
  check('…e o resumo passa a contar 2 respostas',
    t.find(x => x.event === 'thread-message')?.payload.thread?.reply_count === 2)

  // ---- Regras do vínculo ----
  const err = async (promise) => (await promise).error || ''
  check('NÃO existe tópico dentro de tópico (resposta de resposta)', (await err(post('A', PUB7, 'x', R1))).includes('thread_root_is_reply'))
  check('raiz de OUTRO canal é recusada', (await err(post('A', PRIV7, 'x', ROOT))).includes('thread_root_other_channel'))
  check('raiz que não existe é recusada', !!(await err(post('A', PUB7, 'x', '99999999-0000-4000-8000-000000000009'))))
  check('quem não é do espaço NÃO responde no tópico', !!(await err(post('D', PUB7, 'intruso', ROOT))))
  check('ninguém responde em nome de outro', !!(await asUser('B', 'insert into public.messages(channel_id, author_id, body, thread_root_id) values ($1, $2, $3, $4)', [PUB7, U.A, 'falso', ROOT])).error)
  check('o vínculo não muda depois: resposta não troca de tópico nem vira mensagem comum',
    (await asUser('B', 'update public.messages set thread_root_id = null where id = $1 returning id', [R1])).rows.length === 0
      && (await admin('select thread_root_id from public.messages where id = $1', [R1])).rows[0]?.thread_root_id === ROOT)
  const PLAIN = (await post('B', PUB7, 'mensagem comum')).rows[0]?.id
  check('mensagem comum não é puxada para dentro de um tópico depois (nem por quem administra o banco)',
    (await err(admin('update public.messages set thread_root_id = $1 where id = $2', [ROOT, PLAIN]))).includes('thread_root_immutable'))
  check('editar o texto de uma resposta de tópico continua permitido',
    (await asUser('B', "update public.messages set body = 'sexta às 22h' where id = $1 returning id", [R1])).rows.length === 1)

  // ---- Leitura e resumo ----
  const PRIVROOT = (await post('A', PRIV7, 'assunto da staff')).rows[0]?.id
  await post('A', PRIV7, 'resposta da staff', PRIVROOT)
  const summaries = async (u, channel) => (await asUser(u, 'select * from public.get_thread_summaries($1)', [channel])).rows
  let sum = await summaries('B', PUB7)
  check('resumo do canal: um tópico com 2 respostas e 2 participantes',
    sum.length === 1 && sum[0].root_id === ROOT && sum[0].reply_count === 2 && sum[0].participant_ids.length === 2, JSON.stringify(sum))
  check('quem não é do espaço não recebe resumo nenhum', (await summaries('D', PUB7)).length === 0)
  check('membro sem acesso ao canal privado não vê o tópico de lá; o dono vê',
    (await summaries('B', PRIV7)).length === 0 && (await summaries('A', PRIV7)).length === 1)
  check('membro sem acesso NÃO lê as respostas do tópico privado',
    (await asUser('B', 'select id from public.messages where thread_root_id = $1', [PRIVROOT])).rows.length === 0)
  check('anônimo NÃO chama o resumo', !!(await asAnon('select * from public.get_thread_summaries($1)', [PUB7])).error)

  // ---- Exclusão ----
  await clearSent()
  check('quem respondeu apaga a própria resposta', (await asUser('B', 'delete from public.messages where id = $1 returning id', [R1])).rows.length === 1)
  t = await sent()
  check('a exclusão avisa o canal dizendo de qual tópico era',
    t.length === 1 && t[0].event === 'delete-message' && t[0].payload.id === R1 && t[0].payload.thread_root_id === ROOT, JSON.stringify(t))
  check('outro membro NÃO apaga a resposta de alguém', (await asUser('B', 'delete from public.messages where id = $1 returning id', [R2])).rows.length === 0)
  await clearSent()
  check('apagar a mensagem-raiz apaga o tópico inteiro',
    (await asUser('A', 'delete from public.messages where id = $1 returning id', [ROOT])).rows.length === 1
      && (await admin('select count(*)::int as n from public.messages where thread_root_id = $1', [ROOT])).rows[0].n === 0)
  check('…e cada resposta apagada junto também é avisada', (await sent()).filter(x => x.event === 'delete-message').length === 2)

  // ---- Reversão ----
  const KEEP = (await post('A', PUB7, 'raiz que fica')).rows[0]?.id
  const KEEPR = (await post('B', PUB7, 'resposta que fica', KEEP)).rows[0]?.id
  const rb14 = await applyScript(fs.readFileSync(`${REPO}/rollback_14_topicos.sql`, 'utf8'))
  check('rollback 14 aplica sem erros', !rb14.error, rb14.error)
  check('rollback 14 não apaga as respostas: viram mensagens comuns',
    (await admin('select count(*)::int as n from public.messages where id = any($1)', [[KEEP, KEEPR]])).rows[0].n === 2
      && (await admin("select count(*)::int as n from information_schema.columns where table_name = 'messages' and column_name = 'thread_root_id'")).rows[0].n === 0)
  await clearSent()
  await asUser('B', "insert into public.messages(channel_id, author_id, body) values ($1, $2, 'depois do rollback')", [PUB7, U.B])
  check('depois do rollback, mensagem comum segue sendo avisada', (await sent()).some(x => x.event === 'new-message'))
  const re14 = await applyScript(sql14)
  check('migração 14 reaplica depois do rollback', !re14.error, re14.error)

  // =========================================================================
  console.log('\n[Migração 15: avisos do banco no lugar do postgres_changes]')
  // =========================================================================
  const setup15 = await applyScript(`
    alter table public.profiles add column if not exists is_premium boolean default false;
    alter table public.profiles add column if not exists premium_until timestamptz;
    alter table public.profiles add column if not exists banner_url text;
    alter table public.profiles add column if not exists banner_preset text;
    alter table public.profiles add column if not exists bio text;
    alter table public.profiles add column if not exists pronouns text;
    alter table public.profiles add column if not exists custom_status text;
    create table if not exists public.message_reactions (id uuid primary key default gen_random_uuid(),
      message_id uuid not null references public.messages(id) on delete cascade, user_id uuid, emoji text, created_at timestamptz default now());
  `)
  check('estado de produção para a migração 15 montado', !setup15.error, setup15.error)
  const sql15 = fs.readFileSync(`${REPO}/migration_15_avisos_do_banco.sql`, 'utf8')
  const m15 = await applyScript(sql15)
  check('migração 15 aplica sem erros', !m15.error, m15.error)
  const m15again = await applyScript(sql15)
  check('migração 15 pode ser reaplicada', !m15again.error, m15again.error)

  // ---- Canais novos ----
  check('membro ouve os avisos do espaço', await canRead('B', `space-events-${S7}`))
  check('quem não é do espaço NÃO ouve os avisos do espaço', !(await canRead('D', `space-events-${S7}`)))
  check('ninguém publica pelo app nos avisos do espaço (nem o dono)', !(await canWrite('A', `space-events-${S7}`)) && !(await canWrite('B', `space-events-${S7}`)))
  check('o app NÃO ouve nem publica no canal de comandos do bot', !(await canRead('A', 'music-bot-commands')) && !(await canWrite('A', 'music-bot-commands')))
  check('as regras da migração 13 continuam valendo', await canRead('A', `user:${U.A}`) && !(await canRead('B', `user:${U.A}`))
    && await canRead('B', `room-messages-${PUB7}`) && !(await canRead('B', `room-messages-${PRIV7}`)) && await canWrite('B', `space-voice-${S7}`, 'presence'))

  // ---- Mensagem nova em canal que todo membro vê ----
  const activity = (rows) => rows.filter(x => x.event === 'channel-activity')
  await clearSent()
  const M15 = (await post('B', PUB7, 'alguém online? @nome A')).rows[0]?.id
  let a = await sent()
  check('mensagem em canal aberto avisa o espaço UMA vez, com o texto (para menção e notificação)',
    activity(a).length === 1 && activity(a)[0].topic === `space-events-${S7}` && activity(a)[0].payload.id === M15
      && activity(a)[0].payload.channel_id === PUB7 && activity(a)[0].payload.author_id === U.B
      && activity(a)[0].payload.body === 'alguém online? @nome A' && activity(a)[0].payload.thread_root_id === null, JSON.stringify(activity(a)))
  check('…e o "new-message" do canal aberto continua saindo', a.some(x => x.event === 'new-message' && x.topic === `room-messages-${PUB7}`))
  await clearSent()
  await post('C', PUB7, 'resposta no tópico', M15)
  check('resposta de tópico também avisa o espaço, marcada como tópico',
    activity(await sent())[0]?.payload.thread_root_id === M15)

  // ---- Canal restrito: o texto só vai para quem enxerga o canal ----
  await clearSent()
  await post('A', PRIV7, 'só a staff lê isto')
  a = await sent()
  check('mensagem em canal privado NÃO vai para o canal do espaço nem para quem não vê o canal',
    activity(a).length === 0 && !JSON.stringify(a.filter(x => x.topic.startsWith('space-events-'))).includes('staff'), JSON.stringify(a))
  const ROLE15 = (await admin("insert into public.space_roles(space_id, name, position, permissions) values ($1, 'Staff', 1, '{}') returning id", [S7])).rows[0].id
  await admin('insert into public.space_member_roles(space_id, user_id, role_id) values ($1, $2, $3)', [S7, U.C, ROLE15])
  await admin('update public.channels set allowed_role_ids = array[$1::text] where id = $2', [ROLE15, PRIV7])
  await clearSent()
  await post('A', PRIV7, 'reunião da staff')
  a = activity(await sent())
  check('…quem tem o cargo do canal privado é avisado na PRÓPRIA caixa de entrada, e só ele',
    a.length === 1 && a[0].topic === `user:${U.C}` && a[0].payload.body === 'reunião da staff', JSON.stringify(a))
  await clearSent()
  await post('C', PRIV7, 'ok, estou dentro')
  a = activity(await sent())
  check('…e o dono (que vê tudo) é avisado quando outro escreve no canal privado; o autor não avisa a si mesmo',
    a.length === 1 && a[0].topic === `user:${U.A}`, JSON.stringify(a))

  // ---- Comandos do bot de música ----
  const VOICE7 = (await admin("insert into public.channels(space_id, name, type) values ($1, 'resenha', 'voice') returning id", [S7])).rows[0].id
  const commands = async () => (await sent()).filter(x => x.topic === 'music-bot-commands')
  await clearSent()
  const CMD = (await post('B', VOICE7, '  !play lofi')).rows[0]?.id
  let c = await commands()
  check('comando em canal de voz vai para o canal do bot, com canal, autor e texto',
    c.length === 1 && c[0].event === 'command' && c[0].payload.id === CMD && c[0].payload.channel_id === VOICE7
      && c[0].payload.author_id === U.B && c[0].payload.body === '  !play lofi', JSON.stringify(c))
  await clearSent()
  await post('B', VOICE7, 'conversa normal na chamada')
  await post('B', PUB7, '!play em canal de texto')
  check('conversa comum e "!" em canal de texto NÃO vão para o bot', (await commands()).length === 0)

  // ---- Canal aberto: edição, reações e fixadas ----
  await clearSent()
  await asUser('B', "update public.messages set body = 'editada' where id = $1", [M15])
  a = await sent()
  check('edição de mensagem avisa o canal aberto',
    a.length === 1 && a[0].event === 'update-message' && a[0].topic === `room-messages-${PUB7}` && a[0].payload.id === M15 && a[0].payload.body === 'editada', JSON.stringify(a))
  await clearSent()
  await admin("insert into public.message_reactions(message_id, user_id, emoji) values ($1, $2, '🔥')", [M15, U.A])
  a = await sent()
  check('reação avisa o canal da mensagem',
    a.length === 1 && a[0].event === 'reactions-changed' && a[0].topic === `room-messages-${PUB7}` && a[0].payload.message_id === M15, JSON.stringify(a))
  await clearSent()
  await admin('delete from public.message_reactions where message_id = $1', [M15])
  check('tirar a reação também avisa', (await sent()).filter(x => x.event === 'reactions-changed').length === 1)
  await clearSent()
  await admin("insert into public.pinned_messages(channel_id, message_id, body) values ($1, $2, 'editada')", [PUB7, M15])
  a = await sent()
  check('fixar mensagem avisa o canal', a.length === 1 && a[0].event === 'pins-changed' && a[0].topic === `room-messages-${PUB7}`, JSON.stringify(a))
  await clearSent()
  await admin('delete from public.pinned_messages where channel_id = $1', [PUB7])
  check('desafixar também avisa', (await sent()).filter(x => x.event === 'pins-changed').length === 1)

  // ---- Espaço: membros, cargos e dados ----
  await clearSent()
  await admin("insert into public.space_members(space_id, user_id, role) values ($1, $2, 'member')", [S7, U.E])
  a = await sent()
  check('entrada de membro avisa o espaço e a caixa de quem entrou',
    a.some(x => x.event === 'members-changed' && x.topic === `space-events-${S7}`)
      && a.some(x => x.event === 'space-membership' && x.topic === `user:${U.E}` && x.payload.space_id === S7 && x.payload.op === 'INSERT'), JSON.stringify(a))
  check('o aviso de membros NÃO leva dados de ninguém (o app recarrega pela API)',
    !JSON.stringify(a.find(x => x.event === 'members-changed')?.payload ?? {}).includes(U.E))
  await clearSent()
  await admin('delete from public.space_members where space_id = $1 and user_id = $2', [S7, U.E])
  a = await sent()
  check('saída/remoção avisa o espaço e a caixa de quem saiu',
    a.some(x => x.event === 'members-changed') && a.some(x => x.event === 'space-membership' && x.topic === `user:${U.E}` && x.payload.op === 'DELETE'), JSON.stringify(a))
  await clearSent()
  await admin("update public.space_roles set color = '#ff0000' where id = $1", [ROLE15])
  check('mudança de cargo avisa o espaço', (await sent()).some(x => x.event === 'roles-changed' && x.topic === `space-events-${S7}`))
  await clearSent()
  await admin('delete from public.space_member_roles where space_id = $1 and user_id = $2', [S7, U.C])
  check('tirar cargo de membro avisa o espaço', (await sent()).some(x => x.event === 'member-roles-changed' && x.topic === `space-events-${S7}`))
  await clearSent()
  await admin("update public.spaces set description = 'nova descrição' where id = $1", [S7])
  check('mudança nos dados do espaço avisa o espaço', (await sent()).some(x => x.event === 'space-updated' && x.topic === `space-events-${S7}`))

  // ---- Perfil ----
  await admin('delete from public.friendships')
  await admin("insert into public.friendships(user_id, friend_id, status) values ($1, $2, 'accepted'), ($3, $1, 'pending')", [U.B, U.F, U.G])
  await clearSent()
  await admin("update public.profiles set display_name = 'B de cara nova' where id = $1", [U.B])
  a = await sent()
  check('mudança de perfil avisa o próprio dono',
    a.some(x => x.event === 'profile-updated' && x.topic === `user:${U.B}` && x.payload.display_name === 'B de cara nova'), JSON.stringify(a))
  const spaceCountB = (await admin('select count(*)::int as n from public.space_members where user_id = $1', [U.B])).rows[0].n
  check('…cada espaço de que ele participa (e nenhum outro)', a.filter(x => x.event === 'member-profile').length === spaceCountB
    && a.some(x => x.event === 'member-profile' && x.topic === `space-events-${S7}` && x.payload.id === U.B),
    JSON.stringify(a.filter(x => x.event === 'member-profile').map(x => x.topic)))
  check('…e só os amigos ACEITOS (pedido pendente não conta)',
    a.filter(x => x.event === 'friend-profile').map(x => x.topic).join() === `user:${U.F}`, JSON.stringify(a.filter(x => x.event === 'friend-profile')))
  check('o aviso para os outros NÃO leva o estado da assinatura',
    !('is_premium' in (a.find(x => x.event === 'member-profile')?.payload ?? {})) && 'is_premium' in (a.find(x => x.event === 'profile-updated')?.payload ?? {}))
  await clearSent()
  await admin("update public.profiles set premium_until = now() + interval '30 days' where id = $1", [U.B])
  a = await sent()
  check('mudança só da assinatura avisa SÓ o dono',
    a.length === 1 && a[0].event === 'profile-updated' && a[0].topic === `user:${U.B}`, JSON.stringify(a))
  await clearSent()
  await admin('update public.profiles set display_name = display_name where id = $1', [U.B])
  check('gravar o perfil sem mudar nada não avisa ninguém', (await sent()).length === 0)

  // ---- Reversão ----
  const rb15 = await applyScript(fs.readFileSync(`${REPO}/rollback_15_avisos_do_banco.sql`, 'utf8'))
  check('rollback 15 aplica sem erros', !rb15.error, rb15.error)
  await clearSent()
  await post('B', PUB7, 'depois do rollback 15')
  a = await sent()
  check('depois do rollback 15, a mensagem segue saindo no canal aberto e os avisos novos param',
    a.length === 1 && a[0].event === 'new-message', JSON.stringify(a))
  check('depois do rollback 15, o canal de avisos do espaço deixa de existir', !(await canRead('B', `space-events-${S7}`)))
  const re15 = await applyScript(sql15)
  check('migração 15 reaplica depois do rollback', !re15.error, re15.error)
}

console.log(`\n${passed} passaram, ${failed} falharam`)
process.exit(failed ? 1 : 0)
