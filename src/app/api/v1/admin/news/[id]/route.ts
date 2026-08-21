import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { updateArticleSchema } from "@/lib/validation";
import { requireApiSession } from "@/lib/auth";
import { can, canEditArticle, canDeleteArticle } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";
import { uniqueSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession();
    const { id } = await ctx.params;
    const body = updateArticleSchema.parse(await req.json());
    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) return apiError("Article not found", 404);

    const needsEdit =
      body.title !== undefined ||
      body.slug !== undefined ||
      body.excerpt !== undefined ||
      body.content !== undefined ||
      body.featuredImage !== undefined ||
      body.categoryId !== undefined ||
      body.scheduledAt !== undefined;
    if (needsEdit && !canEditArticle(session, existing)) {
      return apiError("You cannot edit this article", 403);
    }

    if (body.action) {
      const required: Record<string, Parameters<typeof can>[1]> = {
        publish: "article.publish",
        unpublish: "article.publish",
        schedule: "article.publish",
        archive: "article.publish",
        restore: "article.publish",
        feature: "feature.manage",
        unfeature: "feature.manage",
        mark_breaking: "breaking.manage",
        remove_breaking: "breaking.manage",
        approve: "article.review",
        reject: "article.review",
        submit_review: "article.edit.own",
      };
      const perm = required[body.action];
      if (perm && !can(session.role, perm)) {
        return apiError(`Missing permission: ${perm}`, 403);
      }
      if ((body.action === "submit_review" || body.action === "reject") && !canEditArticle(session, existing)) {
        return apiError("You cannot modify this article", 403);
      }
    }
    if (body.editorialPriority !== undefined && !can(session.role, "feature.manage")) {
      return apiError("Missing permission: feature.manage", 403);
    }
    if (body.status !== undefined && !can(session.role, "article.publish")) {
      return apiError("Missing permission: article.publish", 403);
    }

    const now = new Date();
    const data: Record<string, unknown> = {};
    let event: "published" | null = null;

    if (body.title && body.title !== existing.title) {
      data.title = body.title;
      if (body.slug === undefined) data.slug = await uniqueSlug(body.title);
    }
    if (body.slug) data.slug = body.slug;
    if (body.excerpt !== undefined) data.excerpt = body.excerpt;
    if (body.content !== undefined) data.content = body.content;
    if (body.featuredImage !== undefined) data.featuredImage = body.featuredImage;
    if (body.categoryId) data.categoryId = body.categoryId;
    if (body.editorialPriority !== undefined) data.editorialPriority = body.editorialPriority;
    if (body.scheduledAt !== undefined) data.scheduledAt = body.scheduledAt;

    switch (body.action) {
      case "publish":
        data.status = "PUBLISHED";
        data.publishedAt = existing.publishedAt ?? now;
        event = "published";
        break;
      case "unpublish":
        data.status = "DRAFT";
        data.isBreaking = false;
        data.breakingUntil = null;
        break;
      case "feature":
        data.isFeatured = true;
        break;
      case "unfeature":
        data.isFeatured = false;
        break;
      case "mark_breaking": {
        const minutes = body.breakingMinutes ?? 120;
        data.isBreaking = true;
        data.breakingUntil = new Date(now.getTime() + minutes * 60_000);
        if (existing.status !== "PUBLISHED" && existing.status !== "OLDER") {
          data.status = "PUBLISHED";
          data.publishedAt = existing.publishedAt ?? now;
        }
        invalidateTags(["breaking"]);
        publishEvent({ type: "breaking.updated" });
        break;
      }
      case "remove_breaking":
        data.isBreaking = false;
        data.breakingUntil = null;
        invalidateTags(["breaking"]);
        publishEvent({ type: "breaking.updated" });
        break;
      case "archive":
        data.status = "ARCHIVED";
        data.isBreaking = false;
        break;
      case "restore":
        data.status = existing.publishedAt ? "OLDER" : "DRAFT";
        break;
      case "submit_review":
        data.status = "IN_REVIEW";
        break;
      case "approve":
        data.status = "APPROVED";
        break;
      case "reject":
        data.status = "DRAFT";
        break;
    }
    if (body.status) data.status = body.status;

    const article = await db.article.update({
      where: { id },
      data,
      include: { category: { select: { slug: true, name: true } }, author: { select: { name: true } } },
    });

    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: `article.${body.action ?? "update"}`,
      targetType: "article",
      targetId: id,
      meta: { title: article.title, status: article.status },
    });

    invalidateTags(["latest", "home", "trending", "admin_stats"]);

    if (event === "published") {
      publishEvent({
        type: "article.published",
        id: article.id,
        slug: article.slug,
        title: article.title,
        categoryId: article.categoryId,
        publishedAt: (article.publishedAt ?? now).toISOString(),
        isBreaking: article.isBreaking,
      });
      if (article.isBreaking) publishEvent({ type: "breaking.updated" });
    }

    return ok({ article });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession();
    const { id } = await ctx.params;
    const existing = await db.article.findUnique({ where: { id } });
    if (!existing) return apiError("Article not found", 404);
    if (!canDeleteArticle(session, existing)) return apiError("You cannot delete this article", 403);
    await db.article.delete({ where: { id } });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "article.delete",
      targetType: "article",
      targetId: id,
      meta: { title: existing.title, slug: existing.slug },
    });
    invalidateTags(["latest", "home", "trending", "admin_stats"]);
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
