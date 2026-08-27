import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await params;
    const slug = decodeSlug(rawSlug);
    const poll = await db.poll.findFirst({ where: { slug } });
    if (!poll) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return ok(poll, {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" },
    });
  } catch (e) {
    return handleError(e);
  }
}
