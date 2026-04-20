-- ============================================================
-- Aprovação Final — Migration: suporte a upload de mídia
-- Cole e execute no SQL Editor do Supabase.
-- Compatível com bancos que já possuem final_reviews e
-- final_review_items criadas pelo schema-final.sql anterior.
-- ============================================================

-- 1. Adiciona coluna storage_folder em final_reviews
--    Armazena o ID da pasta no Supabase Storage.
--    Usada para limpar os arquivos quando a review é excluída.
alter table final_reviews
  add column if not exists storage_folder text;

-- 2. (Opcional) Remove a coluna reference_url de final_review_items
--    se quiser manter o banco limpo.
--    Comente estas linhas se preferir manter a coluna sem uso.
-- alter table final_review_items
--   drop column if exists reference_url;

-- 3. Índice extra (já existe, mas garantindo)
create index if not exists idx_final_reviews_storage_folder
  on final_reviews(storage_folder)
  where storage_folder is not null;

-- ============================================================
-- BUCKET E POLÍTICAS DE STORAGE
-- O SQL abaixo NÃO roda no SQL Editor comum do Supabase —
-- use o painel Storage ou o SQL do schema de storage do Supabase.
-- As instruções estão comentadas como referência.
-- ============================================================

-- Passo A: Criar o bucket no painel Storage do Supabase
--   Nome  : final-reviews
--   Tipo  : Public (leitura pública, sem autenticação)
--   Nota  : NÃO ativar "Restrict file upload size" por enquanto.

-- Passo B: Políticas de armazenamento
--   (Executar no SQL Editor, substituindo pelo nome real do bucket)

-- Permite leitura pública de todos os arquivos (necessário para a
-- página de aprovação do cliente, que não tem autenticação):
-- insert into storage.buckets (id, name, public)
--   values ('final-reviews', 'final-reviews', true)
--   on conflict (id) do update set public = true;

-- Política de INSERT via service role (uploads via API route):
-- create policy "Service role pode fazer upload"
--   on storage.objects for insert
--   to service_role
--   with check (bucket_id = 'final-reviews');

-- Política de DELETE via service role (limpeza ao excluir review):
-- create policy "Service role pode excluir arquivos"
--   on storage.objects for delete
--   to service_role
--   using (bucket_id = 'final-reviews');

-- Política de SELECT público (clientes veem as mídias):
-- create policy "Leitura pública dos arquivos"
--   on storage.objects for select
--   to public
--   using (bucket_id = 'final-reviews');

-- ============================================================
-- RESUMO DO QUE VOCÊ PRECISA FAZER NO PAINEL DO SUPABASE
-- ============================================================
-- 1. Rodar o SQL acima (apenas as linhas sem comentário).
-- 2. Ir em Storage > New bucket:
--      Name: final-reviews
--      Public bucket: SIM (toggle ligado)
-- 3. Confirmar que as políticas de INSERT e DELETE para
--    service_role estão ativas (o bucket público já cuida
--    da leitura — nenhuma política extra necessária para SELECT).
-- ============================================================
