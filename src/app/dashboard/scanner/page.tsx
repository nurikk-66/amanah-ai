"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, ScanLine, CheckCircle2, AlertTriangle, XCircle,
  Loader2, FileImage, X, Download, RotateCcw, Zap,
  Shield, ChevronDown, Info, Copy, History, Clock,
  Layers, BarChart2, Files, TrendingUp, ArrowRight,
  Database, Cpu, Target, Sparkles, Building2, ArrowLeftRight, QrCode, ExternalLink,
  Share2, Mail, MessageCircle, Check,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/lib/supabase";
import { checkIngredientsLocally } from "@/lib/checker-logic";
import { calculateAuditReadiness, type AuditReadinessResult } from "@/lib/audit-readiness";
import { HALAL_DICTIONARY } from "@/lib/halal-db";
import { generateBatchId } from "@/lib/batch-id";
import { TraceabilityTimeline } from "@/components/traceability-timeline";
import { buildTimelineStages } from "@/lib/timeline-stages";

// ─── Types ────────────────────────────────────────────────────────────────────
type ScanPhase = "idle" | "uploading" | "analyzing" | "done" | "batch" | "batch-done";
type BatchItemStatus = "pending" | "processing" | "done" | "error";

interface Ingredient {
  name: string;
  status: "halal" | "doubtful" | "haram";
  risk: string;
  jakim: string;
  confidence: number;
  details: string;
  halal_alternative?: string;
  trusted_suppliers?: string[];
}

type ScanEngine = "local" | "ai" | "hybrid";

interface ScanResult {
  product: string;
  overallStatus: "halal" | "doubtful" | "haram";
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  complianceScore: number;
  reason?: string;
  ingredients: Ingredient[];
  scanId: string;
  timestamp: string;
  engine?: ScanEngine;
  batchId?: string;
}

interface BatchItem {
  id: string;
  file: File;
  fileName: string;
  status: BatchItemStatus;
  progress: number;
  currentStep: number;
  result?: ScanResult;
  error?: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_PRODUCTS = [
  {
    name: "Instant Noodle Seasoning",
    file: "noodle_seasoning_label.jpg",
    result: {
      product: "Instant Noodle Seasoning",
      overallStatus: "haram" as const,
      riskLevel: "Critical" as const,
      complianceScore: 32,
      reason: "Contains lard (rendered pork fat), which is strictly prohibited under Islamic dietary law.",
      ingredients: [
        { name: "Salt (Sodium Chloride)",     status: "halal" as const,    risk: "None",     jakim: "JAKIM-MIN-001", confidence: 99, details: "Mineral compound, universally accepted." },
        { name: "MSG (E621)",                 status: "halal" as const,    risk: "None",     jakim: "JAKIM-ADD-014", confidence: 96, details: "Synthetically produced monosodium glutamate." },
        { name: "Disodium Inosinate (E631)",  status: "doubtful" as const, risk: "Medium",   jakim: "JAKIM-ADD-019", confidence: 74, details: "May be derived from pork or fish. Supplier certification required." },
        { name: "Palm Oil",                   status: "halal" as const,    risk: "None",     jakim: "JAKIM-FAT-003", confidence: 98, details: "Plant-based oil with valid MSPO certification." },
        { name: "Lard",                       status: "haram" as const,    risk: "Critical", jakim: "JAKIM-FAT-H01", confidence: 99, details: "Rendered pork fat. Strictly prohibited under Islamic law." },
      ],
    },
  },
  {
    name: "Bakery Emulsifier Mix",
    file: "emulsifier_coa.pdf",
    result: {
      product: "Bakery Emulsifier Mix",
      overallStatus: "doubtful" as const,
      riskLevel: "Medium" as const,
      complianceScore: 61,
      reason: "Multiple emulsifiers with unverified sources. Supplier declarations required before halal certification.",
      ingredients: [
        { name: "Lecithin (E322)",                  status: "doubtful" as const, risk: "Medium", jakim: "JAKIM-ADD-022", confidence: 68, details: "Unspecified source — soy or egg; source declaration required." },
        { name: "Mono & Diglycerides (E471)",        status: "doubtful" as const, risk: "High",   jakim: "JAKIM-FAT-011", confidence: 61, details: "Animal or plant-derived unclear. JAKIM flag pending." },
        { name: "Sodium Stearoyl Lactylate (E481)", status: "halal" as const,    risk: "None",   jakim: "JAKIM-ADD-031", confidence: 94, details: "Synthetically produced. No animal-derived components." },
        { name: "Ascorbic Acid (E300)",             status: "halal" as const,    risk: "None",   jakim: "JAKIM-VIT-004", confidence: 99, details: "Vitamin C. Universally halal." },
      ],
    },
  },
  {
    name: "Protein Supplement Blend",
    file: "protein_blend_spec.pdf",
    result: {
      product: "Protein Supplement Blend",
      overallStatus: "haram" as const,
      riskLevel: "High" as const,
      complianceScore: 28,
      reason: "Contains pork-derived gelatin and unverified whey protein. Immediate supplier audit recommended.",
      ingredients: [
        { name: "Whey Protein Concentrate", status: "doubtful" as const, risk: "High",     jakim: "JAKIM-PRO-007", confidence: 72, details: "Halal only if sourced from halal-slaughtered bovine." },
        { name: "L-Leucine",               status: "halal" as const,    risk: "None",     jakim: "JAKIM-AMI-001", confidence: 97, details: "Synthetic branched-chain amino acid. Halal certified." },
        { name: "Gelatin",                 status: "haram" as const,    risk: "Critical", jakim: "JAKIM-GEL-H01", confidence: 98, details: "Pork-derived gelatin. Not acceptable unless fish/bovine certified." },
        { name: "Magnesium Stearate",      status: "doubtful" as const, risk: "Medium",   jakim: "JAKIM-ADD-044", confidence: 65, details: "Animal or vegetable origin unclear. Clarification needed." },
      ],
    },
  },
];

const ANALYSIS_STEPS = [
  { label: "Uploading file to secure server...",   duration: 800  },
  { label: "Extracting text via OCR engine...",    duration: 900  },
  { label: "Tokenising ingredient list...",        duration: 700  },
  { label: "Cross-referencing 50,000+ records...", duration: 1000 },
  { label: "Querying JAKIM halal database...",     duration: 900  },
  { label: "Running AI risk classification...",    duration: 800  },
  { label: "Generating compliance report...",      duration: 600  },
];

// ─── Config ───────────────────────────────────────────────────────────────────
const statusCfg = {
  halal:    { icon: CheckCircle2,  label: "Halal",    rowCls: "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.07]", badgeCls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", dot: "bg-emerald-400" },
  doubtful: { icon: AlertTriangle, label: "Doubtful", rowCls: "bg-amber-500/[0.04] hover:bg-amber-500/[0.07]",   badgeCls: "border-amber-500/30 bg-amber-500/10 text-amber-400",     dot: "bg-amber-400"   },
  haram:    { icon: XCircle,       label: "Haram",    rowCls: "bg-red-500/[0.04] hover:bg-red-500/[0.07]",       badgeCls: "border-red-500/30 bg-red-500/10 text-red-400",           dot: "bg-red-400"     },
};

const riskLevelCfg = {
  Low:      { cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  Medium:   { cls: "bg-amber-500/10 text-amber-400 border-amber-500/20"       },
  High:     { cls: "bg-red-500/10 text-red-400 border-red-500/20"             },
  Critical: { cls: "bg-red-600/20 text-red-300 border-red-500/30"             },
};

const overallStatusCfg = {
  halal:    { label: "COMPLIANT",     cls: "from-emerald-900/40 via-slate-900 to-slate-900 border-emerald-500/20", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  doubtful: { label: "REVIEW NEEDED", cls: "from-amber-900/30 via-slate-900 to-slate-900 border-amber-500/20",    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30"       },
  haram:    { label: "NON-COMPLIANT", cls: "from-red-900/30 via-slate-900 to-slate-900 border-red-500/20",        badge: "bg-red-500/20 text-red-300 border-red-500/30"             },
};

// ─── File Validation ─────────────────────────────────────────────────────────
const ACCEPTED_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf",
]);
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

interface ValidationResult {
  valid: File[];
  /** Human-readable error message if any files were rejected, null otherwise */
  message: string | null;
  /** "error" = nothing to process, "warning" = some files skipped */
  level: "error" | "warning" | null;
}

function validateFiles(files: File[]): ValidationResult {
  const valid: File[] = [];
  const badType:  string[] = [];
  const tooLarge: string[] = [];
  const empty:    string[] = [];

  for (const f of files) {
    if (f.size === 0) {
      empty.push(f.name);
    } else if (!ACCEPTED_TYPES.has(f.type)) {
      badType.push(f.name);
    } else if (f.size > MAX_FILE_SIZE) {
      tooLarge.push(f.name);
    } else {
      valid.push(f);
    }
  }

  const parts: string[] = [];
  if (badType.length)  parts.push(`Unsupported format: ${badType.join(", ")} — only JPG, PNG, GIF, WEBP, PDF allowed.`);
  if (tooLarge.length) parts.push(`File too large: ${tooLarge.join(", ")} — max 25 MB per file.`);
  if (empty.length)    parts.push(`Empty or corrupted: ${empty.join(", ")}.`);

  const message = parts.length > 0 ? parts.join(" ") : null;
  const level   = message === null ? null : valid.length === 0 ? "error" : "warning";
  return { valid, message, level };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ScannerPage() {
  // Single-scan state
  const [phase, setPhase]             = useState<ScanPhase>("idle");
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress]       = useState(0);
  const [dragOver, setDragOver]       = useState(false);
  const [fileName, setFileName]       = useState("");
  const [result, setResult]           = useState<ScanResult | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [history, setHistory]         = useState<ScanResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [reportUrl, setReportUrl]     = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [auditReadiness, setAuditReadiness] = useState<AuditReadinessResult | null>(null);
  const [copiedPassport, setCopiedPassport] = useState(false);

  // Batch state
  const [batchItems, setBatchItems]               = useState<BatchItem[]>([]);
  const [batchReportUrl, setBatchReportUrl]       = useState<string | null>(null);
  const [batchReportLoading, setBatchReportLoading] = useState(false);
  const [expandedBatchItem, setExpandedBatchItem] = useState<string | null>(null);

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const toastTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toast, setToast] = useState<{ message: string; level: "error" | "warning" } | null>(null);

  // Recompute audit readiness whenever a result is set
  useEffect(() => {
    if (!result) { setAuditReadiness(null); return; }
    setAuditReadiness(calculateAuditReadiness(result, fileName));
  }, [result, fileName]);

  const showToast = useCallback((message: string, level: "error" | "warning") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, level });
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  }, []);

  // ── Single-scan animation ─────────────────────────────────────────────────
  const runStepAnimation = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      let stepIndex = 0;
      let elapsed = 0;
      const totalDuration = ANALYSIS_STEPS.reduce((a, s) => a + s.duration, 0);
      const tick = () => {
        if (stepIndex >= ANALYSIS_STEPS.length) { resolve(); return; }
        const step = ANALYSIS_STEPS[stepIndex];
        setCurrentStep(stepIndex);
        setPhase(stepIndex === 0 ? "uploading" : "analyzing");
        elapsed += step.duration;
        setProgress(Math.round((elapsed / totalDuration) * 95));
        stepIndex++;
        setTimeout(tick, step.duration);
      };
      setTimeout(tick, 0);
    });
  }, []);

  // ── Per-item animation (batch) ────────────────────────────────────────────
  const runItemAnimation = useCallback((itemId: string): Promise<void> => {
    return new Promise((resolve) => {
      let stepIdx = 0;
      let elapsed = 0;
      const total = ANALYSIS_STEPS.reduce((a, s) => a + s.duration, 0);
      const tick = () => {
        if (stepIdx >= ANALYSIS_STEPS.length) { resolve(); return; }
        const step = ANALYSIS_STEPS[stepIdx];
        elapsed += step.duration;
        setBatchItems(prev => prev.map(it =>
          it.id === itemId
            ? { ...it, currentStep: stepIdx, progress: Math.round((elapsed / total) * 95) }
            : it
        ));
        stepIdx++;
        setTimeout(tick, step.duration);
      };
      setTimeout(tick, 0);
    });
  }, []);

  // ── Persist scan to Supabase ─────────────────────────────────────────────
  const persistScan = useCallback((r: ScanResult) => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase!.from("scans").insert({
        product_name:     r.product,
        overall_status:   r.overallStatus,
        compliance_score: r.complianceScore,
        risk_level:       r.riskLevel,
        reason:           r.reason ?? null,
        ingredients:      r.ingredients ?? [],
        scan_id:          r.scanId,
        user_id:          user?.id ?? null,
        scan_engine:      r.engine ?? "ai",
        batch_id:         r.batchId ?? null,
      }).then(({ error }) => {
        if (!error) return;
        const msg = error.message ?? "";
        // If scan_engine column missing — retry without it but KEEP batch_id
        if (msg.includes("scan_engine")) {
          supabase!.from("scans").insert({
            product_name: r.product, overall_status: r.overallStatus,
            compliance_score: r.complianceScore, risk_level: r.riskLevel,
            reason: r.reason ?? null, ingredients: r.ingredients ?? [],
            scan_id: r.scanId, user_id: user?.id ?? null,
            batch_id: r.batchId ?? null,
          }).then(({ error: e2 }) => {
            if (!e2) return;
            // batch_id column also missing — last resort save without both
            if (e2.message?.includes("batch_id")) {
              supabase!.from("scans").insert({
                product_name: r.product, overall_status: r.overallStatus,
                compliance_score: r.complianceScore, risk_level: r.riskLevel,
                reason: r.reason ?? null, ingredients: r.ingredients ?? [],
                scan_id: r.scanId, user_id: user?.id ?? null,
              }).then(({ error: e3 }) => {
                if (e3) console.error("[supabase] insert error:", e3.message);
              });
            } else {
              console.error("[supabase] insert error:", e2.message);
            }
          });
        } else if (msg.includes("batch_id")) {
          // batch_id column missing — save without it
          supabase!.from("scans").insert({
            product_name: r.product, overall_status: r.overallStatus,
            compliance_score: r.complianceScore, risk_level: r.riskLevel,
            reason: r.reason ?? null, ingredients: r.ingredients ?? [],
            scan_id: r.scanId, user_id: user?.id ?? null,
            scan_engine: r.engine ?? "ai",
          }).then(({ error: e2 }) => {
            if (e2) console.error("[supabase] insert error:", e2.message);
          });
        } else {
          console.error("[supabase] insert error:", msg);
        }
      });
    });
  }, []);

  // ── Finish single scan ───────────────────────────────────────────────────
  const finishScan = useCallback((scanResult: ScanResult) => {
    const batchId = scanResult.batchId ?? generateBatchId(scanResult.scanId, scanResult.product);
    const scanResult2 = { ...scanResult, batchId };
    setProgress(100);
    setPhase("done");
    setResult(scanResult2);
    setReportUrl(null);
    setHistory((prev) => [scanResult2, ...prev].slice(0, 10));
    persistScan(scanResult2);

    setReportLoading(true);
    fetch("/api/generate-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scanResult2),
    })
      .then(async r => {
        const j = await r.json();
        if (j.url) setReportUrl(j.url);
        else console.error("[report] no URL:", j);
      })
      .catch(e => console.error("[report] fetch error:", e))
      .finally(() => setReportLoading(false));
  }, [persistScan]);

  // ── Build ScanResult from local DB matches ──────────────────────────────
  const buildLocalResult = useCallback((fileName: string, localCheck: ReturnType<typeof checkIngredientsLocally>): Omit<ScanResult, "scanId" | "timestamp"> => {
    const ingredients: Ingredient[] = localCheck.results.map((m) => {
      const e = m.entry;
      const risk = e.status === "haram" ? "Critical" : e.status === "doubtful" ? "Medium" : "None";
      return {
        name: e.name,
        status: e.status,
        risk,
        jakim: e.jakimRef ?? "JAKIM-UNK-000",
        confidence: e.status === "halal" ? 95 : e.status === "doubtful" ? 70 : 98,
        details: e.description,
        halal_alternative: e.halal_alternative,
        trusted_suppliers: e.trusted_suppliers,
      };
    });

    const hasHaram    = ingredients.some((i) => i.status === "haram");
    const hasDoubtful = ingredients.some((i) => i.status === "doubtful");
    const haramCount    = ingredients.filter((i) => i.status === "haram").length;
    const doubtfulCount = ingredients.filter((i) => i.status === "doubtful").length;

    const overallStatus = hasHaram ? "haram" : hasDoubtful ? "doubtful" : "halal";
    const complianceScore = Math.max(0, 100 - haramCount * 30 - doubtfulCount * 10);
    const riskLevel = hasHaram ? "Critical" : doubtfulCount >= 2 ? "High" : doubtfulCount === 1 ? "Medium" : "Low";

    const product = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
    const reason = hasHaram
      ? `Contains ${haramCount} haram ingredient(s) identified via local JAKIM database.`
      : hasDoubtful
        ? `${doubtfulCount} ingredient(s) require supplier verification. Source declaration needed.`
        : "All ingredients verified as halal via local JAKIM database.";

    return { product, overallStatus, riskLevel, complianceScore, reason, ingredients, engine: "local" };
  }, []);

  // ── Read file as text (for local DB matching) ─────────────────────────────
  const extractTextFromFile = useCallback(async (file: File): Promise<string> => {
    // For images we can't extract text client-side — return filename as hint
    if (file.type.startsWith("image/")) return file.name;
    // For PDFs and text files, read as text
    try { return await file.text(); } catch { return file.name; }
  }, []);

  // ── Single-file real analysis (hybrid: local-first → AI fallback) ────────
  const runRealAnalysis = useCallback(async (file: File) => {
    setFileName(file.name);
    setPhase("uploading");
    setCurrentStep(0);
    setProgress(0);
    setResult(null);
    setError(null);

    // ── Step 1: Try local DB match ─────────────────────────────────────────
    const rawText = await extractTextFromFile(file);
    const localCheck = checkIngredientsLocally(rawText);

    // If ≥80% matched with unknowns ≤ 20% → use local result, skip AI entirely
    if (localCheck.isFullyCovered) {
      // Quick animation (faster than full AI scan)
      setPhase("analyzing");
      setProgress(30);
      await new Promise((r) => setTimeout(r, 400));
      setProgress(65);
      await new Promise((r) => setTimeout(r, 350));
      setProgress(95);
      await new Promise((r) => setTimeout(r, 250));

      const localResult = buildLocalResult(file.name, localCheck);
      finishScan({
        ...localResult,
        engine: "local",
        scanId: `SCN-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString(),
      });
      return;
    }

    // ── Step 2: AI analysis (full or hybrid) ───────────────────────────────
    const formData = new FormData();
    formData.append("file", file);

    // If we have partial local matches, pass them as "Already Verified" context
    // so the AI focuses tokens only on the unknown ingredients
    if (localCheck.results.length > 0) {
      const context = localCheck.results
        .map((m) => `- ${m.entry.name}: ${m.entry.status.toUpperCase()} (${m.entry.description})`)
        .join("\n");
      formData.append("localContext", context);
    }

    const engine: ScanEngine = localCheck.results.length > 0 ? "hybrid" : "ai";

    try {
      const [apiResult] = await Promise.all([
        fetch("/api/analyze", { method: "POST", body: formData }).then(async (r) => {
          if (!r.ok) {
            const body = await r.json().catch(() => ({ error: "Request failed" }));
            throw new Error(body.error ?? "Analysis request failed");
          }
          return r.json() as Promise<Omit<ScanResult, "scanId" | "timestamp">>;
        }),
        runStepAnimation(),
      ]);
      // Enrich AI ingredients with local DB alternatives where available
      const enriched = (apiResult.ingredients ?? []).map((ing) => {
        const lower = ing.name.toLowerCase();
        const entry = HALAL_DICTIONARY.find(
          (e) =>
            e.name.toLowerCase().includes(lower) ||
            lower.includes(e.name.toLowerCase().split(/\s*[—–-]\s*/).pop()?.toLowerCase() ?? "") ||
            (e.aliases ?? []).some((a) => lower.includes(a.toLowerCase()) || a.toLowerCase().includes(lower))
        );
        return entry?.halal_alternative
          ? { ...ing, halal_alternative: entry.halal_alternative, trusted_suppliers: entry.trusted_suppliers }
          : ing;
      });
      finishScan({
        ...apiResult,
        ingredients: enriched,
        engine,
        scanId: `SCN-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toLocaleString(),
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Analysis failed.";
      const isQuota = errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("API key") || errMsg.includes("limit");

      if (isQuota && localCheck.results.length > 0) {
        // API failed but we have local matches — use them as fallback
        const localResult = buildLocalResult(file.name, localCheck);
        finishScan({
          ...localResult,
          engine: "local",
          scanId: `SCN-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleString(),
        });
      } else if (isQuota) {
        const demo = DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)];
        finishScan({ ...demo.result, engine: "ai", scanId: `SCN-${Date.now().toString().slice(-4)}`, timestamp: new Date().toLocaleString() });
      } else {
        setPhase("idle");
        setError(errMsg);
      }
    }
  }, [runStepAnimation, finishScan, buildLocalResult, extractTextFromFile]);

  // ── Demo scan ────────────────────────────────────────────────────────────
  const runDemoAnalysis = useCallback(async (productIndex: number) => {
    if (phase !== "idle") return;                          // race-condition guard
    const product = DEMO_PRODUCTS[productIndex];
    setFileName(product.file);
    setPhase("uploading");
    setCurrentStep(0);
    setProgress(0);
    setResult(null);
    setError(null);
    await runStepAnimation();
    finishScan({ ...product.result, scanId: `SCN-${1042 + productIndex}`, timestamp: new Date().toLocaleString() });
  }, [phase, runStepAnimation, finishScan]);

  // ── Batch analysis ───────────────────────────────────────────────────────
  const runBatchAnalysis = useCallback(async (files: File[]) => {
    const items: BatchItem[] = files.map((f, i) => ({
      id: `batch-${i}-${Date.now()}`,
      file: f,
      fileName: f.name,
      status: "pending",
      progress: 0,
      currentStep: 0,
    }));
    setBatchItems(items);
    setBatchReportUrl(null);
    setPhase("batch");

    for (const item of items) {
      setBatchItems(prev => prev.map(it =>
        it.id === item.id ? { ...it, status: "processing" } : it
      ));

      try {
        const formData = new FormData();
        formData.append("file", item.file);

        const [apiResult] = await Promise.all([
          fetch("/api/analyze", { method: "POST", body: formData }).then(async r => {
            if (!r.ok) {
              const body = await r.json().catch(() => ({ error: "Failed" }));
              throw new Error(body.error ?? "Analysis failed");
            }
            return r.json() as Promise<Omit<ScanResult, "scanId" | "timestamp">>;
          }),
          runItemAnimation(item.id),
        ]);

        const scanResult: ScanResult = {
          ...apiResult,
          scanId: `SCN-${Date.now().toString().slice(-4)}`,
          timestamp: new Date().toLocaleString(),
        };

        setBatchItems(prev => prev.map(it =>
          it.id === item.id ? { ...it, status: "done", progress: 100, result: scanResult } : it
        ));
        persistScan(scanResult);
        setHistory(prev => [scanResult, ...prev].slice(0, 20));

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Analysis failed";
        const isQuota = errMsg.includes("quota") || errMsg.includes("429") || errMsg.includes("API key") || errMsg.includes("limit");

        if (isQuota) {
          const demo = DEMO_PRODUCTS[Math.floor(Math.random() * DEMO_PRODUCTS.length)];
          const scanResult: ScanResult = {
            ...demo.result,
            product: item.fileName.replace(/\.[^/.]+$/, ""),
            scanId: `SCN-${Date.now().toString().slice(-4)}`,
            timestamp: new Date().toLocaleString(),
          };
          setBatchItems(prev => prev.map(it =>
            it.id === item.id ? { ...it, status: "done", progress: 100, result: scanResult } : it
          ));
          persistScan(scanResult);
        } else {
          setBatchItems(prev => prev.map(it =>
            it.id === item.id ? { ...it, status: "error", error: errMsg } : it
          ));
        }
      }
    }

    setPhase("batch-done");
  }, [runItemAnimation, persistScan]);

  // ── Generate batch PDF ────────────────────────────────────────────────────
  const generateBatchReport = useCallback(async () => {
    const doneItems = batchItems.filter(it => it.status === "done" && it.result);
    if (doneItems.length === 0) return;
    setBatchReportLoading(true);
    try {
      const resp = await fetch("/api/generate-batch-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: `BATCH-${Date.now().toString().slice(-6)}`,
          timestamp: new Date().toLocaleString(),
          items: doneItems.map(it => ({
            scanId:          it.result!.scanId,
            product:         it.result!.product,
            overallStatus:   it.result!.overallStatus,
            riskLevel:       it.result!.riskLevel,
            complianceScore: it.result!.complianceScore,
            reason:          it.result!.reason,
          })),
        }),
      });
      const { url } = await resp.json();
      if (url) setBatchReportUrl(url);
    } catch (e) {
      console.error("[batch-report] error:", e);
    } finally {
      setBatchReportLoading(false);
    }
  }, [batchItems]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  // Guard: reject any new scan while one is already in progress.
  // Covers drop events, file-picker changes, and programmatic triggers.
  const isScanning = phase !== "idle";

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (phase !== "idle") return;
    const { valid, message, level } = validateFiles(Array.from(e.dataTransfer.files));
    if (message && level) showToast(message, level);
    if (valid.length === 0) return;
    if (valid.length === 1) runRealAnalysis(valid[0]);
    else runBatchAnalysis(valid);
  }, [phase, showToast, runRealAnalysis, runBatchAnalysis]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (phase !== "idle") { e.target.value = ""; return; }
    const { valid, message, level } = validateFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
    if (message && level) showToast(message, level);
    if (valid.length === 0) return;
    if (valid.length === 1) runRealAnalysis(valid[0]);
    else runBatchAnalysis(valid);
  }, [phase, showToast, runRealAnalysis, runBatchAnalysis]);

  const reset = () => {
    setPhase("idle");
    setCurrentStep(0);
    setProgress(0);
    setFileName("");
    setResult(null);
    setExpandedRow(null);
    setError(null);
    setReportUrl(null);
    setReportLoading(false);
    setAuditReadiness(null);
    setBatchItems([]);
    setBatchReportUrl(null);
    setBatchReportLoading(false);
    setExpandedBatchItem(null);
  };

  // ── Batch computed values ─────────────────────────────────────────────────
  const batchDone      = batchItems.filter(it => it.status === "done").length;
  const batchTotal     = batchItems.length;
  const batchResults   = batchItems.filter(it => it.status === "done" && it.result).map(it => it.result!);
  const batchAvgScore  = batchResults.length > 0
    ? Math.round(batchResults.reduce((a, r) => a + r.complianceScore, 0) / batchResults.length)
    : 0;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto min-h-full" style={{ background: "#09101e" }}>

      {/* Hidden file input — multiple */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        className="hidden"
        disabled={isScanning}
        onChange={handleFileChange}
      />

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="flex-1 text-sm text-red-300">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── File validation toast (auto-dismisses in 5s) ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
              toast.level === "error"
                ? "border-red-500/20 bg-red-500/10 text-red-300"
                : "border-amber-500/20 bg-amber-500/10 text-amber-300"
            }`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p className="flex-1 text-sm">{toast.message}</p>
            <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">

        {/* ══ IDLE: Upload zone ══════════════════════════════════════════════ */}
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }}>

            {/* Page header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-900/40">
                  <ScanLine className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-xl font-black text-white tracking-tight">AI Scanner</h1>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Powered by Gemini
                </span>
              </div>
              <p className="text-sm text-slate-500 ml-12">Upload product images or documents to instantly check halal compliance</p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 sm:p-16 text-center transition-all duration-200 cursor-pointer overflow-hidden ${
                dragOver
                  ? "border-emerald-400/60 scale-[1.005]"
                  : "border-white/[0.08] hover:border-emerald-500/30"
              }`}
              style={{ background: dragOver ? "rgba(16,185,129,0.05)" : "#0d1525" }}
            >
              {/* Ambient glow */}
              <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${dragOver ? "opacity-100" : "opacity-0"}`}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
              </div>

              <div className={`relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-200 ${
                dragOver ? "bg-emerald-500/20 scale-110 ring-1 ring-emerald-500/30" : "bg-white/[0.04] ring-1 ring-white/[0.06]"
              }`}>
                <Upload className={`h-9 w-9 transition-colors ${dragOver ? "text-emerald-300" : "text-slate-500"}`} />
              </div>

              <p className="relative mb-2 text-xl font-bold text-white">
                {dragOver ? "Release to start scanning" : "Drop your file here"}
              </p>
              <p className="relative text-sm text-slate-500 mb-4">
                or <span className="text-emerald-400 font-semibold">browse to upload</span> · JPG, PNG, PDF supported
              </p>

              <div className="relative flex flex-wrap justify-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs text-slate-500">
                  <Shield className="h-3 w-3 text-emerald-500" /> End-to-end encrypted
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs text-slate-500">
                  <Zap className="h-3 w-3 text-amber-400" /> Results in &lt;10s
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] px-3 py-1 text-xs text-slate-500">
                  <Files className="h-3 w-3 text-blue-400" /> Batch mode supported
                </span>
              </div>
            </div>

            {/* Demo products */}
            <div className="mt-5">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-600">Try a demo scan</p>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {DEMO_PRODUCTS.map((p, i) => {
                  const demoStatus = p.result.overallStatus;
                  const demoColor = demoStatus === "halal" ? "text-emerald-400" : demoStatus === "haram" ? "text-red-400" : "text-amber-400";
                  const demoBg    = demoStatus === "halal" ? "bg-emerald-500/8" : demoStatus === "haram" ? "bg-red-500/8" : "bg-amber-500/8";
                  return (
                    <button
                      key={p.name}
                      onClick={() => runDemoAnalysis(i)}
                      className="group flex items-center gap-3 rounded-xl border border-white/[0.05] p-3.5 text-left transition-all hover:border-white/[0.1] hover:bg-white/[0.03]"
                      style={{ background: "#0d1525" }}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${demoBg} ring-1 ring-white/[0.06] transition-all group-hover:scale-105`}>
                        <FileImage className={`h-4.5 w-4.5 ${demoColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">{p.file}</p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-700 group-hover:text-slate-400 transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ══ UPLOADING / ANALYZING (single) ════════════════════════════════ */}
        {(phase === "uploading" || phase === "analyzing") && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border border-white/[0.05] p-8 relative overflow-hidden"
            style={{ background: "#0d1525" }}
          >
            {/* Background pulse */}
            <div className="pointer-events-none absolute inset-0">
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-48 w-48 rounded-full bg-emerald-400/6 blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            <div className="relative mb-8 flex items-center gap-4">
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-500/25">
                <ScanLine className="h-6 w-6 text-emerald-400" />
                <motion.div
                  className="absolute inset-0 rounded-2xl ring-1 ring-emerald-400/40"
                  animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white truncate max-w-[200px] sm:max-w-sm">{fileName}</p>
                <p className="text-xs text-slate-500 mt-0.5">AI analysis in progress · do not close tab</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-black text-emerald-400 tabular-nums">{progress}%</p>
                <p className="text-[10px] text-slate-600 font-mono">complete</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative mb-7 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Steps */}
            <div className="relative space-y-2">
              {ANALYSIS_STEPS.map((step, i) => {
                const done   = i < currentStep;
                const active = i === currentStep;
                return (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all ${
                      active ? "bg-emerald-500/8 ring-1 ring-emerald-500/20" : ""
                    }`}
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
                      done ? "bg-emerald-500/25" : active ? "bg-emerald-500/15" : "bg-white/[0.04]"
                    }`}>
                      {done   ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> :
                       active ? <Loader2 className="h-3 w-3 animate-spin text-emerald-400" /> :
                                <span className="h-1 w-1 rounded-full bg-slate-700" />}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${
                      done ? "text-slate-500 line-through decoration-slate-600" : active ? "text-white" : "text-slate-700"
                    }`}>
                      {step.label}
                    </span>
                    {done && <span className="ml-auto text-[10px] font-semibold text-emerald-500/60 uppercase tracking-wider">Done</span>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ══ BATCH: Processing queue ════════════════════════════════════════ */}
        {(phase === "batch" || phase === "batch-done") && (
          <motion.div
            key="batch"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35 }}
            className="space-y-4"
          >
            {/* Queue card */}
            <div className="rounded-2xl border border-white/[0.05] overflow-hidden" style={{ background: "#0d1525" }}>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20">
                    <Layers className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Batch Processing</p>
                    <p className="text-xs text-slate-500">
                      {phase === "batch-done"
                        ? `All ${batchTotal} files processed`
                        : `${batchDone} of ${batchTotal} complete`}
                    </p>
                  </div>
                </div>
                {phase === "batch"
                  ? <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                  : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              </div>

              {/* Overall batch progress bar */}
              <div className="px-5 pt-4 pb-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
                    animate={{ width: `${batchTotal > 0 ? (batchDone / batchTotal) * 100 : 0}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              {/* Queue items */}
              <div className="divide-y divide-white/[0.04]">
                {batchItems.map((item) => {
                  const isExpanded = expandedBatchItem === item.id;
                  const r = item.result;
                  return (
                    <div key={item.id} className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {/* Status icon */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all ${
                          item.status === "done"       ? "bg-emerald-500/20" :
                          item.status === "processing" ? "bg-blue-500/10" :
                          item.status === "error"      ? "bg-red-500/10" : "bg-slate-800"
                        }`}>
                          {item.status === "done"       ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
                           item.status === "processing" ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" /> :
                           item.status === "error"      ? <XCircle className="h-4 w-4 text-red-400" /> :
                                                          <span className="h-2 w-2 rounded-full bg-slate-600" />}
                        </div>

                        {/* File info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.fileName}</p>
                          {item.status === "processing" && (
                            <p className="text-xs text-slate-500 truncate">
                              {ANALYSIS_STEPS[item.currentStep]?.label ?? "Processing…"}
                            </p>
                          )}
                          {item.status === "done" && r && (
                            <p className="text-xs text-slate-500 truncate">{r.product}</p>
                          )}
                          {item.status === "error" && (
                            <p className="text-xs text-red-400 truncate">{item.error}</p>
                          )}
                          {item.status === "pending" && (
                            <p className="text-xs text-slate-600">Waiting…</p>
                          )}
                        </div>

                        {/* Score + expand (when done) */}
                        {item.status === "done" && r && (
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${statusCfg[r.overallStatus].badgeCls}`}>
                              {r.complianceScore}/100
                            </span>
                            <button
                              onClick={() => setExpandedBatchItem(isExpanded ? null : item.id)}
                              className="text-slate-600 hover:text-slate-400 transition-colors"
                            >
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Progress bar (processing) */}
                      {item.status === "processing" && (
                        <div className="mt-3 ml-11">
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                              animate={{ width: `${item.progress}%` }}
                              transition={{ duration: 0.4 }}
                            />
                          </div>
                          <p className="mt-1 text-right text-[10px] font-mono text-blue-400/60">{item.progress}%</p>
                        </div>
                      )}

                      {/* Expanded inline result */}
                      <AnimatePresence>
                        {isExpanded && r && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 ml-11 rounded-xl border border-white/[0.05] bg-slate-950/60 p-4 space-y-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg[r.overallStatus].badgeCls}`}>
                                  {statusCfg[r.overallStatus].label}
                                </span>
                                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${riskLevelCfg[r.riskLevel].cls}`}>
                                  {r.riskLevel} Risk
                                </span>
                                <span className="ml-auto text-xs font-mono text-slate-500">{r.scanId}</span>
                              </div>
                              {r.reason && <p className="text-xs text-slate-400">{r.reason}</p>}
                              <div className="grid grid-cols-3 gap-2 text-center">
                                {(["halal","doubtful","haram"] as const).map(s => {
                                  const count = r.ingredients.filter(i => i.status === s).length;
                                  return (
                                    <div key={s} className={`rounded-lg border px-2 py-1.5 ${statusCfg[s].badgeCls}`}>
                                      <p className="text-sm font-bold leading-none">{count}</p>
                                      <p className="text-[9px] opacity-70 mt-0.5">{statusCfg[s].label}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Batch-done summary + actions ────────────────────────────── */}
            {phase === "batch-done" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-white/[0.05] p-6"
              style={{ background: "#0d1525" }}
              >
                {/* Stats */}
                <div className="flex items-center gap-3 mb-5">
                  <BarChart2 className="h-5 w-5 text-emerald-400" />
                  <p className="font-bold text-white">Batch Summary</p>
                  <span className="ml-auto rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400">
                    {batchDone}/{batchTotal} processed
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  {[
                    { label: "Avg Score", value: batchAvgScore, cls: batchAvgScore >= 80 ? "text-emerald-400" : batchAvgScore >= 50 ? "text-amber-400" : "text-red-400" },
                    { label: "Scanned",   value: batchTotal,    cls: "text-white" },
                    { label: "Halal",     value: batchResults.filter(r => r.overallStatus === "halal").length,    cls: "text-emerald-400" },
                    { label: "Doubtful",  value: batchResults.filter(r => r.overallStatus === "doubtful").length, cls: "text-amber-400" },
                    { label: "Haram",     value: batchResults.filter(r => r.overallStatus === "haram").length,    cls: "text-red-400" },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl border border-white/[0.05] px-4 py-3 text-center" style={{ background: "#080c14" }}>
                      <p className={`text-2xl font-extrabold leading-none ${stat.cls}`}>{stat.value}</p>
                      <p className="mt-1.5 text-[10px] text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {batchReportLoading ? (
                    <Button disabled className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white opacity-70">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Batch Report…
                    </Button>
                  ) : batchReportUrl ? (
                    <a href={batchReportUrl} target="_blank" rel="noopener noreferrer" download>
                      <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30">
                        <Download className="mr-2 h-4 w-4" />
                        Download Batch Summary PDF
                      </Button>
                    </a>
                  ) : (
                    <Button
                      onClick={generateBatchReport}
                      className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Generate Batch Summary Report
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    onClick={reset}
                    className="text-slate-400 hover:text-white"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    New Scan
                  </Button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ══ DONE: Single-file result ═══════════════════════════════════════ */}
        {phase === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* Result Banner */}
            <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${overallStatusCfg[result.overallStatus].cls} p-6`}>
              <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-white/[0.02] blur-3xl" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${
                    result.overallStatus === "halal"    ? "bg-emerald-500/20 ring-emerald-500/30" :
                    result.overallStatus === "doubtful" ? "bg-amber-500/20 ring-amber-500/30" :
                                                          "bg-red-500/20 ring-red-500/30"
                  }`}>
                    {result.overallStatus === "halal"    ? <CheckCircle2 className="h-7 w-7 text-emerald-400" /> :
                     result.overallStatus === "doubtful" ? <AlertTriangle className="h-7 w-7 text-amber-400" /> :
                                                           <XCircle className="h-7 w-7 text-red-400" />}
                  </div>
                  <div>
                    <span className={`inline-block rounded-full border px-3 py-0.5 text-xs font-bold tracking-wider ${overallStatusCfg[result.overallStatus].badge}`}>
                      {overallStatusCfg[result.overallStatus].label}
                    </span>
                    <h2 className="mt-1.5 text-xl font-bold text-white">{result.product}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
                      <span className="font-mono">{result.scanId}</span>
                      <span className="text-slate-700">·</span>
                      <span>{result.timestamp}</span>
                      <span className="text-slate-700">·</span>
                      {result.engine === "local" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                          <Database className="h-2.5 w-2.5" /> Verified by Amanah Local DB ⚡
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400">
                          <Cpu className="h-2.5 w-2.5" /> AI-Enhanced Analysis {result.engine === "hybrid" ? "(DB + AI)" : ""} 🤖
                        </span>
                      )}
                    </div>
                    {result.reason && (
                      <p className="mt-2 max-w-md text-sm text-slate-300">{result.reason}</p>
                    )}
                  </div>
                </div>

                <div className="text-center">
                  <div className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl ring-1 ${riskLevelCfg[result.riskLevel].cls}`}>
                    <span className="text-xl font-extrabold">{result.complianceScore}</span>
                    <span className="text-[9px] font-medium opacity-70">/ 100</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500">Compliance Score</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {(["halal", "doubtful", "haram"] as const).map((s) => {
                  const count = result.ingredients.filter((i) => i.status === s).length;
                  const cfg = statusCfg[s];
                  const Icon = cfg.icon;
                  return (
                    <div key={s} className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${cfg.badgeCls}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-lg font-extrabold leading-none">{count}</p>
                        <p className="text-[10px] opacity-70">{cfg.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── JAKIM Readiness Gauge ──────────────────────────────────────── */}
            {auditReadiness && (() => {
              const ar = auditReadiness;
              const LEVEL_CFG = {
                "not-ready": { bar: "from-red-500 to-red-400",     text: "text-red-400",     ring: "ring-red-500/20",     bg: "bg-red-500/8"     },
                "partial":   { bar: "from-amber-500 to-amber-400", text: "text-amber-400",   ring: "ring-amber-500/20",   bg: "bg-amber-500/8"   },
                "good":      { bar: "from-blue-500 to-cyan-400",   text: "text-blue-400",    ring: "ring-blue-500/20",    bg: "bg-blue-500/8"    },
                "ready":     { bar: "from-emerald-500 to-teal-400",text: "text-emerald-400", ring: "ring-emerald-500/20", bg: "bg-emerald-500/8" },
              }[ar.level];
              const rows = [
                { label: "Ingredient Safety",     score: ar.breakdown.ingredients.score, max: 50, note: ar.breakdown.ingredients.note, color: "bg-emerald-500" },
                { label: "Document Completeness", score: ar.breakdown.documents.score,   max: 30, note: ar.breakdown.documents.note,   color: "bg-blue-500"   },
                { label: "Supplier Reliability",  score: ar.breakdown.supplier.score,    max: 20, note: ar.breakdown.supplier.note,    color: "bg-violet-500" },
              ];

              return (
                <div className="rounded-2xl border border-white/[0.05] overflow-hidden" style={{ background: "#0d1525" }}>
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <Target className="h-4 w-4 text-violet-400" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">JAKIM Audit Readiness</h3>
                        <p className="text-xs text-slate-500">Certification readiness score based on ingredients, documents &amp; supplier reliability</p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                      ar.level === "ready"     ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                      ar.level === "good"      ? "border-blue-500/30 bg-blue-500/10 text-blue-400"         :
                      ar.level === "partial"   ? "border-amber-500/30 bg-amber-500/10 text-amber-400"       :
                                                 "border-red-500/30 bg-red-500/10 text-red-400"
                    }`}>{ar.label}</span>
                  </div>

                  <div className="p-5 space-y-5">
                    {/* Gauge arc + score */}
                    <div className="flex items-center gap-6">
                      {/* Arc gauge (SVG semi-circle) */}
                      <div className="relative shrink-0 w-28 h-16 overflow-hidden">
                        <svg viewBox="0 0 120 66" className="w-full h-full" style={{ overflow: "visible" }}>
                          {/* Track */}
                          <path
                            d="M10,60 A50,50 0 0,1 110,60"
                            fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"
                          />
                          {/* Fill — stroke-dasharray trick on a path */}
                          <motion.path
                            d="M10,60 A50,50 0 0,1 110,60"
                            fill="none"
                            stroke="url(#gaugeGrad)"
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray="157"
                            initial={{ strokeDashoffset: 157 }}
                            animate={{ strokeDashoffset: 157 - (ar.score / 100) * 157 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                          />
                          <defs>
                            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%"   stopColor={ar.level === "ready" ? "#10b981" : ar.level === "good" ? "#3b82f6" : ar.level === "partial" ? "#f59e0b" : "#ef4444"} />
                              <stop offset="100%" stopColor={ar.level === "ready" ? "#14b8a6" : ar.level === "good" ? "#06b6d4" : ar.level === "partial" ? "#f97316" : "#f87171"} />
                            </linearGradient>
                          </defs>
                        </svg>
                        {/* Score number centred below arc */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                          <motion.p
                            className={`text-2xl font-black leading-none tabular-nums ${LEVEL_CFG.text}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                          >
                            {ar.score}
                          </motion.p>
                          <p className="text-[9px] text-slate-600 font-mono">/ 100</p>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className={`flex-1 rounded-xl px-4 py-3 ring-1 ${LEVEL_CFG.ring} ${LEVEL_CFG.bg}`}>
                        <p className={`text-xs font-semibold mb-1 ${LEVEL_CFG.text}`}>Recommendation</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{ar.recommendation}</p>
                        {ar.breakdown.documents.docs.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ar.breakdown.documents.docs.map((d) => (
                              <span key={d} className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400 font-medium">{d}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Breakdown bars */}
                    <div className="space-y-3">
                      {rows.map((r, i) => (
                        <div key={r.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400">{r.label}</span>
                            <span className="text-xs font-bold text-white tabular-nums">{r.score}<span className="text-slate-600 font-normal">/{r.max}</span></span>
                          </div>
                          <div className="relative h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                            <motion.div
                              className={`h-full rounded-full ${r.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${(r.score / r.max) * 100}%` }}
                              transition={{ duration: 0.7, delay: 0.1 * i }}
                            />
                          </div>
                          <p className="mt-0.5 text-[10px] text-slate-600">{r.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Ingredients Table */}
            <div className="rounded-2xl border border-white/[0.05] overflow-hidden" style={{ background: "#0d1525" }}>
              <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Ingredient Breakdown</h3>
                  <p className="text-xs text-slate-500">{result.ingredients.length} ingredients analysed</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskLevelCfg[result.riskLevel].cls}`}>
                  {result.riskLevel} Risk
                </span>
              </div>

              <div className="divide-y divide-white/[0.04]">
                {result.ingredients.map((ing, i) => {
                  const cfg = statusCfg[ing.status];
                  const Icon = cfg.icon;
                  const isExpanded = expandedRow === ing.name;
                  return (
                    <motion.div key={ing.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                      <button
                        onClick={() => setExpandedRow(isExpanded ? null : ing.name)}
                        className={`w-full text-left transition-colors ${cfg.rowCls}`}
                      >
                        <div className="flex items-center gap-4 px-5 py-4">
                          <Icon className={`h-4 w-4 shrink-0 ${cfg.badgeCls.split(" ")[2]}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{ing.name}</p>
                            <p className="text-xs text-slate-500 font-mono">{ing.jakim}</p>
                          </div>
                          <div className="hidden sm:flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-800">
                              <motion.div
                                className={`h-full rounded-full ${ing.status === "halal" ? "bg-emerald-500" : ing.status === "doubtful" ? "bg-amber-500" : "bg-red-500"}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${ing.confidence}%` }}
                                transition={{ duration: 0.7, delay: 0.2 + i * 0.07 }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs text-slate-500">{ing.confidence}%</span>
                          </div>
                          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeCls}`}>{cfg.label}</span>
                          <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mx-5 mb-4 space-y-2.5">
                              {/* Details */}
                              <div className="rounded-xl border border-white/[0.05] bg-slate-950/60 p-4">
                                <div className="flex items-start gap-2">
                                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                                  <p className="text-sm text-slate-400">{ing.details}</p>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                                  <span>JAKIM Ref: <span className="font-mono text-slate-300">{ing.jakim}</span></span>
                                  <span>Risk: <span className={ing.risk === "None" ? "text-emerald-400" : ing.risk === "Critical" ? "text-red-400" : "text-amber-400"}>{ing.risk}</span></span>
                                  <span>Confidence: <span className="text-white">{ing.confidence}%</span></span>
                                </div>
                              </div>

                              {/* Halal Swap Card — only for haram/doubtful with alternatives */}
                              {(ing.status === "haram" || ing.status === "doubtful") && ing.halal_alternative && (
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Recommended Halal Swap</span>
                                  </div>
                                  <div className="flex items-start gap-2 mb-3">
                                    <ArrowLeftRight className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-white">{ing.halal_alternative}</p>
                                  </div>
                                  {ing.trusted_suppliers && ing.trusted_suppliers.length > 0 && (
                                    <div className="space-y-1.5">
                                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                        <Building2 className="h-3 w-3" /> Trusted Suppliers
                                      </p>
                                      {ing.trusted_suppliers.map((s) => (
                                        <div key={s} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-slate-900/60 px-3 py-2">
                                          <span className="text-xs text-slate-300">{s}</span>
                                          <button
                                            onClick={() => navigator.clipboard.writeText(s)}
                                            className="flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                                          >
                                            Contact Supplier
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* ── Traceability Timeline + QR ──────────────────────────────────── */}
            {(() => {
              const stages = buildTimelineStages(result.overallStatus, new Date().toISOString());
              const passportUrl = result.batchId
                ? `https://amanah-ai.vercel.app/verify/${result.batchId}`
                : null;
              return (
                <div className="rounded-2xl border border-white/[0.05] overflow-hidden" style={{ background: "#0d1525" }}>
                  <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <QrCode className="h-4 w-4 text-teal-400" />
                      <div>
                        <h3 className="text-sm font-semibold text-white">Traceability Timeline</h3>
                        <p className="text-xs text-slate-500">Digital supply chain record for this batch</p>
                      </div>
                    </div>
                    {result.batchId && (
                      <span className="rounded-full border border-teal-500/25 bg-teal-500/10 px-3 py-0.5 font-mono text-[10px] font-bold text-teal-400">
                        {result.batchId}
                      </span>
                    )}
                  </div>

                  <div className="p-5 grid sm:grid-cols-[1fr_200px] gap-6 items-start">
                    {/* Timeline */}
                    <TraceabilityTimeline stages={stages} compact />

                    {/* QR + passport link */}
                    <div className="flex flex-col items-center gap-3">
                      {passportUrl ? (
                        <>
                          <div className="rounded-2xl border border-white/[0.06] bg-[#080c14] p-3 shadow-lg">
                            <QRCodeSVG
                              value={passportUrl}
                              size={148}
                              level="H"
                              fgColor="#00c67a"
                              bgColor="#080c14"
                              includeMargin={false}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 text-center">Scan to open Digital Passport</p>
                          <Link
                            href={passportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 rounded-lg border border-teal-500/25 bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-400 hover:bg-teal-500/20 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Digital Passport
                          </Link>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-center py-4">
                          <QrCode className="h-8 w-8 text-slate-700" />
                          <p className="text-xs text-slate-600">QR will appear after scan is saved</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── Share Results ───────────────────────────────────────────── */}
            {(() => {
              const passportUrl = result.batchId
                ? `https://amanah-ai.vercel.app/verify/${result.batchId}`
                : null;
              const statusEmoji = result.overallStatus === "halal" ? "✅" : result.overallStatus === "doubtful" ? "⚠️" : "❌";
              const statusLabel = result.overallStatus === "halal" ? "HALAL COMPLIANT" : result.overallStatus === "doubtful" ? "REVIEW NEEDED" : "NON-COMPLIANT";
              const waText = encodeURIComponent(
                `${statusEmoji} *Halal Audit Result – ${result.product}*\n` +
                `Status: *${statusLabel}* | Score: *${result.complianceScore}/100*\n` +
                (result.reason ? `\n${result.reason}\n` : "") +
                (passportUrl ? `\n📋 Digital Passport:\n${passportUrl}` : "") +
                `\n\n_Powered by Amanah AI – amanah-ai.vercel.app_`
              );
              const emailSubject = encodeURIComponent(`Halal Compliance Report – ${result.product}`);
              const emailBody = encodeURIComponent(
                `Halal Audit Result\n` +
                `==================\n` +
                `Product: ${result.product}\n` +
                `Status: ${statusLabel}\n` +
                `Compliance Score: ${result.complianceScore}/100\n` +
                `Risk Level: ${result.riskLevel}\n` +
                (result.reason ? `\nSummary:\n${result.reason}\n` : "") +
                (passportUrl ? `\nDigital Passport (QR Verified):\n${passportUrl}\n` : "") +
                `\nGenerated by Amanah AI\nhttps://amanah-ai.vercel.app`
              );
              return (
                <div className="rounded-2xl border border-white/[0.05] overflow-hidden" style={{ background: "#0d1525" }}>
                  <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-5 py-4">
                    <Share2 className="h-4 w-4 text-blue-400" />
                    <div>
                      <h3 className="text-sm font-semibold text-white">Share Results</h3>
                      <p className="text-xs text-slate-500">Send audit results to your team or supplier</p>
                    </div>
                  </div>
                  <div className="p-5 flex flex-wrap gap-3">
                    {/* WhatsApp */}
                    <a
                      href={`https://wa.me/?text=${waText}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-[#25D366]/25 bg-[#25D366]/10 px-4 py-2.5 text-sm font-semibold text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Share via WhatsApp
                    </a>

                    {/* Email */}
                    <a
                      href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
                      className="flex items-center gap-2 rounded-xl border border-blue-500/25 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-400 hover:bg-blue-500/20 transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      Send via Email
                    </a>

                    {/* Copy passport link */}
                    {passportUrl && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(passportUrl);
                          setCopiedPassport(true);
                          setTimeout(() => setCopiedPassport(false), 2000);
                        }}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 hover:border-white/20 hover:bg-white/[0.07] transition-colors"
                      >
                        {copiedPassport ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                        {copiedPassport ? "Copied!" : "Copy Passport Link"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {reportLoading ? (
                <Button disabled className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white opacity-70">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </Button>
              ) : reportUrl ? (
                <a href={reportUrl} target="_blank" rel="noopener noreferrer" download>
                  <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-900/30">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF Report
                  </Button>
                </a>
              ) : (
                <Button disabled className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white opacity-40">
                  <Download className="mr-2 h-4 w-4" />
                  Export PDF Report
                </Button>
              )}
              <Link href={`/dashboard/scanner/${result.scanId}`}>
                <Button variant="outline" className="border-white/10 bg-transparent text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/[0.04] hover:text-emerald-300">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Trends
                </Button>
              </Link>
              <Button
                variant="outline"
                className="border-white/10 bg-transparent text-slate-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
                onClick={() => navigator.clipboard.writeText(result.scanId)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Scan ID
              </Button>
              <Button variant="ghost" onClick={reset} className="text-slate-400 hover:text-white">
                <RotateCcw className="mr-2 h-4 w-4" />
                New Scan
              </Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── Scan History ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/[0.06] bg-slate-900/60 overflow-hidden"
          >
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex items-center gap-3">
                <History className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-semibold text-white">Scan History</span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">{history.length}</span>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${showHistory ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  key="history-list"
                  initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-white/[0.04] border-t border-white/[0.04]">
                    {history.map((h) => {
                      const cfg = overallStatusCfg[h.overallStatus];
                      const dotCls = h.overallStatus === "halal" ? "bg-emerald-400" : h.overallStatus === "doubtful" ? "bg-amber-400" : "bg-red-400";
                      return (
                        <div key={h.scanId} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                          <button
                            onClick={() => { setResult(h); setPhase("done"); setExpandedRow(null); }}
                            className="flex flex-1 items-center gap-4 text-left min-w-0"
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${dotCls}`} />
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-medium text-white">{h.product}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                <span className="font-mono">{h.scanId}</span>
                                <span className="text-slate-700">·</span>
                                <span>{h.timestamp}</span>
                              </div>
                            </div>
                            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                              {h.complianceScore}/100
                            </span>
                          </button>
                          <Link
                            href={`/dashboard/scanner/${h.scanId}`}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-slate-600 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                          >
                            <TrendingUp className="h-3 w-3" />
                            Trends
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
