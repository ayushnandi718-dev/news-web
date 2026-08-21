import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const ALLOWED = new Set(["twitter", "facebook", "whatsapp", "copy", "native"]);

export async function POST(req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { channel?: string };
    const channel = body.channel && ALLOWED.has(body.channel) ? body.channel : "native";
    const article = await db.article.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!article || !PUBLIC_VISIBLE_STATUSES.includes(article.status as never)) {
      return ok({ counted: false });
    }
    await db.$transaction([
      db.shareEvent.create({ data: { articleId: article.id, channel } }),
      db.article.update({ where: { id: article.id }, data: { shares: { increment: 1 } } }),
    ]);
    return ok({ counted: true });
  } catch (err) {
    return handleError(err);
  }
}
