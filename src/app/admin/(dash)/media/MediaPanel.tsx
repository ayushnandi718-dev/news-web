"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { useUI } from "@/components/ui/overlay";

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

function AdminMedia() {
  const { toast, confirm } = useUI();
  const [items, setItems] = useState<MediaRow[] | null>(null);
  const [q, setQ] = useState("");
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
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/admin/media", { method: "POST", body: fd });
      const json = await res.json();
      if (json.ok) toast("Image upload ho gayi.", "success");
      else toast(json.error || "Upload fail hua", "error");
      await load();
    } catch {
      toast("Network error", "error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function remove(id: string, alt: string | null) {
    const yes = await confirm({
      title: "Media delete karein?",
      message: `"${alt || "Ye image"}" library se permanently hat jayegi. Articles mein broken image dikh sakta hai.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!yes) return;
    const res = await fetch(`/api/v1/admin/media/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) toast("Media delete ho gaya.", "success");
    else toast(json.error || "Delete fail hua", "error");
    await load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="section-title mr-auto">Media library</h1>
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
                  onClick={() => remove(m.id, m.alt)}
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

export default AdminMedia;
export const MediaPanel = AdminMedia;
