-- ============================================================
-- Aprovação Final — Migration: Preview Automático do Feed
--
-- Adiciona UMA coluna em final_review_items para guardar a capa
-- escolhida manualmente de um conteúdo, quando aplicável:
--
--   feed_cover_url text null
--
-- Comportamento é inferido pelo tipo do conteúdo + presença/ausência
-- desse valor (sem necessidade de coluna de "tipo de capa" separada):
--
--   POST + feed_cover_url null        → usa a própria imagem (media_items[0])
--   CARROSSEL + feed_cover_url null   → usa o primeiro slide
--   CARROSSEL + feed_cover_url setado → usa o slide escolhido (se ainda
--                                        existir em media_items; senão,
--                                        cai para o primeiro slide — essa
--                                        checagem é feita em código, não
--                                        precisa de constraint no banco)
--   VÍDEO/REELS/SHORTS + feed_cover_url setado → capa enviada ou frame
--                                        capturado
--   VÍDEO/REELS/SHORTS + feed_cover_url null   → placeholder (vídeo não
--                                        tem capa própria automática)
--
-- A funcionalidade manual antiga (feed_preview_url/feed_preview_status/
-- feed_preview_feedback em final_reviews) NÃO é tocada por esta migration
-- — continua exatamente como está, para aprovações que já a usam.
--
-- Segura para dados existentes:
--   - coluna nova, nullable, sem default diferente de null
--   - nenhum registro existente é alterado
--   - nenhuma coluna ou tabela é removida
--   - reversível (ver ROLLBACK no final)
--
-- Execute no SQL Editor do Supabase quando for publicar esta melhoria.
-- ============================================================

alter table final_review_items
  add column if not exists feed_cover_url text;

-- ──────────────────────────────────────────────────────────────
-- Verificação — deve retornar 1 linha com a coluna nova
-- ──────────────────────────────────────────────────────────────
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'final_review_items'
  and column_name = 'feed_cover_url';

-- ──────────────────────────────────────────────────────────────
-- ROLLBACK (se precisar reverter esta migration)
-- ──────────────────────────────────────────────────────────────
-- alter table final_review_items drop column if exists feed_cover_url;
