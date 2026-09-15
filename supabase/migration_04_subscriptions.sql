-- Migração 04: Sistema de Assinaturas e Status Echo Pro
-- Adiciona campos de controle de assinatura na tabela profiles

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT DEFAULT NULL;

-- Garante que a tabela profiles está na publicação do Supabase Realtime para transmitir alterações de assinatura ao vivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
