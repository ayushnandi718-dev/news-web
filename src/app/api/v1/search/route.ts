import type { NextRequest } from "next/server";
import { searchNews } from "@/lib/feeds";
import { handleError, ok, apiError } from "@/lib/api";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(`search:${ip}`, 20, 60_000)) {
      return apiError("Too many requests — please slow down", 429);
    }
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
    if (q.length < 2) return ok({ items: [], query: q });
    const items = await searchNews(q);
    return ok({ items, query: q }, { headers: { "Cache-Control": "private, max-age=10" } });
  } catch (err) {
    return handleError(err);
  }
}
