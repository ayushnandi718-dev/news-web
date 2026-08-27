"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface GalleryImage {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string | null;
  caption: string | null;
  credit: string | null;
  width: number | null;
  height: number | null;
  sortOrder: number;
}

interface Gallery {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  eventDate: string | null;
  location: string | null;
  status: string;
  photoCount: number;
  createdAt: string;
  images?: GalleryImage[];
}

export default function AdminGallery() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [filter, setFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED">("ALL");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Gallery | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const q = filter !== "ALL" ? `?status=${filter}` : "";
    try {
      const r = await fetch(`/api/v1/admin/galleries${q}`);
      const j = await r.json();
      if (j.ok) setGalleries(j.data);
    } catch {}
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = galleries.filter((g) => !search.trim() || g.title.toLowerCase().includes(search.toLowerCase().trim()));

  async function handleSave(data: { title: string; description?: string; location?: string; eventDate?: string; status: string }) {
    if (editing) {
      await fetch(`/api/v1/admin/galleries/${editing.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/v1/admin/galleries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
    }
    setShowForm(false);
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!window.confirm("Are you sure you want to delete this gallery? This action cannot be undone.")) return;
    setBusyId(id);
    try {
      await fetch(`/api/v1/admin/galleries/${id}`, { method: "DELETE" });
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function setCover(galleryId: string, imageUrl: string) {
    await fetch(`/api/v1/admin/galleries/${galleryId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ coverImage: imageUrl }),
    });
    load();
  }

  async function handleImageUpload(galleryId: string, file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/v1/admin/media", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json();
      if (!uploadJson.ok) return;
      const url = uploadJson.data.media?.url;
      if (!url) return;
      const thumbUrl = url.replace(/(\.\w+)$/, "_thumb.webp");
      const imgRes = await fetch(`/api/v1/admin/galleries/${galleryId}/images`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, thumbUrl, alt: file.name.replace(/\.\w+$/, ""), mime: file.type, size: file.size }),
      });
      const imgJson = await imgRes.json();
      if (!imgJson.ok) return;
      load();
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(galleryId: string, imageId: string) {
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    await fetch(`/api/v1/admin/galleries/${galleryId}/images`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    load();
  }

  if (showForm) {
    return (
      <GalleryEditor
        gallery={editing}
        onSave={handleSave}
        onUploadImage={handleImageUpload}
        onSetCover={setCover}
        uploading={uploading}
        onCancel={() => { setShowForm(false); setEditing(null); }}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-lg font-bold text-brand-ink">ফটো গ্যালারি</h1>
        <div className="ml-auto flex items-center gap-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search galleries..."
            className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/30"
          />
          {(["ALL", "DRAFT", "PUBLISHED"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded px-2.5 py-1 text-xs font-semibold transition ${filter === s ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
              {s}
            </button>
          ))}
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="ml-2 rounded bg-brand px-3 py-1 text-xs font-bold text-white hover:bg-brand/90">
            + New Gallery
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">{search ? "No galleries match your search." : "No galleries yet."}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((g) => (
            <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-3">
                {g.coverImage ? (
                  <img src={g.coverImage} alt="" className="h-20 w-20 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /></svg>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-brand-ink">{g.title}</h3>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${g.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                      {g.status}
                    </span>
                    <span className="text-[11px] text-slate-400">{g.photoCount} photos</span>
                  </div>
                  {g.description && <p className="mt-1 line-clamp-1 text-sm text-slate-600">{g.description}</p>}
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400">
                    {g.location && <span>{g.location}</span>}
                    {g.eventDate && <span>{new Date(g.eventDate).toLocaleDateString()}</span>}
                    <span>Created {new Date(g.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <a href={`/gallery/${g.slug}`} target="_blank" rel="noopener noreferrer" className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100">
                    Preview
                  </a>
                  <button onClick={() => { setEditing(g); setShowForm(true); }} className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                    Edit
                  </button>
                  <button onClick={() => remove(g.id)} disabled={busyId === g.id} className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50">
                    Delete
                  </button>
                </div>
              </div>
              {g.images && g.images.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {g.images.slice(0, 12).map((img, i) => (
                    <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100">
                      <img src={img.thumbUrl || img.url} alt={img.alt || ""} className="h-full w-full object-cover transition group-hover:scale-105" />
                      <span className="absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-[9px] font-bold text-white">{i + 1}</span>
                      {g.coverImage === img.url && <span className="absolute left-1 bottom-1 rounded bg-brand px-1 text-[8px] font-bold text-white">Cover</span>}
                      <button onClick={() => removeImage(g.id, img.id)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600">✕</button>
                    </div>
                  ))}
                  {g.images.length > 12 && (
                    <div className="flex aspect-square items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">+{g.images.length - 12}</div>
                  )}
                </div>
              )}
              <div className="mt-3">
                <label className="cursor-pointer rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                  {uploading ? "Uploading…" : "+ Add Photos"}
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple className="hidden"
                    onChange={(e) => { const files = e.target.files; if (files) Array.from(files).forEach((f) => handleImageUpload(g.id, f)); e.target.value = ""; }} />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryEditor({
  gallery,
  onSave,
  onUploadImage,
  onSetCover,
  uploading,
  onCancel,
}: {
  gallery: Gallery | null;
  onSave: (data: { title: string; description?: string; location?: string; eventDate?: string; status: string }) => void;
  onUploadImage: (galleryId: string, file: File) => void;
  onSetCover: (galleryId: string, imageUrl: string) => void;
  uploading: boolean;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(gallery?.title || "");
  const [description, setDescription] = useState(gallery?.description || "");
  const [location, setLocation] = useState(gallery?.location || "");
  const [eventDate, setEventDate] = useState(gallery?.eventDate ? gallery.eventDate.slice(0, 10) : "");
  const [status, setStatus] = useState(gallery?.status || "DRAFT");
  const [saved, setSaved] = useState(false);
  const [galleryId, setGalleryId] = useState(gallery?.id || "");
  const [gallerySlug, setGallerySlug] = useState(gallery?.slug || "");
  const [coverImage, setCoverImage] = useState(gallery?.coverImage || null);
  const [images, setImages] = useState<GalleryImage[]>(gallery?.images || []);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  async function loadGallery(id: string) {
    try {
      const r = await fetch(`/api/v1/admin/galleries/${id}`);
      const j = await r.json();
      if (j.ok) {
        setImages(j.data.images || []);
        setGalleryId(j.data.id);
        setGallerySlug(j.data.slug);
        setCoverImage(j.data.coverImage);
      }
    } catch {}
  }

  async function handleSave() {
    if (gallery) {
      await fetch(`/api/v1/admin/galleries/${gallery.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description: description || undefined, location: location || undefined, eventDate: eventDate || undefined, status }),
      });
      setSaved(true);
      await loadGallery(gallery.id);
    } else {
      const r = await fetch("/api/v1/admin/galleries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description: description || undefined, location: location || undefined, eventDate: eventDate || undefined, status }),
      });
      const j = await r.json();
      if (j.ok && j.data) {
        setGalleryId(j.data.id);
        setGallerySlug(j.data.slug);
        setSaved(true);
        await loadGallery(j.data.id);
      }
    }
  }

  async function removeImage(imageId: string) {
    if (!galleryId) return;
    if (!window.confirm("Are you sure you want to delete this photo?")) return;
    await fetch(`/api/v1/admin/galleries/${galleryId}/images`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    await loadGallery(galleryId);
  }

  async function saveImageMeta(imageId: string, data: { alt?: string; caption?: string; credit?: string }) {
    if (!galleryId) return;
    await fetch(`/api/v1/admin/galleries/${galleryId}/images/${imageId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditingImage(null);
    await loadGallery(galleryId);
  }

  async function handleReorder(orderedIds: string[]) {
    if (!galleryId) return;
    const prev = [...images];
    const reordered = orderedIds.map((id) => images.find((img) => img.id === id)!).filter(Boolean);
    setImages(reordered);
    const r = await fetch(`/api/v1/admin/galleries/${galleryId}/images/reorder`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    });
    if (!r.ok) setImages(prev);
  }

  function onDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  }

  function onDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget(idx);
  }

  function onDrop(e: React.DragEvent, idx: number) {
    e.preventDefault();
    setDropTarget(null);
    if (dragIdx === null || dragIdx === idx) return;
    const ids = images.map((img) => img.id);
    const [moved] = ids.splice(dragIdx, 1);
    ids.splice(idx, 0, moved);
    setDragIdx(null);
    handleReorder(ids);
  }

  function onDragEnd() {
    setDragIdx(null);
    setDropTarget(null);
  }

  function onFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length && galleryId) {
      Array.from(files).forEach((f) => {
        if (f.type.startsWith("image/")) uploadAndRefresh(galleryId, f);
      });
    }
  }

  async function uploadAndRefresh(gid: string, file: File) {
    await onUploadImage(gid, file);
    await loadGallery(gid);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-4 text-lg font-bold text-brand-ink">{gallery ? "Edit Gallery" : "New Gallery"}</h2>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" placeholder="Gallery title" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" placeholder="What happened at this event?" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" placeholder="e.g. Alipurduar Stadium" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Event Date</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2 text-sm">
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Cancel</button>
          <button onClick={handleSave} disabled={!title.trim()} className="rounded bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand/90 disabled:opacity-50">
            {gallery ? "Save Changes" : "Create Gallery"}
          </button>
        </div>
      </div>

      {saved && galleryId && (
        <div className="mt-4 rounded-lg border border-brand/20 bg-brand/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-brand-ink">📸 Photos ({images.length})</h3>
          </div>
          {images.length > 0 && (
            <div ref={dropRef} className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {images.map((img, i) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, i)}
                  onDragOver={(e) => onDragOver(e, i)}
                  onDrop={(e) => onDrop(e, i)}
                  onDragEnd={onDragEnd}
                  className={`group relative overflow-hidden rounded-lg border bg-white transition ${dragIdx === i ? "opacity-50 scale-95" : ""} ${dropTarget === i ? "border-brand ring-2 ring-brand/30" : "border-slate-200"}`}
                >
                  <div className="aspect-square overflow-hidden bg-slate-100 cursor-grab active:cursor-grabbing">
                    <img src={img.thumbUrl || img.url} alt={img.alt || ""} className="h-full w-full object-cover transition group-hover:scale-105" />
                  </div>
                  <div className="p-1.5">
                    {img.alt && <p className="truncate text-[10px] font-medium text-slate-600">{img.alt}</p>}
                    {img.credit && <p className="truncate text-[9px] text-slate-400">📷 {img.credit}</p>}
                  </div>
                  <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-[10px] font-bold text-white">{i + 1}</span>
                  {coverImage === img.url && <span className="absolute right-1.5 bottom-1.5 rounded bg-brand px-1 text-[8px] font-bold text-white">Cover</span>}
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => setEditingImage(img)} className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white hover:bg-blue-600" title="Edit metadata">✎</button>
                    <button onClick={() => { if (galleryId) onSetCover(galleryId, img.url); }} className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white hover:bg-emerald-600" title="Set as cover">★</button>
                    <button onClick={() => removeImage(img.id)} className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white hover:bg-red-600">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onFileDrop}
            className={`flex flex-col items-center rounded-lg border-2 border-dashed px-4 py-6 transition ${dragOver ? "border-brand bg-brand/10" : "border-brand/30 bg-white hover:border-brand/50 hover:bg-brand/5"}`}
          >
            <svg viewBox="0 0 24 24" className="mb-1 h-8 w-8 text-brand/50" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /></svg>
            <p className="text-xs font-semibold text-slate-600">{dragOver ? "Drop images here" : uploading ? "Uploading..." : "Drag & drop photos here, or click to browse"}</p>
            <label className="mt-2 cursor-pointer rounded bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-200">
              Browse files
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple className="hidden"
                onChange={(e) => { const files = e.target.files; if (files) Array.from(files).forEach((f) => uploadAndRefresh(galleryId, f)); e.target.value = ""; }} />
            </label>
          </div>
        </div>
      )}

      {saved && (
        <div className="mt-4 flex justify-end gap-2">
          {gallerySlug && <a href={`/gallery/${gallerySlug}`} target="_blank" rel="noopener noreferrer" className="rounded bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">Preview</a>}
          <button onClick={onCancel} className="rounded bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700">Done</button>
        </div>
      )}

      {editingImage && (
        <ImageMetaEditor image={editingImage} onSave={(data) => saveImageMeta(editingImage.id, data)} onCancel={() => setEditingImage(null)} />
      )}
    </div>
  );
}

function ImageMetaEditor({
  image,
  onSave,
  onCancel,
}: {
  image: GalleryImage;
  onSave: (data: { alt?: string; caption?: string; credit?: string }) => void;
  onCancel: () => void;
}) {
  const [alt, setAlt] = useState(image.alt || "");
  const [caption, setCaption] = useState(image.caption || "");
  const [credit, setCredit] = useState(image.credit || "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-bold text-brand-ink">Edit Photo Details</h3>
        <div className="mb-3 overflow-hidden rounded-lg">
          <img src={image.thumbUrl || image.url} alt="" className="h-40 w-full object-cover" />
        </div>
        <div className="space-y-2">
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">Alt text</label>
            <input value={alt} onChange={(e) => setAlt(e.target.value)} className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs" placeholder="Describe this image" />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">Caption</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs" placeholder="Optional caption" />
          </div>
          <div>
            <label className="mb-0.5 block text-[11px] font-semibold text-slate-600">Credit</label>
            <input value={credit} onChange={(e) => setCredit(e.target.value)} className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs" placeholder="Photographer name" />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">Cancel</button>
          <button onClick={() => onSave({ alt: alt || undefined, caption: caption || undefined, credit: credit || undefined })} className="rounded bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-brand/90">Save</button>
        </div>
      </div>
    </div>
  );
}
