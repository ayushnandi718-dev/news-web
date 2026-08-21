"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface LogRow {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: string | null;
  createdAt: string;
}

export default function AdminAudit() {
  const [items, setItems] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/admin/audit${filter ? `?action=${filter}` : ""}`, { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setItems(json.data.items);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const actions = ["", "article.", "publish", "breaking", "inbox", "media.", "user.", "source.", "auth."];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="section-title mr-auto">Audit log</h1>
        {actions.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === a ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600 hover:border-brand"}`}
          >
            {a || "ALL"}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">Actor</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Meta</th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-1.5 text-xs text-slate-500">{formatDateTime(l.createdAt)}</td>
                <td className="px-3 py-1.5 text-xs">{l.actorEmail ?? "system"}</td>
                <td className="px-3 py-1.5 font-mono text-xs font-bold text-brand">{l.action}</td>
                <td className="px-3 py-1.5 text-xs text-slate-500">
                  {l.targetType ? `${l.targetType}:${(l.targetId ?? "").slice(-6)}` : "—"}
                </td>
                <td className="max-w-xs truncate px-3 py-1.5 font-mono text-[10px] text-slate-400">{l.meta ?? ""}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No audit entries.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
