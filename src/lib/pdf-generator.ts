/**
 * pdf-generator.ts
 * Server-side PDF generation utility using @react-pdf/renderer.
 * Renders an Amanah AI Audit Report, uploads to Supabase Storage,
 * saves a record in audit_logs, and returns the public URL.
 *
 * Usage (server-side only):
 *   import { generateAuditPDF } from "@/lib/pdf-generator";
 *   const { url } = await generateAuditPDF(data, userId);
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@supabase/supabase-js";
import { AuditReportPDF, type AuditReportData } from "@/components/AuditReportPDF";

const BUCKET = "audit-reports";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function ensureBucket(sb: ReturnType<typeof serviceClient>) {
  const { data: buckets } = await sb.storage.listBuckets();
  if (!buckets?.some((b) => b.id === BUCKET)) {
    await sb.storage.createBucket(BUCKET, { public: true });
  }
}

export interface GeneratePDFResult {
  url: string;
  fileName: string;
}

/**
 * Generate a PDF audit report for a completed scan.
 * @param data      - Scan result data (product, ingredients, scores, etc.)
 * @param userId    - Authenticated user's UUID (optional — stored in audit_logs)
 */
export async function generateAuditPDF(
  data: AuditReportData,
  userId?: string | null
): Promise<GeneratePDFResult> {
  // 1. Render PDF to buffer
  const pdfBuffer = await renderToBuffer(
    createElement(AuditReportPDF, { data })
  );

  const sb = serviceClient();
  await ensureBucket(sb);

  // 2. Upload to Supabase Storage
  const fileName = `${data.scanId}-${Date.now()}.pdf`;

  const { error: uploadError } = await sb.storage
    .from(BUCKET)
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // 3. Get public URL
  const {
    data: { publicUrl },
  } = sb.storage.from(BUCKET).getPublicUrl(fileName);

  // 4. Persist to audit_logs (non-fatal — don't throw if this fails)
  const { error: dbError } = await sb.from("audit_logs").insert({
    user_id:          userId ?? null,
    scan_id:          data.scanId,
    product_name:     data.product,
    overall_status:   data.overallStatus,
    compliance_score: data.complianceScore,
    risk_level:       data.riskLevel,
    pdf_url:          publicUrl,
  });

  if (dbError) {
    console.error("[pdf-generator] audit_logs insert error:", dbError.message);
  }

  return { url: publicUrl, fileName };
}
