import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await params;
    const slug = decodeSlug(rawSlug);
    const gallery = await db.gallery.findFirst({
      where: { slug, status: "PUBLISHED" },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!gallery) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return ok(gallery, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (e) {
    return handleError(e);
  }
}
