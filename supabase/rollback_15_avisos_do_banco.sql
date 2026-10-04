-- Desfaz a migration_15_avisos_do_banco.sql.
-- ⚠️ O app v0.53+ depende destes avisos: sem eles, não lidas de outros canais, reações, fixadas, edição de
--    mensagem e mudanças de membros/cargos só aparecem ao recarregar. Só reverta junto com a volta do app.
--    O bot de música que ouve "music-bot-commands" também deixa de receber os comandos.

drop trigger if exists notify_channel_activity_trigger on public.messages;
drop trigger if exists notify_channel_message_update_trigger on public.messages;
drop trigger if exists notify_message_reaction_trigger on public.message_reactions;
drop trigger if exists notify_pinned_message_trigger on public.pinned_messages;
drop trigger if exists notify_space_members_trigger on public.space_members;
drop trigger if exists notify_space_roles_trigger on public.space_roles;
drop trigger if exists notify_space_member_roles_trigger on public.space_member_roles;
drop trigger if exists notify_spaces_trigger on public.spaces;
drop trigger if exists notify_profile_update_trigger on public.profiles;

drop function if exists public.notify_channel_activity();
drop function if exists public.notify_channel_message_update();
drop function if exists public.notify_message_reaction();
drop function if exists public.notify_pinned_message();
drop function if exists public.notify_space_change();
drop function if exists public.notify_profile_update();
drop function if exists public.user_can_view_channel(uuid, uuid, boolean, text[]);

-- Regras dos canais de volta ao que a migração 13 deixou (sem space-events)
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

  m := regexp_match(v_topic, '^voice-(' || v_uuid || ')$');
  if m is not null then
    return public.can_view_channel(m[1]::uuid);
  end if;

  return false;
end;
$$;
