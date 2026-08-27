import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";
import { serializeArticle } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  if (!idsParam) return NextResponse.json({ ok: true, data: { items: [] } });

  const ids = idsParam.split(",").filter(Boolean).slice(0, 50);
  const articles = await db.article.findMany({
    where: { id: { in: ids }, status: { in: PUBLIC_VISIBLE_STATUSES as never[] } },
    include: {
      category: { select: { slug: true, name: true } },
      author: { select: { name: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    data: { items: articles.map((a) => serializeArticle(a)) },
  });
}
