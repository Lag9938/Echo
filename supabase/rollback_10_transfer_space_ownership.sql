-- Reversão da migração 10: remove a função de transferência de posse.
drop function if exists public.transfer_space_ownership(uuid, uuid);
