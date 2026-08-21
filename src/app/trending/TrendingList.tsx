"use client";

import { useState } from "react";
import { ArticleCard } from "@/components/ArticleCard";
import type { ArticleDTO } from "@/lib/serialize";

export default function TrendingList({
  initialItems,
  hasMore: initialHasMore,
}: {
  initialItems: ArticleDTO[];
  hasMore: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/news/trending?limit=20&page=${page + 1}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setItems((prev) => [...prev, ...json.data.items]);
        setHasMore(json.data.hasMore);
        setPage((p) => p + 1);
      }
    } catch {}
    setLoading(false);
  }

  return (
    <div>
      <div className="space-y-4">
        {items.map((a, i) => (
          <div key={a.id} className="flex gap-3">
            <span className="text-2xl font-black text-slate-300">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <ArticleCard a={a} />
            </div>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nothing trending right now.</p>}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
