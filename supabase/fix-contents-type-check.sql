-- ============================================================
-- FIX — contents_type_check rejeitando 'video' (TikTok)
-- Execute no SQL Editor do Supabase. Não apaga dados nem tabelas.
--
-- Causa: a constraint em produção ficou desatualizada em relação ao
-- schema.sql (que já previa 'video','shorts','artigo' desde o primeiro
-- commit do projeto). O bloco de migração em schema.sql para isso
-- ficou apenas comentado como documentação e nunca foi executado.
--
-- Este script recria a constraint incluindo os 7 formatos atuais do
-- app (post, carrossel, reels, stories, video, shorts, artigo) e,
-- de forma defensiva, qualquer outro valor de "type" que já exista
-- na tabela hoje — assim nenhum conteúdo/link antigo pode quebrar,
-- mesmo que haja algum valor legado fora dessa lista.
-- ============================================================

do $$
declare
  legacy_values text;
  full_list     text;
begin
  -- Valores que já existem na tabela e NÃO estão na lista canônica do app
  select string_agg(distinct quote_literal(type), ', ')
    into legacy_values
    from contents
   where type is not null
     and type not in ('post', 'carrossel', 'reels', 'stories', 'video', 'shorts', 'artigo');

  full_list := $q$'post','carrossel','reels','stories','video','shorts','artigo'$q$;
  if legacy_values is not null then
    full_list := full_list || ', ' || legacy_values;
    raise notice 'Valores legados preservados na constraint: %', legacy_values;
  end if;

  execute 'alter table contents drop constraint if exists contents_type_check';
  execute format(
    'alter table contents add constraint contents_type_check check (type in (%s))',
    full_list
  );
end $$;

-- Verificação final: confirma a nova definição da constraint
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'contents'::regclass
  and conname = 'contents_type_check';
