import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { commentSchema } from "@/lib/validation";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`comment:${ip}`, 5, 10 * 60_000)) {
      return apiError("Too many comments submitted. Try again later.", 429);
    }
    const body = commentSchema.parse(await req.json());
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return apiError("Missing article", 422);
    const article = await db.article.findUnique({
      where: { slug },
      select: { id: true, commentsEnabled: true, status: true },
    });
    if (!article || !["PUBLISHED", "OLDER"].includes(article.status)) return apiError("Article not found", 404);
    if (!article.commentsEnabled) return apiError("Comments are disabled on this story", 403);

    const comment = await db.comment.create({
      data: {
        articleId: article.id,
        authorName: body.authorName,
        body: body.body,
        status: "PENDING",
      },
    });
    return ok({ comment: { id: comment.id, status: comment.status } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
