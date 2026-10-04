-- Migração 15 — avisos do banco no lugar dos ouvintes de tabela (postgres_changes)
--
-- ⚠️ Aplique ANTES de publicar a versão do app que deixa de usar postgres_changes (v0.53). A migração só
--    ACRESCENTA avisos: os apps antigos e o bot de música antigo continuam funcionando como estão, porque as
--    tabelas seguem na publicação do Realtime. Depois que todos atualizarem (app e bot), dá para tirar as
--    tabelas da publicação e desligar "Allow public access" no Realtime — isso NÃO é feito aqui.
--    Para desfazer: rollback_15_avisos_do_banco.sql.
--
-- PROBLEMA:
--   O app ainda ouvia 13 mudanças de tabela pelo postgres_changes, em sete canais públicos. Para cada mudança
--   o Realtime confere, uma a uma, quais inscritos podem ver a linha — é isso que consome ~95% do tempo de
--   banco do projeto. E enquanto esses canais existirem não dá para fechar o acesso público do Realtime.
--
-- CORREÇÃO: o próprio banco publica o aviso (realtime.send) em canais privados, como já faz desde a migração 13.
--   room-messages-<canal>   + "update-message", "reactions-changed", "pins-changed"
--   space-events-<espaço>   (novo, só membros leem, ninguém escreve pelo app)
--                           "channel-activity" (mensagem nova em canal que todo membro vê),
--                           "members-changed", "roles-changed", "member-roles-changed", "space-updated",
--                           "member-profile"
--   user:<id>               + "channel-activity" (canal restrito: só para quem enxerga o canal),
--                           "space-membership", "profile-updated", "friend-profile"
--   music-bot-commands      (novo, só o servidor do bot lê) "command"

-- ---------------------------------------------------------------------------
-- 1. Regras dos canais: a função da migração 13 com os dois tópicos novos
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

  -- Avisos do espaço: só membros leem; quem publica é o banco
  m := regexp_match(v_topic, '^space-events-(' || v_uuid || ')$');
  if m is not null then
    return not p_write and public.is_space_member(m[1]::uuid);
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

  -- "music-bot-commands" e qualquer outro nome: negado para o app (o bot entra com a chave do servidor)
  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Visibilidade de um canal para OUTRO usuário (uso interno dos gatilhos)
--    Mesma regra de can_view_channel_row, que só responde por quem está chamando.
-- ---------------------------------------------------------------------------
create or replace function public.user_can_view_channel(p_user uuid, p_space_id uuid, p_is_private boolean, p_allowed_role_ids text[])
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_perms jsonb := public.space_member_permissions(p_space_id, p_user);
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
          where m.space_id = p_space_id and m.user_id = p_user and m.role_id = r.id
        )
      )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Mensagem nova: aviso para quem NÃO está com o canal aberto (não lidas, menções, notificação)
--    e comando para o bot de música
-- ---------------------------------------------------------------------------
create or replace function public.notify_channel_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel record;
  v_payload jsonb;
  v_everyone_views boolean;
  v_member uuid;
begin
  select c.space_id, c.type, c.is_private, c.allowed_role_ids into v_channel
    from public.channels c where c.id = new.channel_id;
  if not found then
    return new;
  end if;

  -- O bot só toca em canal de voz e só entende mensagens que começam com "!"
  if v_channel.type = 'voice' and left(ltrim(coalesce(new.body, '')), 1) = '!' then
    perform realtime.send(
      jsonb_build_object('id', new.id, 'channel_id', new.channel_id, 'author_id', new.author_id, 'body', new.body),
      'command', 'music-bot-commands', true);
  end if;

  v_payload := jsonb_build_object(
    'id', new.id, 'channel_id', new.channel_id, 'space_id', v_channel.space_id,
    'author_id', new.author_id, 'thread_root_id', new.thread_root_id, 'body', new.body);

  select coalesce((r.permissions ->> 'viewChannels')::boolean or (r.permissions ->> 'administrator')::boolean, false)
    into v_everyone_views
    from public.space_roles r where r.space_id = v_channel.space_id and r.is_everyone;

  if not coalesce(v_channel.is_private, false) and coalesce(v_everyone_views, false) then
    -- Canal que todo membro vê: um aviso só, no canal do espaço
    perform realtime.send(v_payload, 'channel-activity', 'space-events-' || v_channel.space_id::text, true);
  else
    -- Canal restrito: o texto só vai para a caixa de entrada de quem enxerga o canal
    for v_member in
      select sm.user_id from public.space_members sm
       where sm.space_id = v_channel.space_id and sm.user_id <> new.author_id
      union
      select s.creator_id from public.spaces s
       where s.id = v_channel.space_id and s.creator_id <> new.author_id
      limit 500
    loop
      if public.user_can_view_channel(v_member, v_channel.space_id, v_channel.is_private, v_channel.allowed_role_ids) then
        perform public.notify_user(v_member, 'channel-activity', v_payload);
      end if;
    end loop;
  end if;
  return new;
exception when others then
  -- O aviso é um extra: nunca pode impedir a gravação da mensagem
  raise warning 'notify_channel_activity falhou: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notify_channel_activity_trigger on public.messages;
create trigger notify_channel_activity_trigger
  after insert on public.messages
  for each row execute function public.notify_channel_activity();

-- ---------------------------------------------------------------------------
-- 4. Canal aberto: edição de mensagem, reações e fixadas
-- ---------------------------------------------------------------------------
create or replace function public.notify_channel_message_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(to_jsonb(new), 'update-message', 'room-messages-' || new.channel_id::text, true);
  return new;
exception when others then
  raise warning 'notify_channel_message_update falhou: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notify_channel_message_update_trigger on public.messages;
create trigger notify_channel_message_update_trigger
  after update on public.messages
  for each row when (old.* is distinct from new.*)
  execute function public.notify_channel_message_update();

create or replace function public.notify_message_reaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_message uuid := coalesce(new.message_id, old.message_id);
  v_channel uuid;
begin
  -- Reação apagada junto com a mensagem: a mensagem já não existe e o "delete-message" cuida da tela
  select m.channel_id into v_channel from public.messages m where m.id = v_message;
  if v_channel is not null then
    perform realtime.send(jsonb_build_object('message_id', v_message, 'channel_id', v_channel),
      'reactions-changed', 'room-messages-' || v_channel::text, true);
  end if;
  return coalesce(new, old);
exception when others then
  raise warning 'notify_message_reaction falhou: %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop trigger if exists notify_message_reaction_trigger on public.message_reactions;
create trigger notify_message_reaction_trigger
  after insert or update or delete on public.message_reactions
  for each row execute function public.notify_message_reaction();

create or replace function public.notify_pinned_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_channel uuid := coalesce(new.channel_id, old.channel_id);
begin
  perform realtime.send(jsonb_build_object('channel_id', v_channel),
    'pins-changed', 'room-messages-' || v_channel::text, true);
  return coalesce(new, old);
exception when others then
  raise warning 'notify_pinned_message falhou: %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop trigger if exists notify_pinned_message_trigger on public.pinned_messages;
create trigger notify_pinned_message_trigger
  after insert or update or delete on public.pinned_messages
  for each row execute function public.notify_pinned_message();

-- ---------------------------------------------------------------------------
-- 5. Espaço: membros, cargos e dados do espaço
--    Os avisos não levam os dados: o app recarrega pela API, onde valem as regras de leitura de cada tabela.
-- ---------------------------------------------------------------------------
create or replace function public.notify_space_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_space uuid;
  v_event text;
begin
  if tg_table_name = 'spaces' then
    v_space := (v_row ->> 'id')::uuid;
    v_event := 'space-updated';
    -- Espaço apagado: o dono pode não estar em space_members, então é avisado direto
    if tg_op = 'DELETE' then
      perform public.notify_user((v_row ->> 'creator_id')::uuid, 'space-membership',
        jsonb_build_object('space_id', v_space, 'op', 'DELETE'));
      return old;
    end if;
  else
    v_space := (v_row ->> 'space_id')::uuid;
    v_event := case tg_table_name
      when 'space_members' then 'members-changed'
      when 'space_roles' then 'roles-changed'
      else 'member-roles-changed'
    end;
    -- Quem entrou, saiu ou foi removido precisa recarregar a própria lista de espaços
    if tg_table_name = 'space_members' then
      perform public.notify_user((v_row ->> 'user_id')::uuid, 'space-membership',
        jsonb_build_object('space_id', v_space, 'op', tg_op));
    end if;
  end if;

  perform realtime.send(jsonb_build_object('space_id', v_space, 'op', tg_op),
    v_event, 'space-events-' || v_space::text, true);
  return coalesce(new, old);
exception when others then
  raise warning 'notify_space_change falhou: %', sqlerrm;
  return coalesce(new, old);
end;
$$;

drop trigger if exists notify_space_members_trigger on public.space_members;
create trigger notify_space_members_trigger
  after insert or update or delete on public.space_members
  for each row execute function public.notify_space_change();

drop trigger if exists notify_space_roles_trigger on public.space_roles;
create trigger notify_space_roles_trigger
  after insert or update or delete on public.space_roles
  for each row execute function public.notify_space_change();

drop trigger if exists notify_space_member_roles_trigger on public.space_member_roles;
create trigger notify_space_member_roles_trigger
  after insert or update or delete on public.space_member_roles
  for each row execute function public.notify_space_change();

drop trigger if exists notify_spaces_trigger on public.spaces;
create trigger notify_spaces_trigger
  after update or delete on public.spaces
  for each row execute function public.notify_space_change();

-- ---------------------------------------------------------------------------
-- 6. Perfil: o próprio usuário, os espaços de que participa e os amigos
-- ---------------------------------------------------------------------------
create or replace function public.notify_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_public jsonb;
  v_target uuid;
begin
  v_public := jsonb_build_object(
    'id', new.id, 'display_name', new.display_name, 'avatar_url', new.avatar_url,
    'avatar_decoration', new.avatar_decoration, 'profile_effect', new.profile_effect);

  -- Só o dono recebe o estado da assinatura
  perform public.notify_user(new.id, 'profile-updated',
    v_public || jsonb_build_object('is_premium', new.is_premium, 'premium_until', new.premium_until));

  -- Mudança só da assinatura não interessa a mais ninguém
  if (new.display_name, new.avatar_url, new.avatar_decoration, new.profile_effect, new.banner_url,
      new.banner_preset, new.bio, new.pronouns, new.custom_status)
     is not distinct from
     (old.display_name, old.avatar_url, old.avatar_decoration, old.profile_effect, old.banner_url,
      old.banner_preset, old.bio, old.pronouns, old.custom_status) then
    return new;
  end if;

  for v_target in
    select sm.space_id from public.space_members sm where sm.user_id = new.id limit 200
  loop
    perform realtime.send(v_public, 'member-profile', 'space-events-' || v_target::text, true);
  end loop;

  for v_target in
    select case when f.user_id = new.id then f.friend_id else f.user_id end
      from public.friendships f
     where (f.user_id = new.id or f.friend_id = new.id) and f.status = 'accepted'
     limit 500
  loop
    perform public.notify_user(v_target, 'friend-profile', jsonb_build_object('id', new.id));
  end loop;
  return new;
exception when others then
  raise warning 'notify_profile_update falhou: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists notify_profile_update_trigger on public.profiles;
create trigger notify_profile_update_trigger
  after update on public.profiles
  for each row when (old.* is distinct from new.*)
  execute function public.notify_profile_update();

-- ---------------------------------------------------------------------------
-- 7. Permissões: nada disto é chamado pelo app
-- ---------------------------------------------------------------------------
revoke all on function public.realtime_topic_allowed(text, boolean) from public, anon;
grant execute on function public.realtime_topic_allowed(text, boolean) to authenticated;
revoke all on function public.user_can_view_channel(uuid, uuid, boolean, text[]) from public, anon, authenticated;
revoke all on function public.notify_channel_activity() from public, anon, authenticated;
revoke all on function public.notify_channel_message_update() from public, anon, authenticated;
revoke all on function public.notify_message_reaction() from public, anon, authenticated;
revoke all on function public.notify_pinned_message() from public, anon, authenticated;
revoke all on function public.notify_space_change() from public, anon, authenticated;
revoke all on function public.notify_profile_update() from public, anon, authenticated;
