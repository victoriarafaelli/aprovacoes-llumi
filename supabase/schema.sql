-- ============================================================
-- Content Approval App — Supabase Schema
-- Execute este SQL no Supabase SQL Editor
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
  status          text not null default 'draft' check (status in ('draft', 'sent', 'completed')),
  created_at      timestamp with time zone default now()
);

-- ============================================================
-- Tabela: contents
-- ============================================================
create table if not exists contents (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references plans(id) on delete cascade,
  title            text not null,
  -- Array de redes sociais: um conteúdo pode ser publicado em múltiplas redes
  social_networks  text[] not null default '{instagram}',
  type             text not null
                     check (type in ('post', 'carrossel', 'reels', 'stories', 'video', 'shorts', 'artigo')),
  copy_text        text,
  video_script     text,
  observations     text,
  approval_status  text not null default 'pending'
                     check (approval_status in ('pending', 'approved', 'rejected')),
  order_position   integer not null default 0,
  created_at       timestamp with time zone default now()
);

-- Índices
create index if not exists idx_contents_plan_id on contents(plan_id);
create index if not exists idx_plans_share_token on plans(share_token);
create index if not exists idx_plans_client_name on plans(client_name);

-- ============================================================
-- RLS desabilitado (sem autenticação por enquanto)
-- ============================================================
alter table plans    disable row level security;
alter table contents disable row level security;


-- ============================================================
-- MIGRATION — se o banco já existir, rode os blocos abaixo
-- (pule se estiver criando do zero)
-- ============================================================

-- Renomeia a coluna social_network (singular) para social_networks (array)
-- Atenção: esta operação recria a coluna. Salve os dados antes se necessário.
--
-- Passo 1: adicionar nova coluna array
-- alter table contents add column if not exists social_networks text[] default '{instagram}';
--
-- Passo 2: migrar dados da coluna antiga para o array
-- update contents set social_networks = array[social_network] where social_networks is null;
-- update contents set social_networks = coalesce(social_networks, array[social_network]);
--
-- Passo 3: tornar a nova coluna NOT NULL
-- alter table contents alter column social_networks set not null;
--
-- Passo 4: remover coluna antiga
-- alter table contents drop column if exists social_network;

-- Adiciona coluna observations (se ainda não existir)
-- alter table contents add column if not exists observations text;

-- Torna copy_text opcional (se ainda for NOT NULL)
-- alter table contents alter column copy_text drop not null;

-- Atualiza check constraint do tipo para incluir todos os formatos atuais
-- alter table contents drop constraint if exists contents_type_check;
-- alter table contents add constraint contents_type_check
--   check (type in ('post', 'carrossel', 'reels', 'stories', 'video', 'shorts', 'artigo'));
