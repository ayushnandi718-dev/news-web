import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashToken, randomToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { passwordResetRequestSchema } from "@/lib/validation";
import { brandedEmail, sendMailOrLog } from "@/lib/mailer";
import { siteUrl } from "@/lib/brand";
import { PASSWORD_RESET_TTL_MINUTES } from "@/lib/config";

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

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`pwreset:${ip}`, 3, 15 * 60_000)) {
      return apiError("Too many requests. Try again later.", 429);
    }
    const body = passwordResetRequestSchema.parse(await req.json());
    const email = body.email.toLowerCase();

    // Always answer identically — never reveal whether the account exists.
    const generic = { requested: true };

    const user = await db.user.findUnique({ where: { email }, select: { id: true, active: true } });
    if (!user || !user.active) {
      await audit({
        actorEmail: email,
        action: "auth.password_reset_requested",
        targetType: "session",
        meta: { ip, matched: false },
      });
      return ok(generic);
    }

    const rawToken = randomToken(32);
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
      },
    });

    const url = `${siteUrl()}/admin/reset-password?token=${rawToken}`;
    await sendMailOrLog(
      email,
      "Password reset link",
      brandedEmail(
        "Password reset",
        `<p>Someone requested a password reset for your newsroom account.</p><p>This link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes and can be used once.</p><p>If you did not request this, ignore this email.</p>`,
        "Reset password",
        url
      ),
      { label: "[mailer] password-reset link", url }
    );

    await audit({
      actorId: user.id,
      actorEmail: email,
      action: "auth.password_reset_requested",
      targetType: "session",
      meta: { ip, matched: true },
    });
    return ok(generic);
  } catch (err) {
    return handleError(err);
  }
}
