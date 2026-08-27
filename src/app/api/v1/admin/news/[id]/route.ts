import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateArticleSchema } from "@/lib/validation";
import { requireApiSession } from "@/lib/auth";
import { can, canEditArticle, canDeleteArticle } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";
import { uniqueSlug } from "@/lib/slug";
import { slugify } from "@/lib/text";

export const dynamic = "force-dynamic";

/** Minimum editorial body required to publish an imported (source-linked) story. */
const MIN_EDITORIAL_CONTENT = 400;

/** Full article for the editor UI (read + edit). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireApiSession();
    const { id } = await ctx.params;
    const article = await db.article.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, slug: true, name: true } },
        subcategory: { select: { id: true, slug: true, name: true } },
        region: { select: { id: true, slug: true, name: true } },
        author: { select: { name: true, email: true } },
        tags: { include: { tag: { select: { name: true, slug: true } } } },
      },
    });
    if (!article) return apiError("Article not found", 404);
    return ok({
      article: {
        ...article,
        authorName: article.author?.name ?? null,
        tagNames: article.tags.map((t) => t.tag.name),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

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
      body.subcategoryId !== undefined ||
      body.regionId !== undefined ||
      body.imageCaption !== undefined ||
      body.imageCredit !== undefined ||
      body.ogImage !== undefined ||
      body.seoTitle !== undefined ||
      body.seoDescription !== undefined ||
      body.sourceNotes !== undefined ||
      body.geographicPriority !== undefined ||
      body.geographicScope !== undefined ||
      body.district !== undefined ||
      body.state !== undefined ||
      body.country !== undefined ||
      body.isFeatured !== undefined ||
      body.tags !== undefined ||
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
    if (body.editorialPriority !== undefined && body.editorialPriority !== existing.editorialPriority && !can(session.role, "feature.manage")) {
      return apiError("Missing permission: feature.manage", 403);
    }
    if (body.status !== undefined && !can(session.role, "article.publish")) {
      return apiError("Missing permission: article.publish", 403);
    }

    const now = new Date();
    const data: Record<string, unknown> = {};
    let event: "published" | null = null;

    if (body.title) {
      data.title = body.title;
      if (body.slug === undefined) data.slug = await uniqueSlug(body.title);
    }
    if (body.slug) {
      const validSlug = /^[\p{L}\p{M}\p{N}-]+$/u.test(body.slug) && body.slug.length >= 3;
      data.slug = validSlug ? body.slug : await uniqueSlug(body.title || existing.title);
    }
    if (body.excerpt !== undefined) data.excerpt = body.excerpt;
    if (body.content !== undefined) data.content = body.content;
    if (body.featuredImage !== undefined) data.featuredImage = body.featuredImage;
    if (body.categoryId) data.categoryId = body.categoryId;
    if (body.subcategoryId !== undefined) data.subcategoryId = body.subcategoryId || null;
    if (body.regionId !== undefined) data.regionId = body.regionId || null;
    if (body.imageCaption !== undefined) data.imageCaption = body.imageCaption || null;
    if (body.imageCredit !== undefined) data.imageCredit = body.imageCredit || null;
    if (body.ogImage !== undefined) data.ogImage = body.ogImage || null;
    if (body.seoTitle !== undefined) data.seoTitle = body.seoTitle || null;
    if (body.seoDescription !== undefined) data.seoDescription = body.seoDescription || null;
    if (body.sourceNotes !== undefined) data.sourceNotes = body.sourceNotes || null;
    if (body.geographicPriority !== undefined) data.geographicPriority = body.geographicPriority;
    if (body.geographicScope !== undefined) data.geographicScope = body.geographicScope;
    if (body.district !== undefined) data.district = body.district || null;
    if (body.state !== undefined) data.state = body.state || null;
    if (body.country !== undefined) data.country = body.country || null;
    if (body.isFeatured !== undefined) data.isFeatured = body.isFeatured;
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

    let tagIds: string[] | null = null;
    if (body.tags !== undefined) {
      const names = Array.from(new Set(body.tags.map((t) => t.trim()).filter(Boolean)));
      tagIds = [];
      for (const name of names) {
        const tagSlug = slugify(name) || name;
        const t = await db.tag.upsert({ where: { slug: tagSlug }, update: {}, create: { name, slug: tagSlug } });
        tagIds.push(t.id);
      }
    }

    // ---- Editorial gate -----------------------------------------------------
    // Imported (source-linked) stories must not go public with truncated feed
    // snippets as the body. Require a real editorial write-up first.
    // Admin roles (OWNER, EDITOR_IN_CHIEF) bypass the quality gate entirely.
    const targetsPublished =
      data.status === "PUBLISHED" ||
      (body.action === "mark_breaking" && data.status === "PUBLISHED");
    const isAdminRole = session.role === "OWNER" || session.role === "EDITOR_IN_CHIEF";
    if (targetsPublished && !body.override && !isAdminRole) {
      const isImported = Boolean(existing.sourceId || existing.sourceUrl);
      const finalContent = typeof body.content === "string" ? body.content : existing.content;

      // Collect ALL issues into a structured list
      const allIssues: Array<{ field: string; message: string; severity: "error" | "warning" }> = [];

      if (isImported && finalContent.trim().length < MIN_EDITORIAL_CONTENT) {
        allIssues.push({
          field: "content",
          message: `Imported story has only ${finalContent.trim().length} characters of content — minimum ${MIN_EDITORIAL_CONTENT} required. Write the full article before publishing.`,
          severity: "error",
        });
      }

      // Quality gate: check required fields before publish
      const { editorialQualityCheck } = await import("@/lib/editorial-check");
      const finalTitle = typeof body.title === "string" ? body.title : existing.title;
      const finalExcerpt = typeof body.excerpt === "string" ? body.excerpt : existing.excerpt;
      const finalImage = typeof body.featuredImage === "string" ? body.featuredImage : existing.featuredImage;
      const finalCategoryId = typeof body.categoryId === "string" ? body.categoryId : existing.categoryId;
      const qualityIssues = editorialQualityCheck({
        title: finalTitle,
        slug: (typeof data.slug === "string" ? data.slug : null) || existing.slug,
        excerpt: finalExcerpt,
        content: finalContent,
        featuredImage: finalImage,
        categoryId: finalCategoryId,
        authorId: existing.authorId,
      });
      allIssues.push(...qualityIssues);

      const errors = allIssues.filter((i) => i.severity === "error");
      if (errors.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Cannot publish — fix the issues below", issues: allIssues, errorCount: errors.length },
          { status: 422 }
        );
      }
    }

    const article = await db.article.update({
      where: { id },
      data,
      include: { category: { select: { slug: true, name: true } }, author: { select: { name: true } } },
    });

    if (tagIds) {
      await db.$transaction([
        db.articleTag.deleteMany({ where: { articleId: id } }),
        ...tagIds.map((tagId) => db.articleTag.create({ data: { articleId: id, tagId } })),
      ]);
    }

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
      if (article.isBreaking) {
        publishEvent({ type: "breaking.updated" });
        // Auto-push breaking news to subscribers
        const { sendPushNotification } = await import("@/lib/push");
        sendPushNotification({
          title: "⚡ ব্রেকিং নিউজ",
          body: article.title,
          url: `/news/${article.slug}`,
          tag: `breaking-${article.id}`,
        }).catch(() => {}); // fire-and-forget
      }
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
