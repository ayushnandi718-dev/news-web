import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 5 * 60 * 1000;
const adCache = new Map<string, { items: unknown[]; expiresAt: number }>();

/**
 * Live ads for a placement. Only ACTIVE, non-deleted ads inside their date
 * window are served. Weighted rotation prevents one advertiser from permanently
 * occupying the slot. Impressions count only the ads actually displayed.
 */
export async function GET(req: NextRequest) {
  try {
    const placement = req.nextUrl.searchParams.get("placement") ?? "HOME_TOP";
    const now = Date.now();

    const cached = adCache.get(placement);
    if (cached && cached.expiresAt > now) {
      return ok({ items: cached.items }, { headers: { "cache-control": "private, max-age=300" } });
    }

    const ads = await db.advertisement.findMany({
      where: {
        placement,
        status: "ACTIVE",
        deletedAt: null,
        OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }],
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 10,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        destinationUrl: true,
        priority: true,
        impressions: true,
      },
    });

    // Weighted rotation: lower priority wins, impressions as tiebreaker + jitter
    const scored = ads.map((ad) => ({
      ...ad,
      _score: (1000 - ad.priority) - (ad.impressions * 0.01) + (Math.random() * 5),
    }));
    scored.sort((a, b) => b._score - a._score);

    const displayed = scored.slice(0, 3).map(({ priority, impressions, _score, ...pub }) => pub);
    adCache.set(placement, { items: displayed, expiresAt: now + CACHE_TTL_MS });

    // Track impression for the ads actually displayed (not all fetched)
    if (displayed.length) {
      db.advertisement.updateMany({
        where: { id: { in: displayed.map((a: { id: string }) => a.id) } },
        data: { impressions: { increment: 1 } },
      }).catch(() => {});
    }

    return ok({ items: displayed }, { headers: { "cache-control": "private, max-age=300" } });
  } catch (err) {
    return handleError(err);
  }
}
