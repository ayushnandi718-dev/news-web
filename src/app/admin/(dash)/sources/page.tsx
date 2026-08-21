"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface SourceRow {
  id: string;
  name: string;
  type: string;
  url: string;
  active: boolean;
  authorized: boolean;
  pollIntervalMinutes: number;
  defaultCategorySlug: string | null;
  lastFetchedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  consecutiveFailures: number;
}

export default function AdminSources() {
  const [items, setItems] = useState<SourceRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", url: "", pollIntervalMinutes: 15, defaultCategorySlug: "", authorized: true });
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/sources", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setItems(json.data.items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runNow(id: string) {
    setBusyId(id);
    setMsg("Fetching source…");
    try {
      const res = await fetch(`/api/v1/admin/sources/${id}`, { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        const r = json.data.result;
        setMsg(`${r.sourceName}: ${r.status} — staged ${r.staged}, duplicates ${r.duplicates}, invalid ${r.invalid}${r.error ? ` (${r.error})` : ""}`);
      } else {
        setMsg(json.error || "Run failed");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(id: string, active: boolean) {
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/sources/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ active }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/sources/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    setBusyId("new");
    try {
      const res = await fetch("/api/v1/admin/sources", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          url: form.url,
          type: "RSS",
          authorized: form.authorized,
          active: true,
          pollIntervalMinutes: Number(form.pollIntervalMinutes),
          defaultCategorySlug: form.defaultCategorySlug || undefined,
        }),
      });
      const json = await res.json();
      if (!json.ok) setMsg(json.error || "Failed to add source");
      else {
        setMsg("Source added.");
        setShowAdd(false);
        setForm({ name: "", url: "", pollIntervalMinutes: 15, defaultCategorySlug: "", authorized: true });
        await load();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="section-title mr-auto">News sources</h1>
        {msg && <span className="text-xs text-slate-600">{msg}</span>}
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          {showAdd ? "Close" : "+ Add source"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={addSource} className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Source name"
            className="rounded border border-slate-300 px-2 py-1.5"
            required
          />
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="RSS/API URL"
            className="w-72 rounded border border-slate-300 px-2 py-1.5"
            required
          />
          <input
            type="number"
            min={5}
            value={form.pollIntervalMinutes}
            onChange={(e) => setForm({ ...form, pollIntervalMinutes: Number(e.target.value) })}
            className="w-20 rounded border border-slate-300 px-2 py-1.5"
            title="Poll interval (minutes)"
          />
          <select
            value={form.defaultCategorySlug}
            onChange={(e) => setForm({ ...form, defaultCategorySlug: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="">Auto category</option>
            {["india", "world", "sports", "business", "technology", "entertainment", "lifestyle"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={form.authorized} onChange={(e) => setForm({ ...form, authorized: e.target.checked })} />
            Authorized/licensed
          </label>
          <button disabled={busyId === "new"} className="rounded bg-brand px-4 py-1.5 font-bold text-white hover:bg-brand-dark disabled:opacity-50">
            Add
          </button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Health</th>
              <th className="px-3 py-2">Interval</th>
              <th className="px-3 py-2">Last fetch</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="max-w-sm px-3 py-2">
                  <p className="font-semibold">{s.name}</p>
                  <p className="truncate text-xs text-slate-400">{s.url}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase">
                    {s.authorized ? (
                      <span className="text-green-700">authorized</span>
                    ) : (
                      <span className="text-red-600">unauthorized</span>
                    )}
                    {!s.active && <span className="ml-1 text-slate-500">· disabled</span>}
                  </p>
                </td>
                <td className="px-3 py-2">
                  {s.lastStatus === "OK" ? (
                    <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">OK</span>
                  ) : s.lastStatus === "ERROR" ? (
                    <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700" title={s.lastError ?? ""}>
                      ERROR ×{s.consecutiveFailures}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">never fetched</span>
                  )}
                </td>
                <td className="px-3 py-2 text-slate-500">{s.pollIntervalMinutes}m</td>
                <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(s.lastFetchedAt)}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button
                      onClick={() => runNow(s.id)}
                      disabled={busyId === s.id || !s.active}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-40"
                    >
                      Fetch now
                    </button>
                    <button
                      onClick={() => toggle(s.id, !s.active)}
                      disabled={busyId === s.id}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand disabled:opacity-40"
                    >
                      {s.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      disabled={busyId === s.id}
                      className="rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No sources configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
