import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_HOURS } from "./config";
import { can, type Permission, type Role } from "./permissions";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-me";
  return new TextEncoder().encode(secret.padEnd(32, "0"));
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.id || !payload.email || !payload.role) return null;
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: (payload.name as string) || "",
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const token = await createSessionToken(user);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.ALLOW_INSECURE_COOKIES !== "true",
    path: "/",
    maxAge: SESSION_TTL_HOURS * 3600,
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


