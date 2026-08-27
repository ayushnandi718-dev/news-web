import { db } from "@/lib/db";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const galleries = await db.gallery.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { images: { take: 4, orderBy: { sortOrder: "asc" }, select: { url: true, thumbUrl: true, alt: true } } },
    });
    return ok(galleries, {
      headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240" },
    });
  } catch (e) {
    return handleError(e);
  }
}
