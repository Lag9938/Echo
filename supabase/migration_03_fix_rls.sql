-- ═══════════════════════════════════════════════════════════════════════
-- ECHO: MIGRATION 03 — CORREÇÃO DO RLS (SEGURANÇA)
-- Execute no SQL Editor do painel Supabase após as migrations 01 e 02.
--
-- Problema: fix_chat_and_rls.sql usou USING (true) para channels, messages
-- e space_members, o que permite que qualquer usuário autenticado leia
-- mensagens de qualquer servidor, mesmo sem ser membro.
--
-- Solução: usar is_space_member() (SECURITY DEFINER — sem recursão)
-- para restringir acesso somente a membros reais do servidor.
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Corrigir função can_access_channel que tinha "OR true" (bug de segurança)
CREATE OR REPLACE FUNCTION public.can_access_channel(p_channel_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $`$
  SELECT EXISTS (
    SELECT 1 FROM public.channels c
    WHERE c.id = p_channel_id
      AND public.is_space_member(c.space_id)
  );
$`$;

-- 2. Canais: apenas membros do servidor leem canais daquele servidor
DROP POLICY IF EXISTS "authenticated users read channels" ON public.channels;
DROP POLICY IF EXISTS "members read channels" ON public.channels;
CREATE POLICY "space members read channels" ON public.channels
  FOR SELECT TO authenticated
  USING (public.is_space_member(channels.space_id));

-- 3. Mensagens: apenas membros do servidor do canal leem mensagens
DROP POLICY IF EXISTS "authenticated users read messages" ON public.messages;
DROP POLICY IF EXISTS "members read messages" ON public.messages;
CREATE POLICY "space members read messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    public.is_space_member(
      (SELECT space_id FROM public.channels WHERE id = messages.channel_id)
    )
  );

-- Envio de mensagens: membro do servidor + autor da mensagem
DROP POLICY IF EXISTS "authenticated users insert messages" ON public.messages;
DROP POLICY IF EXISTS "members send messages as themselves" ON public.messages;
CREATE POLICY "space members send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid())
    AND public.is_space_member(
      (SELECT space_id FROM public.channels WHERE id = messages.channel_id)
    )
  );

-- 4. space_members: apenas membros do espaço veem outros membros daquele espaço
--    (evita listar membros de servidores dos quais não faz parte)
DROP POLICY IF EXISTS "members read space memberships" ON public.space_members;
DROP POLICY IF EXISTS "members read their own membership" ON public.space_members;
CREATE POLICY "space members read memberships" ON public.space_members
  FOR SELECT TO authenticated
  USING (public.is_space_member(space_members.space_id));

-- 5. spaces: mantém leitura aberta para validação de convites antes de entrar
--    (se fecharmos isso, o sistema de convites quebra pois o usuário não
--     consegue verificar se o espaço existe antes de entrar)
--    O que importa para segurança são as mensagens e canais — já protegidos acima.
--    A policy atual (USING true) para spaces já existe em fix_chat_and_rls.sql,
--    então não precisamos recriar.

-- 6. space_roles e space_member_roles: membros do servidor leem cargos
DROP POLICY IF EXISTS "authenticated read space_roles" ON public.space_roles;
CREATE POLICY "space members read roles" ON public.space_roles
  FOR SELECT TO authenticated
  USING (public.is_space_member(space_roles.space_id));

DROP POLICY IF EXISTS "authenticated read space_member_roles" ON public.space_member_roles;
CREATE POLICY "space members read member roles" ON public.space_member_roles
  FOR SELECT TO authenticated
  USING (public.is_space_member(space_member_roles.space_id));
