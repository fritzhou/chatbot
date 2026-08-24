-- =========================================================
-- Migration 002: Keywords and Unanswered Questions
-- Purpose: Support keyword-based matching and continuous
--          improvement of the knowledge base.
-- Tables created: faq_keywords, unanswered_questions
-- =========================================================

-- ---------------------------------------------------------
-- faq_keywords
-- ---------------------------------------------------------
create table if not exists public.faq_keywords (
  id         uuid primary key default gen_random_uuid(),
  faq_id     uuid not null references public.faqs(id) on delete cascade,
  keyword    text not null,
  weight     int not null default 1 check (weight between 1 and 5),
  created_at timestamptz not null default now()
);

-- A keyword should not be duplicated for the same FAQ
create unique index if not exists uq_faq_keyword
  on public.faq_keywords (faq_id, lower(keyword));

-- Indexed keyword column for fast matching lookups
create index if not exists idx_faq_keywords_keyword
  on public.faq_keywords (lower(keyword));

create index if not exists idx_faq_keywords_faq_id
  on public.faq_keywords (faq_id);

-- ---------------------------------------------------------
-- unanswered_questions
-- ---------------------------------------------------------
create table if not exists public.unanswered_questions (
  id                 uuid primary key default gen_random_uuid(),
  question           text not null,
  detected_keywords  text[],
  status             text not null default 'new'
                       check (status in ('new', 'reviewed', 'converted', 'ignored')),
  created_at         timestamptz not null default now(),
  reviewed_at        timestamptz,
  converted_faq_id   uuid references public.faqs(id) on delete set null
);

create index if not exists idx_unanswered_status
  on public.unanswered_questions (status);
