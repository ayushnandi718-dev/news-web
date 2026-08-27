"use client";

import { useEffect, useState, useCallback } from "react";

interface Obituary {
  id: string;
  name: string;
  slug: string;
  age: number | null;
  photoUrl: string | null;
  message: string;
  deathDate: string | null;
  submittedName: string | null;
  submittedPhone: string | null;
  status: string;
  publishedAt: string | null;
  createdAt: string;
}

export default function AdminObituaries() {
  const [items, setItems] = useState<Obituary[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "PUBLISHED" | "REJECTED">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = filter !== "ALL" ? `?status=${filter}` : "";
    try {
      const r = await fetch(`/api/v1/admin/obituaries${q}`);
      const j = await r.json();
      if (j.ok) setItems(j.data);
    } catch {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "reject" | "delete") {
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/obituaries/${id}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "content-type": "application/json" },
        body: action !== "delete" ? JSON.stringify({ action }) : undefined,
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-lg font-bold text-brand-ink">Obituaries</h1>
        <div className="ml-auto flex gap-1">
          {(["ALL", "PENDING", "PUBLISHED", "REJECTED"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded px-2.5 py-1 text-xs font-semibold transition ${filter === s ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No obituaries yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((o) => (
            <div key={o.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                {o.photoUrl && <img src={o.photoUrl} alt="" className="h-14 w-14 rounded-full object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-brand-ink">{o.name}</h3>
                    {o.age && <span className="text-xs text-slate-400">{o.age} yrs</span>}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${o.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : o.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {o.status}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{o.message}</p>
                  {o.submittedName && <p className="mt-1 text-[11px] text-slate-400">Submitted by: {o.submittedName} {o.submittedPhone && `(${o.submittedPhone})`}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {o.status === "PENDING" && (
                    <>
                      <button disabled={busyId === o.id} onClick={() => act(o.id, "approve")} className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                      <button disabled={busyId === o.id} onClick={() => act(o.id, "reject")} className="rounded bg-red-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50">Reject</button>
                    </>
                  )}
                  <button disabled={busyId === o.id} onClick={() => act(o.id, "delete")} className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
