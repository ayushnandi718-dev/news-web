import Link from "next/link";
import { DIVISION_ORDER, WB_DISTRICTS, getAllDistrictsWeather, iconFor } from "@/lib/weather";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "West Bengal Weather — All Districts | NewsWeb",
  description: "Current weather for all 23 districts of West Bengal, grouped by division.",
};

function formatTimeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default async function WeatherPage() {
  const districts = await getAllDistrictsWeather();
  const bySlug = new Map(districts.map((d) => [d.slug, d]));
  const anyStale = districts.some((d) => d.stale && d.weather);
  const latest = districts.reduce<string | null>((acc, d) => {
    const updated = d.weather?.updatedAt;
    return updated && (!acc || updated > acc) ? updated : acc;
  }, null);
  const sourceMix = new Set(districts.flatMap((d) => (d.weather ? [d.weather.source] : [])));

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-brand-ink">West Bengal Weather</h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Current conditions across all {districts.length} districts · hourly updates
            {latest ? ` · refreshed ${formatTimeAgo(latest)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {anyStale && (
            <span className="rounded bg-amber-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Some readings stale
            </span>
          )}
          <Link href="/" className="text-xs font-bold text-brand hover:underline">
            ← Home
          </Link>
        </div>
      </div>

      {DIVISION_ORDER.map((division) => {
        const items = WB_DISTRICTS.filter((d) => d.division === division)
          .map((spec) => bySlug.get(spec.slug))
          .filter((d): d is NonNullable<typeof d> => Boolean(d));

        return (
          <section key={division} className="mb-8">
            <div className="mb-3 flex items-center gap-2 border-b-2 border-brand-ink/90 pb-1.5">
              <h2 className="text-sm font-black uppercase tracking-wide text-brand-ink">{division} Division</h2>
              <span className="text-[10px] font-bold text-slate-400">{items.length} districts</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {items.map((d) => (
                <article
                  key={d.slug}
                  className="flex min-h-[168px] flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand/60 dark:border-slate-800 dark:bg-slate-950"
                >
                  <header className="flex items-start justify-between gap-1">
                    <h3 className="text-base font-extrabold leading-tight text-slate-900 dark:text-white">{d.district}</h3>
                    {d.weather && d.stale && (
                      <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                        Stale
                      </span>
                    )}
                  </header>

                  {d.weather ? (
                    <>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                            {Math.round(d.weather.tempC)}
                          </span>
                          <span className="text-xs font-bold text-slate-500">°C</span>
                        </div>
                        <span className="text-2xl leading-none" aria-hidden>{iconFor(d.weather.iconCode)}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold capitalize text-slate-600 dark:text-slate-400">
                        {d.weather.conditionText || d.weather.conditionMain}
                      </p>

                      <div className="mt-auto grid grid-cols-3 gap-1 border-t border-slate-100 pt-2 text-center dark:border-slate-800">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Feels</p>
                          <p className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">{Math.round(d.weather.feelsLikeC)}°</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Humidity</p>
                          <p className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">{d.weather.humidityPct}%</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Wind</p>
                          <p className="text-xs font-bold tabular-nums text-slate-800 dark:text-slate-200">{d.weather.windKmh}</p>
                        </div>
                      </div>
                      <p className="mt-1.5 text-[9px] text-slate-400">
                        {formatTimeAgo(d.weather.updatedAt)} · via{" "}
                        {d.weather.source === "open-meteo" ? "Open-Meteo" : "OpenWeatherMap"}
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center py-4">
                      <p className="text-center text-xs font-medium text-slate-500">{d.error ?? "Unavailable"}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <p className="mt-2 text-[10px] text-slate-400">
        Weather data: OpenWeatherMap{sourceMix.has("open-meteo") ? " + Open-Meteo (automatic backup)" : ""}. Informational use only.
      </p>
    </main>
  );
}
