-- ─── AuditAI Core Schema ──────────────────────────────────────────────────────
-- Companies (State enterprises)
create table if not exists public.companies (
  id                uuid primary key default gen_random_uuid(),
  name              text not null unique,
  sector            text not null, -- energy, manufacturing, agritech, finance, etc.
  revenue_usd       numeric(15, 2),
  employee_count    integer,
  privatization_readiness_score integer default 0, -- 0-100
  risk_level        text check (risk_level in ('low', 'medium', 'high', 'critical')),
  status            text default 'pending' check (status in ('pending', 'in_review', 'auditing', 'approved', 'rejected')),
  description       text,
  logo_url          text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Users/Auditors
create table if not exists public.users (
  id                uuid primary key references auth.users(id) on delete cascade,
  email             text not null unique,
  full_name         text,
  role              text default 'auditor' check (role in ('admin', 'auditor', 'reviewer', 'viewer')),
  department        text,
  profile_picture   text,
  is_active         boolean default true,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Financial Audits
create table if not exists public.audits (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  created_by        uuid not null references public.users(id) on delete set null,
  title             text not null,
  description       text,
  audit_type        text check (audit_type in ('financial', 'operational', 'compliance', 'combined')),
  status            text default 'draft' check (status in ('draft', 'in_progress', 'completed', 'archived')),
  overall_score     numeric(5, 2), -- 0.00-100.00
  risk_assessment   text, -- 'low', 'medium', 'high', 'critical'
  total_findings    integer default 0,
  critical_findings integer default 0,

  -- Financial metrics
  total_revenue_reviewed numeric(15, 2),
  total_expenses_identified numeric(15, 2),
  financial_leaks_usd numeric(15, 2), -- Amount of financial inefficiencies found
  optimization_potential_usd numeric(15, 2),

  -- Metadata
  file_url          text, -- encrypted file storage
  report_url        text,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now(),
  completed_at      timestamptz
);

-- Audit Findings (Detailed issues)
create table if not exists public.audit_findings (
  id                uuid primary key default gen_random_uuid(),
  audit_id          uuid not null references public.audits(id) on delete cascade,
  category          text not null, -- 'revenue_leak', 'cost_overrun', 'compliance_gap', 'efficiency_loss', 'fraud_risk'
  severity          text not null check (severity in ('low', 'medium', 'high', 'critical')),
  title             text not null,
  description       text,
  affected_amount_usd numeric(15, 2),
  recommendation    text,
  status            text default 'open' check (status in ('open', 'in_progress', 'resolved', 'ignored')),
  resolution_date   timestamptz,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Financial Data (Encrypted uploads)
create table if not exists public.financial_data (
  id                uuid primary key default gen_random_uuid(),
  audit_id          uuid not null references public.audits(id) on delete cascade,
  file_name         text not null,
  file_type         text, -- pdf, xlsx, csv
  encrypted_hash    text not null unique, -- AES-256 encrypted hash
  file_size_bytes   integer,
  period_start      date,
  period_end        date,
  data_categories   text[], -- array of: 'revenue', 'expenses', 'assets', 'liabilities', 'payroll'
  created_at        timestamptz default now()
);

-- Audit Comments/Collaboration
create table if not exists public.audit_comments (
  id                uuid primary key default gen_random_uuid(),
  audit_id          uuid not null references public.audits(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete set null,
  content           text not null,
  is_internal       boolean default false, -- only visible to auditors
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- ─── Row-Level Security (RLS) ───────────────────────────────────────────────────

-- Companies: Public read, admin/auditor modify
alter table public.companies enable row level security;

create policy "Anyone can view companies"
  on public.companies for select
  using (true);

create policy "Admins can manage companies"
  on public.companies for insert
  with check (auth.jwt() ->> 'role' = 'authenticated' AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

create policy "Admins can update companies"
  on public.companies for update
  using (auth.jwt() ->> 'role' = 'authenticated' AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Users: Users can view, admins manage
alter table public.users enable row level security;

create policy "Users can view all users"
  on public.users for select
  using (true);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Admins can insert users"
  on public.users for insert
  with check ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Audits: Auditors see their own, admins see all
alter table public.audits enable row level security;

create policy "Users can view audits for their companies"
  on public.audits for select
  using (
    auth.uid() = created_by OR
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

create policy "Auditors can create audits"
  on public.audits for insert
  with check (auth.uid() = created_by AND auth.jwt() ->> 'role' = 'authenticated');

create policy "Auditors can update own audits"
  on public.audits for update
  using (auth.uid() = created_by OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- Audit Findings: Same as audits
alter table public.audit_findings enable row level security;

create policy "Users can view findings on their audits"
  on public.audit_findings for select
  using (
    audit_id IN (SELECT id FROM public.audits WHERE created_by = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  );

-- Financial Data: Encrypted, strict access
alter table public.financial_data enable row level security;

create policy "Users can view encrypted data on their audits"
  on public.financial_data for select
  using (
    audit_id IN (SELECT id FROM public.audits WHERE created_by = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  );

-- Audit Comments
alter table public.audit_comments enable row level security;

create policy "Auditors can view comments on their audits"
  on public.audit_comments for select
  using (
    audit_id IN (SELECT id FROM public.audits WHERE created_by = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  );

create policy "Auditors can insert comments on their audits"
  on public.audit_comments for insert
  with check (auth.uid() = user_id AND auth.jwt() ->> 'role' = 'authenticated');

-- ─── Indexes for Performance ────────────────────────────────────────────────────
create index if not exists idx_audits_company_id on public.audits(company_id);
create index if not exists idx_audits_created_by on public.audits(created_by);
create index if not exists idx_audits_status on public.audits(status);
create index if not exists idx_audit_findings_audit_id on public.audit_findings(audit_id);
create index if not exists idx_audit_findings_severity on public.audit_findings(severity);
create index if not exists idx_financial_data_audit_id on public.financial_data(audit_id);
create index if not exists idx_audit_comments_audit_id on public.audit_comments(audit_id);
create index if not exists idx_companies_sector on public.companies(sector);
create index if not exists idx_companies_status on public.companies(status);

-- ─── Storage Bucket for Encrypted Files ──────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('audit-documents', 'audit-documents', false)
on conflict (id) do nothing;

create policy "Users can access own audit documents"
  on storage.objects for select
  using (
    bucket_id = 'audit-documents' AND
    (storage.foldername(name))[1]::uuid IN (SELECT id FROM public.audits WHERE created_by = auth.uid() OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin')
  );

create policy "Users can upload audit documents"
  on storage.objects for insert
  with check (
    bucket_id = 'audit-documents' AND
    auth.jwt() ->> 'role' = 'authenticated'
  );

-- ─── Seed Data: Sample State Companies ──────────────────────────────────────
insert into public.companies (name, sector, revenue_usd, employee_count, privatization_readiness_score, risk_level, status, description) values
  ('UzAuto', 'manufacturing', 2500000000, 15000, 72, 'medium', 'in_review', 'Leading automotive manufacturer'),
  ('Navoiyazot', 'energy', 1800000000, 8500, 65, 'medium', 'pending', 'Chemical and fertilizer production'),
  ('Uzbekneftegaz', 'energy', 5200000000, 22000, 58, 'high', 'pending', 'Oil and gas sector'),
  ('Uzbekistan Airways', 'transportation', 850000000, 5200, 68, 'medium', 'in_review', 'National airline'),
  ('Asaka Bank', 'finance', 1200000000, 3800, 75, 'low', 'in_review', 'Leading microfinance institution'),
  ('Tashkent Electric Power', 'energy', 650000000, 4100, 62, 'high', 'pending', 'Power distribution'),
  ('Zarafshan Silk', 'textiles', 280000000, 2100, 70, 'low', 'in_review', 'Silk manufacturing'),
  ('Yangiabad Dairy', 'agriculture', 180000000, 1800, 78, 'low', 'approved', 'Agricultural cooperative')
on conflict (name) do nothing;
