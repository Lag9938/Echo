-- Reversão da migração 13. Volta ao comportamento anterior (canais sem regras, avisos feitos pelo app,
-- IDs do Asaas em profiles, bucket sem limites). Use só se a migração 13 quebrar algo em produção:
-- o estado anterior tem as falhas de privacidade descritas no cabeçalho da migração 13.

drop policy if exists "echo: ler canais permitidos" on realtime.messages;
drop policy if exists "echo: publicar em canais permitidos" on realtime.messages;

drop trigger if exists notify_direct_message_trigger on public.direct_messages;
drop trigger if exists notify_group_message_trigger on public.group_messages;
drop trigger if exists notify_friendship_trigger on public.friendships;

drop function if exists public.send_call_event(text, uuid);
drop function if exists public.send_typing(text, uuid);
drop function if exists public.notify_direct_message();
drop function if exists public.notify_group_message();
drop function if exists public.notify_friendship();
drop function if exists public.notify_user(uuid, text, jsonb);
drop function if exists public.are_friends(uuid, uuid);
drop function if exists public.profile_display_name(uuid);
drop function if exists public.realtime_topic_allowed(text, boolean);

-- IDs do Asaas de volta para profiles
update public.profiles p
set asaas_customer_id = b.asaas_customer_id, asaas_subscription_id = b.asaas_subscription_id
from public.billing_accounts b
where b.user_id = p.id;
drop table if exists public.billing_accounts;

-- Anexos: regras e bucket como antes
drop policy if exists "anexos: ver só os próprios arquivos" on storage.objects;
drop policy if exists "anexos: enviar só no lugar permitido" on storage.objects;
drop policy if exists "anexos: substituir só os próprios arquivos" on storage.objects;
drop function if exists public.can_upload_attachment(text);

drop policy if exists "Permitir leitura pública de anexos" on storage.objects;
create policy "Permitir leitura pública de anexos" on storage.objects
  for select to authenticated using (bucket_id = 'attachments');
drop policy if exists "Permitir upload para usuários autenticados" on storage.objects;
create policy "Permitir upload para usuários autenticados" on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');

update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'attachments';
