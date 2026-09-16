-- ═══════════════════════════════════════════════════════════════════════
-- ECHO: MIGRATION 05 — OTIMIZAÇÕES DE CHAT, ÍNDICES DE PERFORMANCE E MODERAÇÃO
-- ═══════════════════════════════════════════════════════════════════════

-- 1. ÍNDICES DE ALTA PERFORMANCE PARA DIRECT_MESSAGES
-- Elimina varredura sequencial completa da tabela em buscas de conversas
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_receiver 
  ON public.direct_messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver_sender 
  ON public.direct_messages (receiver_id, sender_id, created_at DESC);

-- 2. STATUS DE LEITURA EM DIRECT_MESSAGES
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_direct_messages_unread
  ON public.direct_messages (receiver_id, read_at)
  WHERE read_at IS NULL;

-- 3. RECURSOS MODERNOS DE CHAT NA TABELA MESSAGES
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'default';

CREATE INDEX IF NOT EXISTS idx_messages_reply_to 
  ON public.messages (reply_to_message_id) 
  WHERE reply_to_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_channel_cursor 
  ON public.messages (channel_id, created_at DESC, id);

-- 4. TRIGGER PARA MARCAÇÃO AUTOMÁTICA DE EDIÇÕES
CREATE OR REPLACE FUNCTION public.handle_message_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.is_edited = true;
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_update ON public.messages;
CREATE TRIGGER trg_message_update
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_message_update();

-- 5. FUNÇÃO E POLÍTICA DE RLS PARA PERMITIR EXCLUSÃO POR MODERADORES E DONOS DO ESPAÇO
CREATE OR REPLACE FUNCTION public.can_delete_message(p_channel_id uuid, p_author_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT (
    -- O próprio autor pode deletar sua mensagem
    p_author_id = auth.uid()
    OR
    -- O criador do servidor pode deletar qualquer mensagem
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.spaces s ON s.id = c.space_id
      WHERE c.id = p_channel_id AND s.creator_id = auth.uid()
    )
    OR
    -- Membro com permissão de administrador ou manageMessages em seus cargos
    EXISTS (
      SELECT 1 FROM public.channels c
      JOIN public.space_member_roles smr ON smr.space_id = c.space_id
      JOIN public.space_roles sr ON sr.id = smr.role_id
      WHERE c.id = p_channel_id 
        AND smr.user_id = auth.uid()
        AND (
          COALESCE((sr.permissions->>'administrator')::boolean, false) = true
          OR COALESCE((sr.permissions->>'manageMessages')::boolean, false) = true
        )
    )
  );
$$;

DROP POLICY IF EXISTS "authors delete messages" ON public.messages;
DROP POLICY IF EXISTS "authorized delete messages" ON public.messages;
CREATE POLICY "authorized delete messages" ON public.messages
  FOR DELETE TO authenticated
  USING (public.can_delete_message(channel_id, author_id));
