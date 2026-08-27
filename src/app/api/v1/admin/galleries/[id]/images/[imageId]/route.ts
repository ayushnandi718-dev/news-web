import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  alt: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  credit: z.string().max(120).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  try {
    await requirePerm("gallery.edit");
    const { id, imageId } = await params;
    const image = await db.galleryImage.findFirst({ where: { id: imageId, galleryId: id } });
    if (!image) return NextResponse.json({ ok: false, error: "Image not found" }, { status: 404 });
    const body = patchSchema.parse(await req.json());
    const updated = await db.galleryImage.update({ where: { id: imageId }, data: body });
    return ok(updated);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  try {
    await requirePerm("gallery.edit");
    const { id, imageId } = await params;
    const image = await db.galleryImage.findFirst({ where: { id: imageId, galleryId: id } });
    if (!image) return NextResponse.json({ ok: false, error: "Image not found" }, { status: 404 });
    await db.galleryImage.delete({ where: { id: imageId } });
    await db.gallery.update({ where: { id }, data: { photoCount: { decrement: 1 } } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
