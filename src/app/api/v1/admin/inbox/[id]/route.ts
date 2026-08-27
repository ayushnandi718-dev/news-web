import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { inboxActionSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { slugify } from "@/lib/text";
import { invalidateTags } from "@/lib/cache";
import { extractArticleText } from "@/lib/ingestion/extract";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("inbox.review");
    const { id } = await ctx.params;
    const body = inboxActionSchema.parse(await req.json());
    const item = await db.importedItem.findUnique({ where: { id }, include: { source: true } });
    if (!item) return apiError("Imported item not found", 404);

    if (body.action === "reject") {
      await db.importedItem.update({ where: { id }, data: { status: "REJECTED" } });
      await audit({
        actorId: session.id, actorEmail: session.email,
        action: "inbox.reject", targetType: "imported_item", targetId: id,
      });
      invalidateTags(["admin_stats", "inbox"]);
      return ok({ status: "REJECTED" });
    }

    let categoryId: string | undefined = body.categoryId;
    if (!categoryId && item.source.defaultCategorySlug) {
      const cat = await db.category.findUnique({ where: { slug: item.source.defaultCategorySlug } });
      categoryId = cat?.id;
    }
    if (!categoryId) {
      const firstCat = await db.category.findFirst({ orderBy: { priority: "desc" } });
      categoryId = firstCat?.id;
    }
    if (!categoryId) return apiError("No category available", 422);

    const baseSlug = slugify(item.title) || `story-${Date.now()}`;
    let slug = baseSlug;
    let n = 1;
    while (await db.article.findUnique({ where: { slug } })) slug = `${baseSlug.slice(0, 80)}-${n++}`;

    const now = new Date();
    let contentText = item.contentText ?? "";
    let imageUrl: string | null = item.imageUrl;

    // Feed snippets are usually truncated. On convert, try to pull the full
    // story from the source page once, so the draft opens with real content.
    if ((!contentText || contentText.trim().length < 400) && !item.url.includes("news.google.com")) {
      const ex = await extractArticleText(item.url, 7000).catch(() => null);
      if (ex?.ok && ex.text && ex.text.length > contentText.length) {
        contentText = ex.text;
        if (!imageUrl && ex.leadImage) imageUrl = ex.leadImage;
        await db.importedItem.update({ where: { id }, data: { contentText: ex.text } }).catch(() => {});
      }
    }

    const rawContent = contentText || item.summary || "";
    const needsFullContent = rawContent.trim().length < 400;

    // "publish" creates the article directly as PUBLISHED if content is
    // substantial enough. Thin imports fall back to NEW so the editor can
    // write a proper story first. Admin roles bypass the content-length check.
    const isAdminRole = session.role === "OWNER" || session.role === "EDITOR_IN_CHIEF";
    const isDirectPublish = body.action === "publish" && (isAdminRole || !needsFullContent);
    const articleStatus = isDirectPublish ? "PUBLISHED" : "NEW";

    const article = await db.article.create({
      data: {
        title: item.title,
        slug,
        excerpt: item.summary ?? item.title,
        content: rawContent || item.title,
        featuredImage: imageUrl,
        categoryId,
        authorId: session.id,
        status: articleStatus,
        publishedAt: isDirectPublish ? now : null,
        sourceName: item.source.name,
        sourceUrl: item.url,
        canonicalUrl: item.canonicalUrl ?? item.url,
        sourceId: item.sourceId,
        sourceNotes: needsFullContent
          ? "IMPORT_TRUNCATED: feed content incomplete — full editorial write-up required"
          : null,
      },
    });

    await db.importedItem.update({
      where: { id },
      data: { status: "CONVERTED_DRAFT", draftArticleId: article.id },
    });

    await audit({
      actorId: session.id, actorEmail: session.email,
      action: isDirectPublish ? "inbox.direct_publish" : "inbox.create_draft",
      targetType: "article", targetId: article.id,
      meta: { importedItemId: id, title: article.title },
    });
    invalidateTags(["admin_stats", "inbox", "breaking"]);
    return ok({ article, published: isDirectPublish }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
