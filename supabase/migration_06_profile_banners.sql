-- ═══════════════════════════════════════════════════════════════════════
-- ECHO: MIGRATION 06 — BANNERS PERSONALIZADOS (GIF) E SINCRONIZAÇÃO DE PERFIL
-- Execute no SQL Editor do painel Supabase (https://supabase.com/dashboard)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Adicionar colunas de banner e biografia na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS banner_preset text DEFAULT 'synthwave',
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS pronouns text DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_status text DEFAULT '';

-- 2. Garantir que a tabela profiles tenha REPLICA IDENTITY FULL para eventos em tempo real
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 3. Adicionar profiles à publicação de realtime caso ainda não esteja
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
END $$;
