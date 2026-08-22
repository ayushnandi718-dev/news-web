import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { regionSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok } from "@/lib/api";
import { slugify } from "@/lib/text";
import { invalidateTags } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requirePerm("dashboard.view");
    const sp = req.nextUrl.searchParams;
    const type = sp.get("type") ?? undefined;
    const parentId = sp.get("parentId") ?? undefined;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (parentId) where.parentId = parentId;

    const regions = await db.region.findMany({
      where,
      include: {
        parent: {
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

    return ok({ items: regions });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("region.create");
    const body = regionSchema.parse(await req.json());

    const slug = body.slug || slugify(body.name) || `region-${Date.now()}`;

    // Check for duplicate slug
    const existing = await db.region.findUnique({
      where: { slug }
    });
    if (existing) {
      return handleError(new Error("Region with this slug already exists"));
    }

    const region = await db.region.create({
      data: {
        name: body.name,
        slug,
        type: body.type,
        parentId: body.parentId,
        district: body.district,
        state: body.state,
        country: body.country,
        priority: body.priority,
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
      action: "region.create",
      targetType: "region",
      targetId: region.id,
      meta: { name: region.name, type: region.type }
    });

    invalidateTags(["regions", "admin_stats"]);

    return ok({ region }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}