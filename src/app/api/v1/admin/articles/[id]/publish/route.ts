import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { updateArticleSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("article.publish");
    const { id } = await ctx.params;
    const partial = await req.json().catch(() => ({}));
    const body = updateArticleSchema.pick({ scheduledAt: true }).parse(partial);
    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) return handleError(new Error("Article not found"));

    const now = new Date();
    let article;
    if (body.scheduledAt && body.scheduledAt > now) {
      article = await db.article.update({
        where: { id },
        data: { status: "SCHEDULED", scheduledAt: body.scheduledAt },
        include: { category: { select: { slug: true, name: true } }, author: { select: { name: true } } },
      });
    } else {
      article = await db.article.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt: existing.publishedAt ?? now, scheduledAt: null },
        include: { category: { select: { slug: true, name: true } }, author: { select: { name: true } } },
      });
      invalidateTags(["latest", "home", "admin_stats"]);
      publishEvent({
        type: "article.published",
        id: article.id,
        slug: article.slug,
        title: article.title,
        categoryId: article.categoryId,
        publishedAt: (article.publishedAt ?? now).toISOString(),
        isBreaking: article.isBreaking,
      });
    }
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: article.status === "SCHEDULED" ? "article.schedule" : "article.publish",
      targetType: "article",
      targetId: id,
      meta: { title: article.title, scheduledAt: article.scheduledAt },
    });
    return ok({ article });
  } catch (err) {
    return handleError(err);
  }
}
