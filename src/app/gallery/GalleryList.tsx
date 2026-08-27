"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GalleryImage {
  url: string;
  thumbUrl: string | null;
  alt: string | null;
}

interface Gallery {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  eventDate: string | null;
  location: string | null;
  photoCount: number;
  createdAt: string;
  images: GalleryImage[];
}

export default function GalleryList() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/galleries")
      .then((r) => r.json())
      .then((j) => { if (j.ok) setGalleries(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-sm text-slate-400 py-8">Loading...</div>;
  if (galleries.length === 0) return <div className="text-center text-sm text-slate-400 py-8">কোনো গ্যালারি নেই</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {galleries.map((g) => {
        const cover = g.coverImage || g.images?.[0]?.url;
        return (
          <Link key={g.id} href={`/gallery/${g.slug}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-md">
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
              {cover ? (
                <img src={g.images?.[0]?.thumbUrl || cover} alt={g.title} className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-300">
                  <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21" /></svg>
                </div>
              )}
              <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
                {g.photoCount} ছবি
              </span>
            </div>
            <div className="p-3">
              <h3 className="font-bold text-brand-ink line-clamp-1 group-hover:text-brand">{g.title}</h3>
              {g.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{g.description}</p>}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                {g.location && <span>{g.location}</span>}
                {g.eventDate && <span>{new Date(g.eventDate).toLocaleDateString("bn-IN")}</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
