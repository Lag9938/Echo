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

-- 3. Permitir que os membros de um espaço vejam os outros membros daquele espaço
DROP POLICY IF EXISTS "members read space memberships" ON public.space_members;
CREATE POLICY "members read space memberships" ON public.space_members
  FOR SELECT TO authenticated
  USING (
    public.is_space_member(space_id) OR (user_id = (select auth.uid()))
  );
