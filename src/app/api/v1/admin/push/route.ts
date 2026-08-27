import { NextRequest } from "next/server";
import { ok, apiError, handleError } from "@/lib/api";
import { requirePerm } from "@/lib/auth";
import { sendPushNotification, getSubscriptionCount, getVapidPublicKey } from "@/lib/push";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requirePerm("dashboard.view");
    const count = await getSubscriptionCount();
    const vapidKey = await getVapidPublicKey();
    return ok({ subscriptionCount: count, vapidPublicKey: vapidKey });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm("article.publish");
    const body = await req.json();
    const { title, body: pushBody, url, tag } = body;

    if (!title || !pushBody) {
      return apiError("title and body are required", 422);
    }

    const result = await sendPushNotification({
      title,
      body: pushBody,
      url: url || "/",
      tag: tag || "manual-push",
    });

    await audit({
      actorId: session.id,
      actorEmail: session.email,
      action: "push.send",
      targetType: "push",
      targetId: tag || "manual",
      meta: { title, sent: result.sent, failed: result.failed },
    });

    return ok(result);
  } catch (err) {
    return handleError(err);
  }
}
