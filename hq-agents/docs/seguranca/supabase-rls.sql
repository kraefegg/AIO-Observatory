-- ============================================================================
-- KRAEFEGG M.O. — SUPABASE RLS (Row Level Security)
-- ============================================================================
-- Objetivo: bloquear que TERCEIROS (chave anonima / publishable exposta)
-- leiam ou alterem dados do projeto. Depois disso, apenas o service_role
-- (backend: ce-strategic, job hq-orquestrador e scripts locais via env)
-- consegue acessar a tabela.
--
-- COMO EXECUTAR:
--   1) Abra o painel do Supabase -> SQL Editor (projeto mrqjmdfulmnggozwjxlq).
--   2) Cole TODO este script e clique em RUN.
--   3) Nao execute antes de trocar SUPABASE_KEY para o service_role em
--      ce-strategic / secret hq-supabase / ~/.hq-secrets/supabase.env
--      (veja roteiro-rotacao-seguranca.md). Se executar antes, a publishable
--      antiga para de ler (401) — o que e o comportamento desejado no fim.
--
-- NOTA: policies antigas de ALLOW (demandas_anon_all / demandas_auth_all)
-- precisam ser REMOVIDAS: no RLS do Postgres, policies permitivas sao OR
-- (um ALLOW "USING(true)" do anon continuaria autorizando mesmo com a
-- "deny_anon_tudo"). A deny e criada como RESTRICTIVE para sobrescrever
-- qualquer ALLOW residual da role anon.
--
-- Idempotente: pode ser re-executado com seguranca.
-- Validado em 2026-09-05: anon SELECT => 200 com [] (filtrado); backend ok.
-- ============================================================================

BEGIN;

-- 1) Remove policies legadas que TODOS usavam (criadas por setup anterior).
DROP POLICY IF EXISTS "demandas_anon_all" ON public.demandas;
DROP POLICY IF EXISTS "demandas_auth_all" ON public.demandas;

-- 2) Habilita RLS na tabela de demandas (e FORCA), para que a role
--    anonima jamais acesse mesmo que a chave vaze.
ALTER TABLE public.demandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demandas FORCE ROW LEVEL SECURITY;

-- 3) NEGA TUDO para a role anonima ("anon"), como RESTRICTIVE (forte):
--    SELECT/INSERT/UPDATE/DELETE retornam RLS block, mesmo se outra policy
--    ALLOW para anon existir.
DROP POLICY IF EXISTS "deny_anon_tudo" ON public.demandas;
CREATE POLICY "deny_anon_tudo" ON public.demandas
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- 4) Permite EXPLICITAMENTE o service_role (o backend usa essa role).
--    O service_role ja ignora RLS por padrao (BYPASSRLS), mas a policy
--    da transparencia/garantia caso algum dia o bypass seja revogado.
DROP POLICY IF EXISTS "service_role_tudo" ON public.demandas;
CREATE POLICY "service_role_tudo" ON public.demandas
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;