"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { iconFor, type DistrictWeather } from "@/lib/weather";

function timeAgo(date: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds} সেকেন্ড আগে`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} মিনিট আগে`;
  return `${Math.floor(minutes / 60)} ঘণ্টা আগে`;
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
      if (!res.ok || !json.data?.weather) throw new Error(json.error ?? "আবহাওয়া অনুপলব্ধ");
      setDistrict(json.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "আবহাওয়া অনুপলব্ধ");
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
    <section className="border border-slate-200/80 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200/70 px-3 py-2">
        <h2 className="text-xs font-bold tracking-wide text-ink">আবহাওয়া</h2>
        {weather && district?.stale && (
          <span className="bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">পুরোনো</span>
        )}
      </header>

      <div className="px-3 py-3">
        <p className="text-[11px] font-medium text-slate-500">আলিপুরদুয়ার, পশ্চিমবঙ্গ</p>

        {loading && !weather ? (
          <div className="mt-2 h-[76px] animate-pulse bg-slate-100" />
        ) : weather ? (
          <>
            <div className="mt-1 flex items-center justify-between">
              <div className="flex items-start">
                <span className="text-[42px] font-bold leading-none tabular-nums text-ink">
                  {Math.round(weather.tempC)}
                </span>
                <span className="mt-1 text-sm font-semibold text-slate-500">°C</span>
              </div>
              <div className="text-right">
                <span className="text-[26px] leading-none" aria-hidden>
                  {iconFor(weather.iconCode)}
                </span>
                <p className="mt-0.5 text-[11px] font-medium capitalize text-slate-600">
                  {weather.conditionText || weather.conditionMain}
                </p>
              </div>
            </div>

            <dl className="mt-3 grid grid-cols-3 gap-1 border-t border-slate-100 pt-2.5 text-center">
              <div>
                <dt className="text-[10px] text-slate-400">অনুভূত</dt>
                <dd className="text-xs font-bold tabular-nums text-slate-700">{Math.round(weather.feelsLikeC)}°C</dd>
              </div>
              <div>
                <dt className="text-[10px] text-slate-400">আর্দ্রতা</dt>
                <dd className="text-xs font-bold tabular-nums text-slate-700">{weather.humidityPct}%</dd>
              </div>
              <div>
                <dt className="text-[10px] text-slate-400">বাতাস</dt>
                <dd className="text-xs font-bold tabular-nums text-slate-700">{weather.windKmh} km/h</dd>
              </div>
            </dl>
          </>
        ) : (
          <p className="py-3 text-xs text-slate-500">আবহাওয়ার তথ্য এই মুহূর্তে পাওয়া যাচ্ছে না।</p>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200/70 px-3 py-2">
        <p className="text-[10px] text-slate-400">
          {error ? "আপডেট ব্যর্থ · শেষ তথ্য দেখানো হচ্ছে" : weather ? `${timeAgo(weather.updatedAt)} আপডেট` : "সংযোগ হচ্ছে…"}
        </p>
        <button type="button" onClick={load} className="text-[10px] font-bold text-brand hover:underline">
          রিফ্রেশ
        </button>
      </footer>
      <Link
        href="/weather"
        className="block border-t border-slate-200/70 px-3 py-1.5 text-center text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50 hover:text-brand"
      >
        সমস্ত পশ্চিমবঙ্গ জেলা →
      </Link>
    </section>
  );
}
