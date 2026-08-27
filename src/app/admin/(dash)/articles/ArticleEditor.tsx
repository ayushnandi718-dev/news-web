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

export interface EditorArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: string;
  featuredImage: string | null;
  imageCaption: string | null;
  imageCredit: string | null;
  categoryId: string;
  subcategoryId: string | null;
  regionId: string | null;
  scheduledAt: string | null;
  isBreaking: boolean;
  isFeatured: boolean;
  editorialPriority: number;
  geographicPriority: number;
  geographicScope: string;
  district: string | null;
  state: string | null;
  country: string | null;
  sourceNotes: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImage: string | null;
  tagNames: string[];
}

export interface ArticleEditorProps {
  onSaved: () => void;
  article?: EditorArticle;
}

export default function ArticleEditor({ onSaved, article }: ArticleEditorProps) {
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
    geographicScope: "LOCAL" as any,
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
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<"featuredImage" | "ogImage">("featuredImage");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  async function handleUpload(file: File, field: "featuredImage" | "ogImage" = "featuredImage") {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("alt", formRef.current.title || file.name);
      const res = await fetch("/api/v1/admin/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error || "Image upload failed");
        return;
      }
      setMedia((m) => [json.data.media, ...m]);
      update({ [field]: json.data.media.url } as Partial<typeof form>);
    } catch {
      setError("Image upload failed — check connection and try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

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

    if (typeof window !== "undefined" && !article) {
      const cached = localStorage.getItem("article_editor_draft");
      if (cached) {
        try {
          setForm((f) => ({ ...f, ...JSON.parse(cached) }));
        } catch {}
      }
    }
  }, []);

  // Prefill when editing an existing article
  useEffect(() => {
    if (!article) return;
    setForm((f) => ({
      ...f,
      title: article.title,
      slug: article.slug,
      slugLocked: true,
      excerpt: article.excerpt,
      content: article.content,
      categoryId: article.categoryId || f.categoryId,
      subcategoryId: "",
      regionId: article.regionId ?? "",
      featuredImage: article.featuredImage ?? "",
      imageCaption: article.imageCaption ?? "",
      imageCredit: article.imageCredit ?? "",
      tags: article.tagNames.join(", "),
      status: article.status,
      scheduledAt: article.scheduledAt ? new Date(article.scheduledAt).toISOString().slice(0, 16) : "",
      isBreaking: article.isBreaking,
      isFeatured: article.isFeatured,
      editorialPriority: article.editorialPriority,
      geographicPriority: article.geographicPriority,
      geographicScope: article.geographicScope,
      district: article.district ?? "",
      state: article.state ?? "",
      country: article.country ?? "",
      sourceNotes: article.sourceNotes ?? "",
      seoTitle: article.seoTitle ?? "",
      seoDescription: article.seoDescription ?? "",
      ogImage: article.ogImage ?? "",
    }));
    setDirty(false);
    keepSubRef.current = article.subcategoryId ?? "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const keepSubRef = useRef<string | null>(null);
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
          setForm((f) => ({ ...f, subcategoryId: keepSubRef.current ?? "" }));
          keepSubRef.current = null;
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
    if (!dirty || article) return;
    const t = setTimeout(() => {
      localStorage.setItem("article_editor_draft", JSON.stringify(formRef.current));
      setSavedAt(new Date().toLocaleTimeString());
    }, 1200);
    return () => clearTimeout(t);
  }, [form, dirty, article]);

  function update(patch: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  }

  function wrapSelection(field: "content" | "excerpt", before: string, after: string) {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = form[field];
    const selected = text.slice(start, end) || "text";
    const newVal = text.slice(0, start) + before + selected + after + text.slice(end);
    update({ [field]: newVal });
    setTimeout(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = start + before.length + selected.length;
    }, 0);
  }

  function prependLine(field: "content" | "excerpt", prefix: string) {
    const el = contentRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const text = form[field];
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const newVal = text.slice(0, lineStart) + prefix + text.slice(lineStart);
    update({ [field]: newVal });
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = lineStart + prefix.length;
    }, 0);
  }

  async function save(publishNow: boolean) {
    setBusy(true);
    setError("");
    try {
      const slugValue = form.slug?.trim() && /^[\p{L}\p{M}\p{N}-]+$/u.test(form.slug.trim()) && form.slug.trim().length >= 3
        ? form.slug.trim()
        : slugify(form.title) || `story-${Date.now()}`;

      const shared = {
        title: form.title,
        slug: slugValue,
        excerpt: form.excerpt,
        content: form.content,
        categoryId: form.categoryId,
        subcategoryId: form.subcategoryId || null,
        regionId: form.regionId || null,
        featuredImage: form.featuredImage || null,
        imageCaption: form.imageCaption || null,
        imageCredit: form.imageCredit || null,
        isFeatured: form.isFeatured,
        editorialPriority: Number(form.editorialPriority),
        geographicPriority: Number(form.geographicPriority),
        geographicScope: form.geographicScope,
        district: form.district || null,
        state: form.state || null,
        country: form.country || null,
        sourceNotes: form.sourceNotes || null,
        seoTitle: form.seoTitle || null,
        seoDescription: form.seoDescription || null,
        ogImage: form.ogImage || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
      };

      let lastError = "";
      if (article) {
        const patch: Record<string, unknown> = {
          ...shared,
          scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
        };
        const res = await fetch(`/api/v1/admin/news/${article.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        });
        const json = await res.json();
        if (!json.ok) {
          setError(json.error || "Save failed");
          return;
        }
        const actions: string[] = [];
        if (publishNow && article.status !== "PUBLISHED") actions.push("publish");
        if (form.isBreaking !== article.isBreaking) {
          actions.push(form.isBreaking ? "mark_breaking" : "remove_breaking");
        }
        for (const action of actions) {
          const r2 = await fetch(`/api/v1/admin/news/${article.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action,
              breakingMinutes: form.isBreaking && action === "mark_breaking" ? Number(form.breakingMinutes) : undefined,
            }),
          });
          const j2 = await r2.json();
          if (!j2.ok) {
            if (r2.status === 422 && Array.isArray(j2.issues) && j2.issues.length > 0) {
              const blocking = j2.issues.filter((i: { severity: string }) => i.severity === "error");
              const warnings = j2.issues.filter((i: { severity: string }) => i.severity === "warning");
              const lines: string[] = [];
              if (blocking.length) {
                lines.push("Cannot publish — fix these issues:");
                for (const i of blocking) lines.push(`  • ${i.field}: ${i.message}`);
              }
              if (warnings.length) {
                lines.push("Warnings (non-blocking):");
                for (const i of warnings) lines.push(`  • ${i.field}: ${i.message}`);
              }
              lastError = lines.join("\n");
            } else {
              lastError = j2.error || `${action} failed`;
            }
          }
        }
        if (lastError) {
          setError(lastError);
          return;
        }
      } else {
        const res = await fetch("/api/v1/admin/news", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...shared,
            status: publishNow ? "PUBLISHED" : "DRAFT",
            scheduledAt: !publishNow && form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
            isBreaking: form.isBreaking,
            breakingMinutes: form.isBreaking ? Number(form.breakingMinutes) : undefined,
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
        return;
      }
      setDirty(false);
      onSaved();
    } catch {
      setError("Network error — your changes are still in the form.");
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
      <div className="mt-2">
        <div className="flex flex-wrap items-center gap-1 rounded-t border border-b-0 border-slate-300 bg-slate-50 px-2 py-1">
          <FormatBtn label="B" title="Bold" onClick={() => wrapSelection("content", "**", "**")} />
          <FormatBtn label="I" title="Italic" onClick={() => wrapSelection("content", "*", "*")} />
          <span className="mx-1 h-4 w-px bg-slate-300" />
          <FormatBtn label="H2" title="Heading" onClick={() => prependLine("content", "## ")} />
          <FormatBtn label="H3" title="Subheading" onClick={() => prependLine("content", "### ")} />
          <span className="mx-1 h-4 w-px bg-slate-300" />
          <FormatBtn label="•" title="Bullet list" onClick={() => prependLine("content", "- ")} />
          <FormatBtn label="1." title="Numbered list" onClick={() => prependLine("content", "1. ")} />
          <FormatBtn label="&quot;&quot;" title="Quote" onClick={() => prependLine("content", "> ")} />
          <span className="mx-1 h-4 w-px bg-slate-300" />
          <FormatBtn label="Link" title="Insert link" onClick={() => wrapSelection("content", "[", "](url)")} />
        </div>
        <textarea
          ref={contentRef}
          value={form.content}
          onChange={(e) => update({ content: e.target.value })}
          placeholder="Full story body…"
          rows={10}
          className="w-full rounded-b border border-slate-300 px-3 py-2 font-mono text-sm leading-relaxed focus:border-brand focus:outline-none"
          required
        />
        <p className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
          <span>{form.content.trim().split(/\s+/).filter(Boolean).length} words</span>
          <span>·</span>
          <span>{Math.max(1, Math.ceil(form.content.trim().split(/\s+/).filter(Boolean).length / 200))} min read</span>
          <span>·</span>
          <span>{form.content.length} chars</span>
        </p>
      </div>

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

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f && f.type.startsWith("image/")) handleUpload(f);
        }}
        className={`mt-2 rounded-lg border-2 border-dashed p-2 transition-colors ${
          dragOver ? "border-brand bg-brand/5" : "border-slate-200"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            value={form.featuredImage}
            onChange={(e) => update({ featuredImage: e.target.value })}
            placeholder="Featured image URL — or drop an image anywhere in this box"
            className="min-w-48 flex-1 rounded border border-slate-300 px-2 py-1.5"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f, uploadTargetRef.current);
          }}
          />
          <button
            type="button"
            onClick={() => {
              uploadTargetRef.current = "featuredImage";
              fileRef.current?.click();
            }}
            disabled={uploading}
            className="rounded bg-slate-800 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "⬆ Choose file"}
          </button>
          <button type="button" onClick={() => setShowMedia((v) => !v)} className="rounded border border-slate-300 px-2 py-1.5 text-xs font-semibold hover:border-brand hover:text-brand">
            Pick from library
          </button>
        </div>
        {uploading && <p className="mt-1 text-xs font-semibold text-brand">Uploading image…</p>}
        {!uploading && (
          <p className="mt-1 text-xs text-slate-400">Drag &amp; drop an image from your device here (JPEG, PNG, WebP, GIF — max 8 MB)</p>
        )}
      </div>
      {form.featuredImage && (
        <div className="mt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={form.featuredImage} alt="Featured preview" className="h-28 w-full max-w-xs rounded object-cover" />
        </div>
      )}
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
            onChange={(e) => update({ geographicScope: e.target.value as any })}
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
          <div className="flex gap-2">
            <input
              value={form.ogImage}
              onChange={(e) => update({ ogImage: e.target.value })}
              placeholder="Open Graph Image URL (optional - for social sharing)"
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                uploadTargetRef.current = "ogImage";
                fileRef.current?.click();
              }}
              disabled={uploading}
              className="shrink-0 rounded bg-slate-800 px-2 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {uploading ? "…" : "⬆"}
            </button>
          </div>
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
          {article
            ? `Editing “${article.title.slice(0, 40)}${article.title.length > 40 ? "…" : ""}” · ${article.status}`
            : savedAt
              ? `Draft autosaved locally at ${savedAt}`
              : dirty
                ? "Editing…"
                : ""}
        </span>
        <div className="flex gap-2">
          {article ? (
            <>
              <button
                onClick={() => save(false)}
                disabled={busy || !form.title || !form.excerpt || !form.content}
                className="rounded border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand disabled:opacity-40"
              >
                Save changes
              </button>
              {article.status !== "PUBLISHED" && (
                <button
                  onClick={() => save(true)}
                  disabled={busy || !form.title || !form.excerpt || !form.content}
                  className="rounded bg-brand px-5 py-2 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Publish now"}
                </button>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
      {error && <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function FormatBtn({ label, title, onClick }: { label: string; title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded px-1.5 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-brand"
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}
