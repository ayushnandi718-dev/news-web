"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDateTime } from "@/lib/format";
import ArticleEditor, { type EditorArticle } from "./ArticleEditor";
import {
  TABS,
  type TabId,
  type NewsroomItem,
  normalizeImported,
  normalizeArticle,
} from "./types";

interface ReadArticle extends EditorArticle {
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  category: { name: string } | null;
  sourceUrl: string | null;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function readTimeMin(text: string): number {
  return Math.max(1, Math.ceil(wordCount(text) / 200));
}

/* ─── StatusPill ──────────────────────────────────────────────── */

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
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}

/* ─── ActionBtn / BulkActionBtn ───────────────────────────────── */

function ActionBtn({
  children,
  onClick,
  disabled,
  danger,
  primary,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-2 py-0.5 text-xs font-semibold disabled:opacity-40 ${
        primary
          ? "border-brand bg-brand text-white hover:bg-brand-dark"
          : danger
            ? "border-red-300 text-red-600 hover:bg-red-50"
            : "border-slate-300 text-slate-600 hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

function BulkActionBtn({
  children,
  onClick,
  disabled,
  primary,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded border px-3 py-1 text-xs font-bold disabled:opacity-40 ${
        primary
          ? "border-brand bg-brand text-white hover:bg-brand-dark"
          : danger
            ? "border-red-300 text-red-600 hover:bg-red-50"
            : "border-slate-300 text-slate-700 hover:border-brand hover:text-brand"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── CategorySelect ─────────────────────────────────────────── */

function CategorySelect({
  categories,
  onPick,
  busy,
  label,
  primary,
}: {
  categories: Array<{ id: string; name: string }>;
  onPick: (categoryId?: string) => void;
  busy: boolean;
  label?: string;
  primary?: boolean;
}) {
  const [catId, setCatId] = useState("");
  const text = busy ? "Working…" : label ?? "Create draft";
  return (
    <div className="inline-flex gap-1">
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
        className={`rounded px-2 py-0.5 text-xs font-bold text-white disabled:opacity-40 ${
          primary
            ? "bg-green-600 hover:bg-green-700"
            : "bg-brand hover:bg-brand-dark"
        }`}
      >
        {text}
      </button>
    </div>
  );
}

/* ─── DeleteConfirmModal ─────────────────────────────────────── */

function DeleteConfirmModal({
  title,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-brand-ink">Delete article?</h3>
        <p className="mt-2 text-sm text-slate-600">
          This will permanently remove <span className="font-semibold">{title}</span>. This action cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="rounded bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── ReadModal ───────────────────────────────────────────────── */

function ReadModal({
  loading,
  article,
  onClose,
  onEdit,
  onPublish,
  busy,
}: {
  loading: boolean;
  article: ReadArticle | null;
  onClose: () => void;
  onEdit: () => void;
  onPublish: () => void;
  busy: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const content = article?.content ?? "";
  const paragraphs = content.split(/\n{2,}/).filter(Boolean);
  const words = wordCount(content);
  const readTime = readTimeMin(content);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Article preview"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl bg-white shadow-2xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
          <div className="flex items-center gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Preview</p>
            {article && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{words.toLocaleString()} words</span>
                <span>·</span>
                <span>{readTime} min read</span>
                <span>·</span>
                <span>{paragraphs.length} paragraphs</span>
              </div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close preview" className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6">
          {loading && <p className="py-10 text-center text-sm text-slate-400">Loading…</p>}
          {!loading && !article && <p className="py-10 text-center text-sm text-slate-400">Article could not be loaded.</p>}
          {article && (
            <article>
              {article.featuredImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={article.featuredImage} alt="" className="mb-4 max-h-72 w-full rounded-lg object-cover" />
              )}
              <h2 className="text-xl font-black leading-snug text-brand-ink sm:text-2xl">{article.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <StatusPill status={article.status} />
                {article.category && <span>{article.category.name}</span>}
                {article.authorName && <span>by {article.authorName}</span>}
                <span>{formatDateTime(article.updatedAt)}</span>
                {article.geographicScope && (
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{article.geographicScope}</span>
                )}
              </div>
              {article.excerpt && (
                <p className="mt-3 border-l-4 border-brand/60 pl-3 font-semibold leading-relaxed text-slate-700">{article.excerpt}</p>
              )}
              <div className="article-body mt-4 space-y-3 text-[15px] leading-relaxed text-slate-800">
                {paragraphs.map((p, i) => {
                  const trimmed = p.trim();
                  if (trimmed.startsWith("## ")) return <h3 key={i} className="mt-4 text-lg font-bold text-brand-ink">{trimmed.replace(/^##\s+/, "")}</h3>;
                  if (trimmed.startsWith("**") && trimmed.endsWith("**")) return <h4 key={i} className="mt-3 text-base font-bold text-slate-700">{trimmed.replace(/^\*\*|\*\*$/g, "")}</h4>;
                  if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) return <li key={i} className="ml-4 list-disc text-[15px] leading-relaxed">{trimmed.slice(2)}</li>;
                  if (/^\d+\.\s/.test(trimmed)) return <li key={i} className="ml-4 list-decimal text-[15px] leading-relaxed">{trimmed.replace(/^\d+\.\s+/, "")}</li>;
                  return <p key={i}>{trimmed}</p>;
                })}
              </div>
              {article.sourceUrl && (
                <p className="mt-4 truncate text-xs text-slate-400">Source: {article.sourceUrl}</p>
              )}
            </article>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
          {article && article.status !== "PUBLISHED" && (
            <button onClick={onPublish} disabled={busy || loading || !article} className="rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40">
              {busy ? "Publishing…" : "Publish"}
            </button>
          )}
          <button onClick={onEdit} disabled={loading || !article} className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand disabled:opacity-40">
            Edit karo
          </button>
          <button onClick={onClose} className="rounded px-4 py-2 text-sm font-semibold text-slate-500 hover:text-brand">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────── */

export default function NewsroomPanel() {
  const [allItems, setAllItems] = useState<NewsroomItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<EditorArticle | null>(null);
  const [reading, setReading] = useState<{ id: string; title: string } | null>(null);
  const [readData, setReadData] = useState<ReadArticle | null>(null);
  const [readLoading, setReadLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [deleting, setDeleting] = useState<{ id: string; title: string } | null>(null);
  const [qualityGate, setQualityGate] = useState<{ id: string; title: string; issues: Array<{ field: string; message: string; severity: "error" | "warning" }> } | null>(null);

  /* ─── Data load ─────────────────────────────────────────────── */

  const load = useCallback(async () => {
    const [inboxRes, newsRes] = await Promise.all([
      fetch("/api/v1/admin/inbox", { cache: "no-store" }),
      fetch("/api/v1/admin/news?limit=500", { cache: "no-store" }),
    ]);
    const inboxJson = await inboxRes.json();
    const newsJson = await newsRes.json();

    const imported: NewsroomItem[] = (inboxJson.data?.items ?? [])
      .filter((i: Record<string, string>) => i.status !== "REJECTED" && i.status !== "CONVERTED_DRAFT")
      .map(normalizeImported);
    const articles: NewsroomItem[] = (newsJson.data?.items ?? []).map(normalizeArticle);

    const byLatest = (a: NewsroomItem, b: NewsroomItem) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

    setAllItems([...imported, ...articles].sort(byLatest));
    setSelected(new Set());
  }, []);

  useEffect(() => {
    load();
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((j) => j.ok && setCategories(j.data.items))
      .catch(() => {});
  }, [load]);

  /* ─── Computed ──────────────────────────────────────────────── */

  const tabCounts = useMemo(() => {
    const counts: Record<TabId, number> = {
      all: 0, new: 0, drafts: 0, review: 0,
      approved: 0, scheduled: 0, published: 0, archived: 0,
    };
    for (const item of allItems) {
      for (const tab of TABS) {
        if (tab.filter(item)) counts[tab.id]++;
      }
    }
    return counts;
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab)!;
    let items = allItems.filter(tab.filter);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.title.toLowerCase().includes(q));
    }
    if (categoryFilter) {
      items = items.filter((i) => i.category === categoryFilter);
    }
    return items;
  }, [allItems, activeTab, search, categoryFilter]);

  const allSelected = filteredItems.length > 0 && selected.size === filteredItems.length;
  const someSelected = selected.size > 0 && selected.size < filteredItems.length;
  const uniqueCategories = useMemo(() => {
    const set = new Set(allItems.map((i) => i.category).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [allItems]);

  /* ─── Actions: imported → article ───────────────────────────── */

  async function convertToDraft(item: NewsroomItem, categoryId?: string) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/v1/admin/inbox/${item.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create_draft", categoryId }),
      });
      const json = await res.json();
      if (json.ok) {
        setAllItems((prev) => prev.filter((i) => i.id !== item.id));
        showToast(`Draft created — "${json.data?.article?.title?.slice(0, 50)}…"`);
        await load();
      } else {
        showToast(json.error || "Action failed");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function publishImported(item: NewsroomItem, categoryId?: string) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/v1/admin/inbox/${item.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish", categoryId }),
      });
      const json = await res.json();
      if (json.ok) {
        setAllItems((prev) => prev.filter((i) => i.id !== item.id));
        if (json.data?.published) {
          showToast(`Published — "${item.title.slice(0, 50)}…"`);
        } else {
          showToast("Content too thin — saved as draft instead");
        }
        await load();
      } else {
        showToast(json.error || "Action failed");
      }
    } finally {
      setBusyId(null);
    }
  }

  async function removeImport(item: NewsroomItem) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/v1/admin/inbox/${item.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      const json = await res.json();
      if (json.ok) {
        setAllItems((prev) => prev.filter((i) => i.id !== item.id));
        showToast("Removed");
        await load();
      } else {
        showToast(json.error || "Action failed");
      }
    } finally {
      setBusyId(null);
    }
  }

  /* ─── Actions: articles ─────────────────────────────────────── */

  async function actArticle(id: string, action: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/v1/admin/news/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!json.ok) {
        if (res.status === 422 && Array.isArray(json.issues)) {
          if (reading?.id === id) { setReading(null); setReadData(null); }
          setQualityGate({ id, title: allItems.find((i) => i.id === id)?.title ?? "", issues: json.issues });
        } else {
          showToast(json.error || "Action failed");
        }
        return;
      }
      await load();
      if (reading?.id === id) { setReading(null); setReadData(null); }
      if (editing?.id === id) { setEditing(null); }
    } finally {
      setBusyId(null);
    }
  }

  async function deleteArticle() {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      const res = await fetch(`/api/v1/admin/news/${deleting.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) {
        setAllItems((prev) => prev.filter((i) => i.id !== deleting.id));
        showToast("Article deleted");
        await load();
      } else {
        showToast(json.error || "Delete failed");
      }
    } finally {
      setDeleting(null);
      setBusyId(null);
    }
  }

  /* ─── Bulk ──────────────────────────────────────────────────── */

  async function bulkActArticle(action: string) {
    const ids = Array.from(selected).filter((id) => allItems.find((i) => i.id === id)?.type === "article");
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/v1/admin/news/${id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        return { id, ok: res.ok, status: res.status };
      }));
      const succeeded = results.filter((r) => r.ok).length;
      const blocked = results.filter((r) => r.status === 422).length;
      if (blocked > 0) {
        showToast(`${succeeded} done, ${blocked} blocked by quality gate — review individually`);
      } else {
        const verb: Record<string, string> = { publish: "published", unpublish: "unpublished", archive: "archived", restore: "restored" };
        showToast(`${succeeded} article${succeeded !== 1 ? "s" : ""} ${verb[action] ?? action}`);
      }
      setSelected(new Set());
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkDeleteArticles() {
    const ids = Array.from(selected).filter((id) => allItems.find((i) => i.id === id)?.type === "article");
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/v1/admin/news/${id}`, { method: "DELETE" });
        return { id, ok: res.ok };
      }));
      const succeeded = results.filter((r) => r.ok).length;
      setAllItems((prev) => prev.filter((i) => !results.find((r) => r.id === i.id && r.ok)));
      setSelected(new Set());
      showToast(`${succeeded} article${succeeded !== 1 ? "s" : ""} deleted`);
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkConvertImports(action: string) {
    const ids = Array.from(selected).filter((id) => {
      const item = allItems.find((i) => i.id === id);
      return item?.type === "imported";
    });
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.all(ids.map(async (id) => {
        const res = await fetch(`/api/v1/admin/inbox/${id}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = await res.json();
        return { id, ok: json.ok };
      }));
      const succeeded = results.filter((r) => r.ok).map((r) => r.id);
      setAllItems((prev) => prev.filter((i) => !succeeded.includes(i.id)));
      setSelected(new Set());
      showToast(`${succeeded.length} item${succeeded.length > 1 ? "s" : ""} processed`);
      await load();
    } finally {
      setBulkBusy(false);
    }
  }

  /* ─── Selection ─────────────────────────────────────────────── */

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredItems.length) setSelected(new Set());
    else setSelected(new Set(filteredItems.map((i) => i.id)));
  }

  /* ─── Read / Edit ───────────────────────────────────────────── */

  async function openRead(item: NewsroomItem) {
    if (item.type === "imported") {
      if (item.sourceUrl) window.open(item.sourceUrl, "_blank");
      return;
    }
    setReading({ id: item.id, title: item.title });
    setReadData(null);
    setReadLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/news/${item.id}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setReadData(json.data.article);
    } finally {
      setReadLoading(false);
    }
  }

  async function startEdit(item: NewsroomItem) {
    if (item.type === "imported") return;
    setReadLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/news/${item.id}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setEditing(json.data.article);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } finally {
      setReadLoading(false);
    }
  }

  async function editImported(item: NewsroomItem) {
    if (item.type !== "imported") return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/v1/admin/inbox/${item.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create_draft" }),
      });
      const json = await res.json();
      if (json.ok && json.data?.article) {
        const articleRes = await fetch(`/api/v1/admin/news/${json.data.article.id}`, { cache: "no-store" });
        const articleJson = await articleRes.json();
        if (articleJson.ok) {
          setEditing(articleJson.data.article);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        await load();
      } else {
        showToast(json.error || "Failed to convert article");
      }
    } finally {
      setBusyId(null);
    }
  }

  function startEditFromRead() {
    if (!readData) return;
    setEditing(readData);
    setReading(null);
    setReadData(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ─── Row actions by type + status ──────────────────────────── */

  function rowActions(item: NewsroomItem) {
    if (item.type === "imported") {
      if (item.status === "PENDING") {
        return (
          <div className="flex flex-wrap items-center gap-1">
            <CategorySelect categories={categories} onPick={(cid) => convertToDraft(item, cid)} busy={busyId === item.id} label="Draft" />
            <CategorySelect categories={categories} onPick={(cid) => publishImported(item, cid)} busy={busyId === item.id} label="Publish" primary />
            <ActionBtn onClick={() => openRead(item)} disabled={busyId === item.id || readLoading}>Read</ActionBtn>
            <ActionBtn onClick={() => editImported(item)} disabled={busyId === item.id || readLoading}>Edit</ActionBtn>
            {item.sourceUrl && (
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand">Open source</a>
            )}
            <ActionBtn danger onClick={() => removeImport(item)} disabled={busyId === item.id}>Delete</ActionBtn>
          </div>
        );
      }
      if (item.status === "DUPLICATE_CANDIDATE") {
        return (
          <div className="flex flex-wrap items-center gap-1">
            <CategorySelect categories={categories} onPick={(cid) => convertToDraft(item, cid)} busy={busyId === item.id} label="Draft" />
            <ActionBtn onClick={() => openRead(item)} disabled={busyId === item.id || readLoading}>Read</ActionBtn>
            <ActionBtn onClick={() => editImported(item)} disabled={busyId === item.id || readLoading}>Edit</ActionBtn>
            {item.sourceUrl && (
              <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="rounded border border-slate-300 px-2 py-0.5 text-xs font-semibold text-slate-600 hover:border-brand hover:text-brand">Open source</a>
            )}
            <ActionBtn danger onClick={() => removeImport(item)} disabled={busyId === item.id}>Delete</ActionBtn>
          </div>
        );
      }
      return null;
    }

    switch (item.status) {
      case "NEW":
      case "DRAFT":
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionBtn onClick={() => openRead(item)} disabled={busyId === item.id || readLoading}>Read</ActionBtn>
            <ActionBtn onClick={() => startEdit(item)} disabled={busyId === item.id || readLoading}>Edit</ActionBtn>
            <ActionBtn primary onClick={() => actArticle(item.id, "publish")} disabled={busyId === item.id}>Publish</ActionBtn>
            <ActionBtn danger onClick={() => setDeleting({ id: item.id, title: item.title })} disabled={busyId === item.id}>Delete</ActionBtn>
          </div>
        );
      case "IN_REVIEW":
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionBtn onClick={() => openRead(item)} disabled={readLoading}>Read</ActionBtn>
            <ActionBtn onClick={() => startEdit(item)} disabled={readLoading}>Edit</ActionBtn>
            <ActionBtn primary onClick={() => actArticle(item.id, "approve")} disabled={busyId === item.id}>Approve</ActionBtn>
            <ActionBtn danger onClick={() => actArticle(item.id, "reject")} disabled={busyId === item.id}>Reject</ActionBtn>
          </div>
        );
      case "APPROVED":
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionBtn onClick={() => openRead(item)} disabled={readLoading}>Read</ActionBtn>
            <ActionBtn onClick={() => startEdit(item)} disabled={readLoading}>Edit</ActionBtn>
            <ActionBtn primary onClick={() => actArticle(item.id, "publish")} disabled={busyId === item.id}>Publish</ActionBtn>
            <ActionBtn danger onClick={() => setDeleting({ id: item.id, title: item.title })} disabled={busyId === item.id}>Delete</ActionBtn>
          </div>
        );
      case "SCHEDULED":
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionBtn onClick={() => openRead(item)} disabled={readLoading}>Read</ActionBtn>
            <ActionBtn onClick={() => startEdit(item)} disabled={readLoading}>Edit</ActionBtn>
            <ActionBtn onClick={() => actArticle(item.id, "unpublish")} disabled={busyId === item.id}>Cancel Schedule</ActionBtn>
            <ActionBtn danger onClick={() => setDeleting({ id: item.id, title: item.title })} disabled={busyId === item.id}>Delete</ActionBtn>
          </div>
        );
      case "PUBLISHED":
      case "OLDER":
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionBtn onClick={() => openRead(item)} disabled={readLoading}>Read</ActionBtn>
            <ActionBtn onClick={() => startEdit(item)} disabled={readLoading}>Edit</ActionBtn>
            <ActionBtn onClick={() => actArticle(item.id, "unpublish")} disabled={busyId === item.id}>Unpublish</ActionBtn>
            <ActionBtn onClick={() => actArticle(item.id, "archive")} disabled={busyId === item.id}>Archive</ActionBtn>
          </div>
        );
      case "ARCHIVED":
        return (
          <div className="flex flex-wrap items-center gap-1">
            <ActionBtn onClick={() => openRead(item)} disabled={readLoading}>Read</ActionBtn>
            <ActionBtn primary onClick={() => actArticle(item.id, "restore")} disabled={busyId === item.id}>Restore</ActionBtn>
            <ActionBtn danger onClick={() => setDeleting({ id: item.id, title: item.title })} disabled={busyId === item.id}>Delete</ActionBtn>
          </div>
        );
      default:
        return null;
    }
  }

  /* ─── Toast ─────────────────────────────────────────────────── */

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  /* ─── Render ────────────────────────────────────────────────── */

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="section-title mr-auto">Articles</h1>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded bg-brand px-4 py-1.5 text-sm font-bold text-white hover:bg-brand-dark"
        >
          {showNew ? "Close" : "+ New article"}
        </button>
      </div>

      {/* Editor */}
      {showNew && <ArticleEditor onSaved={() => { setShowNew(false); load(); }} />}
      {editing && (
        <ArticleEditor
          key={editing.id}
          article={editing}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelected(new Set()); }}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? "border-brand bg-brand text-white"
                : "border-slate-300 text-slate-600 hover:border-brand"
            }`}
          >
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeTab === tab.id ? "bg-white/20 text-white" : "bg-brand/10 text-brand"
              }`}>
                {tabCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search + category filter */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title…"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All categories</option>
          {uniqueCategories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* ReadModal */}
      {reading && (
        <ReadModal
          loading={readLoading}
          article={readData}
          onClose={() => { setReading(null); setReadData(null); }}
          onEdit={startEditFromRead}
          onPublish={() => actArticle(reading.id, "publish")}
          busy={busyId === reading.id}
        />
      )}

      {/* DeleteConfirmModal */}
      {deleting && (
        <DeleteConfirmModal
          title={deleting.title}
          onConfirm={deleteArticle}
          onCancel={() => setDeleting(null)}
          busy={busyId === deleting.id}
        />
      )}

      {/* Quality Gate Modal */}
      {qualityGate && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4" onClick={() => setQualityGate(null)}>
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-lg">⚠️</span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cannot publish yet</h3>
                <p className="text-xs text-slate-500">Fix the issues below, then try again</p>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto px-6 py-4">
              <p className="mb-2 text-xs font-semibold text-slate-700">"{qualityGate.title}"</p>
              <ul className="space-y-2">
                {qualityGate.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0 text-xs">{issue.severity === "error" ? "🔴" : "🟡"}</span>
                    <div>
                      <span className="font-semibold text-slate-800">{issue.field}:</span>{" "}
                      <span className="text-slate-600">{issue.message}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-3">
              <button onClick={() => setQualityGate(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Close
              </button>
              <button
                onClick={() => {
                  const item = allItems.find((i) => i.id === qualityGate.id);
                  setQualityGate(null);
                  if (item && item.type === "article") startEdit(item);
                }}
                className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Edit Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand/5 px-4 py-2.5">
          <span className="text-sm font-bold text-brand">{selected.size} selected</span>
          <span className="text-slate-300">|</span>
          {(() => {
            const sel = Array.from(selected).map((id) => allItems.find((i) => i.id === id)).filter(Boolean) as NewsroomItem[];
            const importCount = sel.filter((i) => i.type === "imported").length;
            const articleCount = sel.filter((i) => i.type === "article").length;
            return (
              <>
                {importCount > 0 && (
                  <>
                    <BulkActionBtn onClick={() => bulkConvertImports("publish")} disabled={bulkBusy} primary>Publish {importCount > 1 ? "Items" : "Item"}</BulkActionBtn>
                    <BulkActionBtn onClick={() => bulkConvertImports("create_draft")} disabled={bulkBusy}>Save as Draft{importCount > 1 ? "s" : ""}</BulkActionBtn>
                    <BulkActionBtn onClick={() => bulkConvertImports("reject")} disabled={bulkBusy} danger>Remove {importCount > 1 ? "Items" : "Item"}</BulkActionBtn>
                  </>
                )}
                {articleCount > 0 && (
                  <>
                    <BulkActionBtn onClick={() => bulkActArticle("publish")} disabled={bulkBusy} primary>Publish</BulkActionBtn>
                    <BulkActionBtn onClick={() => bulkActArticle("unpublish")} disabled={bulkBusy}>Unpublish</BulkActionBtn>
                    <BulkActionBtn onClick={() => bulkActArticle("archive")} disabled={bulkBusy}>Archive</BulkActionBtn>
                    <BulkActionBtn onClick={() => bulkActArticle("restore")} disabled={bulkBusy}>Restore</BulkActionBtn>
                    <BulkActionBtn onClick={bulkDeleteArticles} disabled={bulkBusy} danger>Delete</BulkActionBtn>
                  </>
                )}
              </>
            );
          })()}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs font-semibold text-slate-500 hover:text-brand">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-brand"
                />
              </th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr
                key={item.id}
                className={`border-b border-slate-100 last:border-0 ${selected.has(item.id) ? "bg-brand/5" : ""}`}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="h-3.5 w-3.5 rounded border-slate-300 accent-brand"
                  />
                </td>
                <td className="max-w-xs px-3 py-2">
                  {item.type === "article" && (item.status === "PUBLISHED" || item.status === "OLDER") && item.slug ? (
                    <a href={`/news/${item.slug}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-brand">
                      {item.title}
                    </a>
                  ) : (
                    <span className="font-semibold">{item.title}</span>
                  )}
                  {item.isBreaking && <span className="ml-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">BREAKING</span>}
                  {item.isFeatured && <span className="ml-1 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-black">FEATURED</span>}
                  {item.status === "DUPLICATE_CANDIDATE" && (
                    <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">DUP</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {item.type === "imported" ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      RSS Import
                      {item.sourceName && <span className="font-normal"> · {item.sourceName}</span>}
                    </span>
                  ) : (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">Article</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <StatusPill status={item.status} />
                </td>
                <td className="px-3 py-2 text-slate-500">{item.category ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{formatDateTime(item.updatedAt)}</td>
                <td className="px-3 py-2 tabular-nums text-slate-500">
                  {item.type === "article" ? (item.views ?? 0).toLocaleString() : "—"}
                </td>
                <td className="px-3 py-2">{rowActions(item)}</td>
              </tr>
            ))}
            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  {search ? "No items match your search." : "No items in this tab."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg bg-brand-ink px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
