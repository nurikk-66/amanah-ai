-- ============================================================
-- Migration 006 — notifications table
-- Stores expiry alerts and system notifications per user.
-- ============================================================

create table if not exists public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        null,                          -- null = broadcast to all
  type        text        not null default 'expiry'
                          check (type in ('expiry', 'scan', 'system')),
  title       text        not null,
  message     text        not null,
  read        boolean     not null default false,
  metadata    jsonb       null,                          -- extra data (supplier_id, days_until_expiry, etc.)
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists notifications_user_id_idx  on public.notifications (user_id);
create index if not exists notifications_read_idx     on public.notifications (read) where read = false;
create index if not exists notifications_created_idx  on public.notifications (created_at desc);

-- RLS
alter table public.notifications enable row level security;

-- Authenticated users can read their own + broadcast notifications
create policy "Users read own notifications" on public.notifications
  for select using (
    auth.uid() = user_id or user_id is null
  );

-- Authenticated users can mark their own as read
create policy "Users update own notifications" on public.notifications
  for update using (
    auth.uid() = user_id or user_id is null
  );

-- Service role manages everything (used by cron-tasks server code)
create policy "Service role full access" on public.notifications
  for all using (true)
  with check (true);
