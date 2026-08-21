import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { breakingUpdateSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("breaking.manage");
    const { id } = await ctx.params;
    const body = breakingUpdateSchema.parse(await req.json());
    const article = await db.article.findUnique({ where: { id } });
    if (!article || !article.isBreaking) return apiError("Breaking article not found", 404);
    const now = new Date();
    const data: Record<string, unknown> = {};
    if (body.priority !== undefined) data.breakingPriority = body.priority;
    if (body.extendMinutes) {
      const base = article.breakingUntil && article.breakingUntil > now ? article.breakingUntil : now;
      data.breakingUntil = new Date(base.getTime() + body.extendMinutes * 60_000);
    }
    if (body.endNow) {
      data.isBreaking = false;
      data.breakingUntil = null;
    }
    const updated = await db.article.update({ where: { id }, data });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: body.endNow ? "breaking.end" : "breaking.update",
      targetType: "article",
      targetId: id,
      meta: { ...body },
    });
    invalidateTags(["breaking", "home", "admin_stats"]);
    publishEvent({ type: "breaking.updated" });
    return ok({ article: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("breaking.manage");
    const { id } = await ctx.params;
    const updated = await db.article.update({ where: { id }, data: { isBreaking: false, breakingUntil: null } });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "breaking.remove",
      targetType: "article",
      targetId: id,
    });
    invalidateTags(["breaking", "home", "admin_stats"]);
    publishEvent({ type: "breaking.updated" });
    return ok({ article: updated });
  } catch (err) {
    return handleError(err);
  }
}
