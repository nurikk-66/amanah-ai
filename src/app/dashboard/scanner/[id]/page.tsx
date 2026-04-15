"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ArrowLeft, TrendingDown, TrendingUp, Minus,
  AlertTriangle, CheckCircle2, XCircle, Clock,
  BarChart2, Shield, Loader2, Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Ingredient {
  name: string;
  status: "halal" | "doubtful" | "haram";
  risk: string;
  confidence: number;
  details?: string;
  jakim?: string;
}

interface ScanRecord {
  id: string;
  scan_id: string;
  product_name: string;
  overall_status: "halal" | "doubtful" | "haram";
  compliance_score: number;
  risk_level: string;
  reason: string | null;
  ingredients: Ingredient[];
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const scoreColor = (s: number) =>
  s >= 80 ? "#10b981" : s >= 50 ? "#f59e0b" : "#ef4444";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const statusCfg = {
  halal:    { icon: CheckCircle2,  cls: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30", label: "Halal" },
  doubtful: { icon: AlertTriangle, cls: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/30",     label: "Doubtful" },
  haram:    { icon: XCircle,       cls: "text-red-400",     bg: "bg-red-500/10 border-red-500/30",         label: "Haram" },
};

// ─── Custom Recharts Tooltip ─────────────────────────────────────────────────
interface TooltipPayload { value: number; name: string }
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: TooltipPayload[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 shadow-2xl">
      <p className="text-[10px] text-slate-400 mb-0.5">{label}</p>
      <p className="text-base font-bold" style={{ color: scoreColor(score) }}>{score}<span className="text-xs text-slate-500">/100</span></p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ScanDetailPage() {
  const params = useParams();
  const scanId = params.id as string;

  const [scan, setScan]       = useState<ScanRecord | null>(null);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Fetch: current scan + product history in parallel ───────────────────
  useEffect(() => {
    if (!scanId) return;
    const sb = createClient();
    let cancelled = false;

    (async () => {
      // Step 1: get current scan
      const { data: current, error } = await sb
        .from("scans")
        .select("*")
        .eq("scan_id", scanId)
        .single();

      if (cancelled) return;
      if (error || !current) { setNotFound(true); setLoading(false); return; }

      // Step 2: get last 5 scans of same product (parallel-safe, single query)
      const { data: hist } = await sb
        .from("scans")
        .select("id, scan_id, product_name, compliance_score, overall_status, created_at, risk_level, reason, ingredients")
        .eq("product_name", current.product_name)
        .order("created_at", { ascending: false })
        .limit(5);

      if (cancelled) return;
      setScan(current);
      setHistory(hist ?? []);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [scanId]);

  // ── Derived trend data ────────────────────────────────────────────────────
  const chartData = [...history].reverse().map((h, i, arr) => ({
    label:     i === arr.length - 1 ? "Now" : fmtDate(h.created_at),
    score:     h.compliance_score,
    isCurrent: h.scan_id === scanId,
  }));

  const prevScores = history
    .filter(h => h.scan_id !== scanId)
    .map(h => h.compliance_score);

  const prevAvg  = prevScores.length > 0
    ? Math.round(prevScores.reduce((a, b) => a + b, 0) / prevScores.length)
    : null;

  const currentScore = scan?.compliance_score ?? 0;
  const delta        = prevAvg !== null ? currentScore - prevAvg : null;
  const isDeclining  = delta !== null && delta < -5;
  const isImproving  = delta !== null && delta > 5;
  const hasEnoughHistory = history.length >= 2;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound || !scan) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/[0.06] bg-slate-900/60 py-20 text-center">
          <Shield className="h-10 w-10 text-slate-700 mb-3" />
          <p className="text-lg font-semibold text-white">Scan not found</p>
          <p className="text-sm text-slate-500 mt-1 mb-5">Scan ID <span className="font-mono text-slate-400">{scanId}</span> does not exist.</p>
          <Link href="/dashboard/scanner" className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">
            ← Back to Scanner
          </Link>
        </div>
      </div>
    );
  }

  const s = statusCfg[scan.overall_status];
  const StatusIcon = s.icon;

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">

      {/* ── Back nav ─────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard/scanner"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Scanner
      </Link>

      {/* ── Scan summary banner ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl border bg-gradient-to-br p-5 ${
          scan.overall_status === "halal"
            ? "from-emerald-900/30 via-slate-900 to-slate-900 border-emerald-500/20"
            : scan.overall_status === "doubtful"
            ? "from-amber-900/20 via-slate-900 to-slate-900 border-amber-500/20"
            : "from-red-900/20 via-slate-900 to-slate-900 border-red-500/20"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${s.bg}`}>
              <StatusIcon className={`h-6 w-6 ${s.cls}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{scan.product_name}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="font-mono">{scan.scan_id}</span>
                <span className="text-slate-700">·</span>
                <Clock className="h-3 w-3" />
                <span>{fmtDate(scan.created_at)}</span>
              </div>
              {scan.reason && <p className="text-sm text-slate-400 mt-1.5 max-w-sm">{scan.reason}</p>}
            </div>
          </div>

          <div className="text-center">
            <div className="text-3xl font-extrabold" style={{ color: scoreColor(currentScore) }}>
              {currentScore}
            </div>
            <div className="text-xs text-slate-500">/ 100 compliance</div>
            <div className={`mt-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${s.bg} ${s.cls}`}>
              {s.label}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Trend chart ──────────────────────────────────────────────────── */}
      {hasEnoughHistory && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl border border-white/[0.06] bg-slate-900/60 p-5"
        >
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Activity className="h-4 w-4 text-emerald-400" />
              <p className="font-semibold text-white text-sm">Compliance Trend</p>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                Last {history.length} scans
              </span>
            </div>

            {/* Trend badge */}
            {delta !== null && (
              <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                isDeclining ? "border-red-500/30 bg-red-500/10 text-red-400" :
                isImproving ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                              "border-slate-700 bg-slate-800 text-slate-400"
              }`}>
                {isDeclining ? <TrendingDown className="h-3 w-3" /> :
                 isImproving ? <TrendingUp   className="h-3 w-3" /> :
                               <Minus        className="h-3 w-3" />}
                {isDeclining ? `Down ${Math.abs(delta)} pts` :
                 isImproving ? `Up ${delta} pts` :
                               "Stable"}
              </div>
            )}
          </div>

          {/* Warning / improving banner */}
          <AnimatePresence>
            {isDeclining && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-300"
              >
                <TrendingDown className="h-4 w-4 shrink-0 text-red-400" />
                <span>
                  Compliance score dropped <strong>{Math.abs(delta!)} points</strong> below the previous average of {prevAvg}/100. Review recent ingredient changes.
                </span>
              </motion.div>
            )}
            {isImproving && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300"
              >
                <TrendingUp className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>
                  Score improved <strong>{delta} points</strong> above the previous average of {prevAvg}/100.
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chart */}
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                {/* Previous average reference line */}
                {prevAvg !== null && (
                  <ReferenceLine
                    y={prevAvg}
                    stroke="#64748b"
                    strokeDasharray="4 4"
                    label={{ value: `Avg ${prevAvg}`, position: "insideTopRight", fontSize: 9, fill: "#64748b" }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#scoreGrad)"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    const color = scoreColor(payload.score);
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx} cy={cy} r={payload.isCurrent ? 5 : 3}
                        fill={color}
                        stroke={payload.isCurrent ? "#0f172a" : color}
                        strokeWidth={payload.isCurrent ? 2 : 0}
                      />
                    );
                  }}
                  activeDot={{ r: 5, fill: "#10b981", stroke: "#0f172a", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Quick stats row */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "Highest",  value: Math.max(...history.map(h => h.compliance_score)) },
              { label: "Average",  value: prevAvg ?? currentScore },
              { label: "Lowest",   value: Math.min(...history.map(h => h.compliance_score)) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-white/[0.05] bg-slate-950/40 px-4 py-3 text-center">
                <p className="text-lg font-bold" style={{ color: scoreColor(value) }}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* First-scan note (no trend yet) */}
      {!hasEnoughHistory && (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-slate-900/40 px-4 py-3 text-sm text-slate-500">
          <BarChart2 className="h-4 w-4 shrink-0 text-slate-600" />
          Trend chart will appear once this product has been scanned at least twice.
        </div>
      )}

      {/* ── Ingredients breakdown ─────────────────────────────────────────── */}
      {scan.ingredients && scan.ingredients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl border border-white/[0.06] bg-slate-900/60 overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <p className="text-sm font-semibold text-white">Ingredient Breakdown</p>
            <span className="text-xs text-slate-500">{scan.ingredients.length} ingredients</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {scan.ingredients.map((ing) => {
              const sc = statusCfg[ing.status];
              const Icon = sc.icon;
              return (
                <div key={ing.name} className="flex items-center gap-4 px-5 py-3">
                  <Icon className={`h-4 w-4 shrink-0 ${sc.cls}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{ing.name}</p>
                    {ing.jakim && <p className="text-[10px] text-slate-600 font-mono">{ing.jakim}</p>}
                  </div>
                  {ing.confidence !== undefined && (
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            ing.status === "halal" ? "bg-emerald-500" :
                            ing.status === "doubtful" ? "bg-amber-500" : "bg-red-500"
                          }`}
                          style={{ width: `${ing.confidence}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[10px] text-slate-500">{ing.confidence}%</span>
                    </div>
                  )}
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sc.bg} ${sc.cls}`}>
                    {sc.label}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

    </div>
  );
}
