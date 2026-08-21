"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/format";

interface CommentRow {
  id: string;
  authorName: string;
  body: string;
  status: string;
  createdAt: string;
  article: { title: string; slug: string };
}

const FILTERS = ["PENDING", "APPROVED", "REJECTED", "ALL"];

export default function AdminComments() {
  const [items, setItems] = useState<CommentRow[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/admin/comments?status=${filter}`, { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setItems(json.data.items);
    else setErr(json.error || "Failed (requires comment.moderate)");
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function moderate(id: string, status: string) {
    await fetch("/api/v1/admin/comments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="section-title mr-auto">Comment moderation</h1>
        {err && <span className="text-xs text-red-600">{err}</span>}
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === f ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600 hover:border-brand"}`}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">
                  {c.authorName}
                  <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    c.status === "APPROVED" ? "bg-green-100 text-green-700" : c.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>{c.status}</span>
                </p>
                <p className="mt-1 text-sm text-slate-700">{c.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  on <Link href={`/news/${c.article.slug}`} className="hover:text-brand">{c.article.title}</Link>
                  {" · "}{formatDateTime(c.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {c.status !== "APPROVED" && (
                  <button onClick={() => moderate(c.id, "APPROVED")} className="rounded border border-green-300 px-2 py-0.5 text-xs font-semibold text-green-700 hover:bg-green-50">Approve</button>
                )}
                {c.status !== "REJECTED" && (
                  <button onClick={() => moderate(c.id, "REJECTED")} className="rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50">Reject</button>
                )}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && !err && (
          <li className="py-8 text-center text-sm text-slate-500">No comments for this filter.</li>
        )}
      </ul>
    </div>
  );
}
