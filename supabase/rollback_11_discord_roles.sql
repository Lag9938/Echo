-- Reversão da migração 11: volta às policies "só o dono" e remove as funções de cargos.
-- Depois deste arquivo, rode de novo migration_08_space_invites.sql (é idempotente) para restaurar as
-- funções de convite e a policy de leitura de convites originais.
-- Os cargos @everyone e as colunas is_everyone/hoist ficam (são inofensivos para a versão anterior do app).

drop trigger if exists seed_space_default_roles_trigger on public.spaces;
drop trigger if exists clear_member_roles_on_leave_trigger on public.space_members;
drop trigger if exists protect_space_owner_trigger on public.spaces;

-- space_roles / space_member_roles
drop policy if exists "space members read roles" on public.space_roles;
create policy "space members read roles" on public.space_roles for select to authenticated using (public.is_space_member(space_id));
create policy "space owners insert roles" on public.space_roles for insert to authenticated with check (public.is_space_creator(space_id));
create policy "space owners update roles" on public.space_roles for update to authenticated using (public.is_space_creator(space_id)) with check (public.is_space_creator(space_id));
create policy "space owners delete roles" on public.space_roles for delete to authenticated using (public.is_space_creator(space_id));

drop policy if exists "space members read member roles" on public.space_member_roles;
create policy "space members read member roles" on public.space_member_roles for select to authenticated using (public.is_space_member(space_id));
create policy "space owners insert member roles" on public.space_member_roles for insert to authenticated with check (public.is_space_creator(space_id));
create policy "space owners update member roles" on public.space_member_roles for update to authenticated using (public.is_space_creator(space_id)) with check (public.is_space_creator(space_id));
create policy "space owners delete member roles" on public.space_member_roles for delete to authenticated using (public.is_space_creator(space_id));

-- channels
drop policy if exists "members read visible channels" on public.channels;
drop policy if exists "channel managers insert channels" on public.channels;
drop policy if exists "channel managers update channels" on public.channels;
drop policy if exists "channel managers delete channels" on public.channels;
create policy "space members read channels" on public.channels for select to authenticated using (public.is_space_member(space_id));
create policy "owners insert channels" on public.channels for insert to authenticated with check (public.is_space_creator(space_id));
create policy "owners update channels" on public.channels for update to authenticated using (public.is_space_creator(space_id)) with check (public.is_space_creator(space_id));
create policy "owners delete channels" on public.channels for delete to authenticated using (public.is_space_creator(space_id));

-- messages
drop policy if exists "members read visible messages" on public.messages;
drop policy if exists "members send allowed messages" on public.messages;
create policy "space members read messages" on public.messages for select to authenticated
  using (public.is_space_member((select channels.space_id from public.channels where channels.id = messages.channel_id)));
create policy "space members send messages" on public.messages for insert to authenticated
  with check (author_id = (select auth.uid()) and public.is_space_member((select channels.space_id from public.channels where channels.id = messages.channel_id)));

create or replace function public.can_delete_message(p_channel_id uuid, p_author_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select (
    p_author_id = auth.uid()
    or exists (
      select 1 from public.channels c join public.spaces s on s.id = c.space_id
      where c.id = p_channel_id and s.creator_id = auth.uid()
    )
    or exists (
      select 1 from public.channels c
      join public.space_member_roles smr on smr.space_id = c.space_id
      join public.space_roles sr on sr.id = smr.role_id
      where c.id = p_channel_id and smr.user_id = auth.uid()
        and (coalesce((sr.permissions->>'administrator')::boolean, false)
             or coalesce((sr.permissions->>'manageMessages')::boolean, false))
    )
  );
$$;

-- pinned_messages
drop policy if exists "members read pinned" on public.pinned_messages;
drop policy if exists "message managers pin" on public.pinned_messages;
drop policy if exists "message managers update pins" on public.pinned_messages;
drop policy if exists "message managers unpin" on public.pinned_messages;
create policy "members manage pinned" on public.pinned_messages for all to authenticated
  using (exists (select 1 from public.channels c where c.id = pinned_messages.channel_id and public.is_space_member(c.space_id)))
  with check (exists (select 1 from public.channels c where c.id = pinned_messages.channel_id and public.is_space_member(c.space_id)));

-- space_members / spaces / audit logs
drop policy if exists "moderators kick members" on public.space_members;
create policy "owners remove members" on public.space_members for delete to authenticated using (public.is_space_creator(space_id));

drop policy if exists "managers update spaces" on public.spaces;

drop policy if exists "audit viewers read space audit logs" on public.space_audit_logs;
create policy "members read space audit logs" on public.space_audit_logs for select to authenticated using (public.is_space_member(space_id));

drop policy if exists "creators and managers read invites" on public.space_invites;

-- funções
drop function if exists public.set_space_member_role(uuid, uuid, uuid, boolean);
drop function if exists public.reorder_space_roles(uuid, uuid[]);
drop function if exists public.delete_space_role(uuid);
drop function if exists public.update_space_role(uuid, jsonb);
drop function if exists public.create_space_role(uuid, text, text, jsonb, boolean);
drop function if exists public.clean_role_color(text);
drop function if exists public.clean_role_name(text);
drop function if exists public.assert_can_manage_role(public.space_roles);
drop function if exists public.assert_can_grant_permissions(uuid, jsonb, jsonb);
drop function if exists public.get_my_channel_permissions(uuid);
drop function if exists public.can_kick_member(uuid, uuid);
drop function if exists public.can_manage_channel_messages(uuid);
drop function if exists public.can_send_message(uuid, boolean);
drop function if exists public.can_view_channel(uuid);
drop function if exists public.can_view_channel_row(uuid, boolean, text[]);
drop function if exists public.clear_member_roles_on_leave();
drop function if exists public.protect_space_owner();
drop function if exists public.seed_space_default_roles();
