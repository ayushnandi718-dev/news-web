import { getBreaking } from "@/lib/feeds";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=5, stale-while-revalidate=10";

export async function GET() {
  try {
    const items = await getBreaking();
    return ok({ items, server_time: new Date().toISOString() }, { headers: { "Cache-Control": CACHE } });
  } catch (err) {
    return handleError(err);
  }
}
