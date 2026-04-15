-- ============================================================
-- 007 · System / Admin Logs
-- ============================================================
-- Captures every scan attempt, API error, rate-limit hit, and
-- auth event. Readable only via service-role key (admin-only).
-- ============================================================

create table if not exists system_logs (
  id           uuid        primary key default gen_random_uuid(),
  created_at   timestamptz not null    default now(),

  -- Who
  user_id      uuid        references auth.users(id) on delete set null,
  user_email   text,
  ip_address   text,

  -- What happened
  type         text        not null,   -- scan_success | scan_error | api_error | rate_limit | auth_event | pdf_generated
  message      text,
  file_name    text,
  file_size    bigint,
  file_type    text,

  -- Extra context (product name, score, status, etc.)
  metadata     jsonb       not null    default '{}'
);

-- Only the service-role key can read or write (no anon / user access)
alter table system_logs enable row level security;

-- Deny all access to regular users; service-role bypasses RLS
create policy "deny_all_users" on system_logs
  as restrictive
  for all
  using (false);

-- Fast lookups
create index idx_system_logs_created_at on system_logs (created_at desc);
create index idx_system_logs_type       on system_logs (type);
create index idx_system_logs_user_id    on system_logs (user_id);
