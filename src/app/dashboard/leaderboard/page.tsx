"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Medal,
  BarChart3,
  Clock,
} from "lucide-react";

interface BrandRow {
  brand: string;
  scan_count: number;
  avg_score: number;
  halal_count: number;
  doubtful_count: number;
  haram_count: number;
  last_scanned: string;
  rank: number;
}

const MEDAL_COLORS = [
  "from-amber-400 to-yellow-500",   // 1st gold
  "from-slate-300 to-slate-400",    // 2nd silver
  "from-amber-600 to-orange-700",   // 3rd bronze
];

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
};

const SCORE_BG = (score: number) => {
  if (score >= 80) return "bg-emerald-500/10 ring-emerald-500/20";
  if (score >= 50) return "bg-amber-500/10 ring-amber-500/20";
  return "bg-red-500/10 ring-red-500/20";
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const sb = createClient();
    const { data, error } = await sb
      .from("brand_leaderboard")
      .select("*")
      .order("rank", { ascending: true })
      .limit(50);

    if (!error && data) {
      setRows(data as BrandRow[]);
      setLastUpdated(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    // Real-time: re-fetch when audit_logs changes
    const sb = createClient();
    const channel = sb
      .channel("leaderboard-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        () => fetchLeaderboard(true)
      )
      .subscribe();

    return () => { sb.removeChannel(channel); };
  }, [fetchLeaderboard]);

  const top3 = rows.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 shadow-lg shadow-amber-900/40">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Brand Leaderboard</h1>
            <p className="text-xs text-slate-500">
              Ranked by average halal compliance score
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <Clock className="h-3 w-3" />
              {timeAgo(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/[0.08] hover:text-white transition-all disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="text-sm text-slate-500">Loading leaderboard...</p>
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-24 gap-4">
          <BarChart3 className="h-12 w-12 text-slate-700" />
          <p className="text-slate-400 font-medium">No scans yet</p>
          <p className="text-sm text-slate-600 text-center max-w-xs">
            Complete a scan from the Scanner page to see brands appear on the leaderboard.
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {top3.length >= 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                top3[1], // 2nd — left
                top3[0], // 1st — center (tallest)
                top3[2], // 3rd — right
              ]
                .filter(Boolean)
                .map((row, i) => {
                  const actualRank = [2, 1, 3][i];
                  const gradient = MEDAL_COLORS[actualRank - 1];
                  const isFist = actualRank === 1;
                  return (
                    <motion.div
                      key={row.brand}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 flex flex-col items-center gap-3 ${
                        isFist ? "sm:-mt-4 shadow-xl shadow-amber-900/20 border-amber-500/20 bg-amber-500/5" : ""
                      }`}
                    >
                      {/* Medal */}
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${gradient} shadow-lg`}>
                        <Medal className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        #{actualRank}
                      </span>
                      <p className="text-sm font-semibold text-white text-center line-clamp-2">
                        {row.brand}
                      </p>
                      <div className={`rounded-xl px-4 py-2 ring-1 ${SCORE_BG(row.avg_score)}`}>
                        <span className={`text-2xl font-black ${SCORE_COLOR(row.avg_score)}`}>
                          {row.avg_score}
                        </span>
                        <span className="text-xs text-slate-500 ml-0.5">/ 100</span>
                      </div>
                      <div className="flex gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {row.scan_count} scans
                        </span>
                      </div>
                      {/* Status bar */}
                      <div className="w-full flex rounded-full overflow-hidden h-1.5 mt-1">
                        {row.halal_count > 0 && (
                          <div
                            className="bg-emerald-500"
                            style={{ width: `${(row.halal_count / row.scan_count) * 100}%` }}
                          />
                        )}
                        {row.doubtful_count > 0 && (
                          <div
                            className="bg-amber-500"
                            style={{ width: `${(row.doubtful_count / row.scan_count) * 100}%` }}
                          />
                        )}
                        {row.haram_count > 0 && (
                          <div
                            className="bg-red-500"
                            style={{ width: `${(row.haram_count / row.scan_count) * 100}%` }}
                          />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          )}

          {/* Full Table */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-semibold text-white">All Brands</span>
              <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-xs text-slate-400">
                {rows.length} brands
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.04]">
                    {["Rank", "Brand", "Avg Score", "Scans", "Halal", "Doubtful", "Haram", "Last Scan"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600 first:pl-5 last:pr-5"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {rows.map((row, idx) => (
                    <motion.tr
                      key={row.brand}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Rank */}
                      <td className="pl-5 py-3.5">
                        {row.rank <= 3 ? (
                          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${MEDAL_COLORS[row.rank - 1]} text-[10px] font-black text-white`}>
                            {row.rank}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">#{row.rank}</span>
                        )}
                      </td>
                      {/* Brand */}
                      <td className="px-4 py-3.5">
                        <span className="font-medium text-white">{row.brand}</span>
                      </td>
                      {/* Avg Score */}
                      <td className="px-4 py-3.5">
                        <span className={`font-bold text-base ${SCORE_COLOR(row.avg_score)}`}>
                          {row.avg_score}
                        </span>
                        <span className="text-slate-600 text-xs">/100</span>
                      </td>
                      {/* Scan count */}
                      <td className="px-4 py-3.5 text-slate-400">{row.scan_count}</td>
                      {/* Halal */}
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {row.halal_count}
                        </span>
                      </td>
                      {/* Doubtful */}
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1 text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {row.doubtful_count}
                        </span>
                      </td>
                      {/* Haram */}
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1 text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          {row.haram_count}
                        </span>
                      </td>
                      {/* Last scanned */}
                      <td className="pr-5 py-3.5 text-slate-600 text-xs">
                        {timeAgo(row.last_scanned)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
