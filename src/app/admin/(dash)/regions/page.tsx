"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface Region {
  id: string;
  name: string;
  slug: string;
  type: string;
  district: string | null;
  state: string | null;
  country: string | null;
  priority: number;
  parent: { id: string; name: string; slug: string } | null;
  _count: { articles: number };
}

export default function AdminRegions() {
  const [items, setItems] = useState<Region[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/admin/regions", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setItems(json.data.items);
    } catch {
      console.error("Failed to load regions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <h1 className="section-title mr-auto">Regions</h1>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          {showNew ? "Cancel" : "+ New region"}
        </button>
      </div>

      {showNew && (
        <RegionForm
          onCancel={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading regions…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Articles</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-semibold">{r.name}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">
                      {r.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {[r.district, r.state, r.country].filter(Boolean).join(", ")}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r.priority}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{r._count.articles}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setEditingId(r.id)}
                      className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold hover:border-brand hover:text-brand"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                    No regions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <RegionForm
          regionId={editingId}
          onCancel={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RegionForm({
  regionId,
  onCancel,
  onSaved,
}: {
  regionId?: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    type: "CUSTOM" as "TOWN" | "DISTRICT" | "DIVISION" | "STATE" | "COUNTRY" | "CUSTOM",
    parentId: "",
    district: "",
    state: "",
    country: "",
    priority: 0,
  });
  const [regions, setRegions] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Load regions for parent selection
    fetch("/api/v1/admin/regions")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setRegions(j.data.items);
      })
      .catch(() => {});

    // Load existing region if editing
    if (regionId) {
      fetch(`/api/v1/admin/regions/${regionId}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) {
            const r = j.data.region;
            setForm({
              name: r.name,
              slug: r.slug,
              type: r.type,
              parentId: r.parentId || "",
              district: r.district || "",
              state: r.state || "",
              country: r.country || "",
              priority: r.priority,
            });
          }
        })
        .catch(() => {});
    }
  }, [regionId]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const url = regionId ? `/api/v1/admin/regions/${regionId}` : "/api/v1/admin/regions";
      const method = regionId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          parentId: form.parentId || undefined,
          district: form.district || undefined,
          state: form.state || undefined,
          country: form.country || undefined,
        }),
      });
      
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Save failed");
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-4 font-semibold">{regionId ? "Edit Region" : "New Region"}</h3>
      
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Region name"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="Slug (auto-generated if empty)"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as any })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="TOWN">Town</option>
          <option value="DISTRICT">District</option>
          <option value="DIVISION">Division</option>
          <option value="STATE">State</option>
          <option value="COUNTRY">Country</option>
          <option value="CUSTOM">Custom</option>
        </select>
        <select
          value={form.parentId}
          onChange={(e) => setForm({ ...form, parentId: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">No parent</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <input
          value={form.district}
          onChange={(e) => setForm({ ...form, district: e.target.value })}
          placeholder="District"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          placeholder="State"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={form.country}
          onChange={(e) => setForm({ ...form, country: e.target.value })}
          placeholder="Country"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="number"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
          placeholder="Priority"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={busy || !form.name}
          className="rounded bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}