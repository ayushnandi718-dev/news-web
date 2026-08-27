import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { AD_TYPES } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Starting prices per ad type (cheapest active rate), for the /advertise page. */
export async function GET(_req: NextRequest) {
  try {
    const rows = await db.advertisementPricing.findMany({ where: { active: true } });
    const starting = AD_TYPES.map((type) => {
      const prices = rows.filter((r) => r.type === type).map((r) => r.basePrice);
      return { type, from: prices.length ? Math.min(...prices) : null };
    });
    return ok({ starting });
  } catch (err) {
    return handleError(err);
  }
}
