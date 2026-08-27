import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requirePerm("inbox.review");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where = status && status !== "ALL" ? { status } : {};
  const items = await db.newsTip.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ ok: true, data: items });
}
