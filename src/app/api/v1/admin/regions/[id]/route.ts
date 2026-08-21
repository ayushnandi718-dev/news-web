import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { regionSchema } from "@/lib/validation";
import { requirePerm, canManageRegions } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requirePerm("dashboard.view");
    const region = await db.region.findUnique({
      where: { id: params.id },
      include: {
        parent: {
          select: { id: true, name: true, slug: true }
        },
        children: {
          select: { id: true, name: true, slug: true, type: true }
        },
        _count: {
          select: { articles: true }
        }
      }
    });

    if (!region) {
      return handleError(new Error("Region not found"), 404);
    }

    return ok({ region });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePerm("region.edit");
    const body = regionSchema.partial().parse(await req.json());

    const region = await db.region.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.parentId !== undefined && { parentId: body.parentId }),
        ...(body.district !== undefined && { district: body.district }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.priority !== undefined && { priority: body.priority }),
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "region.edit",
      targetType: "region",
      targetId: region.id,
      meta: { name: region.name }
    });

    invalidateTags(["regions", "admin_stats"]);

    return ok({ region });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePerm("region.delete");

    // Check if region has articles
    const articleCount = await db.article.count({
      where: { regionId: params.id }
    });

    if (articleCount > 0) {
      return handleError(new Error("Cannot delete region with associated articles"));
    }

    // Check if region has children
    const childCount = await db.region.count({
      where: { parentId: params.id }
    });

    if (childCount > 0) {
      return handleError(new Error("Cannot delete region with child regions"));
    }

    const region = await db.region.delete({
      where: { id: params.id }
    });

    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "region.delete",
      targetType: "region",
      targetId: region.id,
      meta: { name: region.name }
    });

    invalidateTags(["regions", "admin_stats"]);

    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}