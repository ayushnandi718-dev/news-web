import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: import("next/server").NextRequest) {
  try {
    await requirePerm("audit.view");
    const action = req.nextUrl.searchParams.get("action") ?? undefined;
    const logs = await db.auditLog.findMany({
      where: action ? { action: { contains: action } } : {},
      orderBy: { createdAt: "desc" },
      take: 150,
    });
    return ok({ items: logs });
  } catch (err) {
    return handleError(err);
  }
}
