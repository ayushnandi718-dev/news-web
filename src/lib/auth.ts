import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { createHash } from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_HOURS, SESSION_REMEMBER_HOURS } from "./config";
import { can, permissionsOf, type Permission, type Role } from "./permissions";
import { db } from "./db";
import { sessionSecretKey } from "./session-secret";

/**
 * Session tokens are intentionally minimal: they identify a user and a
 * server-side session, nothing more. Role / name / permissions are resolved
 * from the database on every request so permission changes apply instantly.
 *
 *   payload = { sub: userId, sid: sessionId, iat, exp }
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** session row id (present once resolved from cookie) */
  sid?: string;
}

export interface SafeCurrentUser extends SessionUser {
  permissions: Permission[];
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Creates the DB-backed session and returns a minimal JWT bound to it. */
export async function issueSession(
  user: Pick<SessionUser, "id">,
  opts: { rememberMe?: boolean; userAgent?: string | null; ipAddress?: string | null } = {}
): Promise<{ token: string; ttlHours: number }> {
  const ttlHours = opts.rememberMe ? SESSION_REMEMBER_HOURS : SESSION_TTL_HOURS;

  const row = await db.adminSession.create({
    data: {
      userId: user.id,
      tokenHash: "pending-" + randomToken(8),
      userAgent: opts.userAgent?.slice(0, 255) ?? null,
      ipAddress: opts.ipAddress?.slice(0, 64) ?? null,
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + ttlHours * 3600_000),
    },
    select: { id: true },
  });

  const token = await new SignJWT({ sub: user.id, sid: row.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(sessionSecretKey());

  await db.adminSession.update({ where: { id: row.id }, data: { tokenHash: hashToken(token) } });
  return { token, ttlHours };
}

export async function revokeSessionById(sid: string): Promise<void> {
  await db.adminSession.updateMany({ where: { id: sid, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeCurrentSession(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, sessionSecretKey());
    const sid = typeof payload.sid === "string" ? payload.sid : "";
    if (!sid) return;
    await revokeSessionById(sid);
  } catch {
    /* already invalid */
  }
}

export async function revokeAllUserSessions(userId: string, exceptSid?: string): Promise<number> {
  const res = await db.adminSession.updateMany({
    where: { userId, revokedAt: null, ...(exceptSid ? { id: { not: exceptSid } } : {}) },
    data: { revokedAt: new Date() },
  });
  return res.count;
}

// --- throttled lastUsedAt touch (max one write per sid per minute) ----------
const touchMap = new Map<string, number>();
const TOUCH_INTERVAL_MS = 60_000;

function touchSession(sid: string): void {
  const now = Date.now();
  const last = touchMap.get(sid) ?? 0;
  if (now - last < TOUCH_INTERVAL_MS) return;
  touchMap.set(sid, now);
  // fire-and-forget; failure must never break request handling
  void db.adminSession
    .update({ where: { id: sid }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
    try {
        const { payload } = await jwtVerify(token, sessionSecretKey());
        const sid = typeof payload.sid === "string" ? payload.sid : "";
        const sub = typeof payload.sub === "string" ? payload.sub : "";
        if (!sid || !sub) return null;

        // session + user in ONE roundtrip (halves auth latency on remote DBs)
        const row = await db.adminSession.findUnique({
            where: { id: sid },
            select: {
                tokenHash: true,
                revokedAt: true,
                expiresAt: true,
                user: { select: { id: true, email: true, name: true, role: true, active: true } },
            },
        });
        if (!row || row.revokedAt || row.expiresAt < new Date()) return null;
        if (row.tokenHash !== hashToken(token)) return null; // exact-token binding
        const user = row.user;
        if (!user || !user.active) return null;

        touchSession(sid);

        return { id: user.id, email: user.email, name: user.name, role: user.role as Role, sid };
    } catch {
        return null;
    }
}

export async function setSessionCookie(issued: { token: string; ttlHours: number }): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, issued.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_COOKIES !== "true",
    path: "/",
    maxAge: issued.ttlHours * 3600,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireApiSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new AuthError("Authentication required", 401);
  return session;
}

export async function requireApiRole(...roles: string[]): Promise<SessionUser> {
  const session = await requireApiSession();
  if (!roles.includes(session.role)) throw new AuthError("Insufficient permissions", 403);
  return session;
}

export async function requirePerm(permission: Permission): Promise<SessionUser> {
  const session = await requireApiSession();
  if (!can(session.role, permission)) throw new AuthError(`Missing permission: ${permission}`, 403);
  return session;
}

// Spec-aligned aliases / helpers -------------------------------------------

export const requireAuth = requireApiSession;

export const requirePermission = requirePerm;

export function canAccessAdmin(session: Pick<SessionUser, "role"> | null): boolean {
  if (!session) return false;
  return can(session.role, "dashboard.view");
}

export async function getCurrentUser(): Promise<SafeCurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  return { ...session, permissions: permissionsOf(session.role) };
}
