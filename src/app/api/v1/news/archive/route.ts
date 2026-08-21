import type { NextRequest } from "next/server";
import { getArchive } from "@/lib/feeds";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const data = await getArchive({
      categorySlug: sp.get("category") ?? undefined,
      q: sp.get("q") ?? undefined,
      year: sp.get("year") ? parseInt(sp.get("year")!, 10) : undefined,
      month: sp.get("month") ? parseInt(sp.get("month")!, 10) : undefined,
      cursor: sp.get("cursor") ?? undefined,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    });
    return ok(data);
  } catch (err) {
    return handleError(err);
  }
}
