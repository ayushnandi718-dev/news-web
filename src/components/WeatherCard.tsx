"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { iconFor, type DistrictWeather } from "@/lib/weather";

function timeAgo(date: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

type WeatherResponse = {
  ok: boolean;
  data: DistrictWeather | null;
  error?: string | null;
};

export default function WeatherCard() {
  const [district, setDistrict] = useState<DistrictWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/weather?district=alipurduar", { cache: "no-store" });
      const json = (await res.json()) as WeatherResponse;
      if (!res.ok || !json.data?.weather) throw new Error(json.error ?? "Weather unavailable");
      setDistrict(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Weather unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 600_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const weather = district?.weather ?? null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Weather</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">{weather?.location ?? district?.district ?? "Alipurduar"}, West Bengal</p>
        </div>
        {district?.stale && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            Stale
          </span>
        )}
      </div>

      {loading && !weather ? (
        <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
      ) : weather ? (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tabular-nums text-slate-900 dark:text-white">
                {Math.round(weather.tempC)}
              </span>
              <span className="text-sm font-bold text-slate-500">°C</span>
            </div>
            <div className="text-right">
              <span className="text-2xl leading-none" aria-hidden>{iconFor(weather.iconCode)}</span>
              <p className="mt-1 text-[11px] font-semibold capitalize text-slate-600 dark:text-slate-400">
                {weather.conditionText || weather.conditionMain}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center dark:border-slate-800">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Feels</p>
              <p className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">{Math.round(weather.feelsLikeC)}°C</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Humidity</p>
              <p className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">{weather.humidityPct}%</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Wind</p>
              <p className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">{weather.windKmh} km/h</p>
            </div>
          </div>
        </>
      ) : (
        <p className="py-4 text-xs text-slate-500">Weather is temporarily unavailable.</p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="text-[10px] text-slate-500">
          {error ? "Refresh failed · showing last data" : weather ? `Updated ${timeAgo(weather.updatedAt)}` : "Connecting…"}
        </p>
        <button type="button" onClick={load} className="text-[10px] font-bold text-brand hover:underline">
          Refresh
        </button>
      </div>
      <Link href="/weather" className="mt-2 block text-[10px] font-bold text-brand hover:underline">
        All West Bengal districts →
      </Link>
    </section>
  );
}
