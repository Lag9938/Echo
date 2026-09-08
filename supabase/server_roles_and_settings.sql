-- ═══════════════════════════════════════════════════════════════════════
-- ECHO: MIGRAÇÃO PARA CARGOS, PERMISSÕES E METADADOS DE SERVIDOR
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Colunas adicionais em spaces para banner, ícone e canal do sistema
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS icon_url text;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS banner_theme text DEFAULT 'gradient-1';
ALTER TABLE public.spaces ADD COLUMN IF NOT EXISTS welcome_channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL;

-- 2. Tabela de Cargos do Servidor (space_roles)
CREATE TABLE IF NOT EXISTS public.space_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 64),
  color text NOT NULL DEFAULT '#99aab5',
  position integer NOT NULL DEFAULT 0,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS space_roles_space_position_idx ON public.space_roles(space_id, position);

-- 3. Tabela de Atribuição de Cargos a Membros (space_member_roles)
CREATE TABLE IF NOT EXISTS public.space_member_roles (
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.space_roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS space_member_roles_space_user_idx ON public.space_member_roles(space_id, user_id);

-- 4. Tabela de Registro de Auditoria do Servidor (space_audit_logs)
CREATE TABLE IF NOT EXISTS public.space_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  author_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS space_audit_logs_space_created_idx ON public.space_audit_logs(space_id, created_at DESC);

-- 5. Habilitar RLS
ALTER TABLE public.space_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.space_audit_logs ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de Acesso
DROP POLICY IF EXISTS "authenticated read space_roles" ON public.space_roles;
CREATE POLICY "authenticated read space_roles" ON public.space_roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated manage space_roles" ON public.space_roles;
CREATE POLICY "authenticated manage space_roles" ON public.space_roles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated read space_member_roles" ON public.space_member_roles;
CREATE POLICY "authenticated read space_member_roles" ON public.space_member_roles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated manage space_member_roles" ON public.space_member_roles;
CREATE POLICY "authenticated manage space_member_roles" ON public.space_member_roles
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated read space_audit_logs" ON public.space_audit_logs;
CREATE POLICY "authenticated read space_audit_logs" ON public.space_audit_logs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "authenticated insert space_audit_logs" ON public.space_audit_logs;
CREATE POLICY "authenticated insert space_audit_logs" ON public.space_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 7. Publicação Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'space_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.space_roles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'space_member_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.space_member_roles;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'spaces'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.spaces;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'space_audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.space_audit_logs;
  END IF;
END $$;

ALTER TABLE public.space_roles REPLICA IDENTITY FULL;
ALTER TABLE public.space_member_roles REPLICA IDENTITY FULL;
ALTER TABLE public.spaces REPLICA IDENTITY FULL;
