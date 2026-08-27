import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { saveUpload, isAllowedImage, MAX_UPLOAD_BYTES } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePerm("media.upload");
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q") ?? undefined;
    const media = await db.media.findMany({
      where: q ? { OR: [{ alt: { contains: q } }, { caption: { contains: q } }] } : {},
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return ok({ items: media });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("media.upload");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError("No file provided", 422);
    if (!isAllowedImage(file.type)) return apiError("Only JPEG, PNG, WebP, AVIF or GIF images are allowed", 415);
    if (file.size > MAX_UPLOAD_BYTES) return apiError("File too large (max 8 MB)", 413);

    const buffer = Buffer.from(await file.arrayBuffer());
    let saved: { url: string; filePath: string };
    try {
      saved = await saveUpload(buffer, file.type);
    } catch (e) {
      return apiError(e instanceof Error ? e.message : "File processing failed — not a valid image", 415);
    }
    const media = await db.media.create({
      data: {
        url: saved.url,
        provider: "local",
        mime: file.type,
        size: file.size,
        alt: (form.get("alt") as string) || null,
        caption: (form.get("caption") as string) || null,
        credit: (form.get("credit") as string) || null,
        uploadedById: session.id,
      },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "media.upload",
      targetType: "media",
      targetId: media.id,
      meta: { url: media.url },
    });
    return ok({ media }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
