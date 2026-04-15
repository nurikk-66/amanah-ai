import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { CheckCircle2, AlertTriangle, XCircle, Shield, ExternalLink } from "lucide-react";
import Link from "next/link";
import { TraceabilityTimeline } from "@/components/traceability-timeline";
import { buildTimelineStages } from "@/lib/timeline-stages";
import { QrCard } from "./qr-card";
import type { Metadata } from "next";

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function getScan(batchId: string) {
  try {
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    const { data, error } = await sb
      .from("scans")
      .select("batch_id, scan_id, product_name, overall_status, compliance_score, risk_level, reason, ingredients, created_at")
      .eq("batch_id", batchId)
      .single();

    if (error) {
      console.error("[verify] getScan error:", error.message);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.error("[verify] getScan threw:", e);
    return null;
  }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata(
  { params }: { params: Promise<{ batchId: string }> }
): Promise<Metadata> {
  const { batchId } = await params;
  const scan = await getScan(batchId);
  if (!scan) return { title: "Passport Not Found | Amanah" };
  return {
    title: `${scan.product_name} — Digital Passport | Amanah`,
    description: `Halal compliance verification for ${scan.product_name}. BatchID: ${batchId}. Status: ${scan.overall_status.toUpperCase()}.`,
  };
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  halal:    { label: "HALAL COMPLIANT",  cls: "from-emerald-900/40 border-emerald-500/20", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: CheckCircle2,  dot: "bg-emerald-400" },
  doubtful: { label: "REVIEW REQUIRED",  cls: "from-amber-900/30  border-amber-500/20",   badge: "bg-amber-500/20  text-amber-300  border-amber-500/30",  icon: AlertTriangle, dot: "bg-amber-400"   },
  haram:    { label: "NON-COMPLIANT",    cls: "from-red-900/30    border-red-500/20",     badge: "bg-red-500/20    text-red-300    border-red-500/30",    icon: XCircle,       dot: "bg-red-400"     },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function VerifyPage(
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  if (!/^AMN-[0-9A-F]{8}$/i.test(batchId)) notFound();

  const scan = await getScan(batchId);
  if (!scan) notFound();

  const status  = scan.overall_status as "halal" | "doubtful" | "haram";
  const cfg     = STATUS[status];
  const Icon    = cfg.icon;
  const stages  = buildTimelineStages(status, scan.created_at);
  const scanUrl = `https://amanah-ai.vercel.app/verify/${batchId}`;

  const halalCt    = (scan.ingredients ?? []).filter((i: {status:string}) => i.status === "halal").length;
  const doubtfulCt = (scan.ingredients ?? []).filter((i: {status:string}) => i.status === "doubtful").length;
  const haramCt    = (scan.ingredients ?? []).filter((i: {status:string}) => i.status === "haram").length;

  return (
    <div className="min-h-screen" style={{ background: "#050810" }}>

      {/* Top nav */}
      <nav className="flex items-center justify-between border-b border-white/[0.05] px-5 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
              <path d="M12 2L4 6v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V6l-8-4z" />
            </svg>
          </div>
          <span className="font-black text-white tracking-tight">
            Amanah<span className="text-emerald-400">.</span>
          </span>
        </Link>
        <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Digital Product Passport
        </span>
      </nav>

      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">

        {/* Status banner */}
        <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br via-[#080c18] to-[#080c18] p-6 ${cfg.cls}`}>
          <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-white/[0.015] blur-3xl" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                status === "halal" ? "bg-emerald-500/20 ring-1 ring-emerald-500/30" :
                status === "doubtful" ? "bg-amber-500/20 ring-1 ring-amber-500/30" :
                "bg-red-500/20 ring-1 ring-red-500/30"
              }`}>
                <Icon className={`h-7 w-7 ${status === "halal" ? "text-emerald-400" : status === "doubtful" ? "text-amber-400" : "text-red-400"}`} />
              </div>
              <div>
                <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-black tracking-widest ${cfg.badge}`}>
                  {cfg.label}
                </span>
                <h1 className="mt-1.5 text-xl font-black text-white">{scan.product_name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">{scan.scan_id}</span>
                  <span className="text-slate-700">·</span>
                  <span className="font-mono font-bold text-white">{batchId}</span>
                  <span className="text-slate-700">·</span>
                  <span>{new Date(scan.created_at).toLocaleDateString("en-MY", { day: "2-digit", month: "long", year: "numeric" })}</span>
                </div>
                {scan.reason && (
                  <p className="mt-2 max-w-md text-sm text-slate-300">{scan.reason}</p>
                )}
              </div>
            </div>

            {/* Compliance score */}
            <div className="text-center shrink-0">
              <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl ring-1 ${
                status === "halal" ? "bg-emerald-500/15 ring-emerald-500/25 text-emerald-400" :
                status === "doubtful" ? "bg-amber-500/15 ring-amber-500/25 text-amber-400" :
                "bg-red-500/15 ring-red-500/25 text-red-400"
              }`}>
                <span className="text-xl font-extrabold">{scan.compliance_score}</span>
                <span className="text-[9px] opacity-70">/ 100</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">Compliance</p>
            </div>
          </div>

          {/* Ingredient counts */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "Halal",    count: halalCt,    cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" },
              { label: "Doubtful", count: doubtfulCt, cls: "border-amber-500/25   bg-amber-500/10   text-amber-400"   },
              { label: "Haram",    count: haramCt,    cls: "border-red-500/25     bg-red-500/10     text-red-400"     },
            ].map((s) => (
              <div key={s.label} className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 ${s.cls}`}>
                <span className="text-lg font-extrabold leading-none">{s.count}</span>
                <span className="text-[10px] opacity-70">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline + QR side by side on md+ */}
        <div className="grid gap-5 md:grid-cols-[1fr_220px]">

          {/* Timeline card */}
          <div className="rounded-2xl border border-white/[0.05] p-6" style={{ background: "#0d1525" }}>
            <div className="flex items-center gap-2.5 mb-6">
              <Shield className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Supply Chain Traceability</h2>
            </div>
            <TraceabilityTimeline stages={stages} />
          </div>

          {/* QR + verify stamp */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/[0.05] p-5 flex flex-col items-center" style={{ background: "#0d1525" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-4">Verify Authenticity</p>
              <QrCard url={scanUrl} batchId={batchId} />
            </div>

            {/* Verified stamp */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-center">
              <div className="flex justify-center mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/25">
                  <Shield className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              <p className="text-xs font-bold text-emerald-400">Verified by Amanah AI</p>
              <p className="text-[10px] text-slate-500 mt-1">JAKIM MS1500:2019 aligned</p>
              <p className="text-[10px] font-mono text-slate-600 mt-2">amanah-ai engine</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-5">
          <p className="text-xs text-slate-600">
            This digital passport is generated by Amanah AI and is based on the ingredient data provided at scan time.
          </p>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            amanah-ai.vercel.app <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
