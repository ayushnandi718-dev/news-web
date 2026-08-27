import type { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  clearSessionCookie,
  getSession,
  issueSession,
  requireApiSession,
  revokeCurrentSession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/config";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { sanitizeNext } from "@/lib/safe-redirect";
import * as OTPAuth from "otpauth";

export const dynamic = "force-dynamic";

const buckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count++;
  return true;
}

const loginBodySchema = loginSchema.extend({
  rememberMe: z.boolean().optional(),
  next: z.string().max(200).optional(),
  totpCode: z.string().length(6).optional(),
  pendingToken: z.string().max(500).optional(),
});

function clientMeta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local",
    ua: req.headers.get("user-agent"),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { ip, ua } = clientMeta(req);
    if (!rateLimit(`login:${ip}`, 5, 15 * 60_000)) {
      return apiError("Too many login attempts. Try again later.", 429);
    }
    const body = loginBodySchema.parse(await req.json());
    const email = body.email.toLowerCase();

    // 2FA verification step
    if (body.pendingToken && body.totpCode) {
      try {
        const payload = JSON.parse(Buffer.from(body.pendingToken, "base64url").toString());
        if (payload.exp && payload.exp < Date.now()) {
          return apiError("Session expired. Please login again.", 401);
        }
        const user = await db.user.findUnique({ where: { id: payload.userId } });
        if (!user || !user.totpSecret) return apiError("Invalid request", 400);
        const totp = new OTPAuth.TOTP({ issuer: "Dooarser Khabar", label: user.email, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(user.totpSecret) });
        const delta = totp.validate({ token: body.totpCode, window: 2 });
        if (delta === null) {
          await audit({ actorId: user.id, actorEmail: user.email, action: "auth.login_failed", meta: { ip, reason: "bad_2fa" } });
          return apiError("Invalid 2FA code", 401);
        }
        const sessionUser = { id: user.id, email: user.email, name: user.name, role: user.role as import("@/lib/permissions").Role };
        const issued = await issueSession({ id: user.id }, { rememberMe: body.rememberMe, ipAddress: ip, userAgent: ua });
        await setSessionCookie(issued);
        await audit({ actorId: user.id, actorEmail: user.email, action: "auth.login", meta: { ip, method: "2fa" } });
        return ok({ user: sessionUser, redirect: sanitizeNext(body.next) });
      } catch {
        return apiError("Invalid 2FA request", 400);
      }
    }

    const user = await db.user.findUnique({ where: { email } });
    const passwordOk = user ? await verifyPassword(body.password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      await audit({
        actorEmail: email,
        action: "auth.login_failed",
        targetType: "session",
        meta: { ip, reason: "bad_credentials" },
      });
      return apiError("Invalid email or password", 401);
    }
    if (!user.active) {
      await audit({
        actorEmail: email,
        action: "auth.login_failed",
        targetType: "session",
        meta: { ip, reason: "account_disabled" },
      });
      return apiError("Invalid email or password", 401);
    }

    // If 2FA is enabled, return pending token instead of session
    if (user.totpEnabled && user.totpSecret) {
      const token = Buffer.from(JSON.stringify({ userId: user.id, exp: Date.now() + 5 * 60_000 })).toString("base64url");
      await audit({ actorId: user.id, actorEmail: user.email, action: "auth.2fa_required", meta: { ip } });
      return ok({ requires2FA: true, pendingToken: token, redirect: sanitizeNext(body.next) });
    }

    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as import("@/lib/permissions").Role,
    };
    const issued = await issueSession({ id: user.id }, { rememberMe: body.rememberMe, ipAddress: ip, userAgent: ua });
    await setSessionCookie(issued);
    await audit({ actorId: user.id, actorEmail: user.email, action: "auth.login", targetType: "session", meta: { ip } });

    return ok({ user: sessionUser, redirect: sanitizeNext(body.next) });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (session) {
      await audit({ actorId: session.id, actorEmail: session.email, action: "auth.logout" });
    }
    await revokeCurrentSession(req.cookies.get(SESSION_COOKIE)?.value);
    await clearSessionCookie();
    return ok({ loggedOut: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function GET() {
  try {
    const session = await requireApiSession();
    const permissions = (await import("@/lib/permissions")).permissionsOf(session.role);
    return ok({ user: { ...session, permissions } });
  } catch (err) {
    return handleError(err);
  }
}
