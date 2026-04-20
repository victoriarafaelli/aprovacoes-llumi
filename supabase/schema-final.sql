-- ============================================================
-- Content Approval App — Schema: Aprovação Final
-- Execute no SQL Editor do Supabase.
-- Não afeta as tabelas existentes (plans / contents).
-- ============================================================

-- ============================================================
-- Tabela: final_reviews (equivalente a "plans")
-- ============================================================
create table if not exists final_reviews (
  id              uuid primary key default gen_random_uuid(),
  client_name     text not null,
  month_reference text not null,
  share_token     text unique not null,
  status          text not null default 'draft'
                    check (status in ('draft', 'sent', 'completed')),
  created_at      timestamp with time zone default now()
);

-- ============================================================
-- Tabela: final_review_items (equivalente a "contents")
-- ============================================================
create table if not exists final_review_items (
  id               uuid primary key default gen_random_uuid(),
  review_id        uuid not null references final_reviews(id) on delete cascade,
  title            text not null,
  social_networks  text[] not null default '{instagram}',
  type             text not null
                     check (type in ('post', 'carrossel', 'reels', 'stories',
                                     'video', 'shorts', 'artigo')),
  caption          text,                    -- legenda final
  observations     text,
  publish_date     date,
  publish_time     time,
  reference_url    text,
  -- Array JSONB com itens de mídia: [{url, label}, ...]
  -- Para vídeo/imagem: 1 item. Para carrossel/stories: N itens.
  media_items      jsonb not null default '[]',
  approval_status  text not null default 'pending'
                     check (approval_status in ('pending', 'approved', 'rejected')),
  client_feedback  text,                    -- comentário deixado pelo cliente
  order_position   integer not null default 0,
  created_at       timestamp with time zone default now()
);

-- Índices
create index if not exists idx_final_review_items_review_id
  on final_review_items(review_id);
create index if not exists idx_final_reviews_share_token
  on final_reviews(share_token);
create index if not exists idx_final_reviews_client_name
  on final_reviews(client_name);

-- ============================================================
-- RLS desabilitado (sem autenticação por enquanto)
-- ============================================================
alter table final_reviews      disable row level security;
alter table final_review_items disable row level security;
