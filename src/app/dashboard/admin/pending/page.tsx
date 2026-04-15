"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, RefreshCw, Loader2, TrendingUp, Trash2,
  CheckCircle2, AlertTriangle, XCircle, Clock, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PendingIngredient {
  id: string;
  name: string;
  detected_status: "halal" | "doubtful" | "haram" | string;
  frequency_count: number;
  last_seen: string;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-MY", { day: "2-digit", month: "short" });
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  halal:    { label: "Halal",    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", icon: CheckCircle2  },
  doubtful: { label: "Doubtful", cls: "border-amber-500/30   bg-amber-500/10   text-amber-400",   icon: AlertTriangle },
  haram:    { label: "Haram",    cls: "border-red-500/30     bg-red-500/10     text-red-400",     icon: XCircle       },
};

function statusCfg(s: string) {
  return STATUS_CFG[s] ?? { label: s, cls: "border-slate-500/30 bg-slate-500/10 text-slate-400", icon: FlaskConical };
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PendingIngredientsPage() {
  const [items,     setItems]     = useState<PendingIngredient[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/pending");
      if (res.status === 403) { setError("forbidden"); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { items: data } = await res.json();
      setItems(data ?? []);
      setLastFetch(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dismiss = useCallback(async (id: string) => {
    setDeleting(id);
    try {
      await fetch("/api/admin/pending", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeleting(null);
    }
  }, []);

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  // ── Forbidden state ───────────────────────────────────────────────────────
  if (error === "forbidden") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Access Denied</h2>
        <p className="text-sm text-slate-500 max-w-xs">This page is restricted to the admin account.</p>
      </div>
    );
  }

  const maxFreq = Math.max(...items.map((i) => i.frequency_count), 1);

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto min-h-full" style={{ background: "#09101e" }}>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-purple-600 shadow-lg shadow-purple-900/40">
            <FlaskConical className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Pending Ingredients</h1>
            <p className="text-xs text-slate-500">Ingredients detected by AI but not yet in local dictionary</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-[10px] text-slate-600 font-mono">
              Updated {timeAgo(lastFetch.toISOString())}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchData(true)}
            className="h-8 px-3 text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Unknown",  value: items.length,                                                     cls: "text-white"        },
            { label: "Halal (AI)",     value: items.filter(i => i.detected_status === "halal").length,          cls: "text-emerald-400"  },
            { label: "Doubtful (AI)",  value: items.filter(i => i.detected_status === "doubtful").length,       cls: "text-amber-400"    },
            { label: "Haram (AI)",     value: items.filter(i => i.detected_status === "haram").length,          cls: "text-red-400"      },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-white/[0.05] px-4 py-3 text-center" style={{ background: "#0d1525" }}>
              <p className={`text-2xl font-extrabold leading-none ${s.cls}`}>{s.value}</p>
              <p className="mt-1.5 text-[10px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {items.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter ingredients…"
            className="w-full rounded-xl border border-white/[0.06] pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20"
            style={{ background: "#0d1525" }}
          />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
        </div>
      )}

      {/* Error */}
      {error && error !== "forbidden" && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/20">
            <FlaskConical className="h-7 w-7 text-violet-400" />
          </div>
          <p className="font-semibold text-white">No pending ingredients yet</p>
          <p className="text-sm text-slate-500 max-w-xs">
            Run some AI scans — ingredients not in the local dictionary will appear here automatically.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className="rounded-2xl border border-white/[0.05] overflow-hidden" style={{ background: "#0d1525" }}>
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-white/[0.06] px-5 py-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Ingredient Name</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 text-center w-24">AI Status</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 text-right w-24">Frequency</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 text-right w-24">Last Seen</span>
            <span className="w-8" />
          </div>

          <AnimatePresence>
            {filtered.map((item, i) => {
              const cfg = statusCfg(item.detected_status);
              const Icon = cfg.icon;
              const barPct = Math.round((item.frequency_count / maxFreq) * 100);

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 border-b border-white/[0.04] px-5 py-3.5 last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Name + frequency bar */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.name}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-800">
                        <motion.div
                          className="h-full rounded-full bg-violet-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.03 }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-600 font-mono">
                        #{i + 1} most seen
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold w-24 justify-center ${cfg.cls}`}>
                    <Icon className="h-3 w-3 shrink-0" />
                    {cfg.label}
                  </span>

                  {/* Frequency count */}
                  <div className="flex items-center gap-1 justify-end w-24">
                    <TrendingUp className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-sm font-bold text-white tabular-nums">{item.frequency_count}×</span>
                  </div>

                  {/* Last seen */}
                  <div className="flex items-center gap-1 justify-end w-24 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    {timeAgo(item.last_seen)}
                  </div>

                  {/* Dismiss */}
                  <button
                    onClick={() => dismiss(item.id)}
                    disabled={deleting === item.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-700 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                    title="Dismiss (mark as resolved)"
                  >
                    {deleting === item.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-white/[0.04] px-5 py-3">
            <p className="text-xs text-slate-600">
              {filtered.length} ingredient{filtered.length !== 1 ? "s" : ""} found
              {search && ` for "${search}"`}
            </p>
            <p className="text-[10px] text-slate-700">
              Add top items to <span className="font-mono text-slate-500">src/lib/halal-db.ts</span> to remove from this list
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
