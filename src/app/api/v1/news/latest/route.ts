import type { NextRequest } from "next/server";
import { getLatest } from "@/lib/feeds";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const data = await getLatest({
      categorySlug: sp.get("category") ?? undefined,
      cursor: sp.get("cursor") ?? undefined,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    });
    return ok({ ...data, server_time: new Date().toISOString() });
  } catch (err) {
    return handleError(err);
  }
}
