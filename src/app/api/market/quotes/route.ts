import { NextResponse } from "next/server";
import { getMarketQuotes } from "@/lib/market/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMarketQuotes();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Market quotes error:", error);
    return NextResponse.json(
      { error: "Market data temporarily unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
