-- ============================================================
-- Migration 005: Regulatory News Cache
-- Amanah AI — Halal Compliance Platform
-- ============================================================

create table if not exists public.regulatory_news_cache (
  id          uuid        primary key default gen_random_uuid(),
  items       jsonb       not null default '[]',
  fetched_at  timestamptz not null default now()
);

-- Only ever keep 1 row (the latest cache)
-- RLS: anyone can read, only service role can write
alter table public.regulatory_news_cache enable row level security;

create policy "Public read news cache"
  on public.regulatory_news_cache for select
  using (true);

create policy "Service role manages news cache"
  on public.regulatory_news_cache for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Seed empty row so frontend always gets a response
insert into public.regulatory_news_cache (items, fetched_at)
values ('[]'::jsonb, '2000-01-01'::timestamptz)
on conflict do nothing;
