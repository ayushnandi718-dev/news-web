import type { NextRequest } from "next/server";
import { subscribeEmail } from "@/lib/newsletter";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`newsletter:${ip}`, 5, 10 * 60_000)) {
      return apiError("Too many attempts. Try again later.", 429);
    }
    const body = (await req.json()) as { email?: unknown; hp?: unknown };
    if (typeof body.hp === "string" && body.hp.length > 0) {
      return ok({ pending: false }); // honeypot — pretend success for bots
    }
    if (typeof body.email !== "string") return apiError("Email required", 422);
    const result = await subscribeEmail(body.email);
    if (!result) return apiError("অনুগ্রহ করে সঠিক ইমেল ঠিকানা লিখুন।", 422);
    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
