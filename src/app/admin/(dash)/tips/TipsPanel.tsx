"use client";

import { useEffect, useState, useCallback } from "react";

interface Tip {
  id: string;
  name: string | null;
  phone: string | null;
  message: string;
  imageUrl: string | null;
  status: string;
  adminNotes: string | null;
  createdAt: string;
}

export default function AdminTips() {
  const [items, setItems] = useState<Tip[]>([]);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "REVIEWED" | "REJECTED">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const q = filter !== "ALL" ? `?status=${filter}` : "";
    try {
      const r = await fetch(`/api/v1/admin/tips${q}`);
      const j = await r.json();
      if (j.ok) setItems(j.data);
    } catch {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "approve" | "reject" | "delete") {
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/tips/${id}`, {
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
        <h1 className="text-lg font-bold text-brand-ink">News Tips</h1>
        <div className="ml-auto flex gap-1">
          {(["ALL", "PENDING", "REVIEWED", "REJECTED"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded px-2.5 py-1 text-xs font-semibold transition ${filter === s ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No tips yet.</p>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <div key={t.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${t.status === "REVIEWED" ? "bg-emerald-100 text-emerald-700" : t.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                      {t.status}
                    </span>
                    {t.name && <span className="text-xs font-semibold text-slate-700">{t.name}</span>}
                    {t.phone && <span className="text-[11px] text-slate-400">{t.phone}</span>}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{t.message}</p>
                  {t.imageUrl && <img src={t.imageUrl} alt="" className="mt-2 h-20 w-20 rounded object-cover" />}
                  <p className="mt-1 text-[11px] text-slate-400">{new Date(t.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {t.status === "PENDING" && (
                    <>
                      <button disabled={busyId === t.id} onClick={() => act(t.id, "approve")} className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Review</button>
                      <button disabled={busyId === t.id} onClick={() => act(t.id, "reject")} className="rounded bg-red-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50">Reject</button>
                    </>
                  )}
                  <button disabled={busyId === t.id} onClick={() => act(t.id, "delete")} className="rounded border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
