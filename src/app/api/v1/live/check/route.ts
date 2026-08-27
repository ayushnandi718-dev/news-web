import { db } from "@/lib/db";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Public: quick check if any live stream is currently active. */
export async function GET() {
  try {
    const count = await db.liveStream.count({ where: { isActive: true } });
    return ok({ hasActive: count > 0, count });
  } catch (err) {
    return handleError(err);
  }
}
