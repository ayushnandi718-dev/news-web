import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { galleryCreateSchema } from "@/lib/validation";
import { slugify } from "@/lib/text";
import { ok, handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await requirePerm("gallery.create");
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where = status && status !== "ALL" ? { status } : {};
    const items = await db.gallery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { images: { select: { id: true } } },
    });
    return ok(items);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requirePerm("gallery.create");
    const body = galleryCreateSchema.parse(await req.json());
    const slug = body.slug || slugify(body.title);
    const existing = await db.gallery.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ ok: false, error: "Slug already exists" }, { status: 409 });
    }
    const gallery = await db.gallery.create({
      data: {
        title: body.title,
        slug,
        description: body.description,
        coverImage: body.coverImage,
        eventDate: body.eventDate,
        location: body.location,
        status: body.status,
      },
    });
    return ok(gallery);
  } catch (e) {
    return handleError(e);
  }
}
