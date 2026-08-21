import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiSession, requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { deleteUploadByUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("media.upload");
    const { id } = await ctx.params;
    const body = (await req.json()) as { alt?: string; caption?: string; credit?: string };
    const media = await db.media.update({
      where: { id },
      data: {
        alt: body.alt,
        caption: body.caption,
        credit: body.credit,
      },
    });
    return ok({ media });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession();
    if (!can(session.role, "media.delete")) return apiError("Missing permission: media.delete", 403);
    const { id } = await ctx.params;
    const media = await db.media.findUnique({ where: { id } });
    if (!media) return apiError("Media not found", 404);
    const inUse = await db.article.count({ where: { featuredImage: media.url } });
    if (inUse > 0) return apiError("Media is in use by articles", 409);
    await db.media.delete({ where: { id } });
    await deleteUploadByUrl(media.url);
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "media.delete",
      targetType: "media",
      targetId: id,
    });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
