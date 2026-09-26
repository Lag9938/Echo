-- Migração 09: Fecha o acesso direto a spaces / space_members / space_audit_logs (parte 2 da Etapa 2)
--
-- ⚠️ APLICAR SOMENTE DEPOIS que (a) a migração 08 estiver aplicada e (b) os usuários estiverem numa versão
-- do app que entra em espaços por código de convite (join_space_with_invite). Depois desta migração,
-- clientes antigos NÃO conseguem mais entrar em espaços novos (quem já é membro não é afetado).
--
-- O que muda:
--  1. `spaces` deixa de ser legível por anon/qualquer usuário: só membros e o criador leem.
--     (antes: qualquer um listava todos os servidores e seus UUIDs)
--  2. Ninguém mais se insere como 'member' em space_members: a entrada é pela função de convite.
--     Só o criador de um espaço pode se inserir como 'owner' (fluxo de criação de espaço).
--  3. Qualquer membro pode sair do espaço (o cliente já tentava, mas a policy só permitia ao dono).
--  4. space_audit_logs: só membros leem e escrevem (antes: qualquer usuário lia e forjava logs de
--     qualquer servidor).
--  5. get_space_invite_details(uuid) (função antiga, por UUID) passa a responder só para membros.

-- 1. spaces -----------------------------------------------------------------
drop policy if exists "anon_read_spaces" on public.spaces;
drop policy if exists "authenticated users read spaces" on public.spaces;

drop policy if exists "members read spaces" on public.spaces;
create policy "members read spaces"
  on public.spaces for select to authenticated
  using (creator_id = (select auth.uid()) or public.is_space_member(id));

-- 2 e 3. space_members --------------------------------------------------------
drop policy if exists "members join spaces" on public.space_members;

drop policy if exists "creators add themselves as owner" on public.space_members;
create policy "creators add themselves as owner"
  on public.space_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and public.is_space_creator(space_id)
  );

drop policy if exists "members leave spaces" on public.space_members;
create policy "members leave spaces"
  on public.space_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- 4. space_audit_logs -----------------------------------------------------------
drop policy if exists "authenticated read space_audit_logs" on public.space_audit_logs;
drop policy if exists "authenticated insert space_audit_logs" on public.space_audit_logs;

drop policy if exists "members read space audit logs" on public.space_audit_logs;
create policy "members read space audit logs"
  on public.space_audit_logs for select to authenticated
  using (public.is_space_member(space_id));

drop policy if exists "members write own space audit logs" on public.space_audit_logs;
create policy "members write own space audit logs"
  on public.space_audit_logs for insert to authenticated
  with check (
    public.is_space_member(space_id)
    and (author_id is null or author_id = (select auth.uid()))
  );

-- 5. Função antiga de detalhes por UUID -------------------------------------------
create or replace function public.get_space_invite_details(p_space_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_space record;
  v_count integer;
begin
  if not public.is_space_member(p_space_id) then
    return null;
  end if;

  select id, name, description, icon_url, banner_url, banner_theme
  into v_space
  from public.spaces
  where id = p_space_id;

  if not found then
    return null;
  end if;

  select count(*) into v_count from public.space_members where space_id = p_space_id;

  return json_build_object(
    'id', v_space.id,
    'name', v_space.name,
    'description', v_space.description,
    'icon_url', v_space.icon_url,
    'banner_url', v_space.banner_url,
    'banner_theme', v_space.banner_theme,
    'member_count', v_count
  );
end;
$$;

revoke all on function public.get_space_invite_details(uuid) from public, anon, authenticated;
grant execute on function public.get_space_invite_details(uuid) to authenticated;
