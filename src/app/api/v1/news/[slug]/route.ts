import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";
import { serializeArticle } from "@/lib/serialize";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=120, stale-while-revalidate=240";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await ctx.params;
    const article = await db.article.findUnique({
      where: { slug: decodeSlug(rawSlug) },
      include: {
        category: { select: { slug: true, name: true } },
        author: { select: { name: true } },
      },
    });
    if (!article || !PUBLIC_VISIBLE_STATUSES.includes(article.status as never)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return ok({ article: serializeArticle(article) }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return handleError(err);
  }
}
