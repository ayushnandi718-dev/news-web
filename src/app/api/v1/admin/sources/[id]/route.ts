import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sourceSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { runIngestionForSource } from "@/lib/ingestion/pipeline";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("source.manage");
    const { id } = await ctx.params;
    const body = sourceSchema.partial().parse(await req.json());
    const source = await db.source.update({ where: { id }, data: body });
    await audit({
      actorId: session.id, actorEmail: session.email,
      action: "source.update", targetType: "source", targetId: id,
      meta: { ...body },
    });
    return ok({ source });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requirePerm("source.view");
    const { id } = await ctx.params;
    const result = await runIngestionForSource(id);
    if (!result) return apiError("Source not found or inactive", 404);
    return ok({ result });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePerm("source.manage");
    const { id } = await ctx.params;
    const existing = await db.source.findUnique({ where: { id } });
    if (!existing) return apiError("Source not found", 404);
    await db.importedItem.deleteMany({ where: { sourceId: id, status: { in: ["REJECTED", "FAILED"] } } });
    await db.source.delete({ where: { id } });
    await audit({
      actorId: session.id, actorEmail: session.email,
      action: "source.delete", targetType: "source", targetId: id,
      meta: { name: existing.name },
    });
    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
