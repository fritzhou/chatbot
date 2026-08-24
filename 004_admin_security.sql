-- =========================================================
-- Migration 004: Admin Authorization, Audit Logs, and RLS
-- Purpose: Enforce authorization at the database level.
--          Students and other anonymous users may only read
--          active knowledge-base data and submit chat
--          activity. Only authenticated admins may manage
--          the knowledge base.
-- Tables created: admins, admin_audit_logs
-- Also: enables RLS + policies on all app tables
-- =========================================================

-- ---------------------------------------------------------
-- admins
-- Maps an authenticated Supabase Auth user to admin status.
-- A row here is what makes an authenticated user an
-- "administrator" from the application's point of view.
-- ---------------------------------------------------------
create table if not exists public.admins (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  role       text not null default 'admin' check (role in ('admin', 'super_admin')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- admin_audit_logs
-- ---------------------------------------------------------
create table if not exists public.admin_audit_logs (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid references public.admins(id) on delete set null,
  action      text not null,
  table_name  text not null,
  record_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_logs_admin_id
  on public.admin_audit_logs (admin_id);
create index if not exists idx_audit_logs_created_at
  on public.admin_audit_logs (created_at);

-- ---------------------------------------------------------
-- Helper function: is_admin()
-- Purpose:  Central place to check whether the currently
--           authenticated user is an active administrator.
-- Inputs:   none (reads auth.uid() internally)
-- Outputs:  boolean
-- Tables:   admins
-- Why:      RLS policies below reuse this instead of
--           repeating the subquery, and SECURITY DEFINER
--           lets it read the admins table safely even
--           though admins table itself is locked down by RLS.
-- ---------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admins
    where id = auth.uid() and is_active = true
  );
$$;

-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- =========================================================
alter table public.categories        enable row level security;
alter table public.faqs              enable row level security;
alter table public.faq_keywords      enable row level security;
alter table public.unanswered_questions enable row level security;
alter table public.chatbot_logs      enable row level security;
alter table public.faq_feedback      enable row level security;
alter table public.admin_audit_logs  enable row level security;
alter table public.admins            enable row level security;

-- =========================================================
-- categories policies
-- =========================================================

-- Policy: Public can view active categories
-- Purpose: The student chatbot needs to browse/display categories.
-- Who can use it: anyone (anon + authenticated)
-- Who cannot: n/a (read-only, active rows only)
create policy "public_read_active_categories"
  on public.categories for select
  using (is_active = true or public.is_admin());

-- Policy: Admins can insert categories
-- Purpose: Allows authorized administrators to add new categories.
-- Who can use it: authenticated users with an admins row
-- Who cannot: students / anonymous users
create policy "admin_insert_categories"
  on public.categories for insert
  with check (public.is_admin());

-- Policy: Admins can update categories
create policy "admin_update_categories"
  on public.categories for update
  using (public.is_admin())
  with check (public.is_admin());

-- Policy: Admins can delete categories
create policy "admin_delete_categories"
  on public.categories for delete
  using (public.is_admin());

-- =========================================================
-- faqs policies
-- =========================================================

-- Policy: Public can view active FAQs
-- Purpose: Students should only ever see published, active answers.
--          Admins can see every status (active, inactive,
--          needs_review, expired) for management purposes.
create policy "public_read_active_faqs"
  on public.faqs for select
  using (status = 'active' or public.is_admin());

create policy "admin_insert_faqs"
  on public.faqs for insert
  with check (public.is_admin());

create policy "admin_update_faqs"
  on public.faqs for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_delete_faqs"
  on public.faqs for delete
  using (public.is_admin());

-- =========================================================
-- faq_keywords policies
-- =========================================================

-- Policy: Public can view keywords belonging to active FAQs
-- Purpose: The keyword-matching engine runs from the browser
--          and needs to read keywords to score candidate FAQs.
create policy "public_read_keywords_of_active_faqs"
  on public.faq_keywords for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.faqs f
      where f.id = faq_keywords.faq_id and f.status = 'active'
    )
  );

create policy "admin_insert_keywords"
  on public.faq_keywords for insert
  with check (public.is_admin());

create policy "admin_update_keywords"
  on public.faq_keywords for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_delete_keywords"
  on public.faq_keywords for delete
  using (public.is_admin());

-- =========================================================
-- unanswered_questions policies
-- =========================================================

-- Policy: Anyone can log an unanswered question
-- Purpose: The chatbot needs to record questions it could not
--          answer, even for anonymous/unauthenticated students.
create policy "public_insert_unanswered"
  on public.unanswered_questions for insert
  with check (true);

-- Policy: Only admins can view/manage unanswered questions
create policy "admin_read_unanswered"
  on public.unanswered_questions for select
  using (public.is_admin());

create policy "admin_update_unanswered"
  on public.unanswered_questions for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_delete_unanswered"
  on public.unanswered_questions for delete
  using (public.is_admin());

-- =========================================================
-- chatbot_logs policies
-- =========================================================

-- Policy: Anyone can write a chat log entry
-- Purpose: Needed so anonymous student sessions can be logged
--          for analytics as they use the chatbot.
create policy "public_insert_chatbot_logs"
  on public.chatbot_logs for insert
  with check (true);

-- Policy: Only admins can read analytics logs
create policy "admin_read_chatbot_logs"
  on public.chatbot_logs for select
  using (public.is_admin());

-- No public update/delete policy is created, so students can
-- never modify or remove log history (default deny).

-- =========================================================
-- faq_feedback policies
-- =========================================================

-- Policy: Anyone can submit feedback (thumbs up/down)
create policy "public_insert_feedback"
  on public.faq_feedback for insert
  with check (true);

-- Policy: Only admins can read feedback analytics
create policy "admin_read_feedback"
  on public.faq_feedback for select
  using (public.is_admin());

-- =========================================================
-- admin_audit_logs policies
-- =========================================================

-- Policy: Admins can insert their own audit trail entries
-- Purpose: Every admin action (create/update/delete FAQ, etc.)
--          is written from the dashboard as the acting admin.
create policy "admin_insert_audit_logs"
  on public.admin_audit_logs for insert
  with check (public.is_admin() and admin_id = auth.uid());

-- Policy: Admins can read audit logs
-- Who can use it: authenticated administrators only
-- Who cannot: students / anonymous users
create policy "admin_read_audit_logs"
  on public.admin_audit_logs for select
  using (public.is_admin());

-- No update/delete policies: audit logs are append-only.

-- =========================================================
-- admins table policies
-- =========================================================

-- Policy: An admin can read only their own admin record
-- (used by the dashboard to display "logged in as ___").
-- Broader admin management (adding new admins) is intended
-- to be done by a super_admin through the Supabase dashboard
-- or a dedicated secure server-side process, not the client app.
create policy "self_read_admin_row"
  on public.admins for select
  using (id = auth.uid());
