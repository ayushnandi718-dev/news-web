import { getBreaking, getLatest } from "@/lib/feeds";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [breaking, latest] = await Promise.all([getBreaking(), getLatest({ limit: 10 })]);
    return ok({
      breaking,
      latest: latest.items,
      server_time: new Date().toISOString(),
    });
  } catch (err) {
    return handleError(err);
  }
}
