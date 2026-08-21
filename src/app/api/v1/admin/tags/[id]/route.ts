import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { tagSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("tag.manage");
    const { id } = await ctx.params;
    const body = tagSchema.partial().parse(await req.json());
    const tag = await db.tag.update({ where: { id }, data: body });
    await audit({ actorId: session.id, actorEmail: session.email, action: "tag.update", targetType: "tag", targetId: id });
    return ok({ tag });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("tag.manage");
    const { id } = await ctx.params;
    await db.tag.delete({ where: { id } });
    await audit({ actorId: session.id, actorEmail: session.email, action: "tag.delete", targetType: "tag", targetId: id });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
