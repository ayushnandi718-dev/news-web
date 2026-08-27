"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { useUI } from "@/components/ui/overlay";

interface LiveRow {
  id: string;
  title: string;
  url: string;
  bannerUrl: string | null;
  platform: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const PLATFORM_BADGE: Record<string, string> = {
  FACEBOOK: "bg-blue-100 text-blue-700",
  YOUTUBE: "bg-red-100 text-red-700",
  OTHER: "bg-slate-200 text-slate-700",
};

const EMPTY_FORM = { title: "", url: "", bannerUrl: "", isActive: false };

export default function AdminLive() {
  const { toast, confirm } = useUI();
  const [items, setItems] = useState<LiveRow[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/v1/admin/live", { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setItems(json.data.items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditId(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.url.trim()) {
      toast("Title aur URL dono zaroori hain.", "warning");
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        url: form.url.trim(),
        isActive: form.isActive,
      };
      if (form.bannerUrl.trim()) payload.bannerUrl = form.bannerUrl.trim();
      const res = await fetch(editId ? `/api/v1/admin/live/${editId}` : "/api/v1/admin/live", {
        method: editId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.ok) {
        toast(
          editId ? "Live stream update ho gaya." : "Live stream add ho gaya — banner auto-fetch bhi.",
          "success"
        );
        resetForm();
        await load();
      } else {
        toast(json.error || "Save fail hua", "error");
      }
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/admin/live/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.ok) toast(json.error || "Update fail hua", "error");
      else if (data.refetchMeta) toast("Banner dobara fetch kiya.", "success");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, title: string) {
    const yes = await confirm({
      title: "Live stream delete karein?",
      message: `"${title}" permanently delete ho jayega. Wapas nahi aayega.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!yes) return;
    setBusy(true);
    try {
      await fetch(`/api/v1/admin/live/${id}`, { method: "DELETE" });
      toast("Stream delete ho gaya.", "success");
      if (editId === id) resetForm();
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="section-title mb-4">Live streams</h1>

      <form onSubmit={submit} className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-slate-800">
          {editId ? "✏️ Edit live stream" : "➕ Add live stream"}
          <span className="ml-2 font-normal text-slate-500">
            Facebook / YouTube / kahin bhi live ka link paste karo — banner auto aa jayega.
          </span>
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title (e.g. দুয়ার্সের খবর লাইভ)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            placeholder="https://facebook.com/… ya https://youtube.com/…"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
          />
          <input
            value={form.bannerUrl}
            onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })}
            placeholder="Banner image URL (optional — khali chhodo toh auto)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand sm:col-span-2"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 accent-red-600"
            />
            🔴 Live chalu hai
          </label>
          <button
            type="submit"
            disabled={busy}
            className="ml-auto rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40"
          >
            {editId ? "Save changes" : "Add stream"}
          </button>
          {editId && (
            <button type="button" onClick={resetForm} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className={`flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 ${item.isActive ? "border-red-300" : "border-slate-200"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.bannerUrl || "/api/og?title=LIVE"}
              alt=""
              className="h-14 w-24 shrink-0 rounded object-cover bg-slate-100"
              onError={(e) => ((e.target as HTMLImageElement).src = "/api/og?square=1")}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold leading-snug text-slate-900">{item.title}</p>
              <a href={item.url} target="_blank" rel="noreferrer noopener" className="block truncate text-xs text-blue-600 hover:underline">
                {item.url}
              </a>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className={`rounded px-1.5 py-0.5 font-bold ${PLATFORM_BADGE[item.platform] || PLATFORM_BADGE.OTHER}`}>
                  {item.platform}
                </span>
                {item.isActive ? (
                  <span className="font-bold text-red-600">● LIVE NOW</span>
                ) : (
                  <span>offline</span>
                )}
                <span>· added {formatDateTime(item.createdAt)}</span>
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1">
              <button
                onClick={() => patch(item.id, { isActive: !item.isActive })}
                disabled={busy}
                className={`rounded border px-2 py-1 text-xs font-bold disabled:opacity-40 ${
                  item.isActive
                    ? "border-slate-300 text-slate-600 hover:bg-slate-50"
                    : "border-red-500 bg-red-600 text-white hover:bg-red-700"
                }`}
              >
                {item.isActive ? "Go offline" : "Go live"}
              </button>
              <button
                onClick={() => patch(item.id, { refetchMeta: true })}
                disabled={busy}
                title="Banner dobara fetch karo"
                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                ⟳ Banner
              </button>
              <button
                onClick={() => {
                  setEditId(item.id);
                  setForm({ title: item.title, url: item.url, bannerUrl: item.bannerUrl ?? "", isActive: item.isActive });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="rounded border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Edit
              </button>
              <button
                onClick={() => remove(item.id, item.title)}
                disabled={busy}
                className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-300 py-8 text-center text-sm text-slate-500">
            Koi live stream nahi — upar se add karo.
          </li>
        )}
      </ul>
    </div>
  );
}
