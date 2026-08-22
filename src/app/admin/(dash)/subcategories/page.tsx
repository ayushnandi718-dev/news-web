"use client";

import { useCallback, useEffect, useState } from "react";

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priority: number;
  category: { id: string; name: string; slug: string };
  _count: { articles: number };
}

export default function AdminSubcategories() {
  const [items, setItems] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, catRes] = await Promise.all([
        fetch("/api/v1/admin/subcategories", { cache: "no-store" }),
        fetch("/api/v1/categories", { cache: "no-store" }),
      ]);
      
      const subJson = await subRes.json();
      const catJson = await catRes.json();
      
      if (subJson.ok) setItems(subJson.data.items);
      if (catJson.ok) setCategories(catJson.data.items);
    } catch {
      console.error("Failed to load subcategories");
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
        <h1 className="section-title mr-auto">Subcategories</h1>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          {showNew ? "Cancel" : "+ New subcategory"}
        </button>
      </div>

      {showNew && (
        <SubcategoryForm
          categories={categories}
          onCancel={() => setShowNew(false)}
          onSaved={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading subcategories…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Description</th>
                <th className="px-3 py-2">Priority</th>
                <th className="px-3 py-2">Articles</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-semibold">{s.name}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">
                      {s.category.name}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500 max-w-xs truncate">
                    {s.description || "-"}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">{s.priority}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{s._count.articles}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => setEditingId(s.id)}
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
                    No subcategories found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <SubcategoryForm
          subcategoryId={editingId}
          categories={categories}
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

function SubcategoryForm({
  subcategoryId,
  categories,
  onCancel,
  onSaved,
}: {
  subcategoryId?: string;
  categories: any[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    categoryId: "",
    priority: 0,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (subcategoryId) {
      fetch(`/api/v1/admin/subcategories/${subcategoryId}`)
        .then((r) => r.json())
        .then((j) => {
          if (j.ok) {
            const s = j.data.subcategory;
            setForm({
              name: s.name,
              slug: s.slug,
              description: s.description || "",
              categoryId: s.categoryId,
              priority: s.priority,
            });
          }
        })
        .catch(() => {});
    }
  }, [subcategoryId]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const url = subcategoryId 
        ? `/api/v1/admin/subcategories/${subcategoryId}` 
        : "/api/v1/admin/subcategories";
      const method = subcategoryId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...form,
          description: form.description || undefined,
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
      <h3 className="mb-4 font-semibold">{subcategoryId ? "Edit Subcategory" : "New Subcategory"}</h3>
      
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Subcategory name"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="Slug (auto-generated if empty)"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Select category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="number"
          value={form.priority}
          onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 0 })}
          placeholder="Priority"
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
          rows={2}
          className="rounded border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
        />
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          onClick={save}
          disabled={busy || !form.name || !form.categoryId}
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