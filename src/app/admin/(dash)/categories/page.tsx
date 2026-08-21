"use client";

import { useCallback, useEffect, useState } from "react";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priority: number;
  freshnessOverrides: { multiplier?: number } | null;
  _count: { articles: number };
}

export default function AdminCategories() {
  const [items, setItems] = useState<CategoryRow[] | null>(null);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ name: "", priority: 0, multiplier: 1 });
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/categories", { cache: "no-store" });
    const json = await res.json();
    setItems(json.ok ? json.data.items : []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        priority: Number(form.priority),
        freshnessOverrides: { multiplier: Number(form.multiplier) },
      }),
    });
    const json = await res.json();
    if (json.ok) {
      setForm({ name: "", priority: 0, multiplier: 1 });
      setShowAdd(false);
      load();
    } else setMsg(json.error || "Failed");
  }

  async function updateMultiplier(id: string, multiplier: number) {
    await fetch(`/api/v1/admin/categories/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ freshnessOverrides: { multiplier } }),
    });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h1 className="section-title mr-auto">Categories</h1>
        {msg && <span className="text-xs text-red-600">{msg}</span>}
        <button onClick={() => setShowAdd((v) => !v)} className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark">
          {showAdd ? "Close" : "+ New category"}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={create} className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" required className="rounded border border-slate-300 px-2 py-1.5" />
          <input type="number" min={0} max={100} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} placeholder="Priority" className="w-20 rounded border border-slate-300 px-2 py-1.5" title="Display priority" />
          <label className="text-xs text-slate-500">
            Freshness window ×
            <input type="number" step="0.25" min={0.25} max={4} value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: Number(e.target.value) })} className="ml-1 w-16 rounded border border-slate-300 px-2 py-1.5" />
          </label>
          <button className="rounded bg-brand px-4 py-1.5 font-bold text-white hover:bg-brand-dark">Create</button>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Articles</th>
              <th className="px-3 py-2">Priority</th>
              <th className="px-3 py-2">Freshness ×</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 font-semibold">{c.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{c.slug}</td>
                <td className="px-3 py-2 tabular-nums text-slate-500">{c._count.articles}</td>
                <td className="px-3 py-2 tabular-nums text-slate-500">{c.priority}</td>
                <td className="px-3 py-2">
                  <select
                    value={c.freshnessOverrides?.multiplier ?? 1}
                    onChange={(e) => updateMultiplier(c.id, Number(e.target.value))}
                    className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((m) => (
                      <option key={m} value={m}>{m}×</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
