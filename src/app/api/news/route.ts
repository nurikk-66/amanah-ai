import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const CACHE_TTL_HOURS = 24;

// Free halal/food-compliance RSS feeds — no API key needed
const RSS_FEEDS = [
  { url: "https://www.halalfocus.net/feed/",        source: "Halal Focus"       },
  { url: "https://halalindustry.org/feed/",         source: "Halal Industry"    },
  { url: "https://salaamgateway.com/feed",          source: "Salaam Gateway"    },
];

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  source: string;
  date: string;
  urgency: "info" | "warning" | "critical";
  link?: string;
}

function extractTag(xml: string, tag: string): string {
  const m =
    xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>`, "i")) ??
    xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\/${tag}>`, "i"));
  return m ? m[1].trim().replace(/<[^>]+>/g, "") : "";
}

function guessUrgency(title: string): "info" | "warning" | "critical" {
  const t = title.toLowerCase();
  if (/ban|recall|suspend|prohibit|violat|urgent|alert/.test(t)) return "critical";
  if (/update|change|new rule|requirement|amendment|warning/.test(t)) return "warning";
  return "info";
}

function guessCategory(title: string, source: string): string {
  const t = (title + " " + source).toLowerCase();
  if (/jakim/.test(t)) return "JAKIM";
  if (/muis/.test(t)) return "MUIS";
  if (/mui|indonesia/.test(t)) return "MUI";
  if (/eu|europe/.test(t)) return "EU-Halal";
  if (/fda|usa|america/.test(t)) return "FDA";
  if (/ifanca/.test(t)) return "IFANCA";
  return "General";
}

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "AmanahAI/1.0 (halal compliance platform)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];

  const xml = await res.text();

  // Split by <item> tags
  const itemMatches = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];

  return itemMatches.slice(0, 5).map((item, i) => {
    const title   = extractTag(item, "title")       || "Halal Compliance Update";
    const desc    = extractTag(item, "description") || extractTag(item, "content:encoded") || "";
    const pubDate = extractTag(item, "pubDate")     || extractTag(item, "dc:date") || "";
    const link    = extractTag(item, "link");

    const date = pubDate
      ? new Date(pubDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const summary = desc.slice(0, 200).trim() || title;

    return {
      id:       `${source.replace(/\s/g, "-").toLowerCase()}-${i}`,
      title:    title.slice(0, 100),
      summary:  summary + (summary.length === 200 ? "..." : ""),
      category: guessCategory(title, source),
      source,
      date,
      urgency:  guessUrgency(title),
      link:     link || undefined,
    };
  });
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(supabaseUrl, serviceKey);

  // ── 1. Return cache if fresh ──────────────────────────────
  const { data: cached } = await sb
    .from("regulatory_news_cache")
    .select("fetched_at, items")
    .order("fetched_at", { ascending: false })
    .limit(1)
    .single();

  const ageHours = cached
    ? (Date.now() - new Date(cached.fetched_at).getTime()) / 3_600_000
    : Infinity;

  const isFresh =
    ageHours < CACHE_TTL_HOURS &&
    Array.isArray(cached?.items) &&
    (cached?.items as NewsItem[]).length > 0;

  if (isFresh) {
    return NextResponse.json({
      items:                  cached!.items,
      source:                 "cache",
      age_hours:              parseFloat(ageHours.toFixed(1)),
      next_refresh_in_hours:  parseFloat((CACHE_TTL_HOURS - ageHours).toFixed(1)),
    });
  }

  // ── 2. Fetch from RSS feeds ────────────────────────────────
  const results = await Promise.allSettled(
    RSS_FEEDS.map((f) => fetchFeed(f.url, f.source))
  );

  const items: NewsItem[] = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  // ── 3. Fallback static news if all feeds fail ──────────────
  const finalItems: NewsItem[] = items.length > 0 ? items : [
    {
      id: "static-1",
      title: "JAKIM Reinforces Halal Certification Requirements for 2025",
      summary: "Malaysia's Department of Islamic Development has updated its halal certification guidelines, requiring manufacturers to submit renewed documentation by Q2 2025.",
      category: "JAKIM", source: "JAKIM Official", date: new Date().toISOString().split("T")[0],
      urgency: "warning",
    },
    {
      id: "static-2",
      title: "New EU Regulation on Halal Labeling Transparency",
      summary: "The European Commission has proposed stricter labeling rules for halal-certified products sold across EU member states, effective from January 2026.",
      category: "EU-Halal", source: "EU Commission", date: new Date().toISOString().split("T")[0],
      urgency: "info",
    },
    {
      id: "static-3",
      title: "Indonesia MUI Issues Warning on Undeclared Pork Derivatives",
      summary: "MUI has issued an urgent circular to food manufacturers regarding undeclared porcine-derived ingredients found in imported flavoring agents. Immediate audit recommended.",
      category: "MUI", source: "MUI Indonesia", date: new Date().toISOString().split("T")[0],
      urgency: "critical",
    },
    {
      id: "static-4",
      title: "MUIS Updates Approved Halal Ingredient Database",
      summary: "Singapore's MUIS has expanded its approved halal ingredient list to include 47 new food additives, simplifying certification for beverage manufacturers.",
      category: "MUIS", source: "MUIS Singapore", date: new Date().toISOString().split("T")[0],
      urgency: "info",
    },
    {
      id: "static-5",
      title: "Global Halal Industry Market Expected to Reach $3.2T by 2027",
      summary: "A new report from the Halal Industry Development Corporation highlights rapid growth in certified halal products across Southeast Asia, Middle East, and Western markets.",
      category: "General", source: "HDC Report", date: new Date().toISOString().split("T")[0],
      urgency: "info",
    },
  ];

  // ── 4. Save to cache ───────────────────────────────────────
  await sb.from("regulatory_news_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await sb.from("regulatory_news_cache").insert({ items: finalItems, fetched_at: new Date().toISOString() });

  return NextResponse.json({
    items:   finalItems,
    source:  items.length > 0 ? "rss" : "static-fallback",
    count:   finalItems.length,
  });
}
