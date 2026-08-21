import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, description: true, priority: true },
    });
    return ok({ items: categories });
  } catch (err) {
    return handleError(err);
  }
}
