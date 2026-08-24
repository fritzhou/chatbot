-- =========================================================
-- Migration 005: Machine-translation flag
-- Purpose: Auto-translated FAQ rows (created by the
--          translate-faq Edge Function) are marked so admins
--          can tell them apart from manually written/verified
--          translations, and so the dashboard can default
--          them to 'needs_review' instead of silently going
--          live in a language nobody proofread.
-- Table affected: faqs
-- =========================================================

alter table public.faqs
  add column if not exists is_machine_translated boolean not null default false;

create index if not exists idx_faqs_machine_translated
  on public.faqs (is_machine_translated)
  where is_machine_translated = true;
