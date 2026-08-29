-- Executar no SQL Editor do painel do seu projeto Supabase para liberar o sistema de convites.

-- 1. Permitir que qualquer usuário autenticado leia os dados básicos dos espaços (necessário para validar o código de convite)
DROP POLICY IF EXISTS "members read their spaces" ON public.spaces;

CREATE POLICY "authenticated users read spaces" ON public.spaces
  FOR SELECT TO authenticated
  USING (true);

-- 2. Permitir que qualquer usuário se adicione como membro ('member') em um espaço
DROP POLICY IF EXISTS "members join spaces" ON public.space_members;

CREATE POLICY "members join spaces" ON public.space_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) AND role = 'member'
  );
