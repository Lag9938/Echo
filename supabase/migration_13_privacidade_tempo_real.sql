-- Migração 13 — privacidade do tempo real, avisos autênticos, cobrança e anexos
--
-- ⚠️ Sai junto com a versão do app que usa canais privados (v0.51.0). Versões antigas continuam usando os
--    canais públicos até atualizarem; depois que todos atualizarem, desligue "Allow public access" nas
--    configurações do Realtime para fechar de vez o caminho antigo.
--
-- PROBLEMAS (auditoria de 01/10/2026):
--  1. Nenhum canal do Realtime era privado e realtime.messages não tinha nenhuma regra. O texto das DMs, as
--     mensagens de grupo (com anexo) e os convites de chamada passavam pelo canal global "echo-social-events":
--     qualquer pessoa com a chave pública (que vai dentro do app) lia tudo e podia forjar avisos em nome de
--     qualquer um. Todo usuário conectado ainda recebia as mensagens de TODOS os grupos.
--  2. As mensagens dos canais de texto (inclusive privados) também iam por broadcast público.
--  3. profiles (legível por qualquer usuário logado) expunha os IDs de cliente/assinatura do Asaas.
--  4. Bucket de anexos sem limite de tamanho/tipo; qualquer usuário logado subia arquivo em qualquer pasta e
--     LISTAVA o bucket inteiro (inclusive dm/ dos outros).
--
-- CORREÇÃO:
--  1. Canais de broadcast/presença passam a ser privados, com regras em realtime.messages:
--       user:<id>                   caixa de entrada pessoal — só o dono ouve, ninguém escreve pelo app
--       global-presence             presença geral — só quem está logado
--       space-voice-<id> / space-presence-<id>   só membros do espaço
--       room-messages-<canal>       só quem vê o canal; "digitando" só de quem pode escrever nele
--       voice-dm-call-<a>-<b>       só os dois participantes da chamada direta
--       voice-<canal>               só quem vê o canal de voz
--     Os avisos de DM, grupo e amizade passam a ser publicados pelo PRÓPRIO banco (gatilhos que chamam
--     realtime.send) quando a linha é gravada — não dá mais para falsificar remetente nem conteúdo.
--     Chamadas e "digitando" (que não têm tabela) passam por funções que conferem a amizade/participação.
--  2. O app deixa de mandar a mensagem por broadcast: o banco publica "new-message"/"delete-message" no canal privado.
--     Também passa a existir a regra de DELETE das DMs (o remetente apaga as próprias; antes nada era apagado).
--  3. Os IDs do Asaas vão para billing_accounts (só o dono lê; só o servidor escreve).
--  4. Bucket com limite de 25 MB e tipos permitidos; cada um só envia para a própria pasta / para canais
--     onde pode anexar / para espaços que gerencia; ninguém lista o bucket (só os próprios arquivos).
--
-- Reversão: rollback_13_privacidade_tempo_real.sql

-- ---------------------------------------------------------------------------
-- 1. Regras de acesso dos canais do Realtime
-- ---------------------------------------------------------------------------
create or replace function public.realtime_topic_allowed(p_topic text, p_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_topic text := lower(coalesce(p_topic, ''));
  v_uuid constant text := '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
  m text[];
begin
  if v_uid is null or v_topic = '' then
    return false;
  end if;

  -- Caixa de entrada pessoal: só o dono ouve. Ninguém publica nela pelo app (os avisos vêm do banco).
  if v_topic = 'user:' || v_uid::text then
    return not p_write;
  end if;

  if v_topic = 'global-presence' then
    return true;
  end if;

  m := regexp_match(v_topic, '^space-(voice|presence)-(' || v_uuid || ')$');
  if m is not null then
    return public.is_space_member(m[2]::uuid);
  end if;

  m := regexp_match(v_topic, '^room-messages-(' || v_uuid || ')$');
  if m is not null then
    if p_write then
      return public.can_send_message(m[1]::uuid, false);
    end if;
    return public.can_view_channel(m[1]::uuid);
  end if;

  m := regexp_match(v_topic, '^voice-dm-call-(' || v_uuid || ')-(' || v_uuid || ')$');
  if m is not null then
    return v_uid::text in (m[1], m[2]);
  end if;

  -- Presença de voz quando o app não sabe o espaço (useVoiceChannel: voice-<canal>)
  m := regexp_match(v_topic, '^voice-(' || v_uuid || ')$');
  if m is not null then
    return public.can_view_channel(m[1]::uuid);
  end if;

  return false;
end;
$$;

drop policy if exists "echo: ler canais permitidos" on realtime.messages;
create policy "echo: ler canais permitidos" on realtime.messages
  for select to authenticated
  using (public.realtime_topic_allowed((select realtime.topic()), false));

drop policy if exists "echo: publicar em canais permitidos" on realtime.messages;
create policy "echo: publicar em canais permitidos" on realtime.messages
  for insert to authenticated
  with check (
    extension in ('broadcast', 'presence')
    and public.realtime_topic_allowed((select realtime.topic()), true)
  );

-- ---------------------------------------------------------------------------
-- 2. Avisos publicados pelo banco na caixa de entrada de cada usuário
-- ---------------------------------------------------------------------------
create or replace function public.notify_user(p_user uuid, p_event text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then
    return;
  end if;
  perform realtime.send(p_payload, p_event, 'user:' || p_user::text, true);
exception when others then
  -- O aviso em tempo real é um extra: nunca pode impedir a gravação da mensagem
  raise warning 'notify_user falhou: %', sqlerrm;
end;
$$;

create or replace function public.profile_display_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(display_name), ''), 'Alguém') from public.profiles where id = p_user
$$;

create or replace function public.notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    -- Quem bloqueou o remetente não recebe o aviso
    if exists (select 1 from public.blocked_users where blocker_id = new.receiver_id and blocked_id = new.sender_id) then
      return new;
    end if;
    perform public.notify_user(new.receiver_id, 'dm-event', jsonb_build_object(
      'messageId', new.id,
      'receiverId', new.receiver_id,
      'senderId', new.sender_id,
      'senderName', coalesce(public.profile_display_name(new.sender_id), 'Alguém'),
      'body', left(case when new.attachment_url is not null then '📎 [Anexo] ' || coalesce(new.body, '') else coalesce(new.body, '') end, 500)
    ));
    return new;
  end if;
  perform public.notify_user(old.receiver_id, 'dm-delete', jsonb_build_object(
    'id', old.id, 'receiverId', old.receiver_id, 'senderId', old.sender_id
  ));
  return old;
end;
$$;

drop trigger if exists notify_direct_message_trigger on public.direct_messages;
create trigger notify_direct_message_trigger
  after insert or delete on public.direct_messages
  for each row execute function public.notify_direct_message();

create or replace function public.notify_group_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member uuid;
  v_payload jsonb;
begin
  v_payload := jsonb_build_object(
    'groupId', new.group_chat_id,
    'messageId', new.id,
    'senderId', new.sender_id,
    'senderName', coalesce(public.profile_display_name(new.sender_id), 'Alguém'),
    'body', left(coalesce(new.body, ''), 2000),
    'attachmentUrl', new.attachment_url,
    'attachmentType', new.attachment_type,
    'created_at', new.created_at
  );
  -- Só os membros do grupo recebem (antes: todo usuário conectado recebia todos os grupos)
  for v_member in
    select user_id from public.group_chat_members where group_chat_id = new.group_chat_id and user_id <> new.sender_id
  loop
    perform public.notify_user(v_member, 'group-message', v_payload);
  end loop;
  return new;
end;
$$;

drop trigger if exists notify_group_message_trigger on public.group_messages;
create trigger notify_group_message_trigger
  after insert on public.group_messages
  for each row execute function public.notify_group_message();

create or replace function public.notify_friendship()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.notify_user(new.friend_id, 'friend-event', jsonb_build_object(
        'type', 'friend-request-sent', 'targetUserId', new.friend_id, 'senderId', new.user_id,
        'senderName', public.profile_display_name(new.user_id)
      ));
    end if;
    return new;
  elsif tg_op = 'UPDATE' then
    if new.status = 'accepted' and old.status is distinct from 'accepted' then
      perform public.notify_user(new.user_id, 'friend-event', jsonb_build_object(
        'type', 'friend-request-accepted', 'targetUserId', new.user_id, 'senderId', new.friend_id,
        'senderName', public.profile_display_name(new.friend_id)
      ));
    end if;
    return new;
  end if;
  -- DELETE: avisa o outro lado (ou os dois, se foi uma remoção administrativa)
  if v_actor is distinct from old.user_id then
    perform public.notify_user(old.user_id, 'friend-event', jsonb_build_object(
      'type', 'friend-removed', 'targetUserId', old.user_id, 'senderId', old.friend_id));
  end if;
  if v_actor is distinct from old.friend_id then
    perform public.notify_user(old.friend_id, 'friend-event', jsonb_build_object(
      'type', 'friend-removed', 'targetUserId', old.friend_id, 'senderId', old.user_id));
  end if;
  return old;
end;
$$;

drop trigger if exists notify_friendship_trigger on public.friendships;
create trigger notify_friendship_trigger
  after insert or update or delete on public.friendships
  for each row execute function public.notify_friendship();

-- Mensagens dos canais de texto: publicadas no canal privado room-messages-<canal>, só para quem vê o canal.
-- Mesmo formato que o app já usa (linha da mensagem + profile). Antes, o próprio app mandava a mensagem por
-- broadcast público (dava para ler canais privados e forjar mensagens de outra pessoa).
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

drop trigger if exists notify_channel_message_trigger on public.messages;
create trigger notify_channel_message_trigger
  after insert or delete on public.messages
  for each row execute function public.notify_channel_message();

-- Remetente apaga a própria DM (não existia regra de DELETE: o app tirava da tela, mas nada era apagado)
drop policy if exists "Users delete their sent direct messages" on public.direct_messages;
create policy "Users delete their sent direct messages" on public.direct_messages
  for delete to authenticated using (sender_id = (select auth.uid()));

-- Amizade aceita nos dois sentidos e sem bloqueio de nenhum dos lados
create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_a is not null and p_b is not null and p_a <> p_b
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.user_id = p_a and f.friend_id = p_b) or (f.user_id = p_b and f.friend_id = p_a))
    )
    and not exists (
      select 1 from public.blocked_users b
      where (b.blocker_id = p_a and b.blocked_id = p_b) or (b.blocker_id = p_b and b.blocked_id = p_a)
    )
$$;

-- ---------------------------------------------------------------------------
-- 3. Chamadas diretas e "digitando": o servidor monta o aviso com o remetente verdadeiro
-- ---------------------------------------------------------------------------
create or replace function public.send_call_event(p_type text, p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not public.are_friends(v_uid, p_target) then
    raise exception 'not_friends' using errcode = '42501';
  end if;
  -- Mesma sala que o app monta: dm-call-<menor id>-<maior id> (ordem de texto)
  v_room := 'dm-call-' || least(v_uid::text, p_target::text) || '-' || greatest(v_uid::text, p_target::text);

  if p_type = 'call-invite' then
    perform public.notify_user(p_target, 'call-event', jsonb_build_object(
      'type', p_type, 'callerId', v_uid, 'callerName', public.profile_display_name(v_uid),
      'callerAvatar', (select avatar_url from public.profiles where id = v_uid),
      'targetUserId', p_target, 'roomId', v_room));
  elsif p_type in ('call-accepted', 'call-rejected') then
    -- p_target é quem ligou
    perform public.notify_user(p_target, 'call-event', jsonb_build_object(
      'type', p_type, 'callerId', p_target, 'targetUserId', v_uid));
  elsif p_type = 'call-ended' then
    perform public.notify_user(p_target, 'call-event', jsonb_build_object(
      'type', p_type, 'targetUserId', p_target, 'senderId', v_uid));
  else
    raise exception 'invalid_call_event' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.send_typing(p_kind text, p_target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_member uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_kind = 'dm' then
    if p_target = v_uid then
      return;
    end if;
    if exists (select 1 from public.blocked_users where blocker_id = p_target and blocked_id = v_uid) then
      return;
    end if;
    -- Só para quem é amigo ou já conversa com você por DM
    if not public.are_friends(v_uid, p_target) and not exists (
      select 1 from public.direct_messages d
      where (d.sender_id = v_uid and d.receiver_id = p_target) or (d.sender_id = p_target and d.receiver_id = v_uid)
    ) then
      return;
    end if;
    perform public.notify_user(p_target, 'dm-typing', jsonb_build_object('senderId', v_uid, 'receiverId', p_target));
  elsif p_kind = 'group' then
    if not exists (select 1 from public.group_chat_members where group_chat_id = p_target and user_id = v_uid) then
      return;
    end if;
    for v_member in
      select user_id from public.group_chat_members where group_chat_id = p_target and user_id <> v_uid
    loop
      perform public.notify_user(v_member, 'group-typing', jsonb_build_object(
        'groupId', p_target, 'senderId', v_uid, 'senderName', public.profile_display_name(v_uid)));
    end loop;
  else
    raise exception 'invalid_typing_kind' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. IDs do Asaas fora de profiles
-- ---------------------------------------------------------------------------
create table if not exists public.billing_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  asaas_customer_id text,
  asaas_subscription_id text,
  updated_at timestamptz not null default now()
);
alter table public.billing_accounts enable row level security;
-- Explícito em vez de depender dos privilégios padrão do Supabase: o app só lê (a própria linha, pela RLS)
revoke all on public.billing_accounts from anon, authenticated;
grant select on public.billing_accounts to authenticated;

drop policy if exists "billing: dono lê a própria conta" on public.billing_accounts;
create policy "billing: dono lê a própria conta" on public.billing_accounts
  for select to authenticated using (user_id = (select auth.uid()));
-- Sem políticas de escrita: só a service role (Edge Function asaas-payment) grava

insert into public.billing_accounts (user_id, asaas_customer_id, asaas_subscription_id)
select id, asaas_customer_id, asaas_subscription_id from public.profiles
where asaas_customer_id is not null or asaas_subscription_id is not null
on conflict (user_id) do update
  set asaas_customer_id = coalesce(excluded.asaas_customer_id, public.billing_accounts.asaas_customer_id),
      asaas_subscription_id = coalesce(excluded.asaas_subscription_id, public.billing_accounts.asaas_subscription_id),
      updated_at = now();

-- As colunas ficam (versões antigas do app ainda as pedem no select), mas vazias
update public.profiles set asaas_customer_id = null, asaas_subscription_id = null
where asaas_customer_id is not null or asaas_subscription_id is not null;

-- ---------------------------------------------------------------------------
-- 5. Anexos: limites e quem envia o quê
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 25 * 1024 * 1024,
    allowed_mime_types = array[
      'image/*', 'audio/*', 'video/*',
      'application/pdf', 'text/plain', 'text/csv', 'application/json',
      'application/zip', 'application/x-zip-compressed', 'application/x-7z-compressed', 'application/vnd.rar',
      'application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ]
where id = 'attachments';

create or replace function public.can_upload_attachment(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_parts text[] := string_to_array(coalesce(p_name, ''), '/');
  v_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  if v_uid is null or array_length(v_parts, 1) is null or array_length(v_parts, 1) < 2 then
    return false;
  end if;
  if p_name like '%..%' then
    return false;
  end if;

  -- Pastas pessoais: dm/<eu>/..., avatars/<eu>/..., banners/<eu>/...
  if v_parts[1] in ('dm', 'avatars', 'banners') then
    return array_length(v_parts, 1) >= 3 and v_parts[2] = v_uid::text;
  end if;

  -- Figurinhas: stickers/<eu>_<...>
  if v_parts[1] = 'stickers' then
    return array_length(v_parts, 1) = 2 and v_parts[2] like v_uid::text || '\_%';
  end if;

  -- Anexos e áudios de canal: só onde a pessoa pode anexar
  if v_parts[1] in ('channels', 'voice-notes') then
    return array_length(v_parts, 1) >= 3 and v_parts[2] ~ v_uuid and public.can_send_message(v_parts[2]::uuid, true);
  end if;

  -- Ícone, banner e emojis do espaço: só quem gerencia
  if v_parts[1] = 'spaces' then
    if array_length(v_parts, 1) < 3 or v_parts[2] !~ v_uuid then
      return false;
    end if;
    if v_parts[3] = 'emojis' then
      return public.has_space_permission(v_parts[2]::uuid, 'manageEmojis')
          or public.has_space_permission(v_parts[2]::uuid, 'manageSpace');
    end if;
    return public.has_space_permission(v_parts[2]::uuid, 'manageSpace');
  end if;

  return false;
end;
$$;

drop policy if exists "Permitir leitura pública de anexos" on storage.objects;
drop policy if exists "Permitir upload para usuários autenticados" on storage.objects;
drop policy if exists "anexos: enviar só no lugar permitido" on storage.objects;
drop policy if exists "anexos: ver só os próprios arquivos" on storage.objects;
drop policy if exists "anexos: substituir só os próprios arquivos" on storage.objects;

-- O bucket é público: os links continuam abrindo sem esta regra. Ela só controla a API (listar/baixar
-- pelo cliente), e listar o bucket inteiro deixa de ser possível.
create policy "anexos: ver só os próprios arquivos" on storage.objects
  for select to authenticated
  using (bucket_id = 'attachments' and owner_id = (select auth.uid())::text);

create policy "anexos: enviar só no lugar permitido" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'attachments' and public.can_upload_attachment(name));

-- upsert (figurinhas, banner) precisa de UPDATE nos próprios arquivos
create policy "anexos: substituir só os próprios arquivos" on storage.objects
  for update to authenticated
  using (bucket_id = 'attachments' and owner_id = (select auth.uid())::text)
  with check (bucket_id = 'attachments' and owner_id = (select auth.uid())::text and public.can_upload_attachment(name));

-- ---------------------------------------------------------------------------
-- 6. Permissões das funções
-- ---------------------------------------------------------------------------
revoke all on function public.realtime_topic_allowed(text, boolean) from public, anon;
revoke all on function public.notify_user(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.profile_display_name(uuid) from public, anon, authenticated;
revoke all on function public.notify_direct_message() from public, anon, authenticated;
revoke all on function public.notify_group_message() from public, anon, authenticated;
revoke all on function public.notify_friendship() from public, anon, authenticated;
revoke all on function public.notify_channel_message() from public, anon, authenticated;
revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;
revoke all on function public.send_call_event(text, uuid) from public, anon;
revoke all on function public.send_typing(text, uuid) from public, anon;
revoke all on function public.can_upload_attachment(text) from public, anon;

grant execute on function public.realtime_topic_allowed(text, boolean) to authenticated;
grant execute on function public.send_call_event(text, uuid) to authenticated;
grant execute on function public.send_typing(text, uuid) to authenticated;
grant execute on function public.can_upload_attachment(text) to authenticated;
