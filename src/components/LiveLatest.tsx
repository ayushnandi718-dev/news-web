"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import NewsCard from "./NewsCard";
import { useNewsEvents } from "@/hooks/useNewsEvents";
import type { ArticleDTO } from "@/lib/serialize";

const LATEST_URL = "/api/v1/news/latest?limit=26";
const MIN_REFRESH_MS = 30_000;

/**
 * "সর্বশেষ খবর" grid that updates itself: server pushes article.published
 * over SSE, we silently refetch the latest list. A slow poll keeps the
 * section fresh even if the SSE connection drops.
 */
export default function LiveLatest({ initial }: { initial: ArticleDTO[] }) {
  const [items, setItems] = useState<ArticleDTO[]>(initial);
  const [connected, setConnected] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownIds = useRef(new Set(initial.map((a) => a.id)));
  const lastRefresh = useRef(Date.now());

  const refresh = useCallback(async () => {
    if (Date.now() - lastRefresh.current < MIN_REFRESH_MS) return;
    lastRefresh.current = Date.now();
    try {
      const res = await fetch(LATEST_URL, { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) return;
      const freshItems: ArticleDTO[] = json.data.items;
      let added = 0;
      for (const a of freshItems) if (!knownIds.current.has(a.id)) added++;
      if (added > 0) {
        setNewCount((c) => c + added);
        knownIds.current = new Set(freshItems.map((a) => a.id));
      }
      setItems(freshItems.slice(8, 20));
    } catch {}
  }, []);

  const scheduleRefresh = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(refresh, 1500);
  }, [refresh]);

  const { connected: sseUp } = useNewsEvents((e) => {
    if (e.type === "article.published") scheduleRefresh();
  });

  useEffect(() => setConnected(sseUp), [sseUp]);

  useEffect(() => {
    if (newCount === 0) return;
    const t = setTimeout(() => setNewCount(0), 20_000);
    return () => clearTimeout(t);
  }, [newCount]);

  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 90_000);
    return () => {
      clearInterval(iv);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  return (
    <section aria-label="সর্বশেষ খবর" className="min-w-0">
      <div className="mb-3 flex items-end justify-between border-b-2 border-brand/90 pb-1">
        <h2 className="flex items-center gap-2 text-[19px] font-bold leading-none text-ink">
          <span className="mb-0.5 h-[18px] w-[3px] bg-brand" aria-hidden="true" />
          সর্বশেষ খবর
          {connected && (
            <span className="flex items-center gap-1 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-600" title="নতুন খবর স্বয়ংক্রিয়ভাবে আসে">
              <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-green-500" aria-hidden="true" />
              লাইভ
            </span>
          )}
        </h2>
        <a href="/news" className="pb-0.5 text-xs font-semibold text-slate-500 transition hover:text-brand">
          সব দেখুন <span aria-hidden="true">→</span>
        </a>
      </div>
      {newCount > 0 && (
        <p className="mb-2 text-xs font-semibold text-brand">আপডেট হয়েছে — {newCount} টি নতুন সংবাদ</p>
      )}
      {items.length > 0 ? (
        <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((a) => (
            <NewsCard key={a.id} a={a} variant="grid" />
          ))}
        </div>
      ) : (
        <p className="py-4 text-sm text-slate-500">এখনও কোনও সংবাদ প্রকাশিত হয়নি।</p>
      )}
    </section>
  );
}
