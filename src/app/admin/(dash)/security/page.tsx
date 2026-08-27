import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import SecurityClient from "./security-client";

export const dynamic = "force-dynamic";

function deviceLabel(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/curl|wget|postman/i.test(ua)) return "API client";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser} · ${os}`.replace(/ ·$/, "");
}

export default async function SecurityPage() {
  const me = await getCurrentUser();
  if (!me || !me.sid) return null;

  const [sessions, activity] = await Promise.all([
    db.adminSession.findMany({
      where: { userId: me.id },
      orderBy: [{ createdAt: "desc" }],
      take: 30,
      select: {
        id: true, ipAddress: true, userAgent: true,
        createdAt: true, lastUsedAt: true, expiresAt: true, revokedAt: true,
      },
    }),
    db.auditLog.findMany({
      where: { actorId: me.id, action: { in: ["auth.login", "auth.login_failed", "auth.logout", "auth.password_changed"] } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, createdAt: true, meta: true },
    }),
  ]);

  return (
    <SecurityClient
      currentSid={me.sid}
      sessions={sessions.map((s) => ({
        id: s.id,
        device: deviceLabel(s.userAgent),
        ip: s.ipAddress ?? "—",
        createdAt: s.createdAt.toISOString(),
        lastUsedAt: s.lastUsedAt?.toISOString() ?? null,
        expiresAt: s.expiresAt.toISOString(),
        revokedAt: s.revokedAt?.toISOString() ?? null,
        isCurrent: s.id === me.sid,
        isActive: !s.revokedAt && s.expiresAt > new Date(),
      }))}
      activity={activity.map((a) => ({
        id: a.id,
        action: a.action,
        at: a.createdAt.toISOString(),
        ok: a.action === "auth.login" || a.action === "auth.logout",
      }))}
    />
  );
}
