import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const ad = await db.advertisement.findUnique({ where: { id }, select: { id: true } });
    if (!ad) return apiError("Ad not found", 404);
    await db.advertisement.update({ where: { id }, data: { clicks: { increment: 1 } } });
    return ok({ counted: true });
  } catch (err) {
    return handleError(err);
  }
}
