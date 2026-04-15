import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function serviceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  if (!batchId || !/^AMN-[0-9A-F]{8}$/i.test(batchId)) {
    return NextResponse.json({ error: "Invalid batch ID format" }, { status: 400 });
  }

  const sb = serviceClient();
  const { data, error } = await sb
    .from("scans")
    .select(
      "batch_id, scan_id, product_name, overall_status, compliance_score, risk_level, reason, ingredients, scan_engine, created_at"
    )
    .eq("batch_id", batchId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Passport not found" }, { status: 404 });
  }

  return NextResponse.json({ scan: data }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
