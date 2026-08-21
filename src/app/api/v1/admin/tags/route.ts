import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiSession, requirePerm } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { tagSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { slugify } from "@/lib/text";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePerm("dashboard.view");
    const tags = await db.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { articles: true } } },
    });
    return ok({ items: tags });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("tag.manage");
    const body = tagSchema.parse(await req.json());
    const tag = await db.tag.create({
      data: { name: body.name, slug: body.slug ?? slugify(body.name) },
    });
    await audit({ actorId: session.id, actorEmail: session.email, action: "tag.create", targetType: "tag", targetId: tag.id });
    return ok({ tag }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) return apiError("Tag already exists", 409);
    return handleError(err);
  }
}
