"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, RefreshCw, AlertTriangle, CheckCircle2, XCircle,
  Loader2, Clock, User, FileText, Zap, Activity,
  TrendingUp, Filter, Copy, ChevronDown, Terminal,
  Users, ScanLine, BarChart2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SystemLog {
  id: string;
  created_at: string;
  type: string;
  message: string;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  metadata: Record<string, unknown>;
}

interface ScanRow {
  id: string;
  scan_id: string;
  product_name: string;
  overall_status: "halal" | "doubtful" | "haram";
  compliance_score: number;
  risk_level: string;
  created_at: string;
  user_id: string | null;
  user_email: string;
}

interface Stats {
  scans_today: number;
  scans_week: number;
  errors_today: number;
  unique_users: number;
  total_scans: number;
  total_logs: number;
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  last_sign_in: string | null;
  role: "auditor" | "manager";
  company_name: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-MY", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatBytes(n: number | null) {
  if (!n) return "—";
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const TYPE_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  scan_success: { label: "Scan OK",    color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
  scan_error:   { label: "Scan ERR",   color: "text-red-400",     bg: "bg-red-500/10",     icon: XCircle      },
  api_error:    { label: "API ERR",    color: "text-red-400",     bg: "bg-red-500/10",     icon: AlertTriangle},
  rate_limit:   { label: "Rate Limit", color: "text-amber-400",   bg: "bg-amber-500/10",   icon: Zap          },
  pdf_generated:{ label: "PDF Gen",    color: "text-blue-400",    bg: "bg-blue-500/10",    icon: FileText     },
  auth_event:   { label: "Auth",       color: "text-purple-400",  bg: "bg-purple-500/10",  icon: User         },
};

const STATUS_CFG = {
  halal:    { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  doubtful: { cls: "bg-amber-500/10  text-amber-400  border-amber-500/20"  },
  haram:    { cls: "bg-red-500/10    text-red-400    border-red-500/20"    },
};

const ALL_TYPES = ["scan_success", "scan_error", "api_error", "rate_limit", "pdf_generated", "auth_event"];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [logs,    setLogs]    = useState<SystemLog[]>([]);
  const [scans,   setScans]   = useState<ScanRow[]>([]);
  const [users,   setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<"overview" | "scans" | "logs" | "users">("overview");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [logsRes, usersRes] = await Promise.all([
        fetch("/api/admin/logs?limit=200"),
        fetch("/api/admin/users"),
      ]);
      if (logsRes.status === 403) { setError("forbidden"); return; }
      if (!logsRes.ok) throw new Error(`HTTP ${logsRes.status}`);
      const data = await logsRes.json();
      setStats(data.stats);
      setLogs(data.logs  ?? []);
      setScans(data.scans ?? []);
      if (usersRes.ok) {
        const ud = await usersRes.json();
        setUsers(ud.users ?? []);
      }
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => fetchData(true), 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const filteredLogs = typeFilter === "all"
    ? logs
    : logs.filter(l => l.type === typeFilter);

  // ── Forbidden ──────────────────────────────────────────────────────────────
  if (error === "forbidden") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
          <Shield className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-lg font-bold text-white">Access Denied</p>
        <p className="text-sm text-slate-500">This page is restricted to administrators only.</p>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center p-6">
        <AlertTriangle className="h-8 w-8 text-red-400" />
        <p className="text-sm text-red-300">{error}</p>
        <button onClick={() => fetchData()} className="text-xs text-emerald-400 hover:underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
            <Terminal className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Admin Logger</h1>
            <p className="text-xs text-slate-500">
              {lastRefresh ? `Last refresh: ${timeAgo(lastRefresh.toISOString())} · Auto-refreshes every 30s` : "Live system monitor"}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-slate-400 hover:bg-white/[0.08] hover:text-white transition-all"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* ── Stats cards ── */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Scans Today",   value: stats.scans_today,  color: "text-blue-400",    icon: Activity     },
            { label: "This Week",     value: stats.scans_week,   color: "text-teal-400",    icon: TrendingUp   },
            { label: "Errors Today",  value: stats.errors_today, color: stats.errors_today > 0 ? "text-red-400" : "text-emerald-400", icon: AlertTriangle },
            { label: "Users Active",  value: stats.unique_users, color: "text-purple-400",  icon: User         },
            { label: "Total Scans",   value: stats.total_scans,  color: "text-slate-300",   icon: CheckCircle2 },
            { label: "Total Logs",    value: stats.total_logs,   color: "text-slate-500",   icon: FileText     },
          ].map(s => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-white/[0.06] bg-slate-900/60 p-4"
              >
                <Icon className={`h-4 w-4 mb-2 ${s.color}`} />
                <p className={`text-2xl font-extrabold leading-none ${s.color}`}>{s.value}</p>
                <p className="mt-1 text-[10px] text-slate-600">{s.label}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-slate-900/60 p-1 w-fit">
        {(["overview", "scans", "logs", "users"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all capitalize ${
              tab === t
                ? "bg-white/[0.08] text-white"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t}
            {t === "logs"  && logs.length  > 0 && <span className="ml-1.5 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px]">{logs.length}</span>}
            {t === "scans" && scans.length > 0 && <span className="ml-1.5 rounded-full bg-slate-700 px-1.5 py-0.5 text-[10px]">{scans.length}</span>}
            {t === "users" && users.length > 0 && <span className="ml-1.5 rounded-full bg-violet-500/30 px-1.5 py-0.5 text-[10px] text-violet-400">{users.length}</span>}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Errors */}
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold text-white">Recent Errors</span>
              <span className="ml-auto rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
                {logs.filter(l => l.type.includes("error")).length}
              </span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
              {logs.filter(l => l.type.includes("error")).slice(0, 20).length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <p className="text-sm text-slate-500">No errors — system healthy</p>
                </div>
              ) : logs.filter(l => l.type.includes("error")).slice(0, 20).map(log => (
                <div key={log.id} className="px-5 py-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-red-300 truncate">{log.message}</p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {log.user_email ?? log.ip_address ?? "anon"} · {timeAgo(log.created_at)}
                        {log.file_name && ` · ${log.file_name}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Successful Scans */}
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Recent Scans</span>
              <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
                {scans.length}
              </span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-72 overflow-y-auto">
              {scans.slice(0, 15).map(scan => (
                <div key={scan.id} className="flex items-center gap-3 px-5 py-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${
                    scan.overall_status === "halal" ? "bg-emerald-400" :
                    scan.overall_status === "doubtful" ? "bg-amber-400" : "bg-red-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{scan.product_name}</p>
                    <p className="text-xs text-slate-600 truncate">
                      {scan.user_email} · {timeAgo(scan.created_at)}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-slate-500">{scan.compliance_score}/100</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ SCANS TAB ════════════════════════════════════════════════════════ */}
      {tab === "scans" && (
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  {["Time", "User", "Product", "Status", "Score", "Risk", "Scan ID"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600 first:pl-5 last:pr-5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {scans.map((scan, i) => (
                  <motion.tr
                    key={scan.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="pl-5 py-3 text-xs text-slate-500 whitespace-nowrap">{timeAgo(scan.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-300 font-mono truncate max-w-[140px] block">
                        {scan.user_email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-white truncate max-w-[160px] block">{scan.product_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${STATUS_CFG[scan.overall_status]?.cls ?? ""}`}>
                        {scan.overall_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${scan.compliance_score >= 80 ? "text-emerald-400" : scan.compliance_score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                        {scan.compliance_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{scan.risk_level}</td>
                    <td className="pr-5 py-3">
                      <button
                        onClick={() => navigator.clipboard.writeText(scan.scan_id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-600 hover:bg-white/[0.06] hover:text-slate-300 transition-colors"
                        title="Copy scan ID"
                      >
                        {scan.scan_id}
                        <Copy className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {scans.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-slate-500">No scans yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ LOGS TAB ═════════════════════════════════════════════════════════ */}
      {tab === "logs" && (
        <div className="space-y-4">
          {/* Type filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter("all")}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                typeFilter === "all" ? "bg-white/[0.10] text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              All ({logs.length})
            </button>
            {ALL_TYPES.map(t => {
              const cfg = TYPE_CFG[t];
              const count = logs.filter(l => l.type === t).length;
              if (count === 0) return null;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                    typeFilter === t ? `${cfg.bg} ${cfg.color}` : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  {cfg.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Log rows */}
          <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 divide-y divide-white/[0.04] overflow-hidden">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-12">
                <Clock className="h-4 w-4 text-slate-600" />
                <p className="text-sm text-slate-500">No logs for this filter</p>
              </div>
            ) : filteredLogs.map((log, i) => {
              const cfg  = TYPE_CFG[log.type] ?? TYPE_CFG.api_error;
              const Icon = cfg.icon;
              const isExpanded = expandedLog === log.id;
              const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.015, 0.3) }}
                >
                  <button
                    onClick={() => hasMeta ? setExpandedLog(isExpanded ? null : log.id) : undefined}
                    className={`w-full text-left px-5 py-3.5 hover:bg-white/[0.02] transition-colors ${hasMeta ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Type badge */}
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cfg.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs text-slate-300 truncate">{log.message}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-3 text-[10px] text-slate-600">
                          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{timeAgo(log.created_at)}</span>
                          {log.user_email && <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" />{log.user_email}</span>}
                          {log.ip_address  && <span>{log.ip_address}</span>}
                          {log.file_name   && <span className="flex items-center gap-1"><FileText className="h-2.5 w-2.5" />{log.file_name} {log.file_size ? `(${formatBytes(log.file_size)})` : ""}</span>}
                        </div>
                      </div>

                      {/* Expand */}
                      {hasMeta && (
                        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-slate-600 transition-transform mt-1 ${isExpanded ? "rotate-180" : ""}`} />
                      )}
                    </div>
                  </button>

                  {/* Expanded metadata */}
                  <AnimatePresence>
                    {isExpanded && hasMeta && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <pre className="mx-5 mb-3 rounded-xl border border-white/[0.06] bg-slate-950/80 p-4 text-[11px] text-slate-400 overflow-x-auto font-mono leading-relaxed">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Users Tab ── */}
      {tab === "users" && (
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/60 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-violet-400" />
              <div>
                <p className="text-sm font-semibold text-white">User Management</p>
                <p className="text-xs text-slate-500">{users.length} registered users · Assign Auditor or Manager roles</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {users.length === 0 && (
              <p className="px-5 py-8 text-center text-sm text-slate-600">No users found</p>
            )}
            {users.map((u) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 px-5 py-4"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-xs font-bold text-white">
                  {u.email[0]?.toUpperCase() ?? "U"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{u.email}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>Joined {new Date(u.created_at).toLocaleDateString("en-MY", { day: "2-digit", month: "short", year: "numeric" })}</span>
                    {u.last_sign_in && (
                      <>
                        <span className="text-slate-700">·</span>
                        <span>Last seen {timeAgo(u.last_sign_in)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Current role badge */}
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                  u.role === "manager"
                    ? "bg-violet-500/10 text-violet-400 border-violet-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>
                  {u.role === "manager" ? "Manager" : "Auditor"}
                </span>

                {/* Toggle role button */}
                <button
                  disabled={roleUpdating === u.id}
                  onClick={async () => {
                    const newRole = u.role === "manager" ? "auditor" : "manager";
                    setRoleUpdating(u.id);
                    const res = await fetch("/api/admin/users", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ userId: u.id, role: newRole }),
                    });
                    if (res.ok) {
                      setUsers(prev => prev.map(usr =>
                        usr.id === u.id ? { ...usr, role: newRole } : usr
                      ));
                    }
                    setRoleUpdating(null);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all disabled:opacity-50 ${
                    u.role === "manager"
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                      : "border-violet-500/20 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20"
                  }`}
                >
                  {roleUpdating === u.id
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : u.role === "manager"
                      ? <><ScanLine className="h-3 w-3" /> Make Auditor</>
                      : <><BarChart2 className="h-3 w-3" /> Make Manager</>
                  }
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
