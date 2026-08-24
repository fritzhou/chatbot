-- =========================================================
-- Migration 003: Chat Logs and Feedback
-- Purpose: Analytics on chatbot usage without storing
--          unnecessary personal/sensitive student data.
-- Tables created: chatbot_logs, faq_feedback
-- =========================================================

-- ---------------------------------------------------------
-- chatbot_logs
-- ---------------------------------------------------------
create table if not exists public.chatbot_logs (
  id             uuid primary key default gen_random_uuid(),
  user_question  text not null,
  matched_faq_id uuid references public.faqs(id) on delete set null,
  category_id    uuid references public.categories(id) on delete set null,
  language       text default 'en',
  match_score    numeric,
  was_answered   boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists idx_chatbot_logs_created_at
  on public.chatbot_logs (created_at);

create index if not exists idx_chatbot_logs_matched_faq
  on public.chatbot_logs (matched_faq_id);

-- ---------------------------------------------------------
-- faq_feedback
-- ---------------------------------------------------------
create table if not exists public.faq_feedback (
  id           uuid primary key default gen_random_uuid(),
  faq_id       uuid references public.faqs(id) on delete cascade,
  chat_log_id  uuid references public.chatbot_logs(id) on delete cascade,
  is_helpful   boolean not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_faq_feedback_faq_id
  on public.faq_feedback (faq_id);
