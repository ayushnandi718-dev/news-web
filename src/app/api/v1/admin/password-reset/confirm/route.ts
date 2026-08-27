import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, hashToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { passwordResetConfirmSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = passwordResetConfirmSchema.parse(await req.json());

    const row = await db.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(body.token) },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
    if (!row || row.usedAt || row.expiresAt < new Date()) {
      return apiError("This reset link is invalid or has expired", 400);
    }

    const user = await db.user.findUnique({ where: { id: row.userId }, select: { active: true, email: true } });
    if (!user || !user.active) return apiError("This reset link is invalid or has expired", 400);

    await db.$transaction([
      db.user.update({ where: { id: row.userId }, data: { passwordHash: await hashPassword(body.password) } }),
      db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      db.adminSession.updateMany({ where: { userId: row.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    await audit({ actorId: row.userId, actorEmail: user.email, action: "auth.password_reset" });
    return ok({ reset: true });
  } catch (err) {
    return handleError(err);
  }
}
