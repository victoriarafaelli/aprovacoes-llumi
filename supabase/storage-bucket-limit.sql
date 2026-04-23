-- ============================================================
-- Aprovação Final — Ajuste do limite de tamanho do bucket
--
-- O erro "Payload too large" acontece porque o bucket final-reviews
-- tem file_size_limit = 52428800 (50 MB) por padrão no Supabase.
-- Arquivos MOV de câmera/iPhone facilmente superam 100–500 MB.
--
-- Execute este SQL no SQL Editor do Supabase para corrigir.
-- ============================================================

-- Opção A: Sem limite explícito (usa o máximo do seu plano)
-- Free plan  → 50 MB por arquivo (plataforma não permite mais)
-- Pro plan   → até 5 GB por arquivo (configurável)
update storage.buckets
  set file_size_limit = null
  where id = 'final-reviews';

-- ──────────────────────────────────────────────────────────────
-- Opção B: Define um limite específico (descomente e ajuste)
-- ──────────────────────────────────────────────────────────────
-- 200 MB:
-- update storage.buckets set file_size_limit = 209715200  where id = 'final-reviews';
-- 500 MB:
-- update storage.buckets set file_size_limit = 524288000  where id = 'final-reviews';
-- 1 GB:
-- update storage.buckets set file_size_limit = 1073741824 where id = 'final-reviews';
-- 2 GB:
-- update storage.buckets set file_size_limit = 2147483648 where id = 'final-reviews';

-- ──────────────────────────────────────────────────────────────
-- Verificar configuração atual do bucket
-- ──────────────────────────────────────────────────────────────
select
  id,
  name,
  public,
  file_size_limit,
  pg_size_pretty(file_size_limit::bigint) as file_size_limit_legivel
from storage.buckets
where id = 'final-reviews';

-- ──────────────────────────────────────────────────────────────
-- IMPORTANTE — Limites por plano Supabase (abril 2025)
-- ──────────────────────────────────────────────────────────────
-- Free:  50 MB por arquivo, 1 GB total de storage
-- Pro:   5 GB por arquivo (configurável), 100 GB total de storage
-- Team:  5 GB por arquivo, 200 GB total de storage
--
-- Se você está no Free plan e precisa de vídeos > 50 MB, a única
-- opção é fazer upgrade para Pro. Não há como contornar o limite
-- de plataforma via SQL — ele é aplicado antes de chegar ao bucket.
--
-- Alternativa prática: orientar o usuário a converter MOV → MP4
-- antes de enviar. Um MOV de 200 MB vira ~40 MB em MP4 (H.264),
-- cabendo no Free plan com folga.
-- ============================================================
