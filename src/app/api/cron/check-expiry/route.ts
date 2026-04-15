import { NextRequest, NextResponse } from "next/server";
import { checkExpiringCertificates } from "@/lib/cron-tasks";

export const runtime = "nodejs";

/**
 * POST /api/cron/check-expiry
 *
 * Triggers the certificate expiry check:
 *  - Queries suppliers expiring within 30 days
 *  - Inserts notifications into the `notifications` table
 *  - Logs a mock email summary to console
 *
 * Protect with CRON_SECRET so only your scheduler (Vercel Cron, GitHub Actions, etc.) can call it.
 * Call from vercel.json:
 *   { "crons": [{ "path": "/api/cron/check-expiry", "schedule": "0 2 * * *" }] }
 */
export async function POST(req: NextRequest) {
  // ── Auth: require CRON_SECRET header in production ───────────────────────
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await checkExpiringCertificates();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[check-expiry] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Also allow GET for easy manual testing in browser / curl
export async function GET(req: NextRequest) {
  return POST(req);
}
