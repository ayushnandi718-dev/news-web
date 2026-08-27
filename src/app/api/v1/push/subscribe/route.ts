import { NextRequest } from "next/server";
import { ok, apiError, handleError } from "@/lib/api";
import { subscribePush } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, p256dh, auth, tags } = body;

    if (!endpoint || !p256dh || !auth) {
      return apiError("Missing required fields: endpoint, p256dh, auth", 422);
    }

    const sub = await subscribePush(endpoint, p256dh, auth, tags || [], req.headers.get("user-agent") || undefined);
    return ok({ id: sub.id });
  } catch (err) {
    return handleError(err);
  }
}
