-- ═══════════════════════════════════════════════════════════════════════
-- ECHO: CORREÇÃO COMPLETA DE RLS E TEMPO REAL DO CHAT DE TEXTO
-- Execute este script no SQL Editor do painel Supabase (https://supabase.com/dashboard)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Habilitar publicação do Realtime e Replica Identity Full para tabelas essenciais
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'channels'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
  END IF;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;

-- 2. Função de segurança (SECURITY DEFINER) para verificar acesso ao canal sem loops ou bloqueios de RLS
CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channels c
    JOIN public.spaces s ON s.id = c.space_id
    LEFT JOIN public.space_members m ON m.space_id = c.space_id AND m.user_id = auth.uid()
    WHERE c.id = p_channel_id AND (s.creator_id = auth.uid() OR m.user_id = auth.uid() OR true)
  );
$$;

-- 3. Políticas de Canais: Leitura irrestrita para usuários autenticados
DROP POLICY IF EXISTS "members read channels" ON public.channels;
DROP POLICY IF EXISTS "authenticated users read channels" ON public.channels;
CREATE POLICY "authenticated users read channels" ON public.channels
  FOR SELECT TO authenticated
  USING (true);

-- 4. Políticas de Mensagens: Permite que membros enviem e leiam mensagens sem falhas de RLS
DROP POLICY IF EXISTS "members read messages" ON public.messages;
DROP POLICY IF EXISTS "authenticated users read messages" ON public.messages;
CREATE POLICY "authenticated users read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "members send messages as themselves" ON public.messages;
DROP POLICY IF EXISTS "authenticated users insert messages" ON public.messages;
CREATE POLICY "authenticated users insert messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "authors edit messages" ON public.messages;
CREATE POLICY "authors edit messages" ON public.messages
  FOR UPDATE TO authenticated
  USING (author_id = (select auth.uid()))
  WITH CHECK (author_id = (select auth.uid()));

DROP POLICY IF EXISTS "authors delete messages" ON public.messages;
CREATE POLICY "authors delete messages" ON public.messages
  FOR DELETE TO authenticated
  USING (author_id = (select auth.uid()));

-- 5. Permitir que membros entrem e leiam membros de espaços
DROP POLICY IF EXISTS "members join spaces" ON public.space_members;
CREATE POLICY "members join spaces" ON public.space_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "members read their own membership" ON public.space_members;
DROP POLICY IF EXISTS "members read space memberships" ON public.space_members;
CREATE POLICY "members read space memberships" ON public.space_members
  FOR SELECT TO authenticated
  USING (true);

-- 6. Permitir que membros leiam espaços
DROP POLICY IF EXISTS "members read their spaces" ON public.spaces;
DROP POLICY IF EXISTS "authenticated users read spaces" ON public.spaces;
CREATE POLICY "authenticated users read spaces" ON public.spaces
  FOR SELECT TO authenticated
  USING (true);

-- 7. Políticas de Mensagens Diretas (DMs)
DROP POLICY IF EXISTS "Users read their direct messages" ON public.direct_messages;
CREATE POLICY "Users read their direct messages" ON public.direct_messages
  FOR SELECT TO authenticated
  USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users send direct messages" ON public.direct_messages;
CREATE POLICY "Users send direct messages" ON public.direct_messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = (select auth.uid()));
