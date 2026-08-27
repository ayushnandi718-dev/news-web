import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function clientMeta(req: Request) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local",
    ua: req.headers.get("user-agent"),
  };
}

function createTOTP(email: string, secret?: string) {
  return new OTPAuth.TOTP({
    issuer: "Dooarser Khabar",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret ? OTPAuth.Secret.fromBase32(secret) : new OTPAuth.Secret({ size: 20 }),
  });
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: session.id } });
    if (!user) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    if (user.totpEnabled) {
      return NextResponse.json({ ok: true, data: { enabled: true } });
    }

    const totp = createTOTP(user.email);
    const uri = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(uri);

    await db.user.update({ where: { id: user.id }, data: { totpSecret: totp.secret.base32 } });

    return NextResponse.json({
      ok: true,
      data: { enabled: false, secret: totp.secret.base32, qr: qrDataUrl },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

const postSchema = z.object({
  action: z.enum(["verify", "disable"]),
  code: z.string().length(6),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { action, code } = postSchema.parse(await req.json());
    const user = await db.user.findUnique({ where: { id: session.id } });
    if (!user) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

    if (action === "verify") {
      if (!user.totpSecret) return NextResponse.json({ ok: false, error: "No secret" }, { status: 400 });
      const totp = createTOTP(user.email, user.totpSecret);
      const delta = totp.validate({ token: code, window: 2 });
      if (delta === null) return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 400 });

      await db.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
      await audit({ actorId: user.id, actorEmail: user.email, action: "auth.2fa_enabled", meta: { ip: clientMeta(req).ip } });
      return NextResponse.json({ ok: true, data: { enabled: true } });
    }

    if (action === "disable") {
      if (!user.totpSecret) return NextResponse.json({ ok: false, error: "Not enabled" }, { status: 400 });
      const totp = createTOTP(user.email, user.totpSecret);
      const delta = totp.validate({ token: code, window: 2 });
      if (delta === null) return NextResponse.json({ ok: false, error: "Invalid code" }, { status: 400 });

      await db.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
      await audit({ actorId: user.id, actorEmail: user.email, action: "auth.2fa_disabled", meta: { ip: clientMeta(req).ip } });
      return NextResponse.json({ ok: true, data: { enabled: false } });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof z.ZodError ? "Invalid input" : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
