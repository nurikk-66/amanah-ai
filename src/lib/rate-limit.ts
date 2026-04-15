/**
 * Simple in-memory rate limiter.
 * Works per-process (single instance). For multi-instance deployments, use Redis.
 *
 * Usage:
 *   const result = rateLimit(ip, { limit: 10, windowMs: 60_000 });
 *   if (!result.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Clean up expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 5 * 60 * 1000);

interface Options {
  /** Max requests per window */
  limit: number;
  /** Window duration in ms */
  windowMs: number;
}

interface Result {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(identifier: string, options: Options): Result {
  const now = Date.now();
  const key = identifier;
  const existing = store.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    const entry: Entry = { count: 1, resetAt: now + options.windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: options.limit - 1, resetAt: entry.resetAt };
  }

  if (existing.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: options.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/** Extract real IP from request, respects Vercel/CF headers */
export function getIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
