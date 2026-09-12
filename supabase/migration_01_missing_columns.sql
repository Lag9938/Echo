-- ═══════════════════════════════════════════════════════════════════════
-- ECHO: MIGRATION 01 — COLUNAS FALTANTES NAS TABELAS EXISTENTES
-- Execute no SQL Editor do painel Supabase (https://supabase.com/dashboard)
-- É seguro rodar múltiplas vezes — usa ALTER ... ADD COLUMN IF NOT EXISTS
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Tabela messages: suporte a anexos (imagens, arquivos, áudios de voz)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text;

-- 2. Tabela profiles: cosméticos de perfil sincronizados entre dispositivos
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_decoration text,
  ADD COLUMN IF NOT EXISTS profile_effect text;

-- 3. Tabela space_roles: cargo padrão para novos membros do servidor
ALTER TABLE public.space_roles
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

-- 4. Tabela channels: metadados de canal sincronizados entre membros
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS topic text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_announcement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user_limit integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slowmode_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';

-- 5. Garantir Replica Identity Full para channels e profiles (necessário para realtime)
ALTER TABLE public.channels REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 6. Adicionar channels à publicação realtime se ainda não estiver
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
  END IF;
END $$;
