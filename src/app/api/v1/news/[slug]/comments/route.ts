import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await ctx.params;
    const article = await db.article.findUnique({
      where: { slug: decodeSlug(rawSlug) },
      select: { id: true, commentsEnabled: true },
    });
    if (!article) return handleError(new Error("Article not found"));
    const items = await db.comment.findMany({
      where: { articleId: article.id, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, authorName: true, body: true, createdAt: true },
    });
    return ok({ items });
  } catch (err) {
    return handleError(err);
  }
}
