import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ── Helper: build a service-role Supabase client ─────────────────────────────
function serviceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

// ── Helper: get the currently authenticated user (anon key) ──────────────────
async function getUser() {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function GET(req: NextRequest) {
  // ── Admin gate ───────────────────────────────────────────────────────────
  const user = await getUser();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!user || !adminEmail || user.email !== adminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = serviceClient();
  const { searchParams } = new URL(req.url);
  const limit  = Math.min(Number(searchParams.get("limit")  ?? 100), 500);
  const offset = Number(searchParams.get("offset") ?? 0);
  const type   = searchParams.get("type"); // optional filter

  // ── Fetch system_logs ────────────────────────────────────────────────────
  let logsQuery = sb
    .from("system_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) logsQuery = logsQuery.eq("type", type);

  const { data: logs, count: logsCount, error: logsErr } = await logsQuery;
  if (logsErr) console.error("[admin/logs] system_logs:", logsErr.message);

  // ── Fetch recent scans (with user email via metadata) ────────────────────
  const { data: scans, error: scansErr } = await sb
    .from("scans")
    .select("id, scan_id, product_name, overall_status, compliance_score, risk_level, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (scansErr) console.error("[admin/logs] scans:", scansErr.message);

  // ── Fetch user emails for scan rows ──────────────────────────────────────
  let userMap: Record<string, string> = {};
  try {
    const { data: { users } } = await sb.auth.admin.listUsers({ perPage: 500 });
    userMap = Object.fromEntries(users.map(u => [u.id, u.email ?? "—"]));
  } catch {
    // not critical — just skip emails
  }

  const enrichedScans = (scans ?? []).map(s => ({
    ...s,
    user_email: s.user_id ? (userMap[s.user_id] ?? "unknown") : "anonymous",
  }));

  // ── Aggregate stats ──────────────────────────────────────────────────────
  const now = Date.now();
  const since24h = new Date(now - 86_400_000).toISOString();
  const since7d  = new Date(now - 7 * 86_400_000).toISOString();

  const { count: scansToday }  = await sb.from("scans").select("id", { count: "exact", head: true }).gte("created_at", since24h);
  const { count: scansWeek }   = await sb.from("scans").select("id", { count: "exact", head: true }).gte("created_at", since7d);
  const { count: errorsToday } = await sb.from("system_logs").select("id", { count: "exact", head: true }).like("type", "%error%").gte("created_at", since24h);

  const uniqueUsers = new Set((scans ?? []).filter(s => s.user_id).map(s => s.user_id)).size;

  return NextResponse.json({
    stats: {
      scans_today:    scansToday    ?? 0,
      scans_week:     scansWeek     ?? 0,
      errors_today:   errorsToday   ?? 0,
      unique_users:   uniqueUsers,
      total_scans:    enrichedScans.length,
      total_logs:     logsCount     ?? 0,
    },
    logs:  logs  ?? [],
    scans: enrichedScans,
  });
}
