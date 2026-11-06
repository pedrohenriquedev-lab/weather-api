-- Alerta de Alagamento | Supabase
-- Execute este arquivo no SQL Editor do seu projeto Supabase.

create table if not exists public.occurrences (
  id bigint generated always as identity primary key,
  nome varchar(70) not null,
  cidade varchar(100) not null,
  bairro varchar(100) not null,
  nivel varchar(10) not null check (nivel in ('Alto', 'Médio', 'Baixo')),
  descricao varchar(500) not null default '',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);

alter table public.occurrences enable row level security;
-- A API usa a chave pública anon; permitir leitura e inserção públicas
-- é intencional para o mural comunitário. A validação e o limite também
-- são aplicados pelo servidor Express. Não conceda UPDATE ou DELETE.
grant select, insert on public.occurrences to anon, authenticated;
grant usage, select on sequence public.occurrences_id_seq to anon, authenticated;

drop policy if exists "Leitura pública dos relatos" on public.occurrences;
create policy "Leitura pública dos relatos"
on public.occurrences for select to anon, authenticated using (true);

drop policy if exists "Cadastro público de relatos" on public.occurrences;
create policy "Cadastro público de relatos"
on public.occurrences for insert to anon, authenticated
with check (
  char_length(trim(nome)) between 1 and 70 and
  char_length(trim(cidade)) between 1 and 100 and
  char_length(trim(bairro)) between 1 and 100 and
  nivel in ('Alto', 'Médio', 'Baixo') and
  char_length(descricao) <= 500 and
  latitude between -90 and 90 and longitude between -180 and 180
);
