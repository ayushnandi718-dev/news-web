import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const DEDUPE_MINUTES = 30;

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug: rawSlug } = await ctx.params;
    const slug = decodeSlug(rawSlug);
    const article = await db.article.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!article || !PUBLIC_VISIBLE_STATUSES.includes(article.status as never)) {
      return ok({ counted: false });
    }

    let sessionId = req.cookies.get("nw_sid")?.value;
    const newSid = !sessionId;
    sessionId ??= crypto.randomUUID();

    const cutoff = new Date(Date.now() - DEDUPE_MINUTES * 60_000);
    const recent = await db.viewEvent.findFirst({
      where: { articleId: article.id, sessionId, createdAt: { gte: cutoff } },
      select: { id: true },
    });

    if (!recent) {
      await db.$transaction([
        db.viewEvent.create({ data: { articleId: article.id, sessionId } }),
        db.article.update({ where: { id: article.id }, data: { views: { increment: 1 } } }),
      ]);
    }

    const res = ok({ counted: !recent });
    if (newSid) {
      res.cookies.set("nw_sid", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 180 * 86400,
      });
    }
    return res;
  } catch (err) {
    return handleError(err);
  }
}
