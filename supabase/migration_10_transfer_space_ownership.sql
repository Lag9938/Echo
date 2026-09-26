-- MigraÃ§Ã£o 10: transferÃªncia de posse do espaÃ§o que funciona (funÃ§Ã£o transfer_space_ownership).
--
-- Problema: o app transferia a posse em 3 passos soltos (spaces.creator_id, e o cargo de cada um em space_members):
--  * a policy "owners update spaces" exige creator_id = auth.uid() tambÃ©m na linha NOVA, entÃ£o o dono nunca
--    conseguia trocar o creator_id para outra pessoa (erro de RLS);
--  * space_members nÃ£o tem policy de UPDATE: as mudanÃ§as de cargo eram descartadas em silÃªncio (0 linhas, sem erro).
--
-- SoluÃ§Ã£o: uma funÃ§Ã£o SECURITY DEFINER que confere quem chama e faz tudo de uma vez (atÃ´mico).
-- NÃ£o abre nenhuma policy nova: space_members continua sem UPDATE direto para os usuÃ¡rios.
--
-- ReversÃ£o: rollback_10_transfer_space_ownership.sql

create or replace function public.transfer_space_ownership(p_space_id uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.is_space_creator(p_space_id) then
    raise exception 'SÃ³ o dono do espaÃ§o pode transferir a posse.' using errcode = '42501';
  end if;

  if p_new_owner is null or p_new_owner = v_uid then
    raise exception 'Escolha outro membro para receber a posse.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.space_members
    where space_id = p_space_id and user_id = p_new_owner
  ) then
    raise exception 'A pessoa escolhida nÃ£o Ã© membro deste espaÃ§o.' using errcode = '22023';
  end if;

  update public.space_members set role = 'owner'
    where space_id = p_space_id and user_id = p_new_owner;
  update public.space_members set role = 'member'
    where space_id = p_space_id and user_id = v_uid;
  update public.spaces set creator_id = p_new_owner
    where id = p_space_id;
end;
$$;

revoke all on function public.transfer_space_ownership(uuid, uuid) from public, anon, authenticated;
grant execute on function public.transfer_space_ownership(uuid, uuid) to authenticated;
