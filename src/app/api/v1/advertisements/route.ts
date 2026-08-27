import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { AD_TYPES } from "@/lib/validation";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { items: unknown[]; expiresAt: number } | null = null;

/**
 * Public advertisement listing. Returns ACTIVE ads sorted by weighted
 * priority (price-based with rotation). Money/priority/financial data
 * is NEVER sent to the client.
 */
export async function GET(req: NextRequest) {
  try {
    const now = Date.now();
    const category = req.nextUrl.searchParams.get("category") ?? undefined;
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 30, 50);

    const cacheKey = `${category ?? "all"}:${limit}`;
    if (cache && cache.expiresAt > now) {
      return ok({ items: cache.items }, { headers: { "cache-control": "public, max-age=300" } });
    }

    const where = {
      status: "ACTIVE",
      deletedAt: null,
      ...(category && (AD_TYPES as readonly string[]).includes(category) ? { type: category } : {}),
      OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
      AND: [{ OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }],
    };

    const ads = await db.advertisement.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        type: true,
        advertiserName: true,
        businessName: true,
        destinationUrl: true,
        price: true,
        impressions: true,
      },
    });

    // Weighted priority: higher price = more prominent, with random jitter
    // for rotation so one advertiser doesn't permanently occupy first position.
    // Price is used server-side ONLY — never sent to client.
    const scored = ads.map((ad) => ({
      ...ad,
      _score: (ad.price * 10) - (ad.impressions * 0.01) + (Math.random() * ad.price * 0.05),
    }));
    scored.sort((a, b) => b._score - a._score);

    // Strip private fields before sending
    const items = scored.slice(0, limit).map(({ _score, price, impressions, ...pub }) => pub);

    // Fire-and-forget impression tracking
    if (ads.length) {
      db.advertisement.updateMany({
        where: { id: { in: ads.map((a) => a.id) } },
        data: { impressions: { increment: 1 } },
      }).catch(() => {});
    }

    cache = { items, expiresAt: now + CACHE_TTL_MS };
    return ok({ items }, { headers: { "cache-control": "public, max-age=300" } });
  } catch (err) {
    return handleError(err);
  }
}
