"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketResponse } from "@/lib/market/types";

function timeAgo(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds} সেকেন্ড আগে`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} মিনিট আগে`;
  return `${Math.floor(minutes / 60)} ঘণ্টা আগে`;
}

const BN_NAMES: Record<string, string> = {
  NIFTY50: "নিফটি ৫০",
  SENSEX: "সেনসেক্স",
  BANKNIFTY: "ব্যাঙ্ক নিফটি",
  USDINR: "ডলার / টাকা",
};

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
    const timer = window.setInterval(load, 300_000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <section className="border border-slate-200/80 bg-white">
      <header className="flex items-center justify-between border-b border-slate-200/70 px-3 py-2">
        <h2 className="text-xs font-bold tracking-wide text-ink">মার্কেট ওয়াচ</h2>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              data?.marketStatus === "OPEN" ? "animate-pulseDot bg-emerald-500" : "bg-slate-400"
            }`}
          />
          {data?.marketStatus === "OPEN" ? "লাইভ" : "বন্ধ"}
        </span>
      </header>

      <div className="divide-y divide-slate-100 px-3">
        {loading && !data ? (
          [1, 2, 3, 4].map((item) => <div key={item} className="my-2 h-9 animate-pulse bg-slate-100" />)
        ) : data?.quotes.length ? (
          data.quotes.map((quote) => {
            const changePct = Number.isFinite(quote.changePercent) ? quote.changePercent : 0;
            const price = Number.isFinite(quote.price) ? quote.price : 0;
            const positive = changePct >= 0;
            return (
              <div key={quote.symbol} className="flex items-center justify-between py-2.5">
                <p className="text-xs font-bold text-ink">{BN_NAMES[quote.symbol] ?? quote.name}</p>
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-ink">
                    {quote.symbol === "USDINR" ? "₹" : ""}
                    {new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(price)}
                  </p>
                  <p
                    className={`text-[10px] font-bold tabular-nums ${
                      positive ? "text-emerald-600" : "text-brand"
                    }`}
                  >
                    {positive ? "▲" : "▼"} {positive ? "+" : ""}
                    {changePct.toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="py-4 text-xs text-slate-500">মার্কেটের তথ্য এই মুহূর্তে পাওয়া যাচ্ছে না।</p>
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200/70 px-3 py-2">
        <p className="text-[10px] text-slate-400">
          {error
            ? "আপডেট ব্যর্থ · শেষ তথ্য"
            : data
              ? `${timeAgo(data.updatedAt)} আপডেট${data.stale ? " · বিলম্বিত" : ""}`
              : "সংযোগ হচ্ছে…"}
        </p>
        <button type="button" onClick={load} className="text-[10px] font-bold text-brand hover:underline">
          রিফ্রেশ
        </button>
      </footer>
      <p className="border-t border-slate-200/70 px-3 py-1.5 text-[9px] leading-3 text-slate-400">
        মার্কেটের তথ্য বিলম্বিত হতে পারে। এটি শুধুমাত্র তথ্যসূত্র হিসেবে দেওয়া হল।
      </p>
    </section>
  );
}
