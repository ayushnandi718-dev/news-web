"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface HistoryItem {
  slug: string;
  title: string;
  category?: string;
  image?: string;
  viewedAt: number;
}

const STORAGE_KEY = "dooarser_reading_history";
const MAX_ITEMS = 8;

export function trackArticleView(slug: string, title: string, category?: string, image?: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: HistoryItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((h) => h.slug !== slug);
    filtered.unshift({ slug, title, category, image, viewedAt: Date.now() });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_ITEMS)));
  } catch {}
}

export function getReadingHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function ContinueReading() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [currentSlug, setCurrentSlug] = useState("");

  useEffect(() => {
    setCurrentSlug(window.location.pathname.replace("/news/", ""));
    setItems(getReadingHistory());
  }, []);

  const filtered = items
    .filter((h) => h.slug !== currentSlug)
    .slice(0, 4);

  if (filtered.length === 0) return null;

  return (
    <section className="mt-8 border border-slate-200/80 bg-white p-4" aria-label="আপনি আগে পড়েছেন">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">আপনি আগে পড়েছেন</h3>
      <div className="space-y-3">
        {filtered.map((item) => (
          <Link
            key={item.slug}
            href={`/news/${item.slug}`}
            className="group flex gap-3"
          >
            {item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.image} alt="" className="h-14 w-20 shrink-0 rounded object-cover" />
            ) : (
              <span className="h-14 w-20 shrink-0 rounded bg-slate-100" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-brand-ink group-hover:text-brand line-clamp-2">
                {item.title}
              </p>
              {item.category && (
                <p className="mt-0.5 text-[11px] text-slate-500">{item.category}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
