-- ─── audit_logs table ────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete set null,
  scan_id          text not null,
  product_name     text not null,
  overall_status   text not null,
  compliance_score integer not null,
  risk_level       text not null,
  pdf_url          text,
  created_at       timestamptz default now()
);

-- RLS
alter table public.audit_logs enable row level security;

create policy "Users can view own audit logs"
  on public.audit_logs for select
  using (auth.uid() = user_id);

create policy "Service role can insert audit logs"
  on public.audit_logs for insert
  with check (true);

-- ─── Supabase Storage bucket ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('audit-reports', 'audit-reports', true)
on conflict (id) do nothing;

create policy "Public read audit reports"
  on storage.objects for select
  using (bucket_id = 'audit-reports');

create policy "Service role upload audit reports"
  on storage.objects for insert
  with check (bucket_id = 'audit-reports');
