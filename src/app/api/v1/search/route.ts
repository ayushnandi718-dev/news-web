import type { NextRequest } from "next/server";
import { searchNews } from "@/lib/feeds";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return ok({ items: [], query: q });
    const items = await searchNews(q);
    return ok({ items, query: q });
  } catch (err) {
    return handleError(err);
  }
}
