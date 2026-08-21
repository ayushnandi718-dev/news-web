import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sourceSchema } from "@/lib/validation";
import { requirePerm } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePerm("source.view");
    const sources = await db.source.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { items: true } } },
    });
    return ok({ items: sources });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("source.manage");
    const body = sourceSchema.parse(await req.json());
    const source = await db.source.create({ data: body });
    await audit({
      actorId: session.id, actorEmail: session.email,
      action: "source.create", targetType: "source", targetId: source.id,
      meta: { name: source.name, url: source.url },
    });
    return ok({ source }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
