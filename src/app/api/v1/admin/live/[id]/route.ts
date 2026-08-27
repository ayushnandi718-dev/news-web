import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { liveStreamUpdateSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError, handleError, ok } from "@/lib/api";
import { invalidateTags } from "@/lib/cache";
import { detectPlatform, fetchLinkMeta, youtubeThumbnailUrl } from "@/lib/live";
import { publishEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await requirePerm("live.manage");
    const { id } = await ctx.params;
    const existing = await db.liveStream.findUnique({ where: { id } });
    if (!existing) return apiError("Live stream not found", 404);
    const body = liveStreamUpdateSchema.parse(await req.json());

    let platform = body.platform;
    if (!platform && body.url && body.url !== existing.url) platform = detectPlatform(body.url);

    let bannerUrl = body.bannerUrl ?? undefined;
    // refetchMeta=true → re-pull og:image (e.g. stream thumbnail changed)
    if (body.refetchMeta) {
      const targetUrl = body.url ?? existing.url;
      const meta = await fetchLinkMeta(targetUrl);
      if (meta.bannerUrl) bannerUrl = meta.bannerUrl;
      const effPlatform = platform ?? detectPlatform(targetUrl);
      const ytThumb = effPlatform === "YOUTUBE" ? youtubeThumbnailUrl(targetUrl) : null;
      if (!bannerUrl && ytThumb) bannerUrl = ytThumb;
      if (meta.title && body.title === undefined) {
        await db.liveStream.update({ where: { id }, data: { title: meta.title } });
      }
    }

    const updated = await db.liveStream.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.url !== undefined ? { url: body.url } : {}),
        ...(bannerUrl !== undefined ? { bannerUrl: bannerUrl ?? null } : {}),
        ...(platform !== undefined ? { platform } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "live.update",
      targetType: "live_stream",
      targetId: id,
      meta: { ...body },
    });
    invalidateTags(["live", "home"]);
    const activeCount = await db.liveStream.count({ where: { isActive: true } });
    publishEvent({ type: "live.updated", hasActive: activeCount > 0 });
    return ok({ stream: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await requirePerm("live.manage");
    const { id } = await ctx.params;
    const existing = await db.liveStream.findUnique({ where: { id } });
    if (!existing) return apiError("Live stream not found", 404);
    await db.liveStream.delete({ where: { id } });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "live.delete",
      targetType: "live_stream",
      targetId: id,
      meta: { title: existing.title, platform: existing.platform },
    });
    invalidateTags(["live", "home"]);
    const activeCount = await db.liveStream.count({ where: { isActive: true } });
    publishEvent({ type: "live.updated", hasActive: activeCount > 0 });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
