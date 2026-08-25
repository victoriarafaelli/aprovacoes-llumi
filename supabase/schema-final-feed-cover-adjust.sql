-- ============================================================
-- Aprovação Final — Migration: Ajuste manual de enquadramento
-- na Prévia de Feed
--
-- Adiciona TRÊS colunas em final_review_items para guardar o ajuste
-- manual (arrastar + zoom) de como a capa aparece na Prévia de Feed:
--
--   feed_cover_position_x real null   -- 0–100 (equivalente a object-position X%)
--   feed_cover_position_y real null   -- 0–100 (equivalente a object-position Y%)
--   feed_cover_zoom        real null  -- 1–1.75 (1 = padrão atual, sem zoom extra)
--
-- Puramente visual — nunca altera o arquivo original (imagem/slide/vídeo).
-- Não é CSS pronto: só três números puros, interpretados no código
-- (FeedGridPreview) como object-position + transform: scale.
--
-- Comportamento:
--
--   qualquer um dos três null  → enquadramento padrão (centro, sem zoom
--                                 extra) — IDÊNTICO ao comportamento atual,
--                                 antes desta migration existir
--   todos preenchidos          → grid aplica object-position:
--                                 `${x}% ${y}%` + transform: scale(zoom)
--
-- Validação em DUAS camadas (defesa em profundidade):
--   - servidor: sempre validado antes de gravar (lib/feed-cover.ts,
--     sanitizeFeedCoverAdjustmentValue) — nunca aceita string/CSS/HTML,
--     faz clamp pro intervalo permitido;
--   - banco: CHECK constraints abaixo garantem o intervalo mesmo se algum
--     caminho de escrita futuro esquecer de sanitizar — nulo continua
--     sempre permitido (não é NOT NULL, só restringe o valor QUANDO
--     preenchido).
--
-- Quando a capa de um item muda (troca de slide do carrossel, novo upload
-- de capa/frame de vídeo, ou o item vira outro formato), o servidor
-- reinicia os três campos pra null automaticamente — o ajuste antigo
-- pertencia à imagem antiga, não à nova (ver o PATCH de
-- final_review_items). Isso não precisa de trigger no banco: já é forçado
-- em toda rota que grava feed_cover_url.
--
-- Nenhuma outra funcionalidade é tocada por esta migration — nem
-- feed_cover_url (capa em si), nem a funcionalidade manual antiga
-- (feed_preview_url/feed_preview_status/feed_preview_feedback em
-- final_reviews).
--
-- Segura para dados existentes:
--   - três colunas novas, nullable, sem default diferente de null
--   - nenhum registro existente é alterado (nenhum UPDATE nesta migration)
--   - CHECK constraints permitem null explicitamente — não viram NOT NULL
--     em nenhum momento, então registros antigos (todos com null nessas
--     colunas até rodar esta migration) continuam válidos
--   - aprovações antigas (sem essas colunas até rodar esta migration)
--     continuam abrindo e renderizando normalmente — null em qualquer
--     uma delas já é o comportamento padrão
--   - nenhuma coluna ou tabela é removida
--   - reversível (ver ROLLBACK no final)
--
-- Execute no SQL Editor do Supabase quando for publicar esta melhoria.
-- ============================================================

alter table final_review_items
  add column if not exists feed_cover_position_x real,
  add column if not exists feed_cover_position_y real,
  add column if not exists feed_cover_zoom real;

-- ──────────────────────────────────────────────────────────────
-- CHECK constraints — nulo sempre permitido; quando preenchido, precisa
-- estar no intervalo. Em DO blocks com checagem de existência porque o
-- Postgres não suporta "ADD CONSTRAINT IF NOT EXISTS" — assim o script
-- continua seguro de rodar mais de uma vez (idempotente), igual ao
-- "add column if not exists" acima.
-- ──────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feed_cover_position_x_range'
  ) then
    alter table final_review_items
      add constraint feed_cover_position_x_range
      check (feed_cover_position_x is null or feed_cover_position_x between 0 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feed_cover_position_y_range'
  ) then
    alter table final_review_items
      add constraint feed_cover_position_y_range
      check (feed_cover_position_y is null or feed_cover_position_y between 0 and 100);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'feed_cover_zoom_range'
  ) then
    alter table final_review_items
      add constraint feed_cover_zoom_range
      check (feed_cover_zoom is null or feed_cover_zoom between 1 and 1.75);
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────
-- Verificação — deve retornar 3 linhas (uma por coluna nova) com os
-- tipos/nullability corretos
-- ──────────────────────────────────────────────────────────────
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'final_review_items'
  and column_name in ('feed_cover_position_x', 'feed_cover_position_y', 'feed_cover_zoom');

-- Verificação dos CHECK constraints — deve retornar 3 linhas
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'final_review_items'::regclass
  and conname in ('feed_cover_position_x_range', 'feed_cover_position_y_range', 'feed_cover_zoom_range');

-- ──────────────────────────────────────────────────────────────
-- ROLLBACK (se precisar reverter esta migration)
-- ──────────────────────────────────────────────────────────────
-- Dropar as colunas já remove os constraints junto (constraint pertence
-- à coluna) — não é preciso dropar constraint separadamente.
-- alter table final_review_items
--   drop column if exists feed_cover_position_x,
--   drop column if exists feed_cover_position_y,
--   drop column if exists feed_cover_zoom;
--
-- Alternativa: reverter só os constraints, mantendo as colunas:
-- alter table final_review_items drop constraint if exists feed_cover_position_x_range;
-- alter table final_review_items drop constraint if exists feed_cover_position_y_range;
-- alter table final_review_items drop constraint if exists feed_cover_zoom_range;
