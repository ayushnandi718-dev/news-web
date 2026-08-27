import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { adCreateSchema, AD_PLACEMENTS } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";
import { sanitizeRichText } from "@/lib/sanitize";
import { slugify } from "@/lib/text";

export const dynamic = "force-dynamic";

async function uniqueAdSlug(base: string): Promise<string> {
  let slug = slugify(base) || `ad-${Date.now()}`;
  let n = 1;
  while (await db.advertisement.findUnique({ where: { slug } })) {
    n++;
    slug = `${slugify(base).slice(0, 80)}-${n}`;
  }
  return slug;
}

const PLACEMENT_LABELS: Record<string, string> = {
  HOME_TOP: "হোমপেজ টপ ব্যানার",
  HOME_SIDEBAR: "হোমপেজ সাইডবার",
  CATEGORY_TOP: "বিভাগ পেজ টপ",
};

export async function GET(req: NextRequest) {
  try {
    await requirePerm("ads.manage");
    const sp = req.nextUrl.searchParams;
    const placement = sp.get("placement") ?? undefined;
    const status = sp.get("status") ?? undefined;
    const [items, totals] = await Promise.all([
      db.advertisement.findMany({
        where: {
          deletedAt: null,
          ...(placement && (AD_PLACEMENTS as readonly string[]).includes(placement) ? { placement } : {}),
          ...(status ? { status } : {}),
        },
        orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      }),
      db.advertisement.groupBy({
        by: ["placement"],
        where: { deletedAt: null },
        _sum: { impressions: true, clicks: true },
      }),
    ]);
    return ok({
      items,
      summary: totals.map((t) => ({
        placement: t.placement,
        label: PLACEMENT_LABELS[t.placement] ?? t.placement,
        impressions: t._sum.impressions ?? 0,
        clicks: t._sum.clicks ?? 0,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("ads.manage");
    const body = adCreateSchema.parse(await req.json());
    if (body.startDate && body.endDate && body.endDate <= body.startDate) {
      return apiError("End date must be after start date", 422);
    }
    const ad = await db.advertisement.create({
      data: {
        internalName: body.internalName,
        slug: body.slug || await uniqueAdSlug(body.internalName),
        advertiserName: body.advertiserName,
        businessName: body.businessName || null,
        email: body.email || null,
        phone: body.phone || null,
        title: body.title,
        description: sanitizeRichText(body.description),
        imageUrl: body.imageUrl || null,
        destinationUrl: body.destinationUrl || null,
        type: body.type,
        placement: body.placement,
        size: body.size,
        price: body.price,
        priority: body.priority,
        status: body.status,
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        ...(body.requestId
          ? { requestId: await db.advertisementRequest.findUnique({ where: { id: body.requestId } }).then((r) => r?.id ?? null) }
          : {}),
      },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "ad.create",
      targetType: "advertisement",
      targetId: ad.id,
      meta: { title: ad.internalName, placement: ad.placement, status: ad.status },
    });
    invalidateTags(["ads"]);
    publishEvent({ type: "ads.updated" });
    return ok({ ad }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
