import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { breakingSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePerm("dashboard.view");
    const now = new Date();
    const active = await db.article.findMany({
      where: { isBreaking: true, breakingUntil: { gt: now } },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: [{ breakingPriority: "desc" }, { publishedAt: "desc" }],
    });
    const recentlyExpired = await db.article.findMany({
      where: {
        status: { in: ["PUBLISHED", "OLDER"] },
        isBreaking: false,
        updatedAt: { gte: new Date(now.getTime() - 86400_000) },
      },
      include: { category: { select: { name: true, slug: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    return ok({ active, recentlyExpired });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("breaking.manage");
    const body = breakingSchema.parse(await req.json());
    const article = await db.article.findUnique({ where: { id: body.articleId } });
    if (!article) return apiError("Article not found", 404);
    const now = new Date();
    const updated = await db.article.update({
      where: { id: body.articleId },
      data: {
        isBreaking: true,
        breakingUntil: new Date(now.getTime() + body.minutes * 60_000),
        breakingPriority: body.priority,
        status: article.status === "PUBLISHED" || article.status === "OLDER" ? article.status : "PUBLISHED",
        publishedAt: article.publishedAt ?? now,
      },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "breaking.create",
      targetType: "article",
      targetId: body.articleId,
      meta: { minutes: body.minutes, priority: body.priority },
    });
    invalidateTags(["breaking", "home", "admin_stats"]);
    publishEvent({ type: "breaking.updated" });
    return ok({ article: updated }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
