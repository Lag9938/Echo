-- ⚠️ Aplique junto com a versão do app que traz as respostas em tópico (v0.52). A migração é compatível com
--    os apps antigos: eles ignoram a coluna nova e continuam funcionando. A única diferença para quem não
--    atualizou é que, ao recarregar um canal, as respostas de tópico aparecem como mensagens comuns.
--    Para desfazer: rollback_14_topicos.sql (as respostas de tópico já gravadas viram mensagens comuns).
--
-- Respostas em tópico: uma conversa paralela presa a uma mensagem do canal, para não poluir o chat principal.
--   • Uma resposta de tópico é uma linha de `messages` com `thread_root_id` apontando para a mensagem-raiz.
--   • Só existe um nível: a raiz é sempre uma mensagem comum do MESMO canal (o banco confere).
--   • Valem as regras que já existem em `messages`: quem vê o canal lê o tópico, quem pode escrever no canal
--     responde, o autor (ou moderador) apaga. Apagar a raiz apaga o tópico inteiro.
--   • O aviso em tempo real sai do banco, pelo mesmo canal privado da migração 13: quem está com o canal
--     aberto recebe "thread-message"; quem participa do tópico recebe um aviso na própria caixa de entrada.

-- ---------------------------------------------------------------------------
-- 1. Coluna e índice
-- ---------------------------------------------------------------------------
alter table public.messages
  add column if not exists thread_root_id uuid references public.messages(id) on delete cascade;

create index if not exists idx_messages_thread_root
  on public.messages (thread_root_id, created_at)
  where thread_root_id is not null;

-- ---------------------------------------------------------------------------
-- 2. O banco confere a raiz: mesmo canal, mensagem comum, e o vínculo não muda depois
-- ---------------------------------------------------------------------------
create or replace function public.validate_message_thread()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_root record;
begin
  if tg_op = 'UPDATE' then
    if new.thread_root_id is distinct from old.thread_root_id then
      raise exception 'thread_root_immutable' using errcode = '42501';
    end if;
    -- Uma mensagem que tem tópico (ou que é resposta de um) não muda de canal
    if new.channel_id is distinct from old.channel_id
       and (old.thread_root_id is not null or exists (select 1 from public.messages r where r.thread_root_id = old.id)) then
      raise exception 'thread_channel_immutable' using errcode = '42501';
    end if;
    return new;
  end if;

  if new.thread_root_id is null then
    return new;
  end if;

  select m.id, m.channel_id, m.thread_root_id into v_root
    from public.messages m where m.id = new.thread_root_id;

  if v_root.id is null then
    raise exception 'thread_root_not_found' using errcode = '23503';
  end if;
  if v_root.channel_id <> new.channel_id then
    raise exception 'thread_root_other_channel' using errcode = '42501';
  end if;
  if v_root.thread_root_id is not null then
    raise exception 'thread_root_is_reply' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_message_thread_trigger on public.messages;
create trigger validate_message_thread_trigger
  before insert or update on public.messages
  for each row execute function public.validate_message_thread();

-- ---------------------------------------------------------------------------
-- 3. Resumo dos tópicos de um canal (quantas respostas, a última e quem participa)
--    Roda com as permissões de quem chama: a regra de leitura de `messages` já garante que só quem vê o
--    canal recebe alguma linha.
-- ---------------------------------------------------------------------------
create or replace function public.get_thread_summaries(p_channel_id uuid)
returns table (root_id uuid, reply_count integer, last_reply_at timestamptz, participant_ids uuid[])
language sql
stable
security invoker
set search_path = ''
as $$
  select m.thread_root_id,
         count(*)::integer,
         max(m.created_at),
         array_agg(distinct m.author_id)
    from public.messages m
   where m.channel_id = p_channel_id
     and m.thread_root_id is not null
   group by m.thread_root_id
$$;

revoke all on function public.get_thread_summaries(uuid) from public, anon;
grant execute on function public.get_thread_summaries(uuid) to authenticated;
revoke all on function public.validate_message_thread() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Avisos em tempo real: a função da migração 13, agora sabendo o que é resposta de tópico
-- ---------------------------------------------------------------------------
create or replace function public.notify_channel_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile jsonb;
  v_root_author uuid;
  v_count integer;
  v_last timestamptz;
  v_participants uuid[];
  v_target uuid;
begin
  if tg_op = 'INSERT' then
    select jsonb_build_object('display_name', p.display_name, 'avatar_url', p.avatar_url,
                              'avatar_decoration', p.avatar_decoration, 'profile_effect', p.profile_effect)
      into v_profile from public.profiles p where p.id = new.author_id;

    if new.thread_root_id is null then
      perform realtime.send(
        to_jsonb(new) || jsonb_build_object('profile', coalesce(v_profile, '{}'::jsonb)),
        'new-message', 'room-messages-' || new.channel_id::text, true);
      return new;
    end if;

    -- Resposta de tópico: evento próprio (não entra no chat principal de quem está com o canal aberto)
    select r.author_id into v_root_author from public.messages r where r.id = new.thread_root_id;
    select count(*)::integer, max(m.created_at), array_agg(distinct m.author_id)
      into v_count, v_last, v_participants
      from public.messages m where m.thread_root_id = new.thread_root_id;
    if v_root_author is not null and not (v_root_author = any (v_participants)) then
      v_participants := v_participants || v_root_author;
    end if;

    perform realtime.send(
      to_jsonb(new) || jsonb_build_object(
        'profile', coalesce(v_profile, '{}'::jsonb),
        'thread', jsonb_build_object('root_id', new.thread_root_id, 'reply_count', v_count,
                                     'last_reply_at', v_last, 'participant_ids', to_jsonb(v_participants))),
      'thread-message', 'room-messages-' || new.channel_id::text, true);

    -- Quem participa do tópico (autor da raiz e quem já respondeu) é avisado na própria caixa de entrada,
    -- mesmo com outro canal aberto. O aviso NÃO leva o texto: quem perdeu acesso ao canal não lê nada por ele.
    foreach v_target in array (v_participants)[1:50] loop
      if v_target <> new.author_id then
        perform public.notify_user(v_target, 'thread-reply', jsonb_build_object(
          'channelId', new.channel_id, 'rootId', new.thread_root_id, 'messageId', new.id,
          'senderId', new.author_id, 'senderName', coalesce(v_profile->>'display_name', 'Alguém')));
      end if;
    end loop;
    return new;
  end if;

  perform realtime.send(
    jsonb_build_object('id', old.id, 'channel_id', old.channel_id, 'thread_root_id', old.thread_root_id),
    'delete-message', 'room-messages-' || old.channel_id::text, true);
  return old;
exception when others then
  raise warning 'notify_channel_message falhou: %', sqlerrm;
  return coalesce(new, old);
end;
$$;
