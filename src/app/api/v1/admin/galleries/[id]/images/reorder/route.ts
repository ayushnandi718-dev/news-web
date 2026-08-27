import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("gallery.edit");
    const { id } = await params;
    const { orderedIds } = reorderSchema.parse(await req.json());
    const images = await db.galleryImage.findMany({ where: { galleryId: id }, select: { id: true } });
    const imageIds = new Set(images.map((i) => i.id));
    if (orderedIds.some((oid) => !imageIds.has(oid))) {
      return NextResponse.json({ ok: false, error: "Invalid image IDs — all must belong to this gallery" }, { status: 400 });
    }
    if (orderedIds.length !== images.length) {
      return NextResponse.json({ ok: false, error: "orderedIds length must match total images in gallery" }, { status: 400 });
    }
    await db.$transaction(
      orderedIds.map((imageId, i) =>
        db.galleryImage.update({ where: { id: imageId }, data: { sortOrder: i } })
      )
    );
    return ok({ ordered: true });
  } catch (e) {
    return handleError(e);
  }
}
