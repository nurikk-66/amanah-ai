// ─── Types ────────────────────────────────────────────────────────────────────

export type AuditLevel = "not-ready" | "partial" | "good" | "ready";

export interface AuditReadinessResult {
  score: number;          // 0–100
  level: AuditLevel;
  label: string;
  breakdown: {
    ingredients: { score: number; max: 50; note: string };
    documents:   { score: number; max: 30; note: string; docs: string[] };
    supplier:    { score: number; max: 20; note: string };
  };
  recommendation: string;
}

// ─── Document detection patterns ─────────────────────────────────────────────

const DOC_CHECKS: ReadonlyArray<{ label: string; re: RegExp; pts: number }> = [
  { label: "COA",               re: /coa|certificate[_\s-]of[_\s-]analysis/i, pts: 12 },
  { label: "MSDS / SDS",        re: /msds|sds|safety[\s_-]data/i,              pts: 8  },
  { label: "Halal Certificate", re: /halal[_\s-]cert|jakim|muis/i,              pts: 7  },
  { label: "Product Spec",      re: /\bspec\b|specification/i,                  pts: 3  },
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

function scoreIngredients(complianceScore: number): number {
  return Math.round(Math.min(50, Math.max(0, (complianceScore / 100) * 50)));
}

function detectDocuments(
  fileName: string,
  detailText: string,
): { docs: string[]; score: number } {
  const hay = `${fileName} ${detailText}`;
  const docs: string[] = [];
  let score = 0;
  for (const c of DOC_CHECKS) {
    if (c.re.test(hay)) { docs.push(c.label); score += c.pts; }
  }
  // Bonus: certification mention inside ingredient details
  if (
    !docs.includes("Halal Certificate") &&
    /mspo certified|jakim certified|halal certified/i.test(detailText)
  ) {
    docs.push("Halal Certificate");
    score += 7;
  }
  return { docs, score: Math.min(30, score) };
}

function scoreSupplier(
  ingredients: Array<{ status: string; confidence: number }>,
  doubtfulCt: number,
  haramCt: number,
): number {
  if (!ingredients.length) return 10;
  const avg = ingredients.reduce((a, i) => a + i.confidence, 0) / ingredients.length;
  return Math.min(
    20,
    Math.max(0, Math.round((avg / 100) * 20 - doubtfulCt * 2 - haramCt * 4)),
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate JAKIM audit readiness from a scan result.
 *
 * Weights:
 *   Ingredient Safety    50 pts  — derived from complianceScore
 *   Document Completeness 30 pts — detected from fileName + ingredient details
 *   Supplier Reliability 20 pts  — derived from avg confidence & doubtful count
 */
export function calculateAuditReadiness(
  scan: {
    complianceScore: number;
    ingredients: Array<{
      status: "halal" | "doubtful" | "haram";
      confidence: number;
      details: string;
    }>;
  },
  fileName = "",
): AuditReadinessResult {
  const haramCt    = scan.ingredients.filter(i => i.status === "haram").length;
  const doubtfulCt = scan.ingredients.filter(i => i.status === "doubtful").length;

  // ── Ingredient Safety (50 pts) ─────────────────────────────────────────────
  const ingScore = scoreIngredients(scan.complianceScore);
  const ingNote =
    haramCt    > 0 ? `${haramCt} haram ingredient${haramCt > 1 ? "s" : ""} must be removed.` :
    doubtfulCt > 0 ? `${doubtfulCt} ingredient${doubtfulCt > 1 ? "s" : ""} need supplier declarations.` :
                     "All ingredients verified halal.";

  // ── Document Completeness (30 pts) ────────────────────────────────────────
  const detailText = scan.ingredients.map(i => i.details).join(" ");
  const { docs, score: docScore } = detectDocuments(fileName, detailText);
  const docNote = docs.length > 0
    ? `Detected: ${docs.join(", ")}.`
    : "No documentation detected. Upload COA & MSDS for +20 pts.";

  // ── Supplier Reliability (20 pts) ─────────────────────────────────────────
  const supScore = scoreSupplier(scan.ingredients, doubtfulCt, haramCt);
  const avgConf  = scan.ingredients.length
    ? Math.round(scan.ingredients.reduce((a, i) => a + i.confidence, 0) / scan.ingredients.length)
    : 0;
  const supNote = `Avg ingredient confidence: ${avgConf}%.`;

  // ── Total & level ──────────────────────────────────────────────────────────
  const total = ingScore + docScore + supScore;
  const level: AuditLevel =
    total >= 80 ? "ready"    :
    total >= 65 ? "good"     :
    total >= 40 ? "partial"  : "not-ready";

  const label =
    level === "ready"   ? "JAKIM Ready"       :
    level === "good"    ? "Good Standing"     :
    level === "partial" ? "Partial Readiness" : "Not Ready";

  // ── Recommendation ─────────────────────────────────────────────────────────
  const gaps: string[] = [];
  if (docScore < 15)  gaps.push("upload COA and MSDS documents");
  if (haramCt > 0)    gaps.push("remove or replace haram ingredients");
  if (doubtfulCt > 0) gaps.push("obtain supplier halal declarations");

  const recommendation =
    level === "ready"
      ? "Product meets JAKIM audit requirements. Maintain documentation and renew certifications annually."
      : gaps.length > 0
        ? `Priority action: ${gaps[0].charAt(0).toUpperCase() + gaps[0].slice(1)}.${
            gaps.length > 1 ? " Also: " + gaps.slice(1).join("; ") + "." : ""
          }`
        : "Review ingredient sourcing and documentation for higher compliance.";

  return {
    score: total,
    level,
    label,
    breakdown: {
      ingredients: { score: ingScore, max: 50, note: ingNote },
      documents:   { score: docScore, max: 30, note: docNote, docs },
      supplier:    { score: supScore, max: 20, note: supNote },
    },
    recommendation,
  };
}
