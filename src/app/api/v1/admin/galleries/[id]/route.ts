import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { galleryUpdateSchema } from "@/lib/validation";
import { slugify } from "@/lib/text";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("gallery.create");
    const { id } = await params;
    const gallery = await db.gallery.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } });
    if (!gallery) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    return ok(gallery);
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("gallery.edit");
    const { id } = await params;
    const body = galleryUpdateSchema.parse(await req.json());
    const data: Record<string, unknown> = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.coverImage !== undefined) data.coverImage = body.coverImage;
    if (body.eventDate !== undefined) data.eventDate = body.eventDate;
    if (body.location !== undefined) data.location = body.location;
    if (body.status !== undefined) data.status = body.status;
    if (body.slug !== undefined) {
      const slug = slugify(body.slug);
      const existing = await db.gallery.findFirst({ where: { slug, NOT: { id } } });
      if (existing) return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
      data.slug = slug;
    }
    const gallery = await db.gallery.update({ where: { id }, data });
    return ok(gallery);
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("gallery.delete");
    const { id } = await params;
    await db.gallery.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
