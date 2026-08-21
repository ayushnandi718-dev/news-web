import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return ok({ suggestions: [] });
    const rows = await db.article.findMany({
      where: {
        status: { in: ["PUBLISHED", "OLDER"] },
        title: { contains: q },
      },
      select: { title: true, slug: true },
      orderBy: { publishedAt: "desc" },
      take: 8,
    });
    return ok({
      suggestions: rows.map((r) => ({ title: r.title, url: `/news/${r.slug}` })),
    });
  } catch (err) {
    return handleError(err);
  }
}
