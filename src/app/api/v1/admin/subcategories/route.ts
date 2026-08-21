import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { subcategorySchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePerm("dashboard.view");
    const sp = req.nextUrl.searchParams;
    const categoryId = sp.get("categoryId") ?? undefined;

    const where: Record<string, unknown> = {};
    if (categoryId) where.categoryId = categoryId;

    const subcategories = await db.subcategory.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, slug: true }
        },
        _count: {
          select: { articles: true }
        }
      },
      orderBy: [
        { priority: "desc" },
        { name: "asc" }
      ]
    });

    return ok({ items: subcategories });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("subcategory.create");
    const body = subcategorySchema.parse(await req.json());

    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: body.categoryId }
    });
    if (!category) {
      return handleError(new Error("Category not found"));
    }

    // Check for duplicate slug
    const slug = body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const existing = await db.subcategory.findUnique({
      where: { slug }
    });
    if (existing) {
      return handleError(new Error("Subcategory with this slug already exists"));
    }

    const subcategory = await db.subcategory.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        priority: body.priority,
        categoryId: body.categoryId,
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
      action: "subcategory.create",
      targetType: "subcategory",
      targetId: subcategory.id,
      meta: { name: subcategory.name, category: category.name }
    });

    invalidateTags(["subcategories", "categories", "admin_stats"]);

    return ok({ subcategory }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}