-- Reversão da migração 12: volta às policies anteriores (a de group_chat_members tinha recursão infinita).
drop policy if exists "Members see group membership" on public.group_chat_members;
create policy "Members see group membership" on public.group_chat_members
  for select
  using (
    (user_id = (select auth.uid()))
    or exists (
      select 1 from public.group_chat_members m2
      where m2.group_chat_id = group_chat_members.group_chat_id
        and m2.user_id = (select auth.uid())
    )
  );

drop policy if exists "Members can see their groups" on public.group_chats;
create policy "Members can see their groups" on public.group_chats
  for select
  using (exists (
    select 1 from public.group_chat_members
    where group_chat_members.group_chat_id = group_chats.id
      and group_chat_members.user_id = (select auth.uid())
  ));

drop policy if exists "Members can update their groups" on public.group_chats;
create policy "Members can update their groups" on public.group_chats
  for update
  using (exists (
    select 1 from public.group_chat_members
    where group_chat_members.group_chat_id = group_chats.id
      and group_chat_members.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.group_chat_members
    where group_chat_members.group_chat_id = group_chats.id
      and group_chat_members.user_id = (select auth.uid())
  ));

drop policy if exists "Members can delete their groups" on public.group_chats;
create policy "Members can delete their groups" on public.group_chats
  for delete
  using (exists (
    select 1 from public.group_chat_members
    where group_chat_members.group_chat_id = group_chats.id
      and group_chat_members.user_id = (select auth.uid())
  ));

drop function if exists public.is_group_chat_member(uuid);
