import { HALAL_DICTIONARY, type HalalEntry } from "./halal-db";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MatchedIngredient {
  /** Raw text fragment that triggered the match */
  raw: string;
  /** Matched dictionary entry */
  entry: HalalEntry;
  /** Which term matched (e-code, name, or alias) */
  matchedVia: string;
}

export interface CheckResult {
  /** true when ≥80% of extracted ingredients matched the local DB */
  isFullyCovered: boolean;
  /** Alias kept for backward compat with scanner page */
  matched: boolean;
  /** Matched ingredients with their DB entries */
  results: MatchedIngredient[];
  /** Tokens that look like ingredients but weren't in the DB */
  unknownTerms: string[];
  /** Alias kept for backward compat with scanner page */
  unknown: string[];
  /** Percentage of ingredients matched (0–100) */
  matchRate: number;
}

// ─── Exported: cleanText ───────────────────────────────────────────────────────

/**
 * Normalise raw OCR / label text for matching.
 *  - lowercases
 *  - replaces all non-alphanumeric (except hyphens, parens, and whitespace) with spaces
 *  - collapses whitespace
 */
export function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\r\n\t]+/g, " ")
    // keep: letters, digits, space, hyphen, parens, period, comma, semicolon
    .replace(/[^a-z0-9\s\-().,:;']/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ─── Pre-computation (runs once at module load) ────────────────────────────────
//
// Strategy for O(n) matching regardless of dictionary size:
//   1. Map<normalised-term, HalalEntry> for O(1) exact lookups
//   2. A single compiled RegExp with alternation: /\b(term1|term2|...)\b/gi
//      → Regex engines compile alternations into a DFA / Aho-Corasick-like
//        automaton, so matching is linear in text length.
//   3. Separate regex for E-codes: /\bE\d{3,4}[a-f]?\b/gi → Map lookup

/** Maps a lowercased search term → { entry, originalTerm } */
interface TermRecord {
  entry: HalalEntry;
  /** The exact term that was indexed (for matchedVia) */
  original: string;
}

const TERM_MAP = new Map<string, TermRecord>();

/** Populate TERM_MAP from every entry's name, E-code, and aliases */
function indexEntry(entry: HalalEntry) {
  // 1. Ingredient name (after "—" split)
  //    e.g. "E471 — Mono and Diglycerides of Fatty Acids" → ["E471", "Mono and Diglycerides of Fatty Acids"]
  const parts = entry.name.split(/\s*[—–-]\s*/);
  for (const p of parts) {
    const clean = p.trim();
    if (clean.length >= 2) {
      TERM_MAP.set(clean.toLowerCase(), { entry, original: clean });
    }
  }

  // 2. Bare E-code  (e.g. "e471", "e150a")
  const eMatch = entry.name.match(/\b(E\d{3,4}[a-f]?)\b/i);
  if (eMatch) {
    TERM_MAP.set(eMatch[1].toLowerCase(), { entry, original: eMatch[1] });
  }

  // 3. Aliases
  for (const alias of entry.aliases ?? []) {
    if (alias.length >= 2) {
      TERM_MAP.set(alias.toLowerCase(), { entry, original: alias });
    }
  }
}

for (const entry of HALAL_DICTIONARY) indexEntry(entry);

/**
 * Build the mega-regex.
 * Terms are sorted longest-first so the alternation is greedy
 * (e.g. "mono and diglycerides of fatty acids" matches before "fatty acids").
 * Special regex chars in terms are escaped.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const sortedTerms = [...TERM_MAP.keys()].sort((a, b) => b.length - a.length);

// Split into two groups: multi-word terms and single-word terms.
// Multi-word terms use looser boundaries (spaces / start / end),
// single-word terms use strict \b word boundaries.
const multiWord:  string[] = [];
const singleWord: string[] = [];
for (const t of sortedTerms) {
  if (t.includes(" ")) multiWord.push(escapeRegex(t));
  else                  singleWord.push(escapeRegex(t));
}

// Combine into one pattern:
//   (?:multi-word1|multi-word2)     — matched with looser boundary
//   |\b(?:single1|single2)\b       — matched with word boundary
const patternParts: string[] = [];
if (multiWord.length > 0)  patternParts.push(`(?:${multiWord.join("|")})`);
if (singleWord.length > 0) patternParts.push(`\\b(?:${singleWord.join("|")})\\b`);

const MEGA_REGEX = new RegExp(patternParts.join("|"), "gi");

/** Dedicated E-code regex for explicit E-number extraction */
const ECODE_REGEX = /\b(E\d{3,4}[a-f]?)\b/gi;

// ─── Noise / stop-word filter ──────────────────────────────────────────────────

const NOISE = new Set([
  "ingredients", "ingredient", "contains", "contain", "may", "traces",
  "of", "and", "or", "the", "less", "than", "added", "to", "for",
  "promote", "freshness", "colour", "color", "flavour", "flavor",
  "artificial", "natural", "permitted", "preservative", "preservatives",
  "antioxidant", "antioxidants", "emulsifier", "emulsifiers", "stabiliser",
  "stabilisers", "stabilizer", "stabilizers", "thickener", "thickeners",
  "acidity", "regulator", "regulators", "raising", "agent", "agents",
  "from", "with", "as", "per", "mg", "ml", "g", "kg", "percentage",
  "nutrition", "information", "facts", "serving", "size", "daily",
  "value", "calories", "total", "fat", "protein", "carbohydrate",
  "fibre", "fiber", "sodium", "sugar", "sugars", "energy", "kcal", "kj",
  "net", "weight", "wt", "vol", "product", "water", "salt",
]);

/**
 * Heuristic: does this token look like an ingredient / chemical name?
 *  - Contains digits (e.g. "E621", "0.5%") → not ingredient-looking unless E-code
 *  - Very short (≤2 chars) → probably noise
 *  - All noise words → skip
 *  - Otherwise a word that starts with uppercase or contains hyphens / long words
 */
function looksLikeIngredient(token: string): boolean {
  const t = token.trim();
  if (t.length <= 2) return false;
  // Pure numeric
  if (/^\d+(\.\d+)?%?$/.test(t)) return false;
  // All words are noise
  const words = t.toLowerCase().split(/\s+/);
  if (words.every((w) => NOISE.has(w) || /^\d+(\.\d+)?%?$/.test(w))) return false;
  // Looks chemical / food: contains a capital letter, hyphen, or is multi-word
  return true;
}

/**
 * Tokenise raw label text into individual ingredient candidates.
 * Ingredients on labels are separated by commas, semicolons, or newlines.
 */
function tokenize(raw: string): string[] {
  const tokens = raw
    .split(/[,;\n]+/)
    .map((t) =>
      t
        // Remove parenthetical notes like "(as preservative)" but keep "(E330)"
        .replace(/\((?!E\d)[^)]*\)/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter((t) => t.length >= 2);

  return tokens;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Match raw ingredient text against the local HALAL_DICTIONARY.
 *
 * **Algorithm (O(n) in text length):**
 *  1. cleanText → lowercase + strip punctuation
 *  2. Run MEGA_REGEX (single pass over full text) → collect all term hits
 *  3. Run ECODE_REGEX → catch any E-numbers the mega-regex missed
 *  4. Tokenize original text → identify unmatched tokens as `unknownTerms`
 *  5. Compute coverage → set `isFullyCovered` (≥80% matched, unknowns ≤ 20%)
 *
 * @param extractedText  Raw text from OCR, product label scan, or user paste.
 * @returns CheckResult — use `isFullyCovered` to decide if AI fallback is needed.
 */
export function checkIngredientsLocally(extractedText: string): CheckResult {
  const empty: CheckResult = {
    isFullyCovered: false,
    matched: false,
    results: [],
    unknownTerms: [],
    unknown: [],
    matchRate: 0,
  };

  if (!extractedText || extractedText.trim().length === 0) return empty;

  const cleaned = cleanText(extractedText);
  if (cleaned.length === 0) return empty;

  // ── Phase 1: Regex sweep over full text ──────────────────────────────────

  const results: MatchedIngredient[] = [];
  const seenEntries = new Set<string>(); // dedupe by entry name
  const matchedSpans: Array<[number, number]> = []; // [start, end] of every hit

  // 1a. Mega-regex — catches names, aliases, multi-word terms
  MEGA_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MEGA_REGEX.exec(cleaned)) !== null) {
    const hit = m[0].toLowerCase();
    const rec = TERM_MAP.get(hit);
    if (rec && !seenEntries.has(rec.entry.name)) {
      seenEntries.add(rec.entry.name);
      results.push({ raw: m[0], entry: rec.entry, matchedVia: rec.original });
      matchedSpans.push([m.index, m.index + m[0].length]);
    }
  }

  // 1b. E-code regex — catches stray E-numbers not in mega alternation
  ECODE_REGEX.lastIndex = 0;
  while ((m = ECODE_REGEX.exec(cleaned)) !== null) {
    const code = m[1].toLowerCase();
    const rec = TERM_MAP.get(code);
    if (rec && !seenEntries.has(rec.entry.name)) {
      seenEntries.add(rec.entry.name);
      results.push({ raw: m[0], entry: rec.entry, matchedVia: code.toUpperCase() });
      matchedSpans.push([m.index, m.index + m[0].length]);
    }
  }

  // ── Phase 2: Find unknown terms ──────────────────────────────────────────
  //
  // Tokenize original text, then check which tokens have NO overlap
  // with any matched span.  Those are the unknowns.

  const tokens = tokenize(extractedText);
  const unknownTerms: string[] = [];

  // Build a set of matched substrings from cleaned text for fast lookup
  const matchedLower = new Set<string>();
  for (const r of results) {
    // Add the raw match and all known terms for this entry
    matchedLower.add(r.raw.toLowerCase());
    matchedLower.add(r.entry.name.toLowerCase());
    for (const a of r.entry.aliases ?? []) matchedLower.add(a.toLowerCase());
    const eMatch = r.entry.name.match(/\b(E\d{3,4}[a-f]?)\b/i);
    if (eMatch) matchedLower.add(eMatch[1].toLowerCase());
  }

  for (const token of tokens) {
    const lower = token.toLowerCase().trim();
    if (lower.length < 2) continue;

    // Check if any matched term is a substring of this token (or vice versa)
    let covered = false;
    for (const m of matchedLower) {
      if (lower.includes(m) || m.includes(lower)) {
        covered = true;
        break;
      }
    }

    if (!covered && looksLikeIngredient(token)) {
      unknownTerms.push(token.trim());
    }
  }

  // ── Phase 3: Compute coverage ────────────────────────────────────────────

  const totalIngredients = results.length + unknownTerms.length;
  const matchRate = totalIngredients > 0
    ? Math.round((results.length / totalIngredients) * 100)
    : 0;

  const isFullyCovered = matchRate >= 80 && unknownTerms.length <= Math.max(1, Math.floor(totalIngredients * 0.2));

  return {
    isFullyCovered,
    matched: isFullyCovered,      // backward compat
    results,
    unknownTerms,
    unknown: unknownTerms,        // backward compat
    matchRate,
  };
}
