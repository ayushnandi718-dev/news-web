import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireApiSession, requirePerm, hashPassword } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { userUpdateSchema } from "@/lib/validation";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireApiSession();
    if (!can(session.role, "user.manage")) return apiError("Missing permission: user.manage", 403);
    const { id } = await ctx.params;
    const body = userUpdateSchema.parse(await req.json());
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return apiError("User not found", 404);
    if (target.role === "OWNER" && body.role && body.role !== "OWNER") {
      const owners = await db.user.count({ where: { role: "OWNER", active: true } });
      if (owners <= 1) return apiError("Cannot demote the last owner", 409);
    }
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.role !== undefined) data.role = body.role;
    if (body.active !== undefined) data.active = body.active;
    if (body.password) data.passwordHash = await hashPassword(body.password);
    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    // Invalidate sessions on role change or deactivation
    if ((body.role && body.role !== target.role) || (body.active === false && target.active)) {
      await db.adminSession.deleteMany({ where: { userId: id } });
    }

    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "user.update",
      targetType: "user",
      targetId: id,
      meta: { role: body.role, active: body.active, passwordChanged: !!body.password },
    });
    return ok({ user });
  } catch (err) {
    return handleError(err);
  }
}
