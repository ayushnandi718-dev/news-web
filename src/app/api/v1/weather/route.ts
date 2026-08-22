import { NextResponse } from "next/server";
import { getAllDistrictsWeather, getDistrictWeather, weatherTtlSeconds } from "@/lib/weather";

export const dynamic = "force-dynamic";

const CACHE_CONTROL = () => {
  const ttl = weatherTtlSeconds();
  return `public, s-maxage=${ttl}, stale-while-revalidate=${Math.round(ttl / 2)}`;
};

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("district")?.trim().toLowerCase();

  if (!slug) {
    const districts = await getAllDistrictsWeather();
    return NextResponse.json(
      { ok: true, data: districts },
      { headers: { "Cache-Control": CACHE_CONTROL() } }
    );
  }

  const district = await getDistrictWeather(slug);
  if (!district.weather) {
    return NextResponse.json(
      { ok: false, data: district, error: district.error ?? "Weather unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { ok: true, data: district, error: district.error },
    { headers: { "Cache-Control": CACHE_CONTROL() } }
  );
}
