-- ═══════════════════════════════════════════════════════════════════════
-- ECHO: MIGRATION 02 — TABELAS DE SINCRONIZAÇÃO (REAÇÕES, FIXADOS, SALVOS)
-- Execute no SQL Editor do painel Supabase após a migration_01
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Reações de emoji em mensagens de canal
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 64),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS message_reactions_message_idx ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS message_reactions_user_idx ON public.message_reactions(user_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- Membros do servidor do canal podem ler reações
DROP POLICY IF EXISTS "space members read reactions" ON public.message_reactions;
CREATE POLICY "space members read reactions" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages msg
      JOIN public.channels c ON c.id = msg.channel_id
      WHERE msg.id = message_reactions.message_id
        AND public.is_space_member(c.space_id)
    )
  );

-- Usuário gerencia suas próprias reações
DROP POLICY IF EXISTS "users manage own reactions" ON public.message_reactions;
CREATE POLICY "users manage own reactions" ON public.message_reactions
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));


-- 2. Mensagens fixadas por canal (sincronizadas entre todos os membros)
CREATE TABLE IF NOT EXISTS public.pinned_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  body text NOT NULL,
  author_name text NOT NULL DEFAULT '',
  author_avatar text,
  pinned_by_name text NOT NULL DEFAULT '',
  pinned_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  attachment_url text,
  attachment_type text,
  UNIQUE(channel_id, message_id)
);

CREATE INDEX IF NOT EXISTS pinned_messages_channel_idx ON public.pinned_messages(channel_id);

ALTER TABLE public.pinned_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_messages REPLICA IDENTITY FULL;

-- Membros do espaço podem ler mensagens fixadas
DROP POLICY IF EXISTS "space members read pinned" ON public.pinned_messages;
CREATE POLICY "space members read pinned" ON public.pinned_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = pinned_messages.channel_id
        AND public.is_space_member(c.space_id)
    )
  );

-- Membros autenticados podem fixar/desafixar (controle de permissão no frontend)
DROP POLICY IF EXISTS "members manage pinned" ON public.pinned_messages;
CREATE POLICY "members manage pinned" ON public.pinned_messages
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = pinned_messages.channel_id
        AND public.is_space_member(c.space_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.channels c
      WHERE c.id = pinned_messages.channel_id
        AND public.is_space_member(c.space_id)
    )
  );


-- 3. Mensagens salvas com estrela (privadas por usuário)
CREATE TABLE IF NOT EXISTS public.saved_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_id text NOT NULL,                        -- text pois pode ser ID de DM ou canal
  source_type text NOT NULL CHECK (source_type IN ('channel', 'dm')),
  source_name text NOT NULL DEFAULT '',
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE,
  dm_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  author_name text NOT NULL DEFAULT '',
  author_avatar text,
  author_id uuid,
  body text NOT NULL DEFAULT '',
  attachment_url text,
  attachment_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_id)
);

CREATE INDEX IF NOT EXISTS saved_messages_user_idx ON public.saved_messages(user_id, saved_at DESC);

ALTER TABLE public.saved_messages ENABLE ROW LEVEL SECURITY;

-- Usuário só acessa suas próprias mensagens salvas
DROP POLICY IF EXISTS "users manage own saved messages" ON public.saved_messages;
CREATE POLICY "users manage own saved messages" ON public.saved_messages
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));


-- 4. Publicação realtime para reações e fixados
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'pinned_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_messages;
  END IF;
END $$;
