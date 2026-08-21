import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { breakingSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("breaking.manage");
    const { id } = await ctx.params;
    const body = breakingSchema.parse(await req.json());
    const article = await db.article.findUnique({ where: { id } });
    if (!article) return apiError("Article not found", 404);
    const now = new Date();
    const updated = await db.article.update({
      where: { id },
      data: {
        isBreaking: true,
        breakingUntil: new Date(now.getTime() + body.minutes * 60_000),
        breakingPriority: body.priority,
        status: ["PUBLISHED", "OLDER"].includes(article.status) ? article.status : "PUBLISHED",
        publishedAt: article.publishedAt ?? now,
      },
    });
    await db.notification.create({
      data: {
        type: "BREAKING",
        title: updated.title,
        body: "Breaking news published",
        url: `/news/${updated.slug}`,
      },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "breaking.create",
      targetType: "article",
      targetId: id,
      meta: { minutes: body.minutes, priority: body.priority },
    });
    invalidateTags(["breaking", "home", "admin_stats"]);
    publishEvent({ type: "breaking.updated" });
    return ok({ article: updated }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
