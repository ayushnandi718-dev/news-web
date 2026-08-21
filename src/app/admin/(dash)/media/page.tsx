"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface MediaRow {
  id: string;
  url: string;
  alt: string | null;
  caption: string | null;
  credit: string | null;
  mime: string | null;
  size: number | null;
  createdAt: string;
}

export default function AdminMedia() {
  const [items, setItems] = useState<MediaRow[] | null>(null);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/admin/media${q ? `?q=${encodeURIComponent(q)}` : ""}`, { cache: "no-store" });
    const json = await res.json();
    setItems(json.ok ? json.data.items : []);
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/admin/media", { method: "POST", body: fd });
      const json = await res.json();
      setMsg(json.ok ? "Uploaded." : json.error || "Upload failed");
      await load();
    } catch {
      setMsg("Network error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this media item?")) return;
    const res = await fetch(`/api/v1/admin/media/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.ok) setMsg(json.error || "Delete failed");
    await load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="section-title mr-auto">Media library</h1>
        {msg && <span className="text-xs text-slate-600">{msg}</span>}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search alt/caption…"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <label className="cursor-pointer rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark">
          {busy ? "Uploading…" : "Upload image"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" onChange={upload} className="hidden" disabled={busy} />
        </label>
      </div>

      {items === null ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : items.length === 0 ? (
        <p className="rounded border border-dashed border-slate-300 py-10 text-center text-sm text-slate-500">
          No media yet. Upload your first image above.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((m) => (
            <div key={m.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt ?? ""} className="h-28 w-full object-cover" />
              <div className="p-2 text-xs text-slate-500">
                <p className="truncate">{m.alt || m.caption || m.url.split("/").pop()}</p>
                <p>{formatDateTime(m.createdAt)}</p>
                <button
                  onClick={() => remove(m.id)}
                  className="mt-1 rounded border border-red-200 px-2 py-0.5 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
