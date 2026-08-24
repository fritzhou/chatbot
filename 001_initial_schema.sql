-- =========================================================
-- Migration 001: Initial Schema
-- Purpose: Core tables for categories and FAQs
-- Tables created: categories, faqs
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Generic trigger function to keep updated_at current
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- categories
-- ---------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- faqs
-- ---------------------------------------------------------
create table if not exists public.faqs (
  id            uuid primary key default gen_random_uuid(),
  question      text not null,
  answer        text not null,
  category_id   uuid references public.categories(id) on delete set null,
  language      text not null default 'en'
                  check (language in ('en', 'fil', 'ceb')),
  priority      int not null default 0,
  status        text not null default 'active'
                  check (status in ('active', 'inactive', 'needs_review', 'expired')),
  source_name   text,
  source_url    text,
  last_verified date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_faqs_status on public.faqs (status);
create index if not exists idx_faqs_category on public.faqs (category_id);
create index if not exists idx_faqs_language on public.faqs (language);

create trigger trg_faqs_updated_at
  before update on public.faqs
  for each row execute function public.set_updated_at();

-- Full text search support for question/answer, used as a fallback
-- when keyword matching does not produce a strong result.
alter table public.faqs
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(question, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(answer, '')), 'B')
  ) stored;

create index if not exists idx_faqs_search_vector
  on public.faqs using gin (search_vector);
