import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";
import { serializeArticle } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const videoCat = await db.category.findFirst({ where: { slug: "videos" } });
    if (!videoCat) return ok({ items: [] });
    const rows = await db.article.findMany({
      where: {
        categoryId: videoCat.id,
        status: { in: ["PUBLISHED", "OLDER"] },
        publishedAt: { not: null, lte: now },
      },
      include: { category: { select: { slug: true, name: true } }, author: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
      take: 12,
    });
    return ok({ items: rows.map((a) => serializeArticle(a, now)) });
  } catch (err) {
    return handleError(err);
  }
}
