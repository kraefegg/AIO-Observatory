-- ============================================================================
-- KRAEFEGG M.O. — SUPABASE RLS (Row Level Security)
-- ============================================================================
-- Objetivo: bloquear que TERCEIROS (chave anonima / publishable exposta)
-- leiam ou alterem dados do projeto. Depois disso, apenas o service_role
-- (backend: ce-strategic, job hq-orquestrador e scripts locais via env)
-- consegue acessar a tabela.
--
-- COMO EXECUTAR:
--   1) Abra o painel do Supabase -> SQL Editor.
--   2) Cole TODO este script e clique em RUN.
--   3) Nao execute antes de trocar SUPABASE_KEY para o service_role em
--      ce-strategic / secret hq-supabase / ~/.hq-secrets/supabase.env
--      (veja roteiro-rotacao-seguranca.md). Se executar antes, a publishable
--      antiga para de ler (401) — o que e o comportamento desejado no fim.
--
-- Idempotente: pode ser re-executado com seguranca.
-- ============================================================================

BEGIN;

-- 1) Habilita RLS na tabela de demandas (e FORCA), para que a role
--    anonima jamais acesse mesmo que a chave vaze.
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas FORCE ROW LEVEL SECURITY;

-- 2) NEGA TUDO para a role anonima ("anon"). A publishable/anon exposta em
--    qualquer artefato (inclusive historico do repo) fica inofensiva:
--    SELECT/INSERT/UPDATE/DELETE retornam RLS block.
DROP POLICY IF EXISTS "deny_anon_tudo" ON public.demandas;
CREATE POLICY "deny_anon_tudo" ON public.demandas
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- 3) Permite EXPLICITAMENTE o service_role (o backend usa essa role).
--    O service_role ja ignora RLS por padrao (BYPASSRLS), mas a policy
--    da transparencia/garantia caso algum dia o bypass seja revogado.
DROP POLICY IF EXISTS "service_role_tudo" ON public.demandas;
CREATE POLICY "service_role_tudo" ON public.demandas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;