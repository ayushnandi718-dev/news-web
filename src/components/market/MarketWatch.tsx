"use client";

import { useEffect, useRef, useState } from "react";
import type { MarketSnapshot } from "@/lib/market/types";

const POLL_MS = 2 * 60 * 1000;

function fmtPrice(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(new Date(iso));
}

function ageMinutes(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
}

function Delta({ q }: { q: MarketSnapshot["items"][number] }) {
  const up = q.change > 0;
  const down = q.change < 0;
  const cls = up ? "text-emerald-600" : down ? "text-red-600" : "text-slate-500";
  const arrow = up ? "▲" : down ? "▼" : "—";
  return (
    <span className={`inline-flex items-baseline gap-1.5 text-right font-bold tabular-nums ${cls}`}>
      <span className="text-[11px]" aria-hidden="true">{arrow}</span>
      <span>
        {up ? "+" : ""}
        {q.changePercent.toFixed(2)}%
      </span>
      <span className="sr-only">
        {q.name} {up ? "up" : down ? "down" : "unchanged"} {Math.abs(q.changePercent).toFixed(2)} percent
      </span>
    </span>
  );
}

function useMarket(initial: MarketSnapshot) {
  const [snap, setSnap] = useState<MarketSnapshot>(initial);
  const [refreshError, setRefreshError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/v1/market", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && json.ok) {
          setSnap(json.data as MarketSnapshot);
          setRefreshError(!!json.data.error && !!json.data.stale);
        }
      } catch {
        if (!cancelled) setRefreshError(true);
      }
    }
    const iv = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  return { snap, refreshError };
}

function QuoteRow({ q, compact = false }: { q: MarketSnapshot["items"][number]; compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex shrink-0 items-baseline gap-1.5 whitespace-nowrap px-3 text-xs">
        <span className="font-bold text-slate-700">{q.name}</span>
        <span className="font-semibold tabular-nums text-slate-900">{fmtPrice(q.price)}</span>
        <Delta q={q} />
      </span>
    );
  }
  return (
    <li className="flex items-center justify-between gap-2 border-b border-slate-100 py-2 last:border-0">
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-wide text-slate-700">{q.name}</p>
        <p className="text-[15px] font-bold tabular-nums leading-tight text-slate-900">{fmtPrice(q.price)}</p>
      </div>
      <Delta q={q} />
    </li>
  );
}

export default function MarketWatch({ initial }: { initial: MarketSnapshot }) {
  const { snap, refreshError } = useMarket(initial);
  const hasData = snap.items.length > 0;
  const mins = snap.updatedAt ? ageMinutes(snap.updatedAt) : null;
  const isLive = !snap.stale && mins !== null && mins < 3;

  return (
    <>
      {/* Desktop card */}
      <aside
        aria-label="Market watch"
        className="hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:block"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-[13px] font-black uppercase tracking-wider text-brand-ink">Market Watch</h2>
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              isLive ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-500"
            }`}
          >
            {isLive ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulseDot" aria-hidden="true" />
                Live
              </>
            ) : (
              "Delayed"
            )}
          </span>
        </div>

        {hasData ? (
          <>
            <ul>
              {snap.items.map((q) => (
                <QuoteRow key={q.symbol} q={q} />
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
              <p className="text-[10px] text-slate-400">
                {snap.error ? `Unable to refresh · updated ${fmtTime(snap.updatedAt)}` : `Updated ${fmtTime(snap.updatedAt)}`}
                {refreshError ? " (retrying)" : ""}
              </p>
              <p className="text-[10px] italic text-slate-400">May be delayed</p>
            </div>
          </>
        ) : (
          <p className="py-4 text-sm text-slate-500">
            {snap.error ?? "Market data unavailable."}
            <span className="mt-1 block text-xs text-slate-400">Will retry automatically.</span>
          </p>
        )}

        <p className="mt-2 text-[10px] leading-snug text-slate-400">
          Market data may be delayed. For informational purposes only.
        </p>
      </aside>

      {/* Mobile horizontal ticker */}
      <div aria-label="Market watch" className="border-y border-slate-200 bg-white lg:hidden">
        <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 pr-1 text-[10px] font-black uppercase tracking-wider text-slate-400">Market</span>
          {hasData ? (
            snap.items.map((q) => <QuoteRow key={q.symbol} q={q} compact />)
          ) : (
            <span className="px-2 text-xs text-slate-400">{snap.error ?? "Unavailable"}</span>
          )}
        </div>
      </div>
    </>
  );
}
