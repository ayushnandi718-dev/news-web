import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePerm("comment.moderate");
    const status = req.nextUrl.searchParams.get("status") ?? "PENDING";
    const comments = await db.comment.findMany({
      where: status !== "ALL" ? { status } : {},
      include: { article: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok({ items: comments });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePerm("comment.moderate");
    const body = (await req.json()) as { id?: string; status?: string };
    if (!body.id || !body.status || !["APPROVED", "REJECTED", "PENDING"].includes(body.status)) {
      return apiError("Invalid input", 422);
    }
    const comment = await db.comment.update({ where: { id: body.id }, data: { status: body.status } });
    if (body.status === "APPROVED" || body.status === "REJECTED") {
      const delta = body.status === "APPROVED" ? 1 : -1;
      await db.article.update({
        where: { id: comment.articleId },
        data: { commentsCount: { increment: delta } },
      });
    }
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: `comment.${body.status.toLowerCase()}`,
      targetType: "comment",
      targetId: comment.id,
    });
    return ok({ comment });
  } catch (err) {
    return handleError(err);
  }
}
