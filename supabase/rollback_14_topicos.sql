-- Desfaz a migration_14_topicos.sql.
-- As respostas de tópico já gravadas NÃO são apagadas: elas perdem o vínculo e passam a aparecer como
-- mensagens comuns do canal (a coluna thread_root_id é removida).

drop trigger if exists validate_message_thread_trigger on public.messages;
drop function if exists public.validate_message_thread();
drop function if exists public.get_thread_summaries(uuid);

-- Aviso em tempo real de volta ao que a migração 13 deixou (sem tópicos)
create or replace function public.notify_channel_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile jsonb;
begin
  if tg_op = 'INSERT' then
    select jsonb_build_object('display_name', p.display_name, 'avatar_url', p.avatar_url,
                              'avatar_decoration', p.avatar_decoration, 'profile_effect', p.profile_effect)
      into v_profile from public.profiles p where p.id = new.author_id;
    perform realtime.send(
      to_jsonb(new) || jsonb_build_object('profile', coalesce(v_profile, '{}'::jsonb)),
      'new-message', 'room-messages-' || new.channel_id::text, true);
    return new;
  end if;
  perform realtime.send(jsonb_build_object('id', old.id, 'channel_id', old.channel_id),
    'delete-message', 'room-messages-' || old.channel_id::text, true);
  return old;
exception when others then
  raise warning 'notify_channel_message falhou: %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop index if exists public.idx_messages_thread_root;
alter table public.messages drop column if exists thread_root_id;
