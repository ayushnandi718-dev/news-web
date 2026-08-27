import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createArticleSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { uniqueSlug } from "@/lib/slug";
import { slugify } from "@/lib/text";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { publishEvent } from "@/lib/events";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePerm("dashboard.view");
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") ?? undefined;
    const q = sp.get("q") ?? undefined;
    const page = Math.max(0, parseInt(sp.get("page") ?? "0", 10) || 0);
    const limit = Math.min(50, parseInt(sp.get("limit") ?? "20", 10) || 20);
    const where: Record<string, unknown> = {
      ...(status ? { status } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] } : {}),
    };
    const [rows, total, statusCounts] = await Promise.all([
      db.article.findMany({
        where,
        include: {
          category: { select: { slug: true, name: true } },
          subcategory: { select: { slug: true, name: true } },
          region: { select: { slug: true, name: true } },
          author: { select: { name: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: page * limit,
        take: limit,
      }),
      db.article.count({ where }),
      db.article.groupBy({
        by: ["status"],
        _count: { _all: true },
        ...(q
          ? { where: { OR: [{ title: { contains: q } }, { excerpt: { contains: q } }] } }
          : {}),
      }),
    ]);
    return ok({
      items: rows.map((a) => ({
        ...a,
        category: a.category,
        authorName: a.author?.name ?? null,
      })),
      total,
      counts: Object.fromEntries(statusCounts.map((c) => [c.status, c._count._all])),
      page,
      limit,
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("article.create");
    const body = createArticleSchema.parse(await req.json());
    if (body.status === "PUBLISHED" && !can(session.role, "article.publish")) {
      body.status = "DRAFT";
    }
    const canPublish = can(session.role, "article.publish");
    let effectiveStatus = body.status;
    if (body.scheduledAt && canPublish) {
      effectiveStatus = "SCHEDULED";
    }

    // Quality gate: check required fields before direct publish
    // Admin roles (OWNER, EDITOR_IN_CHIEF) bypass the quality gate entirely.
    const isAdminRole = session.role === "OWNER" || session.role === "EDITOR_IN_CHIEF";
    if (effectiveStatus === "PUBLISHED" && canPublish && !isAdminRole) {
      const { editorialQualityCheck } = await import("@/lib/editorial-check");
      const qualityIssues = editorialQualityCheck({
        title: body.title,
        slug: body.slug || undefined,
        excerpt: body.excerpt,
        content: body.content,
        featuredImage: body.featuredImage ?? undefined,
        categoryId: body.categoryId,
        authorId: session.id,
      });
      if (qualityIssues.length > 0) {
        const errors = qualityIssues.filter((i) => i.severity === "error");
        if (errors.length > 0) {
          return NextResponse.json(
            { ok: false, error: "Cannot publish — fix the issues below", issues: qualityIssues, errorCount: errors.length },
            { status: 422 }
          );
        }
      }
    }
    const category = await db.category.findUnique({ where: { id: body.categoryId } });
    if (!category) return handleError(new Error("Category not found"));
    const slugRaw = body.slug ? body.slug : "";
    const slugValid = slugRaw && /^[\p{L}\p{M}\p{N}-]+$/u.test(slugRaw) && slugRaw.length >= 3;
    const slug = slugValid ? slugRaw : await uniqueSlug(body.title);
    const now = new Date();
    const breakingUntil =
      body.isBreaking && body.breakingMinutes
        ? new Date(now.getTime() + body.breakingMinutes * 60_000)
        : null;

    const tagNames = Array.from(new Set(body.tags.map((t) => t.trim()).filter(Boolean)));
    const tagConnects = [];
    for (const name of tagNames) {
      const tagSlug = slugify(name) || name;
      const t = await db.tag.upsert({
        where: { slug: tagSlug },
        update: {},
        create: { name, slug: tagSlug },
      });
      tagConnects.push({ id: t.id });
    }

    const article = await db.article.create({
      data: {
        title: body.title,
        slug,
        excerpt: body.excerpt,
        content: body.content,
        featuredImage: body.featuredImage ?? null,
        imageCaption: body.imageCaption ?? null,
        imageCredit: body.imageCredit ?? null,
        categoryId: body.categoryId,
        subcategoryId: body.subcategoryId ?? null,
        regionId: body.regionId ?? null,
        authorId: session.id,
        status: effectiveStatus,
        publishedAt: effectiveStatus === "PUBLISHED" ? now : null,
        scheduledAt: body.scheduledAt ?? null,
        isBreaking: body.isBreaking && !!breakingUntil,
        breakingUntil,
        isFeatured: body.isFeatured,
        editorialPriority: body.editorialPriority,
        geographicPriority: body.geographicPriority ?? 0,
        geographicScope: body.geographicScope,
        district: body.district ?? null,
        state: body.state ?? null,
        country: body.country ?? null,
        sourceName: body.sourceName ?? null,
        sourceUrl: body.sourceUrl ?? null,
        sourceNotes: body.sourceNotes ?? null,
        seoTitle: body.seoTitle ?? null,
        seoDescription: body.seoDescription ?? null,
        ogImage: body.ogImage ?? null,
        ...(tagConnects.length
          ? { tags: { create: tagConnects.map((t) => ({ tagId: t.id })) } }
          : {}),
      },
      include: { 
        category: { select: { slug: true, name: true } }, 
        subcategory: { select: { slug: true, name: true } },
        region: { select: { slug: true, name: true } },
        author: { select: { name: true } }, 
        tags: { include: { tag: true } } 
      },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "article.create",
      targetType: "article",
      targetId: article.id,
      meta: { 
        title: article.title, 
        status: article.status,
        geographicScope: article.geographicScope,
        region: article.region?.name,
        category: article.category?.name
      },
    });
    invalidateTags(["latest", "home", "admin_stats"]);
    if (article.status === "PUBLISHED") {
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
    return ok({ article }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}


