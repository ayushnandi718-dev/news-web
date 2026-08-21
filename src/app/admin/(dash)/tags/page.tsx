"use client";

import { useCallback, useEffect, useState } from "react";

interface TagRow {
  id: string;
  name: string;
  slug: string;
  _count: { articles: number };
}

export default function AdminTags() {
  const [items, setItems] = useState<TagRow[]>([]);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/tags", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setItems(json.data.items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/v1/admin/tags", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (json.ok) setName("");
    else setMsg(json.error || "Failed");
  }

  return (
    <div>
      <h1 className="section-title mb-4">Tags</h1>
      <form onSubmit={create} className="mb-5 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" required minLength={2} className="rounded border border-slate-300 px-3 py-2 text-sm" />
        <button className="rounded bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark">Add tag</button>
        {msg && <span className="self-center text-xs text-red-600">{msg}</span>}
      </form>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span key={t.id} className="group flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
            {t.name} <span className="text-xs text-slate-400">{t._count.articles}</span>
            <button
              onClick={async () => {
                await fetch(`/api/v1/admin/tags/${t.id}`, { method: "DELETE" });
                load();
              }}
              className="text-slate-400 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && <p className="text-sm text-slate-500">No tags yet.</p>}
      </div>
    </div>
  );
}
