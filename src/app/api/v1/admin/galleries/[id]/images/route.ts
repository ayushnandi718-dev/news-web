import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { galleryImageSchema } from "@/lib/validation";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("gallery.edit");
    const { id } = await params;
    const gallery = await db.gallery.findUnique({ where: { id } });
    if (!gallery) return NextResponse.json({ ok: false, error: "Gallery not found" }, { status: 404 });
    const body = galleryImageSchema.parse(await req.json());
    const maxSort = await db.galleryImage.findFirst({
      where: { galleryId: id },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const image = await db.galleryImage.create({
      data: {
        galleryId: id,
        url: body.url,
        thumbUrl: body.thumbUrl,
        alt: body.alt,
        caption: body.caption,
        credit: body.credit,
        width: body.width,
        height: body.height,
        size: body.size,
        mime: body.mime,
        sortOrder: body.sortOrder || (maxSort ? maxSort.sortOrder + 1 : 0),
      },
    });
    await db.gallery.update({ where: { id }, data: { photoCount: { increment: 1 } } });
    return ok(image);
  } catch (e) {
    return handleError(e);
  }
}

const deleteSchema = z.object({ imageId: z.string().min(1) });

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("gallery.edit");
    const { id } = await params;
    const { imageId } = deleteSchema.parse(await req.json());
    const image = await db.galleryImage.findFirst({ where: { id: imageId, galleryId: id } });
    if (!image) return NextResponse.json({ ok: false, error: "Image not found" }, { status: 404 });
    await db.galleryImage.delete({ where: { id: imageId } });
    await db.gallery.update({ where: { id }, data: { photoCount: { decrement: 1 } } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
