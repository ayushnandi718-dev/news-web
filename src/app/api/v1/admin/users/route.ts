import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePerm, hashPassword } from "@/lib/auth";
import { userCreateSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePerm("user.manage");
    const users = await db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        _count: { select: { articles: true } },
      },
    });
    return ok({ items: users });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("user.manage");
    const body = userCreateSchema.parse(await req.json());
    const exists = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (exists) return apiError("Email already registered", 409);
    const user = await db.user.create({
      data: {
        email: body.email.toLowerCase(),
        name: body.name,
        role: body.role,
        passwordHash: await hashPassword(body.password),
      },
      select: { id: true, email: true, name: true, role: true },
    });
    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "user.create",
      targetType: "user",
      targetId: user.id,
      meta: { role: body.role },
    });
    return ok({ user }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
