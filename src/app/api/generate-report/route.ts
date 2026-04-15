import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AuditReportPDF, type AuditReportData } from "@/components/AuditReportPDF";
import { rateLimit, getIP } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Rate limit: 10 reports per minute per IP
  const ip = getIP(req);
  const limit = rateLimit(`report:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Parse body
  let data: AuditReportData;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!data.scanId || !data.product || !data.ingredients?.length) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Supabase server client (service role for storage + table writes)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  // Get authenticated user
  const anonSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await anonSupabase.auth.getUser();

  // Generate PDF buffer
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderToBuffer(
      createElement(AuditReportPDF, { data })
    );
  } catch (err) {
    console.error("[generate-report] PDF render error:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(b => b.id === "audit-reports");
  if (!bucketExists) {
    const { error: bucketErr } = await supabase.storage.createBucket("audit-reports", { public: true });
    if (bucketErr) console.error("[generate-report] Bucket create error:", bucketErr.message);
  }

  // Upload to Supabase Storage
  const fileName = `${data.scanId}-${Date.now()}.pdf`;
  const { error: uploadError } = await supabase.storage
    .from("audit-reports")
    .upload(fileName, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) {
    console.error("[generate-report] Storage upload error:", uploadError.message);
    return NextResponse.json({ error: "Upload failed", detail: uploadError.message }, { status: 500 });
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("audit-reports")
    .getPublicUrl(fileName);

  // Save to audit_logs table
  const { error: dbError } = await supabase.from("audit_logs").insert({
    user_id:          user?.id ?? null,
    scan_id:          data.scanId,
    product_name:     data.product,
    overall_status:   data.overallStatus,
    compliance_score: data.complianceScore,
    risk_level:       data.riskLevel,
    pdf_url:          publicUrl,
  });

  if (dbError) {
    console.error("[generate-report] DB insert error:", dbError.message);
    // Don't fail — PDF is already uploaded, return URL anyway
  }

  return NextResponse.json({ url: publicUrl });
}
