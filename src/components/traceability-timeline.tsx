"use client";

import { motion } from "framer-motion";
import { Package, FlaskConical, Shield, CheckCircle2, Clock, XCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimelineStage {
  id: string;
  label: string;
  description: string;
  date: Date | null;
  status: "complete" | "pending" | "failed";
  icon: "Package" | "FlaskConical" | "Shield" | "CheckCircle2";
}

const ICON_MAP = { Package, FlaskConical, Shield, CheckCircle2 };

const STATUS_CFG = {
  complete: {
    dot:   "bg-emerald-500 ring-emerald-500/30",
    line:  "bg-gradient-to-b from-emerald-500/40 to-emerald-500/10",
    badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    label: "Completed",
    StatusIcon: CheckCircle2,
  },
  pending: {
    dot:   "bg-amber-500 ring-amber-500/30",
    line:  "bg-gradient-to-b from-amber-500/20 to-white/[0.04]",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    label: "Pending Review",
    StatusIcon: Clock,
  },
  failed: {
    dot:   "bg-red-500 ring-red-500/30",
    line:  "bg-gradient-to-b from-red-500/20 to-white/[0.04]",
    badge: "border-red-500/30 bg-red-500/10 text-red-400",
    label: "Action Required",
    StatusIcon: XCircle,
  },
};

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("en-MY", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  stages: TimelineStage[];
  /** Tighter spacing for embedded use */
  compact?: boolean;
  /** Background color for ring-offset (matches card bg) */
  ringBg?: string;
}

export function TraceabilityTimeline({ stages, compact = false, ringBg = "#0d1525" }: Props) {
  return (
    <div className="relative">
      {stages.map((stage, i) => {
        const cfg = STATUS_CFG[stage.status];
        const Icon = ICON_MAP[stage.icon];
        const { StatusIcon } = cfg;
        const isLast = i === stages.length - 1;

        return (
          <div key={stage.id} className="relative flex gap-4">
            {/* Dot + vertical line */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.12, type: "spring", stiffness: 260, damping: 20 }}
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-4 ${cfg.dot}`}
                style={{ ringOffsetColor: ringBg }}
              >
                <Icon className="h-[18px] w-[18px] text-white" />
              </motion.div>

              {!isLast && (
                <motion.div
                  className={`w-0.5 flex-1 rounded-full ${cfg.line}`}
                  style={{ minHeight: compact ? 36 : 52 }}
                  initial={{ scaleY: 0, opacity: 0 }}
                  animate={{ scaleY: 1, opacity: 1 }}
                  transition={{ delay: i * 0.12 + 0.08, duration: 0.35 }}
                />
              )}
            </div>

            {/* Content */}
            <motion.div
              className={`flex-1 min-w-0 pt-1.5 ${isLast ? "" : compact ? "pb-4" : "pb-6"}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12 + 0.04 }}
            >
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <p className="text-sm font-semibold text-white">{stage.label}</p>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
                  <StatusIcon className="h-2.5 w-2.5" />
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{stage.description}</p>
              {stage.date && (
                <p className="mt-1 text-[10px] font-mono text-slate-600">{formatDate(stage.date)}</p>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildTimelineStages(
  overallStatus: "halal" | "doubtful" | "haram",
  /** ISO string or locale string — parsed with new Date() */
  scanTimestamp: string,
): TimelineStage[] {
  // Try to parse. If locale string, fall back to now.
  const auditDate = (() => {
    const d = new Date(scanTimestamp);
    return isNaN(d.getTime()) ? new Date() : d;
  })();

  const rawDate = new Date(auditDate.getTime() - 72 * 3_600_000);
  const labDate = new Date(auditDate.getTime() - 24 * 3_600_000);

  const marketStatus: TimelineStage["status"] =
    overallStatus === "halal"    ? "complete" :
    overallStatus === "doubtful" ? "pending"  : "failed";

  return [
    {
      id: "raw",
      label: "Raw Material Sourced",
      description: "Ingredients sourced, documented, and supplier declarations collected",
      date: rawDate,
      status: "complete",
      icon: "Package",
    },
    {
      id: "lab",
      label: "Lab Tested",
      description: "Certificate of Analysis (COA) issued by an accredited laboratory",
      date: labDate,
      status: "complete",
      icon: "FlaskConical",
    },
    {
      id: "audit",
      label: "Amanah AI Audited",
      description: `JAKIM compliance analysis completed — ${overallStatus.toUpperCase()} determination`,
      date: auditDate,
      status: overallStatus === "haram" ? "failed" : "complete",
      icon: "Shield",
    },
    {
      id: "market",
      label: "Ready for Market",
      description:
        overallStatus === "halal"
          ? "All checks passed. Product cleared for the halal market."
          : overallStatus === "doubtful"
          ? "Pending supplier declarations before market clearance."
          : "Haram ingredient detected. Reformulation required before approval.",
      date: overallStatus === "halal" ? auditDate : null,
      status: marketStatus,
      icon: "CheckCircle2",
    },
  ];
}
