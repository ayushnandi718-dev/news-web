"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUI } from "@/components/ui/overlay";
import { useNewsEvents } from "@/hooks/useNewsEvents";
import { KpiCard } from "@/components/admin/ui";
import {
  AD_STATUS_LABELS,
  AD_STATUS_COLORS,
  AD_PLACEMENT_LABELS,
  formatINR,
} from "@/lib/pricing";

interface RevenueData {
  kpis: {
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
    activeAds: number;
    totalAds: number;
    pendingApproval: number;
    deletedAds: number;
  };
  byPayment: { status: string; revenue: number; count: number }[];
  byStatus: { status: string; revenue: number; impressions: number; clicks: number; count: number }[];
  byPlacement: { placement: string; revenue: number; impressions: number; clicks: number; count: number }[];
  monthly: { month: string; label: string; revenue: number; paid: number; count: number }[];
  activity: ActivityRow[];
  ads: AdRow[];
}

interface AdRow {
  id: string;
  internalName: string;
  advertiserName: string;
  price: number;
  status: string;
  paymentStatus: string;
  paymentDate: string | null;
  paymentNotes: string | null;
  impressions: number;
  clicks: number;
  placement: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface ActivityRow {
  id: string;
  action: string;
  actorEmail: string | null;
  targetId: string | null;
  meta: { title?: string; status?: string; placement?: string } | null;
  createdAt: string;
}

const PAYMENT_LABELS: Record<string, string> = {
  UNPAID: "Unpaid",
  PARTIAL: "Partial",
  PAID: "Paid",
};

const PAYMENT_COLORS: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
};

const ACTION_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  "ad.create": { label: "Created", color: "bg-blue-100 text-blue-700", icon: "+" },
  "ad.update": { label: "Updated", color: "bg-amber-100 text-amber-700", icon: "~" },
  "ad.delete": { label: "Deleted", color: "bg-red-100 text-red-700", icon: "x" },
};

type Range = "all" | "7d" | "30d" | "90d" | "365d";
const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
  { value: "365d", label: "1 Year" },
  { value: "all", label: "All Time" },
];

function fmtDate(v: string | null): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "abhi";
  if (diffMin < 60) return `${diffMin} min pehle`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ghante pehle`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} din pehle`;
}

export default function RevenueDashboard() {
  const { toast, confirm } = useUI();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "UNPAID" | "PARTIAL" | "PAID">("all");
  const [range, setRange] = useState<Range>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/admin/ads/revenue?range=${range}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok && mountedRef.current) {
        setData(json.data);
        setLastRefresh(new Date());
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  // Auto-refresh on SSE ads.updated events
  useNewsEvents((e) => {
    if (e.type === "ads.updated" && autoRefresh && mountedRef.current) {
      load();
      toast("Revenue dashboard refreshed — ad update detected", "info");
    }
  });

  // Poll fallback every 30s
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(() => {
      if (mountedRef.current && document.visibilityState === "visible") load();
    }, 30_000);
    return () => clearInterval(iv);
  }, [autoRefresh, load]);

  async function markPaid(ad: AdRow) {
    const ok = await confirm({
      title: "Payment received?",
      message: `"${ad.internalName}" — ${formatINR(ad.price)} ka payment confirm karein?`,
      confirmText: "Confirm Payment",
    });
    if (!ok) return;
    await fetch(`/api/v1/admin/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paymentStatus: "PAID",
        paymentDate: new Date().toISOString(),
      }),
    });
    toast("Payment marked as received", "success");
    await load();
  }

  async function markPartial(ad: AdRow) {
    await fetch(`/api/v1/admin/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentStatus: "PARTIAL" }),
    });
    toast("Marked as partially paid", "info");
    await load();
  }

  async function markUnpaid(ad: AdRow) {
    await fetch(`/api/v1/admin/ads/${ad.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentStatus: "UNPAID", paymentDate: null }),
    });
    toast("Marked as unpaid", "info");
    await load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <span className="ml-3 text-sm text-slate-400">Loading revenue dashboard…</span>
      </div>
    );
  }

  if (!data) {
    return <p className="py-12 text-center text-slate-500">Revenue data load nahi ho paya.</p>;
  }

  const filteredAds = filter === "all" ? data.ads : data.ads.filter((a) => a.paymentStatus === filter);
  const maxMonthlyRevenue = Math.max(1, ...data.monthly.map((m) => m.revenue));

  return (
    <div>
      {/* Header bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h2 className="section-title mr-auto">Ad Revenue Dashboard</h2>

        {/* Time range selector */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded px-2.5 py-1 text-[11px] font-bold transition ${
                range === r.value ? "bg-brand text-white" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden sm:inline">Last refresh: {lastRefresh.toLocaleTimeString("en-IN")}</span>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
              autoRefresh ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${autoRefresh ? "animate-pulse bg-emerald-500" : "bg-slate-400"}`} />
            {autoRefresh ? "LIVE" : "PAUSED"}
          </button>
          <button onClick={load} className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200">
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards — Row 1: Revenue */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Revenue" value={formatINR(data.kpis.totalRevenue)} sub={`${data.kpis.totalAds} ads total`} tone="brand" />
        <KpiCard label="Paid Revenue" value={formatINR(data.kpis.paidRevenue)} sub="Collected from advertisers" tone="good" />
        <KpiCard label="Unpaid Revenue" value={formatINR(data.kpis.unpaidRevenue)} sub={`${data.kpis.pendingApproval} ads awaiting`} tone="danger" />
        <KpiCard label="Active Ads" value={data.kpis.activeAds} sub={`CTR: ${data.kpis.ctr}%`} tone="neutral" />
      </div>

      {/* KPI Cards — Row 2: Performance */}
      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <KpiCard label="Impressions" value={data.kpis.totalImpressions.toLocaleString("en-IN")} tone="neutral" />
        <KpiCard label="Clicks" value={data.kpis.totalClicks.toLocaleString("en-IN")} tone="neutral" />
        <KpiCard label="CTR" value={`${data.kpis.ctr}%`} tone="neutral" />
        <KpiCard label="Pending Review" value={data.kpis.pendingApproval} sub="Awaiting approval" tone={data.kpis.pendingApproval > 0 ? "warn" : "good"} />
      </div>

      {/* KPI Cards — Row3: Deleted */}
      {data.kpis.deletedAds > 0 && (
        <div className="mb-4">
          <KpiCard label="Soft-Deleted Ads" value={data.kpis.deletedAds} sub="Revenue data preserved" tone="neutral" />
        </div>
      )}

      {/* Monthly Revenue Trend — Bar Chart */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">Revenue Trend (Last 12 Months)</h3>
        <div className="flex items-end gap-1.5" style={{ height: 140 }}>
          {data.monthly.map((m) => {
            const pct = maxMonthlyRevenue > 0 ? (m.revenue / maxMonthlyRevenue) * 100 : 0;
            const paidPct = m.revenue > 0 ? (m.paid / m.revenue) * 100 : 0;
            return (
              <div key={m.month} className="group relative flex flex-1 flex-col items-center gap-1" style={{ height: "100%" }}>
                {/* Tooltip */}
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] shadow-lg group-hover:block">
                  <p className="font-bold text-slate-800">{m.label}</p>
                  <p className="text-brand">{formatINR(m.revenue)} revenue</p>
                  <p className="text-emerald-600">{formatINR(m.paid)} paid</p>
                  <p className="text-slate-400">{m.count} ads</p>
                </div>
                {/* Bar */}
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(pct, 2)}%`,
                      background: `linear-gradient(to top, #10b981 ${paidPct}%, #c8102e ${paidPct}%)`,
                    }}
                  />
                </div>
                <span className="text-[8px] text-slate-400 sm:text-[9px]">{m.label.split(" ")[0]}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex items-center gap-4 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" /> Paid</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-brand" /> Unpaid</span>
        </div>
      </div>

      {/* Two-column: Breakdown + Activity */}
      <div className="mb-5 grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Left: Payment + Placement breakdown */}
        <div className="space-y-5">
          {/* Revenue by Payment Status */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">Payment Overview</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {data.byPayment.map((p) => (
                <div key={p.status} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${PAYMENT_COLORS[p.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {PAYMENT_LABELS[p.status] ?? p.status}
                  </span>
                  <p className="mt-1 text-xl font-black tabular-nums">{formatINR(p.revenue)}</p>
                  <p className="text-xs text-slate-500">{p.count} ads</p>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Placement */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">Revenue by Placement</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Placement</th>
                    <th className="px-3 py-2">Ads</th>
                    <th className="px-3 py-2">Revenue</th>
                    <th className="px-3 py-2">Imp / Click</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byPlacement.map((p) => (
                    <tr key={p.placement} className="border-b border-slate-100 last:border-0">
                      <td className="px-3 py-2 font-medium text-slate-700">{AD_PLACEMENT_LABELS[p.placement] ?? p.placement}</td>
                      <td className="px-3 py-2 tabular-nums">{p.count}</td>
                      <td className="px-3 py-2 font-bold text-brand tabular-nums">{formatINR(p.revenue)}</td>
                      <td className="px-3 py-2 tabular-nums text-xs">{p.impressions.toLocaleString("en-IN")} / {p.clicks.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Activity Timeline */}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">Recent Activity</h3>
          {data.activity.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">Koi recent activity nahi.</p>
          ) : (
            <div className="space-y-0">
              {data.activity.map((a, i) => {
                const info = ACTION_LABELS[a.action] ?? { label: a.action, color: "bg-slate-100 text-slate-600", icon: "?" };
                return (
                  <div key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {/* Timeline line */}
                    {i < data.activity.length - 1 && (
                      <div className="absolute left-[11px] top-6 h-full w-px bg-slate-200" />
                    )}
                    {/* Dot */}
                    <div className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${info.color}`}>
                      {info.icon}
                    </div>
                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {a.meta?.title || a.targetId?.slice(0, 8) || "Ad"}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-400">{fmtTime(a.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-bold ${info.color}`}>{info.label}</span>
                        {a.meta?.status && (
                          <span className="ml-1">
                            → <span className={`inline-block rounded px-1 py-0.5 text-[9px] font-bold ${AD_STATUS_COLORS[a.meta.status] ?? "bg-slate-100 text-slate-600"}`}>
                              {AD_STATUS_LABELS[a.meta.status] ?? a.meta.status}
                            </span>
                          </span>
                        )}
                      </p>
                      {a.actorEmail && (
                        <p className="mt-0.5 text-[10px] text-slate-400">by {a.actorEmail.split("@")[0]}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ad Status Breakdown */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">Revenue by Ad Status</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Ads</th>
                <th className="px-3 py-2">Revenue</th>
                <th className="px-3 py-2">Impressions</th>
                <th className="px-3 py-2">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {data.byStatus.map((s) => (
                <tr key={s.status} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${AD_STATUS_COLORS[s.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {AD_STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{s.count}</td>
                  <td className="px-3 py-2 font-bold text-brand tabular-nums">{formatINR(s.revenue)}</td>
                  <td className="px-3 py-2 tabular-nums">{s.impressions.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2 tabular-nums">{s.clicks.toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Tracker */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="mr-auto text-sm font-black uppercase tracking-wider text-slate-400">Payment Tracker</h3>
          {(["all", "UNPAID", "PARTIAL", "PAID"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                filter === f ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f === "all" ? "All" : PAYMENT_LABELS[f]}
              {f !== "all" && (
                <span className="ml-1 text-[10px]">
                  ({data.ads.filter((a) => a.paymentStatus === f).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Advertisement</th>
                <th className="px-3 py-2">Advertiser</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Ad Status</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Payment Date</th>
                <th className="px-3 py-2">Imp / Click</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAds.map((a) => (
                <tr key={a.id} className={`border-b border-slate-100 last:border-0 ${a.deletedAt ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2">
                    <p className="max-w-[180px] truncate font-semibold text-slate-800">{a.internalName}</p>
                    <p className="text-[10px] text-slate-400">{AD_PLACEMENT_LABELS[a.placement]}</p>
                    {a.deletedAt && (
                      <span className="mt-0.5 inline-block rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-600">DELETED</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">{a.advertiserName || "—"}</td>
                  <td className="px-3 py-2 font-bold text-brand tabular-nums">{formatINR(a.price)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${AD_STATUS_COLORS[a.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {AD_STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${PAYMENT_COLORS[a.paymentStatus] ?? "bg-slate-100 text-slate-600"}`}>
                      {PAYMENT_LABELS[a.paymentStatus] ?? a.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{fmtDate(a.paymentDate)}</td>
                  <td className="px-3 py-2 tabular-nums text-xs">{a.impressions.toLocaleString("en-IN")} / {a.clicks.toLocaleString("en-IN")}</td>
                  <td className="px-3 py-2">
                    {!a.deletedAt ? (
                    <div className="flex flex-wrap gap-1">
                      {a.paymentStatus !== "PAID" && (
                        <button onClick={() => markPaid(a)} className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-200">
                          Mark Paid
                        </button>
                      )}
                      {a.paymentStatus !== "PARTIAL" && a.paymentStatus !== "PAID" && (
                        <button onClick={() => markPartial(a)} className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-200">
                          Partial
                        </button>
                      )}
                      {a.paymentStatus !== "UNPAID" && (
                        <button onClick={() => markUnpaid(a)} className="rounded border border-red-300 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50">
                          Unpaid
                        </button>
                      )}
                    </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">Archived</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredAds.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    No ads match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
