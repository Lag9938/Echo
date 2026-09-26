-- Migração 11: cargos e permissões no estilo Discord, valendo de verdade no servidor.
--
-- Problemas que esta migração resolve:
--  * As permissões dos cargos eram só visuais: no banco, só o dono do espaço conseguia criar/editar canais,
--    mexer em cargos ou expulsar membros. Um "Moderador" com "Gerenciar Canais" ou "Expulsar" não conseguia
--    fazer nada (RLS recusava), e canais privados / de anúncios só eram respeitados pela interface.
--  * Não havia hierarquia: nada impedia um cargo de editar um cargo acima dele.
--  * Não havia @everyone: um membro sem cargos não tinha permissões base definidas.
--  * O cliente semeava os cargos padrão ao abrir o espaço, e aberturas simultâneas criavam cargos duplicados.
--
-- Modelo (igual ao Discord, com a cara do Echo):
--  * Todo espaço tem um cargo @everyone (is_everyone) que vale para todos os membros, sem atribuição.
--  * Permissões efetivas = @everyone ∪ cargos atribuídos. "administrator" libera tudo. O dono tem tudo.
--  * Hierarquia: position 0 é o topo. Só se gerencia cargos ABAIXO do seu cargo mais alto, e só se gerencia
--    membros cujo cargo mais alto está abaixo do seu. Ninguém concede uma permissão que não tem.
--  * Escritas em space_roles / space_member_roles passam por funções (RPC) que aplicam essas regras.
--  * Canais: exigem "viewChannels"; privados só para os cargos liberados em allowed_role_ids (ou admin).
--    Mensagens exigem "sendMessages" (+ "sendInAnnouncementChannels" em anúncios, "attachFiles" com anexo).
--
-- ⚠️ Aplicar junto com a versão do app que usa as funções abaixo: clientes antigos perdem a edição de cargos
-- (eles escreviam direto nas tabelas). Reversão: rollback_11_discord_roles.sql

-- ---------------------------------------------------------------------------
-- 1. Colunas novas
-- ---------------------------------------------------------------------------
alter table public.space_roles add column if not exists is_default boolean not null default false;
alter table public.space_roles add column if not exists is_everyone boolean not null default false;
alter table public.space_roles add column if not exists hoist boolean not null default false;

create unique index if not exists space_roles_one_everyone_idx on public.space_roles (space_id) where is_everyone;

-- ---------------------------------------------------------------------------
-- 2. Limpeza dos cargos duplicados pela semeadura concorrente do cliente
--    (remove cópias idênticas sem ninguém atribuído, mantendo a mais antiga ou a que tem membros)
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from public.space_roles where is_everyone) then
    delete from public.space_roles r
    using public.space_roles keep
    where r.space_id = keep.space_id
      and r.id <> keep.id
      and r.name = keep.name
      and r.color = keep.color
      and r.position = keep.position
      and r.permissions = keep.permissions
      and r.is_default = keep.is_default
      and not exists (select 1 from public.space_member_roles m where m.role_id = r.id)
      and (
        exists (select 1 from public.space_member_roles m where m.role_id = keep.id)
        or keep.created_at < r.created_at
        or (keep.created_at = r.created_at and keep.id < r.id)
      );

    -- Cargos existentes continuam aparecendo separados na lista de membros, como antes
    update public.space_roles set hoist = true;
  end if;
end $$;

-- Posições contíguas (0 = topo) por espaço, sem contar o @everyone
with ordered as (
  select id, row_number() over (partition by space_id order by position, created_at, id) - 1 as pos
  from public.space_roles
  where not is_everyone
)
update public.space_roles r set position = o.pos
from ordered o
where o.id = r.id and r.position <> o.pos;

-- ---------------------------------------------------------------------------
-- 3. Catálogo de permissões e padrões
-- ---------------------------------------------------------------------------
create or replace function public.space_permission_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'administrator',
    'viewChannels', 'manageChannels', 'manageRoles', 'manageEmojis', 'viewAuditLog', 'manageSpace',
    'createInvite', 'kickMembers',
    'sendMessages', 'sendInAnnouncementChannels', 'attachFiles', 'manageMessages',
    'connect', 'speak', 'muteMembers', 'moveMembers', 'disconnectMembers'
  ]::text[]
$$;

create or replace function public.space_everyone_default_permissions()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select '{"viewChannels": true, "createInvite": true, "sendMessages": true, "attachFiles": true, "connect": true, "speak": true}'::jsonb
$$;

-- Mantém só chaves conhecidas com valor true (o cliente pode mandar o objeto inteiro com falses)
create or replace function public.sanitize_space_permissions(p_permissions jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, true), '{}'::jsonb)
  from jsonb_each(case when jsonb_typeof(p_permissions) = 'object' then p_permissions else '{}'::jsonb end) e
  where e.key = any (public.space_permission_keys())
    and e.value = 'true'::jsonb
$$;

-- ---------------------------------------------------------------------------
-- 4. @everyone para os espaços existentes e para os novos
-- ---------------------------------------------------------------------------
insert into public.space_roles (space_id, name, color, position, permissions, is_everyone, hoist, is_default)
select s.id, '@everyone', '#99aab5', 2147483647, public.space_everyone_default_permissions(), true, false, false
from public.spaces s
where not exists (select 1 from public.space_roles r where r.space_id = s.id and r.is_everyone);

create or replace function public.seed_space_default_roles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.space_roles (space_id, name, color, position, permissions, is_everyone, hoist)
  values (NEW.id, '@everyone', '#99aab5', 2147483647, public.space_everyone_default_permissions(), true, false)
  on conflict do nothing;

  insert into public.space_roles (space_id, name, color, position, permissions, is_everyone, hoist)
  values (
    NEW.id, '🛡️ Moderador', '#3b82f6', 0,
    '{"kickMembers": true, "manageMessages": true, "sendInAnnouncementChannels": true, "viewAuditLog": true,
      "muteMembers": true, "moveMembers": true, "disconnectMembers": true}'::jsonb,
    false, true
  );
  return NEW;
end;
$$;

drop trigger if exists seed_space_default_roles_trigger on public.spaces;
create trigger seed_space_default_roles_trigger
  after insert on public.spaces
  for each row execute function public.seed_space_default_roles();

-- ---------------------------------------------------------------------------
-- 5. Cálculo de permissões e hierarquia
-- ---------------------------------------------------------------------------
create or replace function public.space_member_permissions(p_space_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_perms jsonb;
begin
  if p_user_id is null or p_space_id is null then
    return '{}'::jsonb;
  end if;

  -- Quem não é do espaço só consulta a si mesmo: senão qualquer conta descobriria dono, membros e cargos
  -- de um espaço alheio só com os UUIDs
  if auth.uid() is not null and p_user_id <> auth.uid()
     and not exists (select 1 from public.space_members where space_id = p_space_id and user_id = auth.uid())
     and not exists (select 1 from public.spaces where id = p_space_id and creator_id = auth.uid()) then
    return '{}'::jsonb;
  end if;

  if exists (select 1 from public.spaces where id = p_space_id and creator_id = p_user_id) then
    select jsonb_object_agg(k, true) into v_perms from unnest(public.space_permission_keys()) k;
    return v_perms;
  end if;

  if not exists (select 1 from public.space_members where space_id = p_space_id and user_id = p_user_id) then
    return '{}'::jsonb;
  end if;

  select coalesce(jsonb_object_agg(e.key, true), '{}'::jsonb) into v_perms
  from public.space_roles r
  cross join lateral jsonb_each(r.permissions) e
  where r.space_id = p_space_id
    and (
      r.is_everyone
      or exists (
        select 1 from public.space_member_roles m
        where m.space_id = p_space_id and m.user_id = p_user_id and m.role_id = r.id
      )
    )
    and e.key = any (public.space_permission_keys())
    and e.value = 'true'::jsonb;

  if coalesce((v_perms ->> 'administrator')::boolean, false) then
    select jsonb_object_agg(k, true) into v_perms from unnest(public.space_permission_keys()) k;
  end if;

  return v_perms;
end;
$$;

create or replace function public.has_space_permission(p_space_id uuid, p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((public.space_member_permissions(p_space_id, auth.uid()) ->> p_permission)::boolean, false)
$$;

-- Posição do cargo mais alto (0 = topo). Dono: -1. Sem cargos: 2147483647 (abaixo de tudo).
-- Quem não é do espaço só consulta a si mesmo (os demais aparecem sem cargos, sem revelar o dono).
create or replace function public.space_member_top_position(p_space_id uuid, p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is not null and p_user_id is distinct from auth.uid()
         and not exists (select 1 from public.space_members where space_id = p_space_id and user_id = auth.uid())
         and not exists (select 1 from public.spaces where id = p_space_id and creator_id = auth.uid()) then 2147483647
    when exists (select 1 from public.spaces where id = p_space_id and creator_id = p_user_id) then -1
    else coalesce((
      select min(r.position)
      from public.space_member_roles m
      join public.space_roles r on r.id = m.role_id
      where m.space_id = p_space_id and m.user_id = p_user_id and not r.is_everyone
    ), 2147483647)
  end
$$;

-- Visibilidade de um canal (recebe as colunas para não reconsultar channels dentro da própria policy)
create or replace function public.can_view_channel_row(p_space_id uuid, p_is_private boolean, p_allowed_role_ids text[])
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_perms jsonb := public.space_member_permissions(p_space_id, v_uid);
begin
  if coalesce((v_perms ->> 'administrator')::boolean, false) then
    return true;
  end if;
  if not coalesce((v_perms ->> 'viewChannels')::boolean, false) then
    return false;
  end if;
  if not coalesce(p_is_private, false) then
    return true;
  end if;
  return exists (
    select 1 from public.space_roles r
    where r.space_id = p_space_id
      and r.id::text = any (coalesce(p_allowed_role_ids, '{}'::text[]))
      and (
        r.is_everyone
        or exists (
          select 1 from public.space_member_roles m
          where m.space_id = p_space_id and m.user_id = v_uid and m.role_id = r.id
        )
      )
  );
end;
$$;

create or replace function public.can_view_channel(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.can_view_channel_row(c.space_id, c.is_private, c.allowed_role_ids)
    from public.channels c where c.id = p_channel_id
  ), false)
$$;

create or replace function public.can_send_message(p_channel_id uuid, p_has_attachment boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_channel record;
  v_perms jsonb;
begin
  select space_id, is_private, allowed_role_ids, is_announcement into v_channel
  from public.channels where id = p_channel_id;
  if not found then
    return false;
  end if;
  if not public.can_view_channel_row(v_channel.space_id, v_channel.is_private, v_channel.allowed_role_ids) then
    return false;
  end if;

  v_perms := public.space_member_permissions(v_channel.space_id, auth.uid());
  if not coalesce((v_perms ->> 'sendMessages')::boolean, false) then
    return false;
  end if;
  if v_channel.is_announcement and not coalesce((v_perms ->> 'sendInAnnouncementChannels')::boolean, false) then
    return false;
  end if;
  if coalesce(p_has_attachment, false) and not coalesce((v_perms ->> 'attachFiles')::boolean, false) then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.can_manage_channel_messages(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select public.can_view_channel_row(c.space_id, c.is_private, c.allowed_role_ids)
       and public.has_space_permission(c.space_id, 'manageMessages')
    from public.channels c where c.id = p_channel_id
  ), false)
$$;

-- Mesma assinatura usada pela policy de DELETE em messages: o autor ou quem gerencia mensagens no canal
create or replace function public.can_delete_message(p_channel_id uuid, p_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_author_id = auth.uid() or public.can_manage_channel_messages(p_channel_id)
$$;

-- Expulsar: precisa de kickMembers e estar acima do alvo na hierarquia. O dono nunca é expulso.
create or replace function public.can_kick_member(p_space_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_user_id is distinct from auth.uid()
    and not exists (select 1 from public.spaces where id = p_space_id and creator_id = p_user_id)
    and public.has_space_permission(p_space_id, 'kickMembers')
    and public.space_member_top_position(p_space_id, auth.uid()) < public.space_member_top_position(p_space_id, p_user_id)
$$;

-- Permissões efetivas do usuário atual num canal (usada pelo token de voz)
create or replace function public.get_my_channel_permissions(p_channel_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_channel record;
begin
  select space_id, is_private, allowed_role_ids into v_channel from public.channels where id = p_channel_id;
  if not found or not public.can_view_channel_row(v_channel.space_id, v_channel.is_private, v_channel.allowed_role_ids) then
    return '{}'::jsonb;
  end if;
  return public.space_member_permissions(v_channel.space_id, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Funções de gestão de cargos (únicas formas de escrever em space_roles / space_member_roles)
-- ---------------------------------------------------------------------------

-- Confere que quem chama pode conceder as permissões novas (ninguém dá o que não tem)
create or replace function public.assert_can_grant_permissions(p_space_id uuid, p_old jsonb, p_new jsonb)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_mine jsonb := public.space_member_permissions(p_space_id, auth.uid());
  v_key text;
begin
  for v_key in select key from jsonb_each(p_new) where value = 'true'::jsonb loop
    if not coalesce((p_old ->> v_key)::boolean, false)
       and not coalesce((v_mine ->> v_key)::boolean, false) then
      raise exception 'missing_permission:%', v_key using errcode = '42501';
    end if;
  end loop;
end;
$$;

create or replace function public.assert_can_manage_role(p_role public.space_roles)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_space_permission(p_role.space_id, 'manageRoles') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- O @everyone pode ser editado por quem gerencia cargos; os demais só se estiverem abaixo do seu cargo mais alto
  if not p_role.is_everyone
     and public.space_member_top_position(p_role.space_id, auth.uid()) >= p_role.position then
    raise exception 'role_hierarchy' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.clean_role_name(p_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
begin
  if char_length(v_name) < 1 or char_length(v_name) > 64 then
    raise exception 'invalid_role_name' using errcode = '22023';
  end if;
  if lower(v_name) in ('@everyone', '@here') then
    raise exception 'invalid_role_name' using errcode = '22023';
  end if;
  return v_name;
end;
$$;

create or replace function public.clean_role_color(p_color text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_color is null or p_color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'invalid_role_color' using errcode = '22023';
  end if;
  return lower(p_color);
end;
$$;

create or replace function public.create_space_role(
  p_space_id uuid,
  p_name text default 'Novo cargo',
  p_color text default '#99aab5',
  p_permissions jsonb default '{}'::jsonb,
  p_hoist boolean default false
)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_perms jsonb := public.sanitize_space_permissions(p_permissions);
  v_role public.space_roles%rowtype;
  v_position integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.has_space_permission(p_space_id, 'manageRoles') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  perform public.assert_can_grant_permissions(p_space_id, '{}'::jsonb, v_perms);

  -- Trava os cargos do espaço para calcular a posição sem corrida
  perform 1 from public.space_roles where space_id = p_space_id for update;
  if (select count(*) from public.space_roles where space_id = p_space_id) >= 250 then
    raise exception 'too_many_roles' using errcode = '54000';
  end if;

  -- Como no Discord: o cargo novo nasce logo acima do @everyone (sempre abaixo de quem criou)
  select coalesce(max(position), -1) + 1 into v_position
  from public.space_roles where space_id = p_space_id and not is_everyone;

  insert into public.space_roles (space_id, name, color, position, permissions, hoist)
  values (p_space_id, public.clean_role_name(p_name), public.clean_role_color(p_color), v_position, v_perms, coalesce(p_hoist, false))
  returning * into v_role;

  return row_to_json(v_role);
end;
$$;

-- p_changes aceita: name, color, permissions, hoist, is_default
create or replace function public.update_space_role(p_role_id uuid, p_changes jsonb)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.space_roles%rowtype;
  v_perms jsonb;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_role from public.space_roles where id = p_role_id for update;
  if not found then
    raise exception 'role_not_found' using errcode = 'P0002';
  end if;
  perform public.assert_can_manage_role(v_role);

  if v_role.is_everyone and (p_changes ? 'name' or p_changes ? 'color' or p_changes ? 'hoist'
                             or coalesce((p_changes ->> 'is_default')::boolean, false)) then
    raise exception 'everyone_locked' using errcode = '42501';
  end if;

  if p_changes ? 'name' then
    v_role.name := public.clean_role_name(p_changes ->> 'name');
  end if;
  if p_changes ? 'color' then
    v_role.color := public.clean_role_color(p_changes ->> 'color');
  end if;
  if p_changes ? 'hoist' then
    v_role.hoist := coalesce((p_changes ->> 'hoist')::boolean, false);
  end if;
  if p_changes ? 'permissions' then
    v_perms := public.sanitize_space_permissions(p_changes -> 'permissions');
    perform public.assert_can_grant_permissions(v_role.space_id, v_role.permissions, v_perms);
    v_role.permissions := v_perms;
  end if;
  if p_changes ? 'is_default' then
    v_role.is_default := coalesce((p_changes ->> 'is_default')::boolean, false);
    if v_role.is_default then
      -- Quem entra ganha o cargo automático: vale a mesma regra de só conceder o que se tem
      perform public.assert_can_grant_permissions(v_role.space_id, '{}'::jsonb,
                                                  public.sanitize_space_permissions(v_role.permissions));
      -- Tirar a marca de outro cargo também é mexer nele: só se ele estiver abaixo de quem chama
      if exists (
        select 1 from public.space_roles
        where space_id = v_role.space_id and id <> v_role.id and is_default
          and position <= public.space_member_top_position(v_role.space_id, auth.uid())
      ) then
        raise exception 'role_hierarchy' using errcode = '42501';
      end if;
      update public.space_roles set is_default = false
      where space_id = v_role.space_id and id <> v_role.id and is_default;
    end if;
  end if;

  update public.space_roles
  set name = v_role.name,
      color = v_role.color,
      hoist = v_role.hoist,
      permissions = v_role.permissions,
      is_default = v_role.is_default
  where id = v_role.id
  returning * into v_role;

  return row_to_json(v_role);
end;
$$;

create or replace function public.delete_space_role(p_role_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.space_roles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_role from public.space_roles where id = p_role_id for update;
  if not found then
    return false;
  end if;
  if v_role.is_everyone then
    raise exception 'everyone_locked' using errcode = '42501';
  end if;
  perform public.assert_can_manage_role(v_role);

  delete from public.space_roles where id = v_role.id;
  update public.space_roles set position = position - 1
  where space_id = v_role.space_id and not is_everyone and position > v_role.position;
  update public.channels set allowed_role_ids = array_remove(allowed_role_ids, v_role.id::text)
  where space_id = v_role.space_id and v_role.id::text = any (allowed_role_ids);
  return true;
end;
$$;

-- p_role_ids: todos os cargos do espaço (menos o @everyone), do topo para baixo
create or replace function public.reorder_space_roles(p_space_id uuid, p_role_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current uuid[];
  v_top integer;
  i integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not public.has_space_permission(p_space_id, 'manageRoles') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Normaliza para uma lista simples começando no índice 1. Um array com outro índice inicial
  -- (ex.: '[3:5]={...}', aceito pelo PostgREST como texto) deixava p_role_ids[i] nulo na checagem de
  -- hierarquia abaixo, e quem chamava conseguia rebaixar cargos acima do seu.
  p_role_ids := array(select x from unnest(p_role_ids) with ordinality as t(x, n) order by n);

  perform 1 from public.space_roles where space_id = p_space_id for update;
  select coalesce(array_agg(id order by position, created_at, id), '{}') into v_current
  from public.space_roles where space_id = p_space_id and not is_everyone;

  if coalesce(cardinality(p_role_ids), 0) <> cardinality(v_current)
     or (select count(distinct x) from unnest(p_role_ids) x) <> cardinality(v_current)
     or exists (select 1 from unnest(p_role_ids) x where x <> all (v_current)) then
    raise exception 'invalid_role_order' using errcode = '22023';
  end if;

  -- Cargos no seu nível ou acima ficam onde estão (posições 0..top); só os de baixo se movem
  v_top := public.space_member_top_position(p_space_id, auth.uid());
  if v_top >= 0 then
    -- least antes do +1: sem cargos, v_top = 2147483647 e v_top + 1 estouraria o integer
    for i in 1 .. least(v_top, cardinality(v_current) - 1) + 1 loop
      if p_role_ids[i] is distinct from v_current[i] then
        raise exception 'role_hierarchy' using errcode = '42501';
      end if;
    end loop;
  end if;

  for i in 1 .. cardinality(p_role_ids) loop
    update public.space_roles set position = i - 1 where id = p_role_ids[i] and position <> i - 1;
  end loop;
  return true;
end;
$$;

create or replace function public.set_space_member_role(p_space_id uuid, p_user_id uuid, p_role_id uuid, p_assign boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.space_roles%rowtype;
  v_my_top integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_role from public.space_roles where id = p_role_id and space_id = p_space_id;
  if not found then
    raise exception 'role_not_found' using errcode = 'P0002';
  end if;
  if v_role.is_everyone then
    raise exception 'everyone_locked' using errcode = '42501';
  end if;
  if not exists (select 1 from public.space_members where space_id = p_space_id and user_id = p_user_id) then
    raise exception 'not_a_member' using errcode = '22023';
  end if;
  if not public.has_space_permission(p_space_id, 'manageRoles') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_my_top := public.space_member_top_position(p_space_id, v_uid);
  if v_my_top >= v_role.position then
    raise exception 'role_hierarchy' using errcode = '42501';
  end if;
  -- Membros acima (ou no mesmo nível) não podem ser alterados; os próprios cargos de baixo, sim
  if p_user_id <> v_uid and v_my_top >= public.space_member_top_position(p_space_id, p_user_id) then
    raise exception 'member_hierarchy' using errcode = '42501';
  end if;

  if coalesce(p_assign, false) then
    -- Ninguém concede uma permissão que não tem, nem por meio de um cargo: cargos novos nascem logo acima do
    -- @everyone, então um "Admin" recém-criado ficaria ao alcance de qualquer um com Gerenciar Cargos
    perform public.assert_can_grant_permissions(p_space_id, '{}'::jsonb,
                                                public.sanitize_space_permissions(v_role.permissions));
    insert into public.space_member_roles (space_id, user_id, role_id)
    values (p_space_id, p_user_id, p_role_id)
    on conflict do nothing;
  else
    delete from public.space_member_roles
    where space_id = p_space_id and user_id = p_user_id and role_id = p_role_id;
  end if;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Integridade
-- ---------------------------------------------------------------------------

-- Quem sai ou é expulso perde os cargos (antes eles ficavam órfãos e voltavam ao reentrar)
create or replace function public.clear_member_roles_on_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.space_member_roles where space_id = OLD.space_id and user_id = OLD.user_id;
  return OLD;
end;
$$;

drop trigger if exists clear_member_roles_on_leave_trigger on public.space_members;
create trigger clear_member_roles_on_leave_trigger
  after delete on public.space_members
  for each row execute function public.clear_member_roles_on_leave();

-- Quem gerencia o espaço edita os dados dele, mas a posse só muda pela função de transferência (chamada pelo dono).
-- SECURITY INVOKER de propósito: num UPDATE direto do app current_user é anon/authenticated (barrado, até para o
-- dono, que senão passaria a posse para quem nem é membro sem acertar space_members); dentro de
-- transfer_space_ownership (SECURITY DEFINER) é o dono da função. A checagem de auth.uid() barra transferências
-- concorrentes feitas pelo antigo dono.
create or replace function public.protect_space_owner()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if NEW.creator_id is distinct from OLD.creator_id
     and (current_user in ('anon', 'authenticated')
          or (auth.uid() is not null and auth.uid() is distinct from OLD.creator_id)) then
    raise exception 'forbidden_owner_change' using errcode = '42501';
  end if;
  return NEW;
end;
$$;

drop trigger if exists protect_space_owner_trigger on public.spaces;
create trigger protect_space_owner_trigger
  before update on public.spaces
  for each row execute function public.protect_space_owner();

-- ---------------------------------------------------------------------------
-- 8. Policies
-- ---------------------------------------------------------------------------

-- space_roles / space_member_roles: leitura para membros; escrita só pelas funções acima
drop policy if exists "authenticated read space_roles" on public.space_roles;
drop policy if exists "authenticated manage space_roles" on public.space_roles;
drop policy if exists "space owners insert roles" on public.space_roles;
drop policy if exists "space owners update roles" on public.space_roles;
drop policy if exists "space owners delete roles" on public.space_roles;
drop policy if exists "space members read roles" on public.space_roles;
create policy "space members read roles"
  on public.space_roles for select to authenticated
  using (public.is_space_member(space_id));

drop policy if exists "authenticated read space_member_roles" on public.space_member_roles;
drop policy if exists "authenticated manage space_member_roles" on public.space_member_roles;
drop policy if exists "space owners insert member roles" on public.space_member_roles;
drop policy if exists "space owners update member roles" on public.space_member_roles;
drop policy if exists "space owners delete member roles" on public.space_member_roles;
drop policy if exists "space members read member roles" on public.space_member_roles;
create policy "space members read member roles"
  on public.space_member_roles for select to authenticated
  using (public.is_space_member(space_id));

-- channels
drop policy if exists "space members read channels" on public.channels;
drop policy if exists "owners insert channels" on public.channels;
drop policy if exists "owners update channels" on public.channels;
drop policy if exists "owners delete channels" on public.channels;
drop policy if exists "members read visible channels" on public.channels;
drop policy if exists "channel managers insert channels" on public.channels;
drop policy if exists "channel managers update channels" on public.channels;
drop policy if exists "channel managers delete channels" on public.channels;

create policy "members read visible channels"
  on public.channels for select to authenticated
  using (public.is_space_member(space_id) and public.can_view_channel_row(space_id, is_private, allowed_role_ids));
create policy "channel managers insert channels"
  on public.channels for insert to authenticated
  with check (public.has_space_permission(space_id, 'manageChannels'));
create policy "channel managers update channels"
  on public.channels for update to authenticated
  using (public.has_space_permission(space_id, 'manageChannels'))
  with check (public.has_space_permission(space_id, 'manageChannels'));
create policy "channel managers delete channels"
  on public.channels for delete to authenticated
  using (public.has_space_permission(space_id, 'manageChannels'));

-- messages
drop policy if exists "space members read messages" on public.messages;
drop policy if exists "space members send messages" on public.messages;
drop policy if exists "members read visible messages" on public.messages;
drop policy if exists "members send allowed messages" on public.messages;

create policy "members read visible messages"
  on public.messages for select to authenticated
  using (public.can_view_channel(channel_id));
create policy "members send allowed messages"
  on public.messages for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and public.can_send_message(channel_id, attachment_url is not null)
  );
-- Edição pelo autor: a linha editada precisa continuar valendo como envio. Antes bastava mandar num canal comum
-- e depois trocar channel_id para um canal de anúncios, ou incluir um anexo sem "Anexar arquivos".
drop policy if exists "authors edit messages" on public.messages;
create policy "authors edit messages"
  on public.messages for update to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and public.can_send_message(channel_id, attachment_url is not null)
  );
-- "authorized delete messages" (can_delete_message) continua como está

-- pinned_messages: todos que veem o canal leem; fixar/desafixar exige Gerenciar Mensagens
drop policy if exists "members manage pinned" on public.pinned_messages;
drop policy if exists "members read pinned" on public.pinned_messages;
drop policy if exists "message managers pin" on public.pinned_messages;
drop policy if exists "message managers update pins" on public.pinned_messages;
drop policy if exists "message managers unpin" on public.pinned_messages;

create policy "members read pinned"
  on public.pinned_messages for select to authenticated
  using (public.can_view_channel(channel_id));
create policy "message managers pin"
  on public.pinned_messages for insert to authenticated
  with check (public.can_manage_channel_messages(channel_id));
create policy "message managers update pins"
  on public.pinned_messages for update to authenticated
  using (public.can_manage_channel_messages(channel_id))
  with check (public.can_manage_channel_messages(channel_id));
create policy "message managers unpin"
  on public.pinned_messages for delete to authenticated
  using (public.can_manage_channel_messages(channel_id));

-- space_members: expulsar segue kickMembers + hierarquia (sair continua livre)
drop policy if exists "owners remove members" on public.space_members;
drop policy if exists "moderators kick members" on public.space_members;
create policy "moderators kick members"
  on public.space_members for delete to authenticated
  using (public.can_kick_member(space_id, user_id));

-- spaces: quem tem Gerenciar Espaço edita nome, ícone, banner etc. (a posse é protegida pelo trigger)
drop policy if exists "managers update spaces" on public.spaces;
create policy "managers update spaces"
  on public.spaces for update to authenticated
  using (public.has_space_permission(id, 'manageSpace'))
  with check (public.has_space_permission(id, 'manageSpace'));

-- space_audit_logs: ler exige Ver Registro de Ações
drop policy if exists "members read space audit logs" on public.space_audit_logs;
drop policy if exists "audit viewers read space audit logs" on public.space_audit_logs;
create policy "audit viewers read space audit logs"
  on public.space_audit_logs for select to authenticated
  using (public.has_space_permission(space_id, 'viewAuditLog'));

-- space_invites: quem criou ou quem gerencia o espaço
drop policy if exists "creators and owners read invites" on public.space_invites;
drop policy if exists "creators and managers read invites" on public.space_invites;
create policy "creators and managers read invites"
  on public.space_invites for select to authenticated
  using (created_by = (select auth.uid()) or public.has_space_permission(space_id, 'manageSpace'));

-- ---------------------------------------------------------------------------
-- 9. Convites passam a respeitar Criar Convite / Gerenciar Espaço
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
  if not public.has_space_permission(p_space_id, 'createInvite') then
    raise exception 'forbidden_create_invite' using errcode = '42501';
  end if;

  if p_expires_in_hours = 0 then
    if not public.has_space_permission(p_space_id, 'manageSpace') then
      raise exception 'forbidden_never_expires' using errcode = '42501';
    end if;
    v_expires := null;
  else
    v_expires := now() + make_interval(hours => p_expires_in_hours);
  end if;

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
        null;
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
  if v_invite.created_by <> v_uid and not public.has_space_permission(v_invite.space_id, 'manageSpace') then
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
  if not public.has_space_permission(p_space_id, 'manageSpace') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.space_invites set revoked_at = now() where space_id = p_space_id and revoked_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Quem pode executar o quê
-- ---------------------------------------------------------------------------
revoke all on function public.space_permission_keys() from public, anon;
revoke all on function public.space_everyone_default_permissions() from public, anon;
revoke all on function public.sanitize_space_permissions(jsonb) from public, anon;
revoke all on function public.seed_space_default_roles() from public, anon, authenticated;
revoke all on function public.space_member_permissions(uuid, uuid) from public, anon;
revoke all on function public.has_space_permission(uuid, text) from public, anon;
revoke all on function public.space_member_top_position(uuid, uuid) from public, anon;
revoke all on function public.can_view_channel_row(uuid, boolean, text[]) from public, anon;
revoke all on function public.can_view_channel(uuid) from public, anon;
revoke all on function public.can_send_message(uuid, boolean) from public, anon;
revoke all on function public.can_manage_channel_messages(uuid) from public, anon;
revoke all on function public.can_delete_message(uuid, uuid) from public, anon;
revoke all on function public.can_kick_member(uuid, uuid) from public, anon;
revoke all on function public.get_my_channel_permissions(uuid) from public, anon;
revoke all on function public.assert_can_grant_permissions(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.assert_can_manage_role(public.space_roles) from public, anon, authenticated;
revoke all on function public.clean_role_name(text) from public, anon, authenticated;
revoke all on function public.clean_role_color(text) from public, anon, authenticated;
revoke all on function public.create_space_role(uuid, text, text, jsonb, boolean) from public, anon;
revoke all on function public.update_space_role(uuid, jsonb) from public, anon;
revoke all on function public.delete_space_role(uuid) from public, anon;
revoke all on function public.reorder_space_roles(uuid, uuid[]) from public, anon;
revoke all on function public.set_space_member_role(uuid, uuid, uuid, boolean) from public, anon;
revoke all on function public.clear_member_roles_on_leave() from public, anon, authenticated;
revoke all on function public.protect_space_owner() from public, anon, authenticated;
revoke all on function public.get_or_create_space_invite(uuid, integer) from public, anon;
revoke all on function public.revoke_space_invite(text) from public, anon;
revoke all on function public.revoke_all_space_invites(uuid) from public, anon;

grant execute on function public.space_permission_keys() to authenticated;
grant execute on function public.space_everyone_default_permissions() to authenticated;
grant execute on function public.sanitize_space_permissions(jsonb) to authenticated;
grant execute on function public.space_member_permissions(uuid, uuid) to authenticated;
grant execute on function public.has_space_permission(uuid, text) to authenticated;
grant execute on function public.space_member_top_position(uuid, uuid) to authenticated;
grant execute on function public.can_view_channel_row(uuid, boolean, text[]) to authenticated;
grant execute on function public.can_view_channel(uuid) to authenticated;
grant execute on function public.can_send_message(uuid, boolean) to authenticated;
grant execute on function public.can_manage_channel_messages(uuid) to authenticated;
grant execute on function public.can_delete_message(uuid, uuid) to authenticated;
grant execute on function public.can_kick_member(uuid, uuid) to authenticated;
grant execute on function public.get_my_channel_permissions(uuid) to authenticated;
grant execute on function public.create_space_role(uuid, text, text, jsonb, boolean) to authenticated;
grant execute on function public.update_space_role(uuid, jsonb) to authenticated;
grant execute on function public.delete_space_role(uuid) to authenticated;
grant execute on function public.reorder_space_roles(uuid, uuid[]) to authenticated;
grant execute on function public.set_space_member_role(uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.get_or_create_space_invite(uuid, integer) to authenticated;
grant execute on function public.revoke_space_invite(text) to authenticated;
grant execute on function public.revoke_all_space_invites(uuid) to authenticated;
