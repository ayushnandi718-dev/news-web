import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";
import { serializeArticle } from "@/lib/serialize";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const article = await db.article.findUnique({
      where: { slug },
      include: {
        category: { select: { slug: true, name: true } },
        author: { select: { name: true } },
      },
    });
    if (!article || !PUBLIC_VISIBLE_STATUSES.includes(article.status as never)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return ok({ article: serializeArticle(article) });
  } catch (err) {
    return handleError(err);
  }
}
