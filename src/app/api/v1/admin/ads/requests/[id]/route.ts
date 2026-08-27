import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { adRequestStatusSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("ads.manage");
    const { id } = await ctx.params;
    const body = adRequestStatusSchema.parse(await req.json());
    const existing = await db.advertisementRequest.findUnique({ where: { id } });
    if (!existing) return apiError("Request not found", 404);
    const item = await db.advertisementRequest.update({ where: { id }, data: { status: body.status } });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "ad.request.update",
      targetType: "advertisement_request",
      targetId: id,
      meta: { status: body.status },
    });
    return ok({ request: item });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("ads.manage");
    const { id } = await ctx.params;
    const existing = await db.advertisementRequest.findUnique({ where: { id } });
    if (!existing) return apiError("Request not found", 404);
    await db.advertisementRequest.delete({ where: { id } });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "ad.request.delete",
      targetType: "advertisement_request",
      targetId: id,
      meta: { name: existing.name },
    });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
