-- ============================================================
-- Migração: Prévia do Feed na Aprovação Final
--
-- Adiciona 3 colunas na tabela final_reviews para suportar
-- o upload, aprovação e comentário da imagem de prévia do feed.
-- ============================================================

-- 1. URL pública da imagem no Supabase Storage
ALTER TABLE final_reviews
  ADD COLUMN IF NOT EXISTS feed_preview_url TEXT;

-- 2. Status de aprovação da prévia (mesmo tipo dos itens)
ALTER TABLE final_reviews
  ADD COLUMN IF NOT EXISTS feed_preview_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (feed_preview_status IN ('pending', 'approved', 'rejected'));

-- 3. Comentário do cliente sobre a prévia do feed
ALTER TABLE final_reviews
  ADD COLUMN IF NOT EXISTS feed_preview_feedback TEXT;

-- ──────────────────────────────────────────────────────────────
-- Verificação — deve retornar as 3 novas colunas
-- ──────────────────────────────────────────────────────────────
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'final_reviews'
  AND column_name IN ('feed_preview_url', 'feed_preview_status', 'feed_preview_feedback')
ORDER BY column_name;

-- ──────────────────────────────────────────────────────────────
-- NOTAS
-- ──────────────────────────────────────────────────────────────
-- • Nenhuma configuração nova no Storage é necessária.
--   A imagem será salva no mesmo bucket "final-reviews",
--   na mesma pasta (storage_folder) da review, com slot key
--   "feed_preview". A exclusão automática já funciona via
--   deleteStorageFolder() ao deletar a review.
--
-- • Revisões já existentes terão feed_preview_url = NULL
--   e feed_preview_status = 'pending' (valor padrão).
--   Isso não afeta o comportamento de revisões antigas,
--   pois a UI só exibe o bloco de prévia se feed_preview_url
--   não for nulo.
-- ============================================================
