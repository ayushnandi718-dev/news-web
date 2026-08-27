import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=10, stale-while-revalidate=20";

/** Public: active live streams ordered for display. */
export async function GET(_req: NextRequest) {
  try {
    const items = await db.liveStream.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, url: true, bannerUrl: true, platform: true, sortOrder: true },
    });
    return ok({ items }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return handleError(err);
  }
}
