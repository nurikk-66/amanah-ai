-- ============================================================
-- Migration 003: Suppliers, Products & Certificate Expiry Cron
-- Amanah AI — Halal Compliance Platform
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. SUPPLIERS TABLE
-- ────────────────────────────────────────────────────────────
create table if not exists public.suppliers (
  id                     uuid        primary key default gen_random_uuid(),
  name                   text        not null,
  contact_email          text,
  contact_phone          text,
  country                text,
  -- Halal certificate info
  certificate_number     text,
  certificate_issuer     text,           -- e.g. JAKIM, MUIS, MUI, IFANCA
  certificate_issued_at  date,
  certificate_expiry_date date,
  certificate_status     text        not null default 'active'
                            check (certificate_status in ('active', 'expired', 'suspended', 'pending')),
  notes                  text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. PRODUCTS TABLE (linked to suppliers)
-- ────────────────────────────────────────────────────────────
create table if not exists public.products (
  id            uuid        primary key default gen_random_uuid(),
  supplier_id   uuid        references public.suppliers(id) on delete set null,
  name          text        not null,
  sku           text,
  category      text,
  halal_status  text        not null default 'pending'
                  check (halal_status in ('halal', 'doubtful', 'haram', 'pending', 'suspended')),
  status_reason text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ────────────────────────────────────────────────────────────
create index if not exists idx_suppliers_certificate_expiry
  on public.suppliers (certificate_expiry_date)
  where certificate_status = 'active';

create index if not exists idx_products_supplier_id
  on public.products (supplier_id);

create index if not exists idx_products_halal_status
  on public.products (halal_status);

-- ────────────────────────────────────────────────────────────
-- 4. AUTO-UPDATE updated_at TRIGGER
-- ────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists suppliers_updated_at on public.suppliers;
create trigger suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 5. CERTIFICATE EXPIRY CHECK FUNCTION
--    Marks expired supplier certs → sets linked products to 'doubtful'
--    Also catches suppliers expiring in 7 days (early warning, no product change)
-- ────────────────────────────────────────────────────────────
create or replace function public.check_expired_certificates()
returns jsonb
language plpgsql
security definer
as $$
declare
  expired_supplier_count  integer := 0;
  affected_product_count  integer := 0;
  expiring_soon_count     integer := 0;
begin

  -- 5a. Mark suppliers whose certificate has expired today
  update public.suppliers
  set
    certificate_status = 'expired',
    notes = coalesce(notes || ' | ', '') ||
            'Auto-expired on ' || current_date::text,
    updated_at = now()
  where certificate_expiry_date < current_date
    and certificate_status = 'active';

  get diagnostics expired_supplier_count = row_count;

  -- 5b. Set all products linked to expired suppliers to 'doubtful'
  --     (only those currently 'halal' or 'pending' — don't overwrite 'haram')
  update public.products p
  set
    halal_status  = 'doubtful',
    status_reason = 'Supplier halal certificate expired on ' ||
                    s.certificate_expiry_date::text ||
                    '. Re-verification required before use.',
    updated_at    = now()
  from public.suppliers s
  where p.supplier_id = s.id
    and s.certificate_status = 'expired'
    and p.halal_status in ('halal', 'pending');

  get diagnostics affected_product_count = row_count;

  -- 5c. Count suppliers expiring within next 7 days (warning only, no status change)
  select count(*) into expiring_soon_count
  from public.suppliers
  where certificate_expiry_date between current_date and (current_date + interval '7 days')
    and certificate_status = 'active';

  -- Return a summary JSON for logging / Edge Function use
  return jsonb_build_object(
    'checked_at',            now(),
    'expired_suppliers',     expired_supplier_count,
    'affected_products',     affected_product_count,
    'expiring_in_7_days',    expiring_soon_count
  );

end;
$$;

-- ────────────────────────────────────────────────────────────
-- 6. CRON JOB — runs daily at 00:05 UTC
--    Requires pg_cron extension (enabled in Supabase by default)
-- ────────────────────────────────────────────────────────────
-- Enable pg_cron if not already enabled
create extension if not exists pg_cron;
-- Grant cron usage to postgres role
grant usage on schema cron to postgres;

-- Remove old job if it exists, then re-create
select cron.unschedule('amanah-check-expired-certificates')
  where exists (
    select 1 from cron.job where jobname = 'amanah-check-expired-certificates'
  );

select cron.schedule(
  'amanah-check-expired-certificates',  -- job name
  '5 0 * * *',                          -- daily at 00:05 UTC
  $$select public.check_expired_certificates();$$
);

-- ────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
alter table public.suppliers enable row level security;
alter table public.products  enable row level security;

-- Authenticated users can read all suppliers & products
create policy "Authenticated users can read suppliers"
  on public.suppliers for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can read products"
  on public.products for select
  using (auth.role() = 'authenticated');

-- Only service role can insert/update/delete (admin operations)
create policy "Service role manages suppliers"
  on public.suppliers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "Service role manages products"
  on public.products for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ────────────────────────────────────────────────────────────
-- 8. SEED: Sample data for testing
-- ────────────────────────────────────────────────────────────
insert into public.suppliers (name, country, certificate_issuer, certificate_number, certificate_expiry_date, certificate_status)
values
  ('Al-Barakah Food Industries',  'Malaysia',   'JAKIM', 'JAKIM-2024-001', current_date + interval '90 days',  'active'),
  ('Halal Star Manufacturing',    'Indonesia',  'MUI',   'MUI-2024-102',   current_date - interval '5 days',   'active'),  -- already expired, will be caught
  ('Global Halal Ingredients',    'UAE',        'ESMA',  'ESMA-2023-778',  current_date + interval '6 days',   'active'),  -- expiring soon
  ('Pure Source Trading',         'Singapore',  'MUIS',  'MUIS-2024-310',  current_date + interval '180 days', 'active')
on conflict do nothing;

-- Sample products linked to first two suppliers
with s1 as (select id from public.suppliers where certificate_number = 'JAKIM-2024-001' limit 1),
     s2 as (select id from public.suppliers where certificate_number = 'MUI-2024-102'   limit 1)
insert into public.products (supplier_id, name, sku, category, halal_status)
select s1.id, 'Halal Gelatin Powder',  'HGP-001', 'Additives',   'halal'   from s1
union all
select s1.id, 'Soy Protein Isolate',   'SPI-002', 'Proteins',    'halal'   from s1
union all
select s2.id, 'Palm Oil Refined',      'POR-003', 'Fats & Oils', 'halal'   from s2
union all
select s2.id, 'Food Grade Emulsifier', 'FGE-004', 'Additives',   'pending' from s2
on conflict do nothing;

-- ────────────────────────────────────────────────────────────
-- 9. IMMEDIATE TEST RUN
--    Run the function now so you can see it working right away
-- ────────────────────────────────────────────────────────────
select public.check_expired_certificates() as result;
