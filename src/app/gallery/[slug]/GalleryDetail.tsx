"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface GalleryImage {
  id: string;
  url: string;
  thumbUrl: string | null;
  alt: string | null;
  caption: string | null;
  credit: string | null;
}

interface Gallery {
  slug: string;
  title: string;
  description: string | null;
  eventDate: string | null;
  location: string | null;
  images: GalleryImage[];
}

export default function GalleryDetail({ gallery }: { gallery: Gallery }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function openLightbox(i: number) { setLightboxIndex(i); }
  function closeLightbox() { setLightboxIndex(null); }
  function prev() { if (lightboxIndex !== null && lightboxIndex > 0) setLightboxIndex(lightboxIndex - 1); }
  function next() { if (lightboxIndex !== null && lightboxIndex < gallery.images.length - 1) setLightboxIndex(lightboxIndex + 1); }

  const current = lightboxIndex !== null ? gallery.images[lightboxIndex] : null;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (lightboxIndex === null) return;
    if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
  }, [lightboxIndex, gallery.images.length]);

  useEffect(() => {
    if (lightboxIndex !== null) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [lightboxIndex, handleKeyDown]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <nav className="mb-4 text-xs text-slate-400">
        <Link href="/" className="hover:text-brand">হোম</Link>
        <span className="mx-1">/</span>
        <Link href="/gallery" className="hover:text-brand">ফটো গ্যালারি</Link>
        <span className="mx-1">/</span>
        <span className="text-slate-600">{gallery.title}</span>
      </nav>

      <h1 className="mb-2 text-2xl font-bold text-brand-ink">{gallery.title}</h1>
      <div className="mb-4 flex items-center gap-3 text-xs text-slate-400">
        {gallery.location && <span>{gallery.location}</span>}
        {gallery.eventDate && <span>{new Date(gallery.eventDate).toLocaleDateString("bn-IN", { year: "numeric", month: "long", day: "numeric" })}</span>}
        <span>{gallery.images.length} ছবি</span>
      </div>
      {gallery.description && <p className="mb-6 text-sm text-slate-600">{gallery.description}</p>}

      {gallery.images.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">এই গ্যালারিতে কোনো ছবি নেই</div>
      ) : (
        <div className="columns-2 gap-2 sm:columns-3 lg:columns-4">
          {gallery.images.map((img, i) => (
            <button key={img.id} onClick={() => openLightbox(i)} className="mb-2 block w-full overflow-hidden rounded-lg transition hover:opacity-90">
              <img src={img.thumbUrl || img.url} alt={img.alt || gallery.title} className="w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightboxIndex !== null && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={closeLightbox}>
          <button onClick={(e) => { e.stopPropagation(); closeLightbox(); }} className="absolute right-4 top-4 z-10 text-white/70 hover:text-white">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
          {lightboxIndex > 0 && (
            <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-4 z-10 text-white/70 hover:text-white">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          )}
          {lightboxIndex < gallery.images.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-4 z-10 text-white/70 hover:text-white">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          )}
          <div className="max-h-[85vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img src={current.url} alt={current.alt || ""} className="max-h-[80vh] rounded-lg object-contain" />
            {(current.caption || current.credit) && (
              <div className="mt-2 text-center text-xs text-white/70">
                {current.caption && <p>{current.caption}</p>}
                {current.credit && <p className="text-white/50">📷 {current.credit}</p>}
              </div>
            )}
            <p className="mt-1 text-center text-[11px] text-white/40">{lightboxIndex + 1} / {gallery.images.length}</p>
          </div>
        </div>
      )}
    </main>
  );
}
