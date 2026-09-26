-- Reversão da migração 09 (lock_space_access): restaura as policies como estavam antes.
-- ⚠️ Isto REABRE a falha (qualquer um lista os servidores e entra em qualquer um). Use só como emergência
-- se o fechamento quebrar algo essencial, e corrija o problema em seguida.

-- spaces: volta a ser legível por todos
drop policy if exists "members read spaces" on public.spaces;
create policy "authenticated users read spaces" on public.spaces for select to authenticated using (true);
create policy "anon_read_spaces" on public.spaces for select to anon using (true);

-- space_members: volta a permitir a entrada direta como member
drop policy if exists "creators add themselves as owner" on public.space_members;
drop policy if exists "members leave spaces" on public.space_members;
create policy "members join spaces" on public.space_members for insert to authenticated
  with check (
    ((select auth.uid()) = user_id)
    and (((role = 'owner') and public.is_space_creator(space_id)) or (role = 'member'))
  );

-- space_audit_logs: volta ao estado anterior
drop policy if exists "members read space audit logs" on public.space_audit_logs;
drop policy if exists "members write own space audit logs" on public.space_audit_logs;
create policy "authenticated read space_audit_logs" on public.space_audit_logs for select to authenticated using (true);
create policy "authenticated insert space_audit_logs" on public.space_audit_logs for insert to authenticated with check (true);

-- função antiga de detalhes por UUID: volta a responder para qualquer um
create or replace function public.get_space_invite_details(p_space_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_space record;
  v_count integer;
begin
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
grant execute on function public.get_space_invite_details(uuid) to public, anon, authenticated;
