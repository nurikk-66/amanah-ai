import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { rateLimit, getIP } from "@/lib/rate-limit";
import { env } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { HALAL_DICTIONARY } from "@/lib/halal-db";

// ── Pre-compute known terms for O(1) lookup ───────────────────────────────────
const KNOWN_TERMS = new Set<string>();
for (const entry of HALAL_DICTIONARY) {
  for (const p of entry.name.split(/\s*[—–-]\s*/)) {
    const t = p.trim().toLowerCase();
    if (t.length >= 2) KNOWN_TERMS.add(t);
  }
  const em = entry.name.match(/\b(E\d{3,4}[a-f]?)\b/i);
  if (em) KNOWN_TERMS.add(em[1].toLowerCase());
  for (const a of entry.aliases ?? []) {
    if (a.length >= 2) KNOWN_TERMS.add(a.toLowerCase());
  }
}

function isKnownIngredient(name: string): boolean {
  const lower = name.toLowerCase();
  for (const known of KNOWN_TERMS) {
    if (lower.includes(known) || known.includes(lower)) return true;
  }
  return false;
}

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

const BASE_PROMPT = `You are a Halal compliance expert with deep knowledge of JAKIM (Malaysia's Department of Islamic Development) standards and Islamic dietary laws.

Analyze this product image or document and identify all ingredients visible. For each ingredient:
1. Determine its Halal status: "halal", "doubtful", or "haram"
2. Note any E-numbers and their typical animal/plant sources
3. Check for Halal certification symbols or logos on the packaging
4. Assign a JAKIM-style reference code (format: JAKIM-XXX-000 where XXX is a category like MIN, ADD, FAT, PRO, GEL, VIT, AMI)
5. Assess risk level: "None", "Low", "Medium", "High", or "Critical"
6. Provide AI confidence percentage (0-100)
7. Write a concise explanation (1-2 sentences) of the ingredient's Halal status

Overall assessment rules:
- "haram" if ANY ingredient is confirmed haram (e.g. pork derivatives, alcohol, non-halal slaughtered meat)
- "doubtful" if ANY ingredient has uncertain source requiring supplier verification
- "halal" only if ALL ingredients are confirmed halal
- Compliance score 0-100: 100 = fully compliant, deduct for doubtful (−10 each) and haram (−30 each)
- Risk: "Critical" if haram found, "High" if multiple doubtful, "Medium" if one doubtful, "Low" if all halal

Return ONLY valid JSON with NO markdown code fences, exactly this structure:
{
  "product": "product name from label or 'Unknown Product'",
  "overallStatus": "halal",
  "riskLevel": "Low",
  "complianceScore": 92,
  "reason": "Brief explanation of the overall compliance determination.",
  "ingredients": [
    {
      "name": "Ingredient Name (E-number if applicable)",
      "status": "halal",
      "risk": "None",
      "jakim": "JAKIM-MIN-001",
      "confidence": 99,
      "details": "Brief explanation of this ingredient's Halal status."
    }
  ]
}`;

/**
 * Build the Gemini prompt.
 * When `localContext` is provided (partial local-DB match), prepend a section
 * listing pre-verified ingredients so the AI doesn't re-analyse them and can
 * focus its tokens on the unknowns.
 */
function buildPrompt(localContext: string | null): string {
  if (!localContext) return BASE_PROMPT;

  return `${BASE_PROMPT}

--- ALREADY VERIFIED BY AMANAH LOCAL DATABASE ---
The following ingredients have already been cross-referenced against JAKIM-certified records. Include them verbatim in your "ingredients" array with confidence ≥ 95 and the status shown. Do NOT re-analyse or override these entries:
${localContext}

For any additional ingredients you identify in the image that are NOT listed above, apply your full expert analysis as normal.
--- END PRE-VERIFIED LIST ---`;
}

// ── Log unknown ingredients to pending_ingredients (fire-and-forget) ─────────
function logUnknownIngredients(ingredients: Array<{ name: string; status: string }>) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  const unknowns = ingredients.filter((ing) => !isKnownIngredient(ing.name));
  if (unknowns.length === 0) return;

  void (async () => {
    try {
      const sb = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll: () => [], setAll: () => {} } }
      );
      for (const ing of unknowns) {
        // Atomic upsert with increment via Postgres function
        await sb.rpc("upsert_pending_ingredient", {
          p_name:            ing.name,
          p_detected_status: ing.status,
        });
      }
    } catch (e) {
      console.error("[pending_ingredients] log error:", e);
    }
  })();
}

// ── Write a row to system_logs (fire-and-forget, never throws) ────────────────
async function writeLog(payload: {
  type: string;
  message: string;
  user_id?: string | null;
  user_email?: string | null;
  ip_address?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );
    await sb.from("system_logs").insert(payload);
  } catch {
    // Never let logging crash the main request
  }
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rl = rateLimit(`analyze:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    void writeLog({ type: "rate_limit", message: "Scan rate limit hit", ip_address: ip });
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute before scanning again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  if (!env.GROQ_API_KEY) {
    void writeLog({ type: "api_error", message: "GROQ_API_KEY not configured", ip_address: ip });
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  // ── Get current user (optional — anon scans are allowed) ─────────────────
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    const cookieStore = await cookies();
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await sb.auth.getUser();
    userId    = user?.id    ?? null;
    userEmail = user?.email ?? null;
  } catch { /* not critical */ }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // File type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      void writeLog({
        type: "scan_error", message: "Unsupported file type",
        user_id: userId, user_email: userEmail, ip_address: ip,
        file_name: file.name, file_size: file.size, file_type: file.type,
        metadata: { reason: "unsupported_type" },
      });
      return NextResponse.json(
        { error: "Only images (JPG, PNG, WEBP, GIF) and PDFs are supported" },
        { status: 400 }
      );
    }

    // File size validation
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      void writeLog({
        type: "scan_error", message: `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB`,
        user_id: userId, user_email: userEmail, ip_address: ip,
        file_name: file.name, file_size: file.size, file_type: file.type,
        metadata: { reason: "file_too_large", max_mb: MAX_FILE_SIZE_MB },
      });
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.` },
        { status: 413 }
      );
    }

    const localContext = (formData.get("localContext") as string | null) || null;

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const groq = new Groq({ apiKey: env.GROQ_API_KEY });

    const result = await groq.messages.create({
      model: "llama-2-90b-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64,
              },
            },
            {
              type: "text",
              text: buildPrompt(localContext),
            },
          ],
        },
      ],
      max_tokens: 2000,
    });

    let jsonStr = (result.content[0] as { type: string; text?: string }).text?.trim() || "";

    // Strip markdown code fences if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const parsed = JSON.parse(jsonStr);

    // ── Log success ────────────────────────────────────────────────────────
    void writeLog({
      type: "scan_success",
      message: `Scanned: ${parsed.product ?? "Unknown"} → ${parsed.overallStatus ?? "?"}`,
      user_id: userId, user_email: userEmail, ip_address: ip,
      file_name: file.name, file_size: file.size, file_type: file.type,
      metadata: {
        product:          parsed.product,
        overall_status:   parsed.overallStatus,
        compliance_score: parsed.complianceScore,
        risk_level:       parsed.riskLevel,
        ingredient_count: parsed.ingredients?.length ?? 0,
      },
    });

    // ── Background: log unknown ingredients for market trend analysis ─────
    if (Array.isArray(parsed.ingredients)) {
      logUnknownIngredients(parsed.ingredients);
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[analyze] error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";

    // ── Log error ──────────────────────────────────────────────────────────
    void writeLog({
      type: "api_error",
      message,
      user_id: userId, user_email: userEmail, ip_address: ip,
      metadata: { stack: err instanceof Error ? err.stack?.slice(0, 500) : undefined },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
