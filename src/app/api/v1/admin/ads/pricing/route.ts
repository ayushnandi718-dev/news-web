import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { pricingRowSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { DEFAULT_RATES, estimatePrice, type PricingRow } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePerm("ads.manage");
    const rows = await db.advertisementPricing.findMany({ orderBy: [{ type: "asc" }, { size: "asc" }] });
    return ok({ rows });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requirePerm("ads.manage");
    const body = pricingRowSchema.parse(await req.json());
    const row = await db.advertisementPricing.upsert({
      where: { type_placement_size: { type: body.type, placement: body.placement, size: body.size } },
      create: { type: body.type, placement: body.placement, size: body.size, basePrice: body.basePrice, active: body.active },
      update: { basePrice: body.basePrice, active: body.active },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "ad.pricing.update",
      targetType: "advertisement_pricing",
      targetId: row.id,
      meta: { ...body },
    });
    return ok({ row });
  } catch (err) {
    return handleError(err);
  }
}

/** Seed/replace default rate card. `?mode=defaults` resets to DEFAULT_RATES; POST-less estimate helper via GET ?estimate=1 */
export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("ads.manage");
    const sp = req.nextUrl.searchParams;
    if (sp.get("mode") === "defaults") {
      for (const r of DEFAULT_RATES) {
        await db.advertisementPricing.upsert({
          where: { type_placement_size: { type: r.type, placement: r.placement, size: r.size } },
          create: { ...r },
          update: { basePrice: r.basePrice, active: true },
        });
      }
      await audit({
        actorId: session.id,
        actorEmail: session.email,
        action: "ad.pricing.reset_defaults",
        targetType: "advertisement_pricing",
        targetId: "all",
        meta: {},
      });
      const rows = await db.advertisementPricing.findMany({ orderBy: [{ type: "asc" }, { size: "asc" }] });
      return ok({ rows });
    }
    const body = (await req.json()) as Partial<PricingRow> & { days?: number };
    const rows = await db.advertisementPricing.findMany({ where: { active: true } });
    const price = estimatePrice(rows as PricingRow[], body.type ?? "", body.placement ?? "", body.size ?? "", Number(body.days ?? 1));
    if (price === null) return apiError("No active rate found for this combination", 404);
    return ok({ price });
  } catch (err) {
    return handleError(err);
  }
}
