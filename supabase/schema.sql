-- ============================================================
-- Content Approval App — Supabase Schema (versão completa)
-- Execute este SQL no Supabase SQL Editor para criar do zero.
-- Se o banco já existir, veja a seção MIGRATION no final.
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- Tabela: plans
-- ============================================================
create table if not exists plans (
  id              uuid primary key default gen_random_uuid(),
  client_name     text not null,
  month_reference text not null,
  share_token     text unique not null,
  status          text not null default 'draft'
                    check (status in ('draft', 'sent', 'completed')),
  created_at      timestamp with time zone default now()
);

-- ============================================================
-- Tabela: contents
-- ============================================================
create table if not exists contents (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references plans(id) on delete cascade,
  title            text not null,
  social_networks  text[] not null default '{instagram}',
  type             text not null
                     check (type in ('post', 'carrossel', 'reels', 'stories',
                                     'video', 'shorts', 'artigo')),
  copy_text        text,
  video_script     text,
  observations     text,
  publish_date     date,                  -- data de publicação (opcional)
  publish_time     time,                  -- horário de publicação (opcional)
  reference_url    text,                  -- link de referência externo (opcional)
  approval_status  text not null default 'pending'
                     check (approval_status in ('pending', 'approved', 'rejected')),
  order_position   integer not null default 0,
  created_at       timestamp with time zone default now()
);

-- Índices
create index if not exists idx_contents_plan_id   on contents(plan_id);
create index if not exists idx_plans_share_token  on plans(share_token);
create index if not exists idx_plans_client_name  on plans(client_name);

-- ============================================================
-- RLS desabilitado (sem autenticação por enquanto)
-- ============================================================
alter table plans    disable row level security;
alter table contents disable row level security;


-- ============================================================
-- MIGRATION — rode apenas se o banco JÁ EXISTIR
-- (pule todo este bloco se estiver criando do zero)
-- ============================================================

-- 1. Renomear social_network (singular, text) → social_networks (plural, text[])
--    Se já fez essa migration anteriormente, ignore os passos 1a–1d.
--
-- 1a. Adicionar nova coluna array
-- alter table contents add column if not exists social_networks text[];
--
-- 1b. Copiar dados da coluna antiga
-- update contents set social_networks = array[social_network]
--   where social_networks is null or social_networks = '{}';
--
-- 1c. Definir NOT NULL e default
-- alter table contents alter column social_networks set not null;
-- alter table contents alter column social_networks set default '{instagram}';
--
-- 1d. Remover coluna antiga
-- alter table contents drop column if exists social_network;

-- 2. Tornar copy_text opcional (se ainda for NOT NULL)
-- alter table contents alter column copy_text drop not null;

-- 3. Atualizar check constraint de tipo
-- alter table contents drop constraint if exists contents_type_check;
-- alter table contents add constraint contents_type_check
--   check (type in ('post', 'carrossel', 'reels', 'stories',
--                   'video', 'shorts', 'artigo'));

-- 4. Adicionar campo observations (se não existir)
-- alter table contents add column if not exists observations text;

-- 5. Novos campos desta versão
-- alter table contents add column if not exists publish_date  date;
-- alter table contents add column if not exists publish_time  time;
-- alter table contents add column if not exists reference_url text;
