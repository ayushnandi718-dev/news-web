"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const RECENTS_KEY = "dk_recent_searches";

function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, 8) : [];
  } catch {
    return [];
  }
}

/** Shows recent searches; optionally saves a query first (after a search). */
export function RecentSearches({ saveQuery }: { saveQuery?: string }) {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    if (saveQuery) {
      const next = [saveQuery, ...readRecents().filter((r) => r !== saveQuery)].slice(0, 8);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    }
    setRecents(readRecents());
  }, [saveQuery]);

  if (recents.length === 0) return null;

  return (
    <section aria-label="সাম্প্রতিক অনুসন্ধান">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">সাম্প্রতিক খোঁজ</h2>
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(RECENTS_KEY);
            setRecents([]);
          }}
          className="text-[11px] font-semibold text-slate-400 hover:text-brand"
        >
          মুছে ফেলুন
        </button>
      </div>
      <ul className="flex flex-wrap gap-2">
        {recents.map((r) => (
          <li key={r}>
            <Link
              href={`/search?q=${encodeURIComponent(r)}`}
              className="flex min-h-[36px] items-center rounded-full border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 transition hover:border-brand hover:text-brand"
            >
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="mr-1.5 text-slate-400" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {r}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrendingTopics({ topics }: { topics: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {topics.map((t) => (
        <li key={t}>
          <Link
            href={`/search?q=${encodeURIComponent(t)}`}
            className="flex min-h-[36px] items-center rounded-full bg-white px-3 text-[13px] font-semibold text-brand shadow-sm ring-1 ring-slate-200 transition hover:ring-brand"
          >
            {t}
          </Link>
        </li>
      ))}
    </ul>
  );
}
