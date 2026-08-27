import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireApiSession, revokeAllUserSessions, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const changeSchema = z.object({
  currentPassword: z.string().min(6).max(128),
  newPassword: z.string().min(8).max(128),
});

/**
 * Change my own password. The current session stays alive; every OTHER
 * active session of this user is revoked.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession();
    const body = changeSchema.parse(await req.json());

    if (body.newPassword === body.currentPassword) {
      return apiError("New password must be different from the current one", 422);
    }

    const user = await db.user.findUnique({
      where: { id: session.id },
      select: { passwordHash: true, email: true },
    });
    if (!user) return apiError("Account not found", 404);

    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      await audit({ actorId: session.id, actorEmail: session.email, action: "auth.password_change_failed" });
      return apiError("Current password is incorrect", 401);
    }

    await db.$transaction([
      db.user.update({ where: { id: session.id }, data: { passwordHash: await hashPassword(body.newPassword) } }),
      // keep current session alive — revoke everything else
    ]);
    const revoked = await revokeAllUserSessions(session.id, session.sid ?? undefined);

    await audit({ actorId: session.id, actorEmail: user.email, action: "auth.password_changed", meta: { revokedOthers: revoked } });
    return ok({ changed: true, revokedOthers: revoked });
  } catch (err) {
    return handleError(err);
  }
}
