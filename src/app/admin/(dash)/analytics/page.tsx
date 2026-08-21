"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Analytics {
  viewsToday: number;
  viewsWeek: number;
  totals: { views: number; shares: number; comments: number };
  topStories: Array<{ title: string; slug?: string; category?: string; weekViews: number; lifetimeViews: number }>;
  topCategories: Array<{ name: string; slug?: string; articles: number; totalViews: number }>;
}

export default function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/v1/admin/analytics", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => (j.ok ? setData(j.data) : setErr(j.error || "Failed")))
      .catch(() => setErr("Network error"));
  }, []);

  if (err) return <p className="text-sm text-red-600">{err} (requires analytics.view permission)</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading analytics…</p>;

  return (
    <div className="space-y-8">
      <h1 className="section-title">Analytics</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card label="Views today" value={data.viewsToday.toLocaleString()} />
        <Card label="Views this week" value={data.viewsWeek.toLocaleString()} />
        <Card label="Lifetime views" value={data.totals.views.toLocaleString()} />
        <Card label="Shares" value={data.totals.shares.toLocaleString()} />
        <Card label="Comments" value={data.totals.comments.toLocaleString()} />
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="section-title">Top stories this week</h2>
          <ol className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            {data.topStories.map((s, i) => (
              <li key={i} className="flex items-start justify-between gap-3">
                <span>
                  {s.slug ? (
                    <Link href={`/news/${s.slug}`} className="font-semibold hover:text-brand">{s.title}</Link>
                  ) : (
                    s.title
                  )}
                  {s.category && <span className="ml-1 text-xs text-slate-400">· {s.category}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">{s.weekViews}</span>
              </li>
            ))}
            {data.topStories.length === 0 && <li className="text-slate-500">No view events yet.</li>}
          </ol>
        </div>
        <div>
          <h2 className="section-title">Top categories</h2>
          <ul className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
            {data.topCategories.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-3">
                <span>{c.name}</span>
                <span className="tabular-nums text-slate-500">{c.totalViews.toLocaleString()} views · {c.articles} stories</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
