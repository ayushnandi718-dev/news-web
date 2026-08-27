import { NextRequest } from "next/server";
import { ok, apiError, handleError } from "@/lib/api";
import { unsubscribePush } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return apiError("Missing endpoint", 422);
    await unsubscribePush(endpoint);
    return ok({ removed: true });
  } catch (err) {
    return handleError(err);
  }
}
