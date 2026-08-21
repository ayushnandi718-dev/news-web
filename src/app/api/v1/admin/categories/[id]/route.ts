import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("category.manage");
    const { id } = await ctx.params;
    const body = categorySchema.partial().parse(await req.json());
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.slug !== undefined) data.slug = body.slug;
    if (body.description !== undefined) data.description = body.description;
    if (body.priority !== undefined) data.priority = body.priority;
    if (body.freshnessOverrides !== undefined) data.freshnessOverrides = body.freshnessOverrides;
    const category = await db.category.update({ where: { id }, data });
    invalidateTags(["home", "latest"]);
    await audit({ actorId: session.id, actorEmail: session.email, action: "category.update", targetType: "category", targetId: id, meta: { ...body } });
    return ok({ category });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("category.manage");
    const { id } = await ctx.params;
    const count = await db.article.count({ where: { categoryId: id } });
    if (count > 0) return apiError(`Category has ${count} articles. Move them first.`, 409);
    await db.category.delete({ where: { id } });
    await audit({ actorId: session.id, actorEmail: session.email, action: "category.delete", targetType: "category", targetId: id });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
