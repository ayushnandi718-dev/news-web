"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface BreakingArticle {
  id: string;
  title: string;
  slug: string;
  breakingUntil: string | null;
  breakingPriority: number;
  publishedAt: string | null;
  updatedAt?: string;
  category: { name: string } | null;
}

export default function AdminBreaking() {
  const [active, setActive] = useState<BreakingArticle[]>([]);
  const [expired, setExpired] = useState<BreakingArticle[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/breaking", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) {
      setActive(json.data.active);
      setExpired(json.data.recentlyExpired ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 20_000);
    return () => clearInterval(iv);
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/breaking/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="section-title">Active breaking news</h1>
        {active.length === 0 ? (
          <p className="text-sm text-slate-500">No active breaking stories. Mark stories as breaking from the Articles page.</p>
        ) : (
          <ul className="space-y-3">
            {active.map((a) => (
              <li key={a.id} className="rounded-lg border border-red-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-slate-900">{a.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Expires <strong>{formatDateTime(a.breakingUntil)}</strong> · priority {a.breakingPriority} ·{" "}
                      {a.category?.name}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[15, 30, 60].map((m) => (
                      <button
                        key={m}
                        disabled={busyId === a.id}
                        onClick={() => patch(a.id, { extendMinutes: m })}
                        className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-40"
                      >
                        +{m}m
                      </button>
                    ))}
                    <button
                      disabled={busyId === a.id}
                      onClick={() => patch(a.id, { endNow: true })}
                      className="rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      End now
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="section-title">Recently ended / expired</h2>
        {expired.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing here.</p>
        ) : (
          <ul className="space-y-2">
            {expired.map((a) => (
              <li key={a.id} className="rounded border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
                {a.title} <span className="text-xs text-slate-400">· updated {formatDateTime(a.updatedAt ?? null)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
