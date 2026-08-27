import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const CACHE_TTL_MS = 5 * 60 * 1000;
const adCache = new Map<string, { items: unknown[]; expiresAt: number }>();

/**
 * Live ads for a placement. Only status=ACTIVE ads inside their date window
 * are served — expired/paused/rejected ads never reach readers.
 * Results are cached in-memory for 5 min; impressions are fire-and-forget.
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
        OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }],
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
      take: 3,
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        destinationUrl: true,
      },
    });

    adCache.set(placement, { items: ads, expiresAt: now + CACHE_TTL_MS });

    if (ads.length) {
      db.advertisement.updateMany({
        where: { id: { in: ads.map((a) => a.id) } },
        data: { impressions: { increment: 1 } },
      }).catch(() => {});
    }

    return ok({ items: ads }, { headers: { "cache-control": "private, max-age=300" } });
  } catch (err) {
    return handleError(err);
  }
}
