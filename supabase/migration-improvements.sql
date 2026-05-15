-- ─── Migração: melhorias de aprovação ────────────────────────────────────────
-- Execute este SQL no Supabase SQL Editor para aplicar as melhorias.

-- 1. Comentário do cliente na primeira aprovação
--    Permite que o cliente deixe um texto por conteúdo ao aprovar/reprovar.
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS client_feedback TEXT;

-- 2. Ordem dos conteúdos (caso ainda não exista)
--    Garante que a coluna order_position existe em ambas as tabelas.
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS order_position INTEGER NOT NULL DEFAULT 0;

ALTER TABLE final_review_items
  ADD COLUMN IF NOT EXISTS order_position INTEGER NOT NULL DEFAULT 0;

-- 3. Índice para ordenação eficiente
CREATE INDEX IF NOT EXISTS idx_contents_plan_order
  ON contents (plan_id, order_position);

CREATE INDEX IF NOT EXISTS idx_final_review_items_review_order
  ON final_review_items (review_id, order_position);
