import { ok, handleError } from "@/lib/api";
import { getVapidPublicKey } from "@/lib/push";

/**
 * Public push config — returns the VAPID *public* key (non-sensitive) so the
 * reader website can subscribe to push notifications. Does NOT require auth.
 */
export async function GET() {
  try {
    const vapidPublicKey = await getVapidPublicKey();
    return ok({ vapidPublicKey });
  } catch (err) {
    return handleError(err);
  }
}
