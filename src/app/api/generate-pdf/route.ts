import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateAuditPDF } from "@/lib/pdf-generator";
import { type AuditReportData } from "@/components/AuditReportPDF";
import { rateLimit, getIP } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Rate limit: 10 PDFs per minute per IP
  const ip    = getIP(req);
  const limit = rateLimit(`generate-pdf:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Parse + validate body
  let data: AuditReportData;
  try {
    data = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!data.scanId || !data.product || !data.ingredients?.length) {
    return NextResponse.json(
      { error: "Missing required fields: scanId, product, ingredients" },
      { status: 400 }
    );
  }

  // Get authenticated user (optional)
  const cookieStore = await cookies();
  const anonSb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await anonSb.auth.getUser();

  // Generate PDF, upload to Supabase Storage, save to audit_logs
  try {
    const { url, fileName } = await generateAuditPDF(data, user?.id);
    return NextResponse.json({ url, fileName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[generate-pdf] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
