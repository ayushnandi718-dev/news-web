"use client";

import { useEffect, useRef, useState } from "react";
import { slugify } from "@/lib/text";

interface Category {
  id: string;
  name: string;
}

type GeographicScope = "LOCAL" | "REGIONAL" | "STATE" | "NATIONAL" | "INTERNATIONAL";

interface MediaRow {
  id: string;
  url: string;
  alt: string | null;
}

export interface ArticleEditorProps {
  onSaved: () => void;
}

export default function ArticleEditor({ onSaved }: ArticleEditorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [showMedia, setShowMedia] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    slugLocked: false,
    excerpt: "",
    content: "",
    categoryId: "",
    subcategoryId: "",
    regionId: "",
    featuredImage: "",
    imageCaption: "",
    imageCredit: "",
    tags: "",
    status: "DRAFT",
    scheduledAt: "",
    isBreaking: false,
    breakingMinutes: 120,
    isFeatured: false,
    editorialPriority: 0,
    geographicPriority: 0,
    geographicScope: "LOCAL" as GeographicScope,
    district: "",
    state: "",
    country: "",
    sourceNotes: "",
    seoTitle: "",
    seoDescription: "",
    ogImage: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    // Load categories
    fetch("/api/v1/categories")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setCategories(j.data.items);
          setForm((f) => ({ ...f, categoryId: f.categoryId || j.data.items[0]?.id || "" }));
        }
      })
      .catch(() => {});

    // Load regions
    fetch("/api/v1/admin/regions")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setRegions(j.data.items);
        }
      })
      .catch(() => {});

    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("article_editor_draft");
      if (cached) {
        try {
          setForm((f) => ({ ...f, ...JSON.parse(cached) }));
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (!showMedia || media.length) return;
    fetch("/api/v1/admin/media", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setMedia(j.data.items);
      })
      .catch(() => {});
  }, [showMedia, media.length]);

  // Load subcategories when category changes
  useEffect(() => {
    if (!form.categoryId) {
      setSubcategories([]);
      setForm((f) => ({ ...f, subcategoryId: "" }));
      return;
    }
    fetch(`/api/v1/admin/subcategories?categoryId=${form.categoryId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setSubcategories(j.data.items);
          setForm((f) => ({ ...f, subcategoryId: "" }));
        }
      })
      .catch(() => {});
  }, [form.categoryId]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (formRef.current.title && dirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      localStorage.setItem("article_editor_draft", JSON.stringify(formRef.current));
      setSavedAt(new Date().toLocaleTimeString());
    }, 1200);
    return () => clearTimeout(t);
  }, [form, dirty]);

  function update(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  async function save(publishNow: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/v1/admin/news", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug || undefined,
          excerpt: form.excerpt,
          content: form.content,
          categoryId: form.categoryId,
          subcategoryId: form.subcategoryId || undefined,
          regionId: form.regionId || undefined,
          featuredImage: form.featuredImage || undefined,
          imageCaption: form.imageCaption || undefined,
          imageCredit: form.imageCredit || undefined,
          status: publishNow ? "PUBLISHED" : "DRAFT",
          scheduledAt: !publishNow && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
          isBreaking: form.isBreaking,
          breakingMinutes: form.isBreaking ? Number(form.breakingMinutes) : undefined,
          isFeatured: form.isFeatured,
          editorialPriority: Number(form.editorialPriority),
          geographicPriority: Number(form.geographicPriority),
          geographicScope: form.geographicScope,
          district: form.district || undefined,
          state: form.state || undefined,
          country: form.country || undefined,
          sourceNotes: form.sourceNotes || undefined,
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
          ogImage: form.ogImage || undefined,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Save failed");
        return;
      }
      localStorage.removeItem("article_editor_draft");
      setDirty(false);
      onSaved();
      setForm({
        title: "", slug: "", slugLocked: false, excerpt: "", content: "", categoryId: categories[0]?.id ?? "",
        subcategoryId: "", regionId: "",
        featuredImage: "", imageCaption: "", imageCredit: "", tags: "", status: "DRAFT",
        scheduledAt: "", isBreaking: false, breakingMinutes: 120, isFeatured: false, editorialPriority: 0,
        geographicPriority: 0, geographicScope: "LOCAL",
        district: "", state: "", country: "", sourceNotes: "", seoTitle: "", seoDescription: "", ogImage: "",
      });
    } catch {
      setError("Network error — your draft is saved locally.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <input
        value={form.title}
        onChange={(e) =>
          update({ title: e.target.value, ...(form.slugLocked ? {} : { slug: slugify(e.target.value) }) })
        }
        placeholder="Headline"
        className="w-full rounded border border-slate-300 px-3 py-2 text-base font-bold outline-none focus:border-brand"
        required
      />
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-slate-400">/news/</span>
        <input
          value={form.slug}
          onChange={(e) => update({ slug: slugify(e.target.value), slugLocked: true })}
          placeholder="auto-generated-from-headline"
          className="flex-1 rounded border border-slate-200 px-2 py-1 font-mono text-xs"
        />
        {form.slugLocked && (
          <button onClick={() => update({ slug: slugify(form.title), slugLocked: false })} className="text-xs text-brand hover:underline">
            Reset
          </button>
        )}
      </div>

      <textarea
        value={form.excerpt}
        onChange={(e) => update({ excerpt: e.target.value })}
        placeholder="Excerpt / standfirst shown on cards and social previews"
        rows={2}
        className="mt-3 w-full rounded border border-slate-300 px-3 py-2 text-sm"
        required
      />
      <textarea
        value={form.content}
        onChange={(e) => update({ content: e.target.value })}
        placeholder="Full story body…"
        rows={8}
        className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm leading-relaxed"
        required
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <select
          value={form.categoryId}
          onChange={(e) => update({ categoryId: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={form.subcategoryId}
          onChange={(e) => update({ subcategoryId: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
          disabled={!subcategories.length}
        >
          <option value="">No subcategory</option>
          {subcategories.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={form.regionId}
          onChange={(e) => update({ regionId: e.target.value })}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">No region</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <input
          value={form.tags}
          onChange={(e) => update({ tags: e.target.value })}
          placeholder="Tags, comma, separated (optional)"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <input
          value={form.featuredImage}
          onChange={(e) => update({ featuredImage: e.target.value })}
          placeholder="Featured image URL"
          className="min-w-48 flex-1 rounded border border-slate-300 px-2 py-1.5"
        />
        <button type="button" onClick={() => setShowMedia((v) => !v)} className="rounded border border-slate-300 px-2 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
          Pick from library
        </button>
      </div>
      {showMedia && (
        <div className="mt-2 grid max-h-40 grid-cols-4 gap-2 overflow-y-auto rounded border border-slate-200 p-2 sm:grid-cols-6">
          {(media.length ? media : []).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                update({ featuredImage: m.url });
                setShowMedia(false);
              }}
              className={`overflow-hidden rounded border-2 ${form.featuredImage === m.url ? "border-brand" : "border-transparent"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" className="h-14 w-full object-cover" />
            </button>
          ))}
          {!media.length && <p className="col-span-6 py-3 text-center text-xs text-slate-400">No media uploaded yet.</p>}
        </div>
      )}
      {form.featuredImage && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input value={form.imageCaption} onChange={(e) => update({ imageCaption: e.target.value })} placeholder="Image caption" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
          <input value={form.imageCredit} onChange={(e) => update({ imageCredit: e.target.value })} placeholder="Image credit" className="rounded border border-slate-300 px-2 py-1.5 text-xs" />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={!form.scheduledAt}
            onChange={() => update({ scheduledAt: "" })}
          />
          Publish now
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={!!form.scheduledAt}
            onChange={() =>
              update({ scheduledAt: new Date(Date.now() + 3600_000).toISOString().slice(0, 16) })
            }
          />
          Schedule for
        </label>
        {form.scheduledAt && (
          <input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => update({ scheduledAt: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1"
          />
        )}
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={form.isBreaking} onChange={(e) => update({ isBreaking: e.target.checked })} />
          Breaking
        </label>
        {form.isBreaking && (
          <select value={form.breakingMinutes} onChange={(e) => update({ breakingMinutes: Number(e.target.value) })} className="rounded border border-slate-300 px-1.5 py-1 text-xs">
            {[30, 60, 120, 240].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        )}
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => update({ isFeatured: e.target.checked })} />
          Featured
        </label>
        <label className="flex items-center gap-1 text-xs text-slate-500">
          Priority
          <select value={form.editorialPriority} onChange={(e) => update({ editorialPriority: Number(e.target.value) })} className="rounded border border-slate-300 px-1 py-0.5">
            <option value={0}>Normal</option>
            <option value={1}>High</option>
            <option value={2}>Very high</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-500">Geographic Scope</label>
          <select
            value={form.geographicScope}
            onChange={(e) => update({ geographicScope: e.target.value as GeographicScope })}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value="LOCAL">Local</option>
            <option value="REGIONAL">Regional</option>
            <option value="STATE">State</option>
            <option value="NATIONAL">National</option>
            <option value="INTERNATIONAL">International</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">Geographic Priority</label>
          <select
            value={form.geographicPriority}
            onChange={(e) => update({ geographicPriority: Number(e.target.value) })}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          >
            <option value={0}>Normal</option>
            <option value={1}>High</option>
            <option value={2}>Very high</option>
            <option value={3}>Maximum</option>
          </select>
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <input
          value={form.district}
          onChange={(e) => update({ district: e.target.value })}
          placeholder="District (optional)"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          value={form.state}
          onChange={(e) => update({ state: e.target.value })}
          placeholder="State (optional)"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          value={form.country}
          onChange={(e) => update({ country: e.target.value })}
          placeholder="Country (optional)"
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mt-3 border-t border-slate-200 pt-3">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">SEO & Metadata</h3>
        <div className="space-y-2">
          <input
            value={form.seoTitle}
            onChange={(e) => update({ seoTitle: e.target.value })}
            placeholder="SEO Title (optional - overrides headline)"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <textarea
            value={form.seoDescription}
            onChange={(e) => update({ seoDescription: e.target.value })}
            placeholder="SEO Description (optional - for search results)"
            rows={2}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            value={form.ogImage}
            onChange={(e) => update({ ogImage: e.target.value })}
            placeholder="Open Graph Image URL (optional - for social sharing)"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs text-slate-500">Source Notes (internal - not published)</label>
        <textarea
          value={form.sourceNotes}
          onChange={(e) => update({ sourceNotes: e.target.value })}
          placeholder="Internal notes about sources, verification status, etc."
          rows={2}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {savedAt ? `Draft autosaved locally at ${savedAt}` : dirty ? "Editing…" : ""}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => save(false)}
            disabled={busy || !form.title || !form.excerpt || !form.content}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand disabled:opacity-40"
          >
            {form.scheduledAt ? "Schedule" : "Save draft"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={busy || !form.title || !form.excerpt || !form.content}
            className="rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40"
          >
            {busy ? "Saving…" : "Publish now"}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
