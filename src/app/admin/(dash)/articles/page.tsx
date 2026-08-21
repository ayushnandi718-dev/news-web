"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import ArticleEditor from "./ArticleEditor";

interface AdminArticle {
  id: string;
  title: string;
  slug: string;
  status: string;
  isBreaking: boolean;
  breakingUntil: string | null;
  isFeatured: boolean;
  views: number;
  publishedAt: string | null;
  updatedAt: string;
  category: { name: string } | null;
  authorName: string | null;
}

const STATUSES = ["", "NEW", "DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "OLDER", "ARCHIVED"];

export default function AdminArticles() {
  const [items, setItems] = useState<AdminArticle[]>([]);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (q) p.set("q", q);
    const res = await fetch(`/api/v1/admin/news?${p}`, { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setItems(json.data.items);
  }, [status, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: string) {
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/news/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="section-title mr-auto">Articles</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s || "All statuses"}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title…"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          {showNew ? "Close" : "+ New article"}
        </button>
      </div>

      {showNew && (
        <ArticleEditor
          onSaved={() => {
            setShowNew(false);
            load();
          }}
        />
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="max-w-xs px-3 py-2">
                  <a href={`/news/${a.slug}`} target="_blank" className="font-semibold hover:text-brand">
                    {a.title}
                  </a>
                  {a.isBreaking && <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">BREAKING</span>}
                  {a.isFeatured && <span className="ml-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">FEATURED</span>}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={a.status} />
                </td>
                <td className="px-3 py-2 text-slate-500">{a.category?.name}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(a.publishedAt)}</td>
                <td className="px-3 py-2 tabular-nums text-slate-500">{a.views.toLocaleString()}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {!["PUBLISHED"].includes(a.status) && a.status !== "ARCHIVED" && (
                      <ActionBtn onClick={() => act(a.id, "publish")} disabled={busyId === a.id}>Publish</ActionBtn>
                    )}
                    {a.status === "PUBLISHED" && (
                      <ActionBtn onClick={() => act(a.id, "unpublish")} disabled={busyId === a.id}>Unpublish</ActionBtn>
                    )}
                    {!a.isFeatured ? (
                      <ActionBtn onClick={() => act(a.id, "feature")} disabled={busyId === a.id}>Feature</ActionBtn>
                    ) : (
                      <ActionBtn onClick={() => act(a.id, "unfeature")} disabled={busyId === a.id}>Unfeature</ActionBtn>
                    )}
                    {!a.isBreaking ? (
                      <ActionBtn onClick={() => act(a.id, "mark_breaking")} disabled={busyId === a.id} danger>Breaking</ActionBtn>
                    ) : (
                      <ActionBtn onClick={() => act(a.id, "remove_breaking")} disabled={busyId === a.id}>End breaking</ActionBtn>
                    )}
                    {a.status !== "ARCHIVED" ? (
                      <ActionBtn onClick={() => act(a.id, "archive")} disabled={busyId === a.id}>Archive</ActionBtn>
                    ) : (
                      <ActionBtn onClick={() => act(a.id, "restore")} disabled={busyId === a.id}>Restore</ActionBtn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-500">No articles found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700",
    DRAFT: "bg-slate-100 text-slate-600",
    IN_REVIEW: "bg-purple-100 text-purple-700",
    APPROVED: "bg-teal-100 text-teal-700",
    SCHEDULED: "bg-indigo-100 text-indigo-700",
    PUBLISHED: "bg-green-100 text-green-700",
    OLDER: "bg-orange-100 text-orange-700",
    ARCHIVED: "bg-slate-200 text-slate-500",
  };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${styles[status] ?? ""}`}>{status}</span>;
}

function ActionBtn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-0.5 text-xs font-semibold disabled:opacity-40 ${
        danger ? "border-red-300 text-red-600 hover:bg-red-50" : "border-slate-300 text-slate-600 hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}
