-- ================================================================
-- Content Approval App — Segurança Completa (RLS + Storage)
-- Execute no SQL Editor do Supabase (Project → SQL Editor)
-- ================================================================
--
-- COMO O SISTEMA FUNCIONA (arquitetura de segurança):
--
--   Browser (cliente/gerente)
--       ↓  fetch('/api/...')
--   Next.js API Routes  ← SUPABASE_SERVICE_ROLE_KEY (server-side, nunca exposta)
--       ↓  createServerClient() com service_role
--   Supabase Database   ← service_role bypassa RLS completamente
--
-- O browser NUNCA acessa o banco diretamente. Ele chama rotas
-- Next.js que validam tokens, checam status e executam as queries
-- via service_role. O RLS bloqueia acesso direto pelo anon key
-- sem afetar em nada o funcionamento das rotas do servidor.
--
-- Links públicos continuam funcionando: o browser chama
-- /api/approve/[token] ou /api/final-approve/[token], que
-- validam o token e retornam apenas os dados permitidos.
--
-- ================================================================
-- SUMÁRIO DO QUE ESTE SCRIPT FAZ:
-- ================================================================
--
--  ① Habilita RLS nas 4 tabelas → bloqueia anon key
--  ② Remove policies permissivas antigas (se existirem)
--  ③ Não cria policies para anon → default deny-all
--  ④ Cria policy de SELECT no Storage → mídias continuam visíveis
--  ⑤ Não cria policies de INSERT/UPDATE/DELETE no Storage → anon bloqueado
--  ⑥ Bloqueia acesso anon direto à API PostgREST do Supabase
--
-- ================================================================


-- ──────────────────────────────────────────────────────────────────
-- PARTE 1 — Tabelas do Planejamento (plans + contents)
-- ──────────────────────────────────────────────────────────────────

-- Remove policies permissivas que possam ter sido criadas anteriormente
DROP POLICY IF EXISTS "allow_all_plans"                 ON plans;
DROP POLICY IF EXISTS "Enable all access for all users" ON plans;
DROP POLICY IF EXISTS "Allow anon select"               ON plans;
DROP POLICY IF EXISTS "allow_all_contents"              ON contents;
DROP POLICY IF EXISTS "Enable all access for all users" ON contents;
DROP POLICY IF EXISTS "Allow anon select"               ON contents;

-- Habilita RLS — sem policies permissivas = anon não acessa nada
-- O service_role do servidor bypassa RLS automaticamente via JWT claim
ALTER TABLE plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contents ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────────────
-- PARTE 2 — Tabelas da Aprovação Final
-- ──────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "allow_all_final_reviews"      ON final_reviews;
DROP POLICY IF EXISTS "allow_all_final_review_items" ON final_review_items;
DROP POLICY IF EXISTS "Enable all access for all users" ON final_reviews;
DROP POLICY IF EXISTS "Enable all access for all users" ON final_review_items;
DROP POLICY IF EXISTS "Allow anon select"            ON final_reviews;
DROP POLICY IF EXISTS "Allow anon select"            ON final_review_items;

ALTER TABLE final_reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_review_items ENABLE ROW LEVEL SECURITY;


-- ──────────────────────────────────────────────────────────────────
-- PARTE 3 — Storage: bucket "final-reviews"
-- ──────────────────────────────────────────────────────────────────
--
-- O bucket é público (public: true), o que permite downloads via
-- URL pública no CDN do Supabase. Isso é NECESSÁRIO para que
-- imagens e vídeos apareçam embedados na página de aprovação.
--
-- Uploads usam Signed Upload URL (gerada server-side via service_role).
-- A URL assinada contém um token próprio de autenticação — funciona
-- independentemente de policies RLS de INSERT.
--
-- Deletes são executados server-side via service_role (bypassa RLS).
--
-- Policy criada:
--   SELECT → anon pode baixar arquivos do bucket (necessário para mídias)
--   INSERT → sem policy = anon bloqueado (signed URL não precisa de policy)
--   UPDATE → sem policy = anon bloqueado
--   DELETE → sem policy = anon bloqueado
-- ──────────────────────────────────────────────────────────────────

-- Remove policy antiga se existir (idempotente)
DROP POLICY IF EXISTS "final_reviews_storage_public_select" ON storage.objects;
DROP POLICY IF EXISTS "Give public access to final-reviews"  ON storage.objects;
DROP POLICY IF EXISTS "Public Access"                        ON storage.objects;

-- Permite leitura pública dos arquivos do bucket final-reviews
-- (necessário para <img> e <video> embutidos na página de aprovação)
CREATE POLICY "final_reviews_storage_public_select"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'final-reviews');

-- Sem policies de INSERT/UPDATE/DELETE para anon:
-- ・uploads diretos pelo anon key → bloqueados
-- ・uploads via signed URL (fluxo legítimo) → funcionam (token próprio)
-- ・deletes (limpeza na exclusão da review) → service_role, bypassa RLS


-- ──────────────────────────────────────────────────────────────────
-- PARTE 4 — Bloquear acesso anon à API PostgREST do Supabase
-- ──────────────────────────────────────────────────────────────────
--
-- O Supabase expõe uma API REST em:
--   https://<project>.supabase.co/rest/v1/<tabela>
--
-- Com RLS habilitado e sem policies permissivas, qualquer requisição
-- com Authorization: Bearer <anon-key> às tabelas retorna 0 linhas
-- (SELECT) ou erro de permissão (INSERT/UPDATE/DELETE).
--
-- Isso elimina os alertas de "table is publicly accessible" no painel.
-- ──────────────────────────────────────────────────────────────────

-- (Nenhuma ação SQL necessária aqui — o RLS habilitado acima já cuida disso)


-- ──────────────────────────────────────────────────────────────────
-- VERIFICAÇÃO — execute após rodar o script acima para confirmar
-- ──────────────────────────────────────────────────────────────────

-- 1. Confirma que RLS está HABILITADO nas 4 tabelas (rls_enabled = true)
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('plans', 'contents', 'final_reviews', 'final_review_items')
ORDER BY tablename;

-- 2. Confirma que NÃO há policies permissivas para anon nas tabelas
SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('plans', 'contents', 'final_reviews', 'final_review_items')
ORDER BY tablename, policyname;
-- → deve retornar 0 linhas (nenhuma policy = deny-all para anon/authenticated)

-- 3. Confirma a policy de leitura pública no Storage
SELECT
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename  = 'objects'
  AND policyname = 'final_reviews_storage_public_select';
-- → deve retornar 1 linha com cmd = 'SELECT'

-- ================================================================
-- FIM DO SCRIPT DE SEGURANÇA
-- ================================================================
