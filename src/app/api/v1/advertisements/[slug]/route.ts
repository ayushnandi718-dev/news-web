import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok, apiError } from "@/lib/api";
import { decodeSlug } from "@/lib/text";

export const dynamic = "force-dynamic";

/**
 * Public single advertisement detail. Returns only reader-safe fields.
 * Gates on ACTIVE + non-deleted + date window so drafts/paused/deleted
 * ads are never served publicly. Money/priority/payment NEVER exposed.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const decoded = decodeSlug(slug);

    const ad = await db.advertisement.findFirst({
      where: {
        slug: decoded,
        status: "ACTIVE",
        deletedAt: null,
        OR: [{ startDate: null }, { startDate: { lte: new Date() } }],
        AND: [{ OR: [{ endDate: null }, { endDate: { gte: new Date() } }] }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        destinationUrl: true,
        type: true,
        advertiserName: true,
        businessName: true,
        phone: true,
      },
    });

    if (!ad) return apiError("বিজ্ঞাপন পাওয়া যায়নি", 404);

    // Fire-and-forget impression tracking
    db.advertisement.update({
      where: { id: ad.id },
      data: { impressions: { increment: 1 } },
    }).catch(() => {});

    return ok({ advertisement: ad }, { headers: { "cache-control": "public, max-age=300" } });
  } catch (err) {
    return handleError(err);
  }
}
