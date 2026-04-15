/**
 * cron-tasks.ts
 * Server-side expiry monitoring utilities.
 *
 * checkExpiringCertificates()
 *   - Queries suppliers whose certificates expire within the next 30 days
 *     (or are already expired).
 *   - Inserts a notification row for each affected supplier.
 *   - Sends a mock email summary (console.log in dev).
 *
 * Called from: POST /api/cron/check-expiry
 * Can also be wired to pg_cron if desired.
 */

import { createClient } from "@supabase/supabase-js";

// ── Supabase service-role client (bypasses RLS) ──────────────────────────────

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface Supplier {
  id: string;
  name: string;
  certificate_number: string | null;
  certificate_expiry_date: string | null;   // ISO date string
  certificate_status: string | null;
}

export interface ExpiryCheckResult {
  checked_at: string;
  suppliers_checked: number;
  notifications_inserted: number;
  already_expired: Supplier[];
  expiring_soon: Supplier[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const expiry = new Date(dateStr).setHours(0, 0, 0, 0);
  const today  = new Date().setHours(0, 0, 0, 0);
  return Math.ceil((expiry - today) / 86_400_000);
}

function buildTitle(days: number, supplierName: string): string {
  if (days < 0)  return `Certificate expired: ${supplierName}`;
  if (days === 0) return `Certificate expires today: ${supplierName}`;
  return `Certificate expiring in ${days} day${days === 1 ? "" : "s"}: ${supplierName}`;
}

function buildMessage(supplier: Supplier, days: number): string {
  const certRef = supplier.certificate_number
    ? ` (Cert #${supplier.certificate_number})`
    : "";

  if (days < 0) {
    return `${supplier.name}${certRef} certificate expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Products linked to this supplier may be flagged as doubtful. Please renew immediately.`;
  }
  if (days === 0) {
    return `${supplier.name}${certRef} certificate expires today. Renew now to avoid compliance issues.`;
  }
  return `${supplier.name}${certRef} certificate will expire on ${supplier.certificate_expiry_date}. ${days} day${days === 1 ? "" : "s"} remaining — renew before it lapses.`;
}

// ── Mock email summary ────────────────────────────────────────────────────────
// Replace this with your email provider (Resend, SendGrid, etc.) when ready.

function sendMockEmailSummary(
  expired: Supplier[],
  expiringSoon: Supplier[]
): void {
  if (expired.length === 0 && expiringSoon.length === 0) return;

  console.log("\n========== [Amanah AI] Certificate Expiry Summary ==========");
  console.log(`Sent at: ${new Date().toISOString()}`);

  if (expired.length > 0) {
    console.log("\n🔴 ALREADY EXPIRED:");
    expired.forEach((s) => {
      console.log(`  • ${s.name} — expired ${s.certificate_expiry_date}`);
    });
  }

  if (expiringSoon.length > 0) {
    console.log("\n⚠️  EXPIRING WITHIN 30 DAYS:");
    expiringSoon.forEach((s) => {
      const days = daysUntil(s.certificate_expiry_date!);
      console.log(`  • ${s.name} — expires ${s.certificate_expiry_date} (${days} days)`);
    });
  }

  console.log("\nAction: Log in to Amanah AI dashboard to manage certificates.");
  console.log("============================================================\n");
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function checkExpiringCertificates(): Promise<ExpiryCheckResult> {
  const sb = serviceClient();

  const DAYS_AHEAD = 30;
  const today   = new Date();
  const cutoff  = new Date(today);
  cutoff.setDate(cutoff.getDate() + DAYS_AHEAD);

  const todayStr  = today.toISOString().split("T")[0];
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // ── 1. Query suppliers with expiring/expired certificates ───────────────────
  const { data: suppliers, error } = await sb
    .from("suppliers")
    .select("id, name, certificate_number, certificate_expiry_date, certificate_status")
    .not("certificate_expiry_date", "is", null)
    .lte("certificate_expiry_date", cutoffStr)   // expiry ≤ today + 30 days
    .order("certificate_expiry_date", { ascending: true });

  if (error) {
    throw new Error(`Failed to query suppliers: ${error.message}`);
  }

  const rows = (suppliers ?? []) as Supplier[];

  const alreadyExpired = rows.filter(
    (s) => s.certificate_expiry_date! < todayStr
  );
  const expiringSoon = rows.filter(
    (s) => s.certificate_expiry_date! >= todayStr
  );

  // ── 2. Insert a notification for each affected supplier ─────────────────────
  let insertedCount = 0;

  for (const supplier of rows) {
    const days = daysUntil(supplier.certificate_expiry_date!);

    const notification = {
      user_id:    null,                               // broadcast — visible to all dashboard users
      type:       "expiry" as const,
      title:      buildTitle(days, supplier.name),
      message:    buildMessage(supplier, days),
      read:       false,
      metadata: {
        supplier_id:          supplier.id,
        supplier_name:        supplier.name,
        certificate_number:   supplier.certificate_number,
        certificate_expiry:   supplier.certificate_expiry_date,
        days_until_expiry:    days,
      },
    };

    const { error: insertErr } = await sb
      .from("notifications")
      .insert(notification);

    if (insertErr) {
      console.error(`[cron-tasks] Failed to insert notification for ${supplier.name}:`, insertErr.message);
    } else {
      insertedCount++;
    }
  }

  // ── 3. Mock email summary ────────────────────────────────────────────────────
  sendMockEmailSummary(alreadyExpired, expiringSoon);

  return {
    checked_at:            new Date().toISOString(),
    suppliers_checked:     rows.length,
    notifications_inserted: insertedCount,
    already_expired:       alreadyExpired,
    expiring_soon:         expiringSoon,
  };
}
