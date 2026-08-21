import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { subcategorySchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
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
    const subcategory = await db.subcategory.findUnique({
      where: { id: params.id },
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        },
        _count: {
          select: { articles: true }
        }
      }
    });

    if (!subcategory) {
      return handleError(new Error("Subcategory not found"), 404);
    }

    return ok({ subcategory });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePerm("subcategory.edit");
    const body = subcategorySchema.partial().parse(await req.json());

    const subcategory = await db.subcategory.update({
      where: { id: params.id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.slug !== undefined && { slug: body.slug }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.categoryId !== undefined && { categoryId: body.categoryId }),
      },
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        }
      }
    });

    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "subcategory.edit",
      targetType: "subcategory",
      targetId: subcategory.id,
      meta: { name: subcategory.name }
    });

    invalidateTags(["subcategories", "categories", "admin_stats"]);

    return ok({ subcategory });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requirePerm("subcategory.delete");

    // Check if subcategory has articles
    const articleCount = await db.article.count({
      where: { subcategoryId: params.id }
    });

    if (articleCount > 0) {
      return handleError(new Error("Cannot delete subcategory with associated articles"));
    }

    const subcategory = await db.subcategory.delete({
      where: { id: params.id }
    });

    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "subcategory.delete",
      targetType: "subcategory",
      targetId: subcategory.id,
      meta: { name: subcategory.name }
    });

    invalidateTags(["subcategories", "categories", "admin_stats"]);

    return ok({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}