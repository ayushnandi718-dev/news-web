"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";

interface ImportedRow {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  status: string;
  similarity: number | null;
  duplicateOfArticleId: string | null;
  sourcePublishedAt: string | null;
  fetchedAt: string;
  source: { name: string; authorized: boolean };
}

const FILTERS = ["", "PENDING", "DUPLICATE_CANDIDATE", "CONVERTED_DRAFT", "REJECTED"];

export default function AdminInbox() {
  const [items, setItems] = useState<ImportedRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("PENDING");
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const p = filter ? `?status=${filter}` : "";
    const res = await fetch(`/api/v1/admin/inbox${p}`, { cache: "no-store" });
    const json = await res.json();
    if (json.ok) {
      setItems(json.data.items);
      setCounts(json.data.counts);
    }
  }, [filter]);

  useEffect(() => {
    load();
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((j) => j.ok && setCategories(j.data.items))
      .catch(() => {});
  }, [load]);

  async function act(id: string, action: string, categoryId?: string) {
    setBusyId(id);
    setMsg("");
    try {
      const res = await fetch(`/api/v1/admin/inbox/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, categoryId }),
      });
      const json = await res.json();
      if (json.ok) {
        setMsg(
          action === "reject"
            ? "Item rejected."
            : `Draft created: "${json.data.article.title}" — review it in Articles (status NEW).`
        );
        await load();
      } else {
        setMsg(json.error || "Action failed");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="section-title mr-auto">Ingestion inbox</h1>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              filter === f ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600 hover:border-brand"
            }`}
          >
            {f || "ALL"} {f && counts[f] ? `(${counts[f]})` : ""}
          </button>
        ))}
      </div>

      {msg && <p className="mb-3 rounded bg-blue-50 px-3 py-2 text-sm text-blue-800">{msg}</p>}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold leading-snug text-slate-900">{item.title}</p>
                <p className="mt-0.5 line-clamp-2 text-sm text-slate-600">{item.summary}</p>
                <p className="mt-1 text-xs text-slate-500">
                  <span className={`mr-2 rounded px-1.5 py-0.5 font-bold ${
                    item.status === "PENDING"
                      ? "bg-blue-100 text-blue-700"
                      : item.status === "DUPLICATE_CANDIDATE"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}>
                    {item.status.replace("_", " ")}
                  </span>
                  {item.source.name}
                  {!item.source.authorized && <span className="ml-1 text-red-600">(unauthorized)</span>}
                  {" · fetched "}
                  {formatDateTime(item.fetchedAt)}
                  {item.similarity != null && <span className="ml-2 font-semibold text-amber-700">similarity {Math.round(item.similarity * 100)}%</span>}
                </p>
                {item.status === "DUPLICATE_CANDIDATE" && (
                  <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    ⚠ Possible duplicate detected. Existing article ID: {item.duplicateOfArticleId ?? "similar pending import"}.
                    Choose “Open existing” to verify, or create a new story if it is genuinely different.
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-1">
                {item.status !== "CONVERTED_DRAFT" && (
                  <>
                    <CategorySelect onPick={(cid) => act(item.id, "create_draft", cid)} busy={busyId === item.id} categories={categories} />
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded border border-slate-300 px-2 py-0.5 text-center text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand"
                    >
                      Open source
                    </a>
                    {item.duplicateOfArticleId && (
                      <button
                        onClick={() => act(item.id, "reject")}
                        disabled={busyId === item.id}
                        className="rounded border border-red-300 px-2 py-0.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        Discard as duplicate
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="py-8 text-center text-sm text-slate-500">Inbox is empty for this filter.</li>}
      </ul>
    </div>
  );
}

function CategorySelect({
  categories,
  onPick,
  busy,
}: {
  categories: Array<{ id: string; name: string }>;
  onPick: (categoryId?: string) => void;
  busy: boolean;
}) {
  const [catId, setCatId] = useState("");
  return (
    <div className="flex gap-1">
      <select
        value={catId}
        onChange={(e) => setCatId(e.target.value)}
        className="rounded border border-slate-300 px-1 py-0.5 text-xs"
      >
        <option value="">Auto category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button
        onClick={() => onPick(catId || undefined)}
        disabled={busy}
        className="rounded bg-brand px-3 py-0.5 text-xs font-bold text-white hover:bg-brand-dark disabled:opacity-40"
      >
        Create draft
      </button>
    </div>
  );
}
