import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requirePerm("inbox.review");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where = status && status !== "ALL" ? { status } : {};
  const items = await db.obituary.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ ok: true, data: items });
}

const patchSchema = z.object({ action: z.enum(["approve", "reject"]) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requirePerm("inbox.review");
  const { id } = await params;
  const { action } = patchSchema.parse(await req.json());
  const status = action === "approve" ? "PUBLISHED" : "REJECTED";
  const data: Record<string, unknown> = { status };
  if (action === "approve") data.publishedAt = new Date();
  const item = await db.obituary.update({ where: { id }, data });
  return NextResponse.json({ ok: true, data: item });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePerm("inbox.review");
  const { id } = await params;
  await db.obituary.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
