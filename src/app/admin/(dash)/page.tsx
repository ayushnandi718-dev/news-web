"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

interface Stats {
  totals: {
    published: number;
    inReview: number;
    drafts: number;
    pendingImports: number;
    duplicateCandidates: number;
    failedSources: number;
    activeBreaking: number;
    expiredBreaking: number;
    older: number;
    archived: number;
  };
  today: { publishedToday: number; importedToday: number };
  staleCategories: Array<{ slug: string; name: string; hoursSinceLast: number; lastAt: string | null }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, []);

  async function load() {
    try {
      const res = await fetch("/api/v1/admin/stats", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setStats(json.data);
      else setError(json.error || "Failed to load");
    } catch {
      setError("Network error");
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!stats) return <p className="text-sm text-slate-500">Loading dashboard…</p>;

  const t = stats.totals;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="section-title">Today</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Published today" value={stats.today.publishedToday} />
          <Stat label="Imported today" value={stats.today.importedToday} />
          <Stat label="In review" value={t.inReview} href="/admin/articles?status=IN_REVIEW" warn={t.inReview > 0} />
          <Stat label="Active breaking" value={t.activeBreaking} href="/admin/breaking" alert={t.activeBreaking > 0} />
          <Stat label="Pending imports" value={t.pendingImports} href="/admin/inbox" warn={t.pendingImports > 0} />
          <Stat label="Duplicates" value={t.duplicateCandidates} href="/admin/inbox?status=DUPLICATE_CANDIDATE" warn={t.duplicateCandidates > 0} />
        </div>
      </section>

      <section>
        <h2 className="section-title">Content lifecycle</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Stat label="Drafts" value={t.drafts} />
          <Stat label="Published" value={t.published} />
          <Stat label="Older" value={t.older} />
          <Stat label="Archived" value={t.archived} />
          <Stat label="Expired breaking" value={t.expiredBreaking} />
          <Stat label="Failing sources" value={t.failedSources} href="/admin/sources" alert={t.failedSources > 0} />
          <Stat label="Fresh window" value="72h" muted />
        </div>
      </section>

      <section>
        <h2 className="section-title">Stale coverage warnings</h2>
        {stats.staleCategories.length === 0 ? (
          <p className="text-sm text-slate-500">All categories have fresh stories. Good coverage.</p>
        ) : (
          <ul className="space-y-2">
            {stats.staleCategories.map((c) => (
              <li key={c.slug} className="rounded border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
                <span className="mr-2">⚠</span>
                {c.hoursSinceLast < 0 ? (
                  <>
                    <strong>{c.name}</strong> has no published stories at all.
                  </>
                ) : (
                  <>
                    No fresh article in <strong>{c.name}</strong> for <strong>{c.hoursSinceLast} hours</strong>.
                    {c.lastAt && <span className="ml-2 text-slate-500">Last update: {formatDateTime(c.lastAt)}</span>}
                  </>
                )}
                <Link href={`/category/${c.slug}`} className="ml-2 font-semibold text-brand hover:underline">
                  View category
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  warn,
  alert,
  muted,
}: {
  label: string;
  value: number | string;
  href?: string;
  warn?: boolean;
  alert?: boolean;
  muted?: boolean;
}) {
  const cls = alert
    ? "border-red-300 bg-red-50"
    : warn
      ? "border-amber-300 bg-amber-50"
      : "border-slate-200 bg-white";
  const body = (
    <div className={`rounded-lg border p-4 ${cls} ${href ? "transition hover:shadow-md" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${muted ? "text-slate-400" : alert ? "text-red-700" : warn ? "text-amber-700" : "text-slate-900"}`}>
        {value}
      </p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
