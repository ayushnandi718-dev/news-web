import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: import("next/server").NextRequest) {
  try {
    await requirePerm("inbox.review");
    const sp = req.nextUrl.searchParams;
    const status = sp.get("status") ?? undefined;
    const where = status ? { status } : {};
    const items = await db.importedItem.findMany({
      where,
      include: { source: { select: { id: true, name: true, type: true, authorized: true } } },
      orderBy: { fetchedAt: "desc" },
      take: 100,
    });
    const counts = await db.importedItem.groupBy({ by: ["status"], _count: { _all: true } });
    return ok({
      items,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    });
  } catch (err) {
    return handleError(err);
  }
}
