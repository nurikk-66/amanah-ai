// Supabase Edge Function — fetch-regulatory-news
// Runs on Deno runtime. Called by pg_cron daily at 06:00 UTC.
// Fetches halal regulatory news via Claude AI, caches in DB.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CACHE_TTL_HOURS = 24;

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  date: string;
  urgency: "info" | "warning" | "critical";
}

Deno.serve(async (req: Request) => {
  // Allow only POST or scheduled internal calls
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl  = Deno.env.get("SUPABASE_URL")!;
  const serviceKey   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

  const sb = createClient(supabaseUrl, serviceKey);

  // ── 1. Check if cache is still fresh ────────────────────────
  const { data: cached } = await sb
    .from("regulatory_news_cache")
    .select("fetched_at, items")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  if (cached) {
    const ageHours = (Date.now() - new Date(cached.fetched_at).getTime()) / 3_600_000;
    if (ageHours < CACHE_TTL_HOURS && (cached.items as NewsItem[]).length > 0) {
      return Response.json({ items: cached.items, source: "cache", age_hours: ageHours.toFixed(1) });
    }
  }

  // ── 2. Fetch fresh news from Claude AI ────────────────────────
  const today = new Date().toISOString().split("T")[0];

  const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Today is ${today}. You are a halal compliance news editor for a B2B SaaS platform.

Generate 6 realistic, informative regulatory news items about halal certification, food compliance, and Islamic dietary standards.
These should feel like real industry news that food manufacturers would care about.

Return ONLY a JSON array with this exact shape (no markdown, no explanation):
[
  {
    "id": "news-1",
    "title": "Brief headline (max 80 chars)",
    "summary": "2-3 sentence summary with key facts relevant to food manufacturers",
    "category": "One of: JAKIM | MUIS | MUI | EU-Halal | FDA | IFANCA | General",
    "source": "e.g. JAKIM Official, Reuters, Halal Industry Authority",
    "date": "${today}",
    "urgency": "info | warning | critical"
  }
]

Mix topics like: certificate renewals, ingredient ban updates, new halal standards, cross-contamination rules, supply chain audits, labeling requirements.
Use urgency=warning for rule changes, urgency=critical for bans/recalls, urgency=info for general updates.`,
        },
      ],
    }),
  });

  if (!claudeRes.ok) {
    const err = await claudeRes.text();
    return Response.json({ error: "Claude API error", detail: err }, { status: 502 });
  }

  const aiData = await claudeRes.json();
  const rawText: string = aiData.content?.[0]?.text ?? "[]";

  let items: NewsItem[] = [];
  try {
    // Strip potential markdown fences
    const clean = rawText.replace(/```json|```/g, "").trim();
    items = JSON.parse(clean);
  } catch {
    return Response.json({ error: "Failed to parse AI response", raw: rawText }, { status: 500 });
  }

  // ── 3. Upsert into cache (delete old, insert new) ────────────
  await sb.from("regulatory_news_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // delete all
  const { error: insertErr } = await sb
    .from("regulatory_news_cache")
    .insert({ items, fetched_at: new Date().toISOString() });

  if (insertErr) {
    return Response.json({ error: insertErr.message }, { status: 500 });
  }

  return Response.json({ items, source: "fresh", count: items.length });
});
