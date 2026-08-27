"use client";

import { useCallback, useEffect, useState } from "react";
import { useNewsEvents } from "@/hooks/useNewsEvents";
import { AD_PLACEMENT_LABELS } from "@/lib/pricing";

interface AdItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  destinationUrl?: string | null;
}

export type AdPlacement = "HOME_TOP" | "HOME_SIDEBAR" | "CATEGORY_TOP";

const SIZES: Record<AdPlacement, string> = {
  HOME_TOP: "min-h-[90px] sm:min-h-[110px]",
  HOME_SIDEBAR: "min-h-[220px]",
  CATEGORY_TOP: "min-h-[90px] sm:min-h-[100px]",
};

/**
 * Reader-facing ad slot. Fetches the ACTIVE ad for its placement and
 * re-fetches itself when an admin changes ad settings (SSE ads.updated),
 * so admin edits appear on reader screens without any reload.
 */
export default function AdSlot({ placement }: { placement: AdPlacement }) {
  const [ad, setAd] = useState<AdItem | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/ads?placement=${placement}`, { cache: "no-store" });
      const json = await res.json();
      setAd(json.ok && json.data.items.length ? json.data.items[0] : null);
    } catch {}
  }, [placement]);

  useEffect(() => {
    load();
  }, [load]);

  useNewsEvents((e) => {
    if (e.type === "ads.updated") load();
  });

  // Poll fallback keeps the slot fresh even without a live SSE connection.
  useEffect(() => {
    const iv = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 120_000);
    return () => clearInterval(iv);
  }, [load]);

  if (!ad || hidden) return null;

  const hasCreative = Boolean(ad.imageUrl);

  return (
    <aside aria-label="বিজ্ঞাপন" className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
      <span className="absolute right-2 top-1.5 z-10 rounded bg-slate-900/55 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/90">
        বিজ্ঞাপন · {AD_PLACEMENT_LABELS[placement]}
      </span>
      <button
        type="button"
        aria-label="বিজ্ঞাপন বন্ধ করুন"
        onClick={() => setHidden(true)}
        className="absolute right-1 top-1 z-10 hidden h-6 w-6 items-center justify-center rounded-full text-white/70 transition hover:bg-black/40 hover:text-white sm:right-9"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {hasCreative && !ad.description ? (
        /* Pure image creative */
        <a
          href={`/advertisements/${ad.slug}`}
          onClick={() => {
            try {
              fetch(`/api/v1/ads/${ad.id}/click`, { method: "POST", keepalive: true });
            } catch {}
          }}
          className={`block w-full ${SIZES[placement]} group`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ad.imageUrl as string}
            alt={ad.title}
            loading="lazy"
            className="h-full min-h-[inherit] w-full object-cover transition group-hover:opacity-95"
          />
        </a>
      ) : (
        /* Text ad or image + description card */
        <a
          href={`/advertisements/${ad.slug}`}
          onClick={() => {
            try {
              fetch(`/api/v1/ads/${ad.id}/click`, { method: "POST", keepalive: true });
            } catch {}
          }}
          className={`group block w-full px-4 py-3 pt-6 ${SIZES[placement]}`}
        >
          {!hasCreative && (
            <p className="text-base font-black leading-snug text-brand">{ad.title}</p>
          )}
          {hasCreative && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.imageUrl as string} alt="" loading="lazy" className="mb-2 max-h-24 w-full object-cover" />
          )}
          {ad.description ? (
            <div
              className="ad-rich text-sm leading-relaxed text-slate-700"
              dangerouslySetInnerHTML={{ __html: ad.description }}
            />
          ) : null}
          {ad.destinationUrl ? (
            <span className="mt-1 inline-block truncate text-xs font-semibold uppercase tracking-wide text-slate-400 group-hover:text-brand">
              আরও জানুন →
            </span>
          ) : null}
        </a>
      )}
    </aside>
  );
}
