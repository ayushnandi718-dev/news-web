import type { NextRequest } from "next/server";
import { getLatest } from "@/lib/feeds";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const sp = req.nextUrl.searchParams;
    const data = await getLatest({
      categorySlug: slug,
      cursor: sp.get("cursor") ?? undefined,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!, 10) : undefined,
    });
    return ok({ ...data, category: slug });
  } catch (err) {
    return handleError(err);
  }
}
