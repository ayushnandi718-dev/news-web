import { getBreaking } from "@/lib/feeds";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getBreaking();
    return ok({ items, server_time: new Date().toISOString() });
  } catch (err) {
    return handleError(err);
  }
}
