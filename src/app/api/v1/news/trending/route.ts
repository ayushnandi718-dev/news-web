import type { NextRequest } from "next/server";
import { getTrending } from "@/lib/feeds";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const data = await getTrending({
      categorySlug: sp.get("category") ?? undefined,
      page: sp.get("page") ? parseInt(sp.get("page")!, 10) : undefined,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    });
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
