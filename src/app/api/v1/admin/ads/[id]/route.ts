import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { adUpdateSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";
import { sanitizeRichText } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("ads.manage");
    const { id } = await ctx.params;
    const body = adUpdateSchema.parse(await req.json());
    const existing = await db.advertisement.findUnique({ where: { id } });
    if (!existing) return apiError("Ad not found", 404);

    if (body.startDate && body.endDate && body.endDate <= body.startDate) {
      return apiError("End date must be after start date", 422);
    }

    const ad = await db.advertisement.update({
      where: { id },
      data: {
        ...(body.internalName !== undefined ? { internalName: body.internalName } : {}),
        ...(body.slug !== undefined ? { slug: body.slug } : {}),
        ...(body.advertiserName !== undefined ? { advertiserName: body.advertiserName } : {}),
        ...(body.businessName !== undefined ? { businessName: body.businessName || null } : {}),
        ...(body.email !== undefined ? { email: body.email || null } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined ? { description: sanitizeRichText(body.description) } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl || null } : {}),
        ...(body.destinationUrl !== undefined ? { destinationUrl: body.destinationUrl || null } : {}),
        ...(body.type !== undefined ? { type: body.type } : {}),
        ...(body.placement !== undefined ? { placement: body.placement } : {}),
        ...(body.size !== undefined ? { size: body.size } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.startDate !== undefined ? { startDate: body.startDate ?? null } : {}),
        ...(body.endDate !== undefined ? { endDate: body.endDate ?? null } : {}),
        ...(body.paymentStatus !== undefined ? { paymentStatus: body.paymentStatus } : {}),
        ...(body.paymentDate !== undefined ? { paymentDate: body.paymentDate ?? null } : {}),
        ...(body.paymentNotes !== undefined ? { paymentNotes: body.paymentNotes ?? null } : {}),
      },
    });

    if (body.resetCounters) {
      await db.advertisement.update({ where: { id }, data: { impressions: 0, clicks: 0 } });
    }

    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "ad.update",
      targetType: "advertisement",
      targetId: id,
      meta: { title: ad.internalName, status: ad.status },
    });
    invalidateTags(["ads"]);
    publishEvent({ type: "ads.updated" });
    return ok({ ad });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("ads.manage");
    const { id } = await ctx.params;
    const existing = await db.advertisement.findUnique({ where: { id } });
    if (!existing) return apiError("Ad not found", 404);
    // Soft-delete: preserve revenue data for dashboard
    await db.advertisement.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "ad.delete",
      targetType: "advertisement",
      targetId: id,
      meta: { title: existing.internalName },
    });
    invalidateTags(["ads"]);
    publishEvent({ type: "ads.updated" });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
