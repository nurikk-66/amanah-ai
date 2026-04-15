-- ============================================================
-- Migration 004: Brand Leaderboard View
-- Amanah AI — Halal Compliance Platform
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. BRAND LEADERBOARD VIEW
--    Aggregates audit_logs by product_name (brand)
--    Calculates: avg score, scan count, status breakdown, rank
-- ────────────────────────────────────────────────────────────
create or replace view public.brand_leaderboard as
with aggregated as (
  select
    product_name                                            as brand,
    count(*)::int                                          as scan_count,
    round(avg(compliance_score))::int                      as avg_score,
    count(*) filter (where overall_status = 'halal')::int  as halal_count,
    count(*) filter (where overall_status = 'doubtful')::int as doubtful_count,
    count(*) filter (where overall_status = 'haram')::int  as haram_count,
    max(created_at)                                        as last_scanned
  from public.audit_logs
  group by product_name
)
select
  *,
  rank() over (order by avg_score desc)::int as rank
from aggregated
order by avg_score desc;

-- Grant read access to authenticated users
-- (View runs as postgres role — bypasses RLS on audit_logs intentionally)
grant select on public.brand_leaderboard to authenticated;
grant select on public.brand_leaderboard to anon;

-- ────────────────────────────────────────────────────────────
-- 2. QUICK TEST
-- ────────────────────────────────────────────────────────────
select * from public.brand_leaderboard limit 10;
