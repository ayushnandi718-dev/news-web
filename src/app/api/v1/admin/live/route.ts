import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { liveStreamCreateSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { invalidateTags } from "@/lib/cache";
import { detectPlatform, fetchLinkMeta, youtubeThumbnailUrl } from "@/lib/live";
import { publishEvent } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePerm("live.manage");
    const items = await db.liveStream.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return ok({ items });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("live.manage");
    const body = liveStreamCreateSchema.parse(await req.json());
    const platform = body.platform ?? detectPlatform(body.url);

    // Auto-fill banner/title from the link's OpenGraph tags when not provided.
    let bannerUrl = body.bannerUrl ?? null;
    let title = body.title;
    if (!bannerUrl) {
      const meta = await fetchLinkMeta(body.url);
      if (meta.bannerUrl) bannerUrl = meta.bannerUrl;
      if (!body.title.trim() && meta.title) title = meta.title;
    }
    // YouTube blocks server-side og fetches — derive thumbnail from the video id instead.
    if (!bannerUrl && platform === "YOUTUBE") bannerUrl = youtubeThumbnailUrl(body.url);

    const stream = await db.liveStream.create({
      data: {
        title,
        url: body.url,
        bannerUrl,
        platform,
        isActive: body.isActive ?? false,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "live.create",
      targetType: "live_stream",
      targetId: stream.id,
      meta: { title, platform },
    });
    invalidateTags(["live", "home"]);
    const activeCount = await db.liveStream.count({ where: { isActive: true } });
    publishEvent({ type: "live.updated", hasActive: activeCount > 0 });
    return ok({ stream }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
