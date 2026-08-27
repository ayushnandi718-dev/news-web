import webPush from "web-push";
import { db } from "./db";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@dooarskhabar.com";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  vapidConfigured = true;
  return true;
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function subscribePush(
  endpoint: string,
  p256dh: string,
  auth: string,
  tags: string[] = [],
  userAgent?: string
): Promise<{ id: string }> {
  return db.pushSubscription.upsert({
    where: { endpoint },
    update: { p256dh, auth, tags, userAgent },
    create: { endpoint, p256dh, auth, tags, userAgent },
  });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await db.pushSubscription.deleteMany({ where: { endpoint } });
}

export async function sendPushNotification(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!ensureVapid()) return { sent: 0, failed: 0 };

  const subscriptions = await db.pushSubscription.findMany();
  let sent = 0;
  let failed = 0;

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    tag: payload.tag || "dooars-news",
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message
        );
        return "ok";
      } catch (err: unknown) {
        // 404 = subscription expired, 410 = gone
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await db.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } });
        }
        throw err;
      }
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled") sent++;
    else failed++;
  }

  return { sent, failed };
}

export async function getVapidPublicKey(): Promise<string | null> {
  return VAPID_PUBLIC || null;
}

export async function getSubscriptionCount(): Promise<number> {
  return db.pushSubscription.count();
}
