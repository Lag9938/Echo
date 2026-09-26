-- Migração 08: Convites de verdade para espaços (parte 1 da Etapa 2 — 100% ADITIVA)
--
-- Problema: o "convite" de um espaço é o próprio UUID dele, e qualquer usuário pode se inserir em
-- space_members como 'member' (policy "members join spaces"). Ou seja, quem souber o UUID entra, e
-- os UUIDs podem ser listados porque `spaces` é legível por todos.
--
-- Solução: convites com código aleatório, com expiração, limite de usos e revogação. A entrada passa
-- a acontecer só pela função join_space_with_invite (SECURITY DEFINER).
--
-- Esta migração NÃO remove nenhum acesso existente: clientes antigos continuam funcionando. O
-- fechamento do acesso direto está na migração 09, que só deve ser aplicada depois que os usuários
-- atualizarem para a versão do app que usa estas funções.

-- ---------------------------------------------------------------------------
-- Tabela de convites
-- ---------------------------------------------------------------------------
create table if not exists public.space_invites (
  code        text primary key check (code ~ '^[a-z0-9]{10,32}$'),
  space_id    uuid not null references public.spaces(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,                                   -- null = nunca expira
  max_uses    integer check (max_uses is null or max_uses > 0), -- null = ilimitado
  uses        integer not null default 0 check (uses >= 0),
  revoked_at  timestamptz
);

create index if not exists space_invites_space_id_idx on public.space_invites (space_id);
create index if not exists space_invites_created_by_idx on public.space_invites (created_by);

alter table public.space_invites enable row level security;

-- Leitura: quem criou o convite e o dono do espaço. Não há policy de INSERT/UPDATE/DELETE: toda
-- escrita passa pelas funções abaixo.
drop policy if exists "creators and owners read invites" on public.space_invites;
create policy "creators and owners read invites"
  on public.space_invites for select to authenticated
  using (created_by = (select auth.uid()) or public.is_space_creator(space_id));

revoke all on table public.space_invites from anon, authenticated;
grant select on table public.space_invites to authenticated;

-- ---------------------------------------------------------------------------
-- Gerador de código (12 caracteres, sem caracteres ambíguos, ~59 bits de entropia)
-- Usa gen_random_uuid() (CSPRNG, nativo do Postgres), pulando os bytes 6 e 8 que têm bits fixos.
-- ---------------------------------------------------------------------------
create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghjkmnpqrstuvwxyz23456789'; -- 31 caracteres (sem i, l, o, 0, 1)
  raw bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  result text := '';
  idx integer;
begin
  foreach idx in array array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11, 12, 13] loop
    result := result || substr(alphabet, (get_byte(raw, idx) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cria (ou reaproveita) um convite do usuário para um espaço
--   p_expires_in_hours: 1..720 (30 dias). 0 = nunca expira (só o dono do espaço). Padrão: 7 dias.
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_space_invite(
  p_space_id uuid,
  p_expires_in_hours integer default 168
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_expires timestamptz;
  v_invite public.space_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_expires_in_hours is null or p_expires_in_hours < 0 or p_expires_in_hours > 720 then
    raise exception 'invalid_expiration' using errcode = '22023';
  end if;
  if not public.is_space_member(p_space_id) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  if p_expires_in_hours = 0 then
    if not public.is_space_creator(p_space_id) then
      raise exception 'forbidden_never_expires' using errcode = '42501';
    end if;
    v_expires := null;
  else
    v_expires := now() + make_interval(hours => p_expires_in_hours);
  end if;

  -- Reaproveita um convite ativo do próprio usuário (evita criar um novo a cada vez que abre o modal)
  select * into v_invite
  from public.space_invites i
  where i.space_id = p_space_id
    and i.created_by = v_uid
    and i.revoked_at is null
    and (i.max_uses is null or i.uses < i.max_uses)
    and (
      (p_expires_in_hours = 0 and i.expires_at is null)
      or (p_expires_in_hours > 0 and i.expires_at is not null
          and i.expires_at > now() + make_interval(hours => greatest(1, p_expires_in_hours / 2)))
    )
  order by i.created_at desc
  limit 1;

  if not found then
    for attempt in 1..5 loop
      begin
        insert into public.space_invites (code, space_id, created_by, expires_at)
        values (public.generate_invite_code(), p_space_id, v_uid, v_expires)
        returning * into v_invite;
        exit;
      exception when unique_violation then
        null; -- colisão de código (praticamente impossível): tenta outro
      end;
    end loop;
  end if;

  if v_invite.code is null then
    raise exception 'code_generation_failed';
  end if;

  return json_build_object(
    'code', v_invite.code,
    'space_id', v_invite.space_id,
    'expires_at', v_invite.expires_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Detalhes públicos de um convite válido (página web de convite e pré-visualização no app)
-- Retorna NULL para código inexistente, expirado, revogado ou esgotado.
-- ---------------------------------------------------------------------------
create or replace function public.get_invite_details(p_code text)
returns json
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_space record;
begin
  if length(v_code) < 10 or length(v_code) > 32 then
    return null;
  end if;

  select s.id, s.name, s.description, s.icon_url, s.banner_url, s.banner_theme
  into v_space
  from public.space_invites i
  join public.spaces s on s.id = i.space_id
  where i.code = v_code
    and i.revoked_at is null
    and (i.expires_at is null or i.expires_at > now())
    and (i.max_uses is null or i.uses < i.max_uses);

  if not found then
    return null;
  end if;

  return json_build_object(
    'id', v_space.id,
    'name', v_space.name,
    'description', v_space.description,
    'icon_url', v_space.icon_url,
    'banner_url', v_space.banner_url,
    'banner_theme', v_space.banner_theme,
    'member_count', (select count(*) from public.space_members m where m.space_id = v_space.id)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Entra num espaço usando um código de convite
-- Erros: not_authenticated, invite_not_found (inexistente ou revogado), invite_expired, invite_exhausted
-- ---------------------------------------------------------------------------
create or replace function public.join_space_with_invite(p_code text)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_invite public.space_invites%rowtype;
  v_space_name text;
  v_default_role uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  -- Trava a linha do convite para respeitar max_uses mesmo com entradas simultâneas
  select * into v_invite from public.space_invites where code = v_code for update;
  if not found or v_invite.revoked_at is not null then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at <= now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;

  select name into v_space_name from public.spaces where id = v_invite.space_id;
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0002';
  end if;

  -- Já é membro: só devolve o espaço (não consome uso do convite)
  if exists (select 1 from public.space_members where space_id = v_invite.space_id and user_id = v_uid) then
    return json_build_object('space_id', v_invite.space_id, 'name', v_space_name, 'already_member', true);
  end if;

  if v_invite.max_uses is not null and v_invite.uses >= v_invite.max_uses then
    raise exception 'invite_exhausted' using errcode = 'P0001';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (v_invite.space_id, v_uid, 'member');

  update public.space_invites set uses = uses + 1 where code = v_invite.code;

  -- Cargo padrão do espaço (antes o cliente tentava atribuir, mas a policy só permitia ao dono)
  select id into v_default_role
  from public.space_roles
  where space_id = v_invite.space_id and is_default
  order by position, created_at
  limit 1;

  if v_default_role is not null then
    insert into public.space_member_roles (space_id, user_id, role_id)
    values (v_invite.space_id, v_uid, v_default_role)
    on conflict do nothing;
  end if;

  return json_build_object('space_id', v_invite.space_id, 'name', v_space_name, 'already_member', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Revoga um convite (quem criou ou o dono do espaço) / revoga todos os convites ativos (dono)
-- ---------------------------------------------------------------------------
create or replace function public.revoke_space_invite(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_invite public.space_invites%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_invite from public.space_invites where code = v_code;
  if not found then
    return false;
  end if;
  if v_invite.created_by <> v_uid and not public.is_space_creator(v_invite.space_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.space_invites set revoked_at = now() where code = v_code and revoked_at is null;
  return true;
end;
$$;

create or replace function public.revoke_all_space_invites(p_space_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.is_space_creator(p_space_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.space_invites set revoked_at = now() where space_id = p_space_id and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Permissões: por padrão o Supabase deixa funções do schema public executáveis por todos
-- ---------------------------------------------------------------------------
revoke all on function public.generate_invite_code() from public, anon, authenticated;
revoke all on function public.get_or_create_space_invite(uuid, integer) from public, anon, authenticated;
revoke all on function public.get_invite_details(text) from public, anon, authenticated;
revoke all on function public.join_space_with_invite(text) from public, anon, authenticated;
revoke all on function public.revoke_space_invite(text) from public, anon, authenticated;
revoke all on function public.revoke_all_space_invites(uuid) from public, anon, authenticated;

-- A página web de convite (sem login) precisa ler os detalhes públicos do convite
grant execute on function public.get_invite_details(text) to anon, authenticated;
grant execute on function public.get_or_create_space_invite(uuid, integer) to authenticated;
grant execute on function public.join_space_with_invite(text) to authenticated;
grant execute on function public.revoke_space_invite(text) to authenticated;
grant execute on function public.revoke_all_space_invites(uuid) to authenticated;
