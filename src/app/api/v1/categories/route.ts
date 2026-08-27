import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, description: true, priority: true },
    });
    return ok({ items: categories }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return handleError(err);
  }
}
