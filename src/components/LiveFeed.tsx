"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArticleCard } from "./ArticleCard";
import { useNewsEvents } from "@/hooks/useNewsEvents";
import type { ArticleDTO } from "@/lib/serialize";

export default function LiveFeed({
  initialItems,
  initialCursor,
  category,
}: {
  initialItems: ArticleDTO[];
  initialCursor: string | null;
  category?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, setPending] = useState<ArticleDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const seen = useRef(new Set(initialItems.map((a) => a.id)));

  const feedUrl = useCallback(
    (c: string | null) =>
      `/api/v1/news/latest?limit=20${category ? `&category=${category}` : ""}${c ? `&cursor=${encodeURIComponent(c)}` : ""}`,
    [category]
  );

  const { connected } = useNewsEvents((e) => {
    if (e.type !== "article.published") return;
    if (e.isBreaking) refreshBreaking();
    if (seen.current.has(e.id)) return;
    seen.current.add(e.id);
    setPending((p) => [
      {
        id: e.id,
        title: e.title,
        slug: e.slug,
        url: `/news/${e.slug}`,
        excerpt: "",
        image: null,
        category: null,
        subcategory: null,
        region: null,
        geographicScope: "LOCAL",
        authorName: null,
        status: "PUBLISHED",
        publishedAt: e.publishedAt,
        updatedAt: e.publishedAt,
        freshness: { key: "JUST_IN", label: "Just In", ageMinutes: 0, ageLabel: "just now" },
        isBreaking: e.isBreaking,
        breakingActive: e.isBreaking,
        breakingUntil: null,
        isFeatured: false,
        views: 0,
        shares: 0,
        commentsCount: 0,
        score: 100,
      },
      ...p,
    ]);
  });

  async function refreshBreaking() {
    try {
      await fetch("/api/v1/news/breaking", { cache: "no-store" });
    } catch {}
  }

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(feedUrl(cursor), { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        for (const a of json.data.items) seen.current.add(a.id);
        setItems((prev) => [...prev, ...json.data.items]);
        setCursor(json.data.next_cursor);
      }
    } catch {}
    setLoading(false);
  }

  function showPending() {
    setItems((prev) => [...pending, ...prev]);
    setPending([]);
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-1 mb-2 px-1">
        {pending.length > 0 && (
          <button
            onClick={showPending}
            className="mx-auto flex items-center gap-3 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-dark"
          >
            <span className={`h-2 w-2 rounded-full bg-white ${connected ? "animate-pulseDot" : ""}`} />
            {pending.length} new {pending.length === 1 ? "story" : "stories"} available
            <span className="underline">View latest</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {items.map((a) => (
          <ArticleCard key={a.id} a={a} />
        ))}
      </div>

      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">No fresh stories right now. Check the archive for older coverage.</p>
      )}

      {cursor && (
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
