"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ageLabel } from "@/lib/format";
import { useNewsEvents } from "@/hooks/useNewsEvents";
import { KpiCard, ScopeBadge, SectionHeader, StatusBadge } from "@/components/admin/ui";
import {
  IconAlert,
  IconArticle,
  IconChevronDown,
  IconExternal,
  IconInbox,
  IconPlus,
  IconZap,
} from "@/components/admin/icons";

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
    scheduled?: number;
  };
  today: { publishedToday: number; importedToday: number; nextScheduledAt?: string | null };
  staleCategories: Array<{ slug: string; name: string; hoursSinceLast: number; lastAt: string | null }>;
}

interface AdminArticleRow {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  featuredImage?: string | null;
  status: string;
  geographicScope?: string | null;
  region?: { slug: string; name: string } | null;
  subcategory?: { slug: string; name: string } | null;
  category?: { slug: string; name: string } | null;
  author?: { name: string } | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

interface BreakingItem {
  id: string;
  title: string;
  slug: string;
  url?: string;
  image?: string | null;
  category?: { name: string } | null;
  region?: { name: string } | null;
  geographicScope?: string | null;
  authorName?: string | null;
  publishedAt?: string | null;
  breakingUntil?: string | null;
}

function relTime(iso?: string | null): string {
  if (!iso) return "";
  const mins = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (mins < 0) return "just now";
  return ageLabel(mins);
}

function expiresIn(iso?: string | null): string {
  if (!iso) return "";
  const mins = Math.max(0, (new Date(iso).getTime() - Date.now()) / 60_000);
  if (mins >= 60) return `${Math.floor(mins / 60)} hr ${Math.round(mins % 60)}m left`;
  return `${Math.max(1, Math.round(mins))} min left`;
}

function nextAtLabel(iso?: string | null): string {
  if (!iso) return "None queued";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "None queued";
  const time = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }).format(d);
  return `Next ${time}`;
}

function coveragePct(hoursSinceLast: number): number {
  if (hoursSinceLast < 0) return 0;
  return Math.max(4, Math.min(100, Math.round(100 - (Math.min(hoursSinceLast, 72) * 100) / 72)));
}

export default function DashboardClient({ userName }: { userName: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [queue, setQueue] = useState<AdminArticleRow[]>([]);
  const [latest, setLatest] = useState<AdminArticleRow[]>([]);
  const [breaking, setBreaking] = useState<BreakingItem[]>([]);
  const [error, setError] = useState("");
  const [showAllStale, setShowAllStale] = useState(false);
  const [greeting, setGreeting] = useState("");
  const [dateLine, setDateLine] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "Working late" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
    setDateLine(
      new Intl.DateTimeFormat("en-IN", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date())
    );
  }, []);

  const load = useCallback(async () => {
    try {
      const [s, q, l, b] = await Promise.all([
        fetch("/api/v1/admin/stats", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/v1/admin/news?status=IN_REVIEW&limit=5", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/v1/admin/news?limit=8", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/v1/news/breaking", { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (s.ok) setStats(s.data);
      else setError(s.error || "Failed to load stats");
      if (q.ok) setQueue(q.data.items ?? []);
      if (l.ok) setLatest(l.data.items ?? []);
      if (b.ok) setBreaking(b.data.items ?? []);
    } catch {
      setError("Network error");
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [load]);

  const { connected } = useNewsEvents(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(load, 600);
  });

  const firstName = userName.split(/\s+/)[0];
  const t = stats?.totals;
  const stale = stats?.staleCategories ?? [];
  const staleSorted = [...stale].sort((a, b) => coveragePct(a.hoursSinceLast) - coveragePct(b.hoursSinceLast));
  const staleTop = showAllStale ? staleSorted : staleSorted.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-brand-ink sm:text-2xl">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Newsroom overview · {dateLine}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/articles"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-bold text-white shadow-sm transition hover:bg-brand-dark"
          >
            <IconPlus className="h-4 w-4" />
            New Story
          </Link>
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-[13px] font-bold text-slate-700 transition hover:border-brand hover:text-brand"
          >
            <IconExternal className="h-3.5 w-3.5" />
            View Site
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* KPIs */}
      <section aria-label="Key metrics">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard label="Published" value={t ? t.published : "—"} sub={t && t.published > 0 ? `+${stats?.today.publishedToday ?? 0} today` : "No stories yet"} tone="good" href="/admin/articles?status=PUBLISHED" />
          <KpiCard
            label="In Review"
            value={t ? t.inReview : "—"}
            sub={t && t.inReview > 0 ? `${Math.min(t.inReview, 9)} need action` : "Queue clear"}
            tone={t && t.inReview > 0 ? "warn" : "neutral"}
            href="/admin/articles?status=IN_REVIEW"
          />
          <KpiCard
            label="Scheduled"
            value={t ? (t.scheduled ?? 0) : "—"}
            sub={nextAtLabel(stats?.today.nextScheduledAt)}
            tone="neutral"
            href="/admin/articles?status=SCHEDULED"
          />
          <KpiCard
            label="Breaking"
            value={t ? t.activeBreaking : "—"}
            sub={t && t.activeBreaking > 0 ? "Live now" : "Quiet"}
            tone={t && t.activeBreaking > 0 ? "danger" : "neutral"}
            href="/admin/breaking"
          />
        </div>
      </section>

      {/* Breaking */}
      <section aria-label="Breaking news">
        <SectionHeader title="Breaking now" accent action={{ label: "Manage", href: "/admin/breaking" }} />
        {breaking.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500 shadow-sm">
            <IconZap className="h-4 w-4 text-slate-300" />
            No active breaking stories.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm">
            {breaking.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition hover:bg-red-50/30">
                <span className="flex h-2.5 w-2.5 shrink-0 items-center justify-center" aria-hidden="true">
                  <span className="absolute h-2.5 w-2.5 rounded-full bg-red-500 opacity-30 animate-pulseDot" />
                  <span className="relative h-2 w-2 rounded-full bg-red-600" />
                </span>
                <div className="min-w-0 flex-1 basis-64">
                  <Link href={`/news/${b.slug}`} target="_blank" className="block truncate text-sm font-bold text-brand-ink hover:text-brand">
                    {b.title}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                    {[b.category?.name, b.region?.name].filter(Boolean).join(" · ") || "Uncategorized"}
                    {b.geographicScope && <ScopeBadge scope={b.geographicScope} />}
                    {b.authorName && <span>By {b.authorName}</span>}
                    {b.publishedAt && <span>{relTime(b.publishedAt)}</span>}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-red-600">
                  <IconAlert className="h-3.5 w-3.5" />
                  {expiresIn(b.breakingUntil)}
                </span>
                <Link
                  href={`/news/${b.slug}`}
                  target="_blank"
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:border-brand hover:text-brand"
                >
                  Open Story
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Editorial queue */}
          <section aria-label="Editorial queue">
            <SectionHeader title="Editorial Queue" action={{ label: "View all", href: "/admin/articles?status=IN_REVIEW" }} />
            {queue.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500 shadow-sm">
                Nothing awaiting review. Queue is clear.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {queue.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition hover:bg-slate-50">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="truncate text-sm font-bold text-brand-ink">{a.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        {[a.category?.name, a.region?.name].filter(Boolean).join(" · ") || "Unassigned"}
                        {a.geographicScope && <ScopeBadge scope={a.geographicScope} />}
                        {a.author?.name && <span>By {a.author.name}</span>}
                        <span>{relTime(a.updatedAt)}</span>
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                    <Link
                      href={`/admin/articles?status=IN_REVIEW`}
                      className="inline-flex items-center gap-0.5 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white transition hover:bg-brand"
                    >
                      Review →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Latest stories */}
          <section aria-label="Latest stories">
            <SectionHeader title="Latest Stories" action={{ label: "View all", href: "/admin/articles" }} />
            {latest.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-500 shadow-sm">
                No stories yet. Publish your first story to see activity here.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {latest.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-50">
                    {a.featuredImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.featuredImage} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover ring-1 ring-slate-200" />
                    ) : (
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-300 ring-1 ring-slate-200">
                        <IconArticle className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link href={`/news/${a.slug}`} target="_blank" className="block truncate text-[13px] font-semibold text-brand-ink hover:text-brand">
                        {a.title}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
                        {[a.category?.name, a.region?.name].filter(Boolean).join(" · ") || "—"}
                        {a.geographicScope && <ScopeBadge scope={a.geographicScope} />}
                        {a.author?.name && <span className="hidden sm:inline">· {a.author.name}</span>}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                    <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-slate-400">{relTime(a.publishedAt ?? a.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <section aria-label="Quick actions">
            <SectionHeader title="Quick Actions" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "New Article", href: "/admin/articles", icon: IconPlus, primary: true },
                { label: "Review Queue", href: "/admin/articles?status=IN_REVIEW", icon: IconArticle },
                { label: "Breaking Desk", href: "/admin/breaking", icon: IconZap },
                { label: "Import Inbox", href: "/admin/inbox", icon: IconInbox },
              ].map((qa) => (
                <Link
                  key={qa.label}
                  href={qa.href}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[13px] font-bold shadow-sm transition ${
                    qa.primary
                      ? "border-brand bg-brand text-white hover:bg-brand-dark"
                      : "border-slate-200 bg-white text-slate-700 hover:border-brand hover:text-brand"
                  }`}
                >
                  <qa.icon className="h-4 w-4 shrink-0" />
                  {qa.label}
                </Link>
              ))}
            </div>
          </section>

          {/* Coverage health */}
          <section aria-label="Coverage health">
            <SectionHeader title="Coverage Health" />
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {stale.length === 0 ? (
                <p className="text-sm text-slate-500">
                  All categories have fresh stories within the last 6 hours. Good coverage.
                </p>
              ) : (
                <>
                  <p className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-amber-700">
                    <IconAlert className="h-4 w-4" />
                    {stale.length} {stale.length === 1 ? "category needs" : "categories need"} attention
                  </p>
                  <ul className="space-y-2.5">
                    {staleTop.map((c) => {
                      const pct = coveragePct(c.hoursSinceLast);
                      const barCls = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
                      return (
                        <li key={c.slug}>
                          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                            <Link href={`/category/${c.slug}`} className="truncate font-semibold text-slate-700 hover:text-brand">
                              {c.name}
                            </Link>
                            <span className={`shrink-0 font-bold tabular-nums ${pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-600"}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${barCls}`} style={{ width: `${pct}%` }} role="presentation" />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {staleSorted.length > 5 && !showAllStale && (
                    <button
                      onClick={() => setShowAllStale(true)}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                    >
                      + {staleSorted.length - 5} more
                      <IconChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {/* System health */}
          <section aria-label="System health">
            <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-500 [&::-webkit-details-marker]:hidden">
                System Health
                <IconChevronDown className="h-4 w-4 text-slate-400" />
              </summary>
              <dl className="space-y-2 border-t border-slate-100 px-4 py-3 text-[13px]">
                <HealthRow
                  label="RSS sources failing"
                  value={t ? String(t.failedSources) : "—"}
                  bad={!!t && t.failedSources > 0}
                  href="/admin/sources"
                />
                <HealthRow label="Pending imports" value={t ? String(t.pendingImports) : "—"} bad={!!t && t.pendingImports > 0} href="/admin/inbox" />
                <HealthRow
                  label="Duplicate candidates"
                  value={t ? String(t.duplicateCandidates) : "—"}
                  bad={!!t && t.duplicateCandidates > 0}
                  href="/admin/inbox?status=DUPLICATE_CANDIDATE"
                />
                <HealthRow label="Drafts" value={t ? String(t.drafts) : "—"} href="/admin/articles?status=DRAFT" />
                <HealthRow label="Expired breaking" value={t ? String(t.expiredBreaking) : "—"} href="/admin/breaking" />
                <HealthRow label="Archived" value={t ? String(t.archived) : "—"} />
                <HealthRow
                  label="Realtime stream"
                  value={connected ? "Connected" : "Reconnecting…"}
                  bad={!connected}
                />
              </dl>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}

function HealthRow({ label, value, bad, href }: { label: string; value: string; bad?: boolean; href?: string }) {
  const body = (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right font-bold tabular-nums ${bad ? "text-red-600" : "text-slate-800"}`}>
        {href ? <span className="hover:text-brand hover:underline">{value}</span> : value}
      </dd>
    </>
  );
  return (
    <div className="flex items-baseline justify-between gap-3">
      {href ? (
        <Link href={href} className="flex w-full items-baseline justify-between gap-3">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}
