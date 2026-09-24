-- Migração 07: Protege colunas de assinatura contra edição direta pelo cliente
-- Problema: a policy "users update their own profile" permite que o usuário
-- autenticado atualize QUALQUER coluna do seu próprio perfil, incluindo
-- is_premium / premium_until / asaas_customer_id / asaas_subscription_id
-- (adicionadas na migração 04). Isso permite que qualquer usuário se
-- autoconceda "Echo Pro" chamando o client Supabase diretamente, sem pagar.
--
-- RLS no Postgres não restringe colunas individualmente dentro de uma mesma
-- policy de UPDATE, então usamos um trigger BEFORE UPDATE que bloqueia
-- qualquer alteração nessas colunas feita fora do service_role (a service
-- role key, usada pelas Edge Functions no servidor, ignora RLS e continua
-- funcionando normalmente).

create or replace function public.protect_subscription_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    if new.is_premium is distinct from old.is_premium
       or new.premium_until is distinct from old.premium_until
       or new.asaas_customer_id is distinct from old.asaas_customer_id
       or new.asaas_subscription_id is distinct from old.asaas_subscription_id then
      raise exception 'Não é permitido alterar campos de assinatura diretamente.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_subscription_fields_trigger on public.profiles;

create trigger protect_subscription_fields_trigger
before update on public.profiles
for each row
execute function public.protect_subscription_fields();
