/**
 * Simple in-memory rate limiter.
 * Works for single-instance deployments. For multi-instance, swap with Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 1, resetAt: now + windowMs };
    buckets.set(key, b);
    return true;
  }
  b.count++;
  if (b.count > limit) return false;
  return true;
}

/** Get client IP from request headers (Vercel/Cloudflare/Next.js). */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
