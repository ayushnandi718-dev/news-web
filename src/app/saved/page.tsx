"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";

function getBookmarks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("dk-bookmarks") || "[]");
  } catch {
    return [];
  }
}

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: { slug: string; name: string } | null;
  publishedAt: string | null;
}

export default function SavedPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const list = getBookmarks();
    setIds(list);
    if (list.length === 0) {
      setLoading(false);
      return;
    }
    fetch(`/api/v1/news/batch?ids=${list.join(",")}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setArticles(j.data?.items ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function remove(id: string) {
    const next = ids.filter((x) => x !== id);
    localStorage.setItem("dk-bookmarks", JSON.stringify(next));
    setIds(next);
    setArticles((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <main className="mx-auto max-w-[800px] px-4 py-8">
      <h1 className="text-2xl font-bold text-brand">সংরক্ষিত খবর</h1>
      <p className="mt-1 text-sm text-slate-500">আপনি যে খবরগুলো সংরক্ষণ করেছেন</p>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />)}
        </div>
      ) : ids.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-400">এখনও কোনো খবর সংরক্ষণ করা হয়নি।</p>
          <Link href="/" className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white">হোমে যান</Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {articles.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
              {a.featuredImage && <img src={a.featuredImage} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <Link href={`/news/${a.slug}`} className="text-sm font-bold text-brand-ink hover:text-brand">{a.title}</Link>
                {a.excerpt && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.excerpt}</p>}
              </div>
              <button onClick={() => remove(a.id)} className="shrink-0 rounded p-1 text-slate-400 hover:text-red-500" aria-label="সরান">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ))}
          {ids.length > articles.length && (
            <p className="text-xs text-slate-400">কিছু খবর লোড হয়নি।</p>
          )}
        </div>
      )}
    </main>
  );
}
