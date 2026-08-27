import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePerm("ads.manage");
    const status = req.nextUrl.searchParams.get("status") ?? undefined;
    const items = await db.advertisementRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { advertisements: { select: { id: true, internalName: true, status: true } } },
    });
    return ok({ items });
  } catch (err) {
    return handleError(err);
  }
}
