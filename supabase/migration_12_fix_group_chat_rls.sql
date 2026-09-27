-- Migração 12 — corrige o RLS dos grupos de conversa (group_chats / group_chat_members)
--
-- PROBLEMA (visto nos logs de produção): a policy de SELECT de group_chat_members consulta a PRÓPRIA tabela
-- (subselect em group_chat_members m2), o que faz o Postgres abortar com
--   "infinite recursion detected in policy for relation group_chat_members"
-- em TODA leitura da tabela (HTTP 500). Resultado: ninguém consegue listar nem criar grupos (a tabela está
-- vazia em produção) e o app repete a consulta a cada minuto, enchendo o log de erros.
-- Além disso, criar um grupo faz INSERT ... RETURNING em group_chats, e a policy de SELECT só deixava ver
-- o grupo a quem já é membro — o criador ainda não é membro naquele instante.
--
-- CORREÇÃO: uma função SECURITY DEFINER (não passa pelo RLS) diz se o usuário é membro do grupo, e as
-- policies passam a usá-la. O criador também enxerga o próprio grupo.
--
-- Não muda dados nem colunas. Reversão: rollback_12_fix_group_chat_rls.sql

create or replace function public.is_group_chat_member(p_group_chat_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_chat_members
    where group_chat_id = p_group_chat_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_group_chat_member(uuid) from public, anon;
grant execute on function public.is_group_chat_member(uuid) to authenticated;

-- group_chat_members: vê a própria linha e a dos colegas de grupo
drop policy if exists "Members see group membership" on public.group_chat_members;
create policy "Members see group membership" on public.group_chat_members
  for select
  using (
    user_id = (select auth.uid())
    or public.is_group_chat_member(group_chat_id)
  );

-- group_chats: membros (e o criador, que ainda não é membro ao criar) enxergam o grupo
drop policy if exists "Members can see their groups" on public.group_chats;
create policy "Members can see their groups" on public.group_chats
  for select
  using (
    creator_id = (select auth.uid())
    or public.is_group_chat_member(id)
  );

drop policy if exists "Members can update their groups" on public.group_chats;
create policy "Members can update their groups" on public.group_chats
  for update
  using (public.is_group_chat_member(id))
  with check (public.is_group_chat_member(id));

drop policy if exists "Members can delete their groups" on public.group_chats;
create policy "Members can delete their groups" on public.group_chats
  for delete
  using (public.is_group_chat_member(id));
