import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createClient } from "@supabase/supabase-js";
import { AuditBatchPDF, type BatchReportData } from "@/components/AuditBatchPDF";
import { rateLimit, getIP } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

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

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const rl = rateLimit(`batch-report:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const data = (await req.json()) as BatchReportData;

  if (!data.items || data.items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  try {
    const pdfBuffer = await renderToBuffer(createElement(AuditBatchPDF, { data }));

    const sb = serviceClient();
    await ensureBucket(sb);

    const fileName = `batch-${data.batchId}-${Date.now()}.pdf`;

    const { error: uploadError } = await sb.storage
      .from(BUCKET)
      .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: { publicUrl } } = sb.storage.from(BUCKET).getPublicUrl(fileName);

    return NextResponse.json({ url: publicUrl, fileName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-batch-report]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
