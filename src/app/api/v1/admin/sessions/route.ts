import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  getSession,
  requireApiSession,
  revokeAllUserSessions,
  revokeSessionById,
} from "@/lib/auth";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

/** List the current user's own sessions (newest first). */
export async function GET() {
  try {
    const session = await requireApiSession();
    const sessions = await db.adminSession.findMany({
      where: { userId: session.id },
      orderBy: [{ revokedAt: "asc" }, { createdAt: "desc" }],
      take: 30,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
    return ok({
      currentSid: session.sid ?? null,
      sessions: sessions.map((s) => ({ ...s, isCurrent: s.id === session.sid, isActive: !s.revokedAt && s.expiresAt > new Date() })),
    });
  } catch (err) {
    return handleError(err);
  }
}

const revokeSchema = z.object({
  scope: z.enum(["one", "others"]).default("one"),
  sessionId: z.string().min(1).optional(),
});

/** Revoke one of my sessions, or all my other devices. */
export async function POST(req: NextRequest) {
  try {
    const session = await requireApiSession();
    if (!session.sid) return apiError("Session context unavailable", 400);
    const body = revokeSchema.parse(await req.json().catch(() => ({})));

    if (body.scope === "others") {
      const count = await revokeAllUserSessions(session.id, session.sid);
      await audit({ actorId: session.id, actorEmail: session.email, action: "auth.sessions_revoked_others", targetType: "session", meta: { count } });
      return ok({ revoked: count });
    }

    if (!body.sessionId) return apiError("sessionId required", 422);
    // Ownership guard: may only revoke own sessions.
    const row = await db.adminSession.findUnique({ where: { id: body.sessionId }, select: { userId: true } });
    if (!row || row.userId !== session.id) return apiError("Session not found", 404);
    if (row.userId === session.id && body.sessionId === session.sid) {
      return apiError("Use logout for the current session", 422);
    }
    await revokeSessionById(body.sessionId);
    await audit({ actorId: session.id, actorEmail: session.email, action: "auth.session_revoked", targetType: "session", targetId: body.sessionId });
    return ok({ revoked: 1 });
  } catch (err) {
    return handleError(err);
  }
}
