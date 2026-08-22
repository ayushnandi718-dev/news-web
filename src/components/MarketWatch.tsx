"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketResponse } from "@/lib/market/types";

function formatPrice(value: number, symbol: string) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: symbol === "USDINR" ? 2 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function timeAgo(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

export default function MarketWatch() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/market/quotes", { cache: "no-store" });
      if (!response.ok) throw new Error("market unavailable");
      setData(await response.json());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 120_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Market Watch</h2>
          <p className="mt-0.5 text-[10px] text-slate-500">Indian market snapshot</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
          <span className={`h-1.5 w-1.5 rounded-full ${data?.marketStatus === "OPEN" ? "bg-emerald-500" : "bg-slate-400"}`} />
          {data?.marketStatus === "OPEN" ? "Open" : "Closed"}
        </span>
      </div>

      <div className="space-y-1">
        {loading && !data ? (
          [1, 2, 3, 4].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />)
        ) : data?.quotes.length ? (
          data.quotes.map((quote) => {
            const positive = quote.changePercent >= 0;
            return (
              <div key={quote.symbol} className="flex items-center justify-between rounded-xl px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{quote.name}</p>
                  <p className="text-[10px] text-slate-500">{quote.symbol === "USDINR" ? "Forex" : "Index"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black tabular-nums text-slate-900 dark:text-white">{quote.symbol === "USDINR" ? "₹" : ""}{formatPrice(quote.price, quote.symbol)}</p>
                  <p className={`text-[10px] font-bold tabular-nums ${positive ? "text-emerald-600" : "text-red-600"}`}>
                    {positive ? "▲" : "▼"} {positive ? "+" : ""}{quote.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-4 text-xs text-slate-500">Market data is temporarily unavailable.</p>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="text-[10px] text-slate-500">
          {error ? "Refresh failed · showing last data" : data ? `Updated ${timeAgo(data.updatedAt)}` : "Connecting…"}
        </p>
        <button type="button" onClick={load} className="text-[10px] font-bold text-brand hover:underline">Refresh</button>
      </div>
      <p className="mt-2 text-[9px] leading-3 text-slate-400">Market data may be delayed. For informational use only.</p>
    </section>
  );
}
