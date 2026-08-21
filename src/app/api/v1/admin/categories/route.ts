import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { slugify } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePerm("dashboard.view");
    const categories = await db.category.findMany({
      orderBy: [{ priority: "desc" }, { name: "asc" }],
      include: { 
        parent: {
          select: { id: true, name: true, slug: true }
        },
        children: {
          select: { id: true, name: true, slug: true }
        },
        subcategories: {
          select: { id: true, name: true, slug: true }
        },
        _count: { select: { articles: true } } 
      },
    });
    return ok({ items: categories });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("category.create");
    const body = categorySchema.parse(await req.json());

    // Verify parent exists if specified
    if (body.parentId) {
      const parent = await db.category.findUnique({
        where: { id: body.parentId }
      });
      if (!parent) {
        return apiError("Parent category not found", 404);
      }
    }

    const category = await db.category.create({
      data: {
        name: body.name,
        slug: body.slug ?? slugify(body.name),
        description: body.description ?? null,
        priority: body.priority,
        type: body.type,
        parentId: body.parentId,
        freshnessOverrides: body.freshnessOverrides ?? undefined,
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
      action: "category.create", 
      targetType: "category", 
      targetId: category.id,
      meta: { 
        name: category.name,
        type: category.type,
        parent: category.parent?.name
      }
    });
    return ok({ category }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return apiError("Category slug already exists", 409);
    return handleError(err);
  }
}
