import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { clearSessionCookie, getSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { handleError, ok, apiError } from "@/lib/api";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return apiError("Invalid email or password", 401);
    }
    const session = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as import("@/lib/permissions").Role,
    };
    await setSessionCookie(session);
    await audit({ actorId: user.id, actorEmail: user.email, action: "auth.login" });
    return ok({ user: session });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE() {
  const session = await getSession();
  if (session) await audit({ actorId: session.id, actorEmail: session.email, action: "auth.logout" });
  await clearSessionCookie();
  return ok({ loggedOut: true });
}

export async function GET() {
  const session = await getSession();
  return ok({ user: session });
}
