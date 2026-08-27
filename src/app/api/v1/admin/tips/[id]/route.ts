import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({ action: z.enum(["approve", "reject"]), adminNotes: z.string().max(500).optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePerm("inbox.review");
  const { id } = await params;
  const { action, adminNotes } = patchSchema.parse(await req.json());
  const status = action === "approve" ? "REVIEWED" : "REJECTED";
  const item = await db.newsTip.update({ where: { id }, data: { status, adminNotes } });
  return NextResponse.json({ ok: true, data: item });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requirePerm("inbox.review");
  const { id } = await params;
  await db.newsTip.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
