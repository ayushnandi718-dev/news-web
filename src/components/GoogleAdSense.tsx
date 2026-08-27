"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_PUBLISHER_ID || "";

function pushAd(el: HTMLDivElement) {
  if (typeof window === "undefined" || !window.adsbygoogle || !el) return;
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch {}
}

interface AdSlotProps {
  /** Google AdSense ad slot ID (data-ad-slot) */
  slot: string;
  /** Ad format: "auto" (responsive), "rectangle", "horizontal", "vertical" */
  format?: string;
  /** Full-width layout? */
  fullWidth?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Min height for the ad container */
  minHeight?: number;
}

export function AdSlot({ slot, format = "auto", fullWidth = true, className = "", minHeight = 100 }: AdSlotProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) pushAd(ref.current);
  }, [slot]);

  if (!ADSENSE_CLIENT || ADSENSE_CLIENT.includes("XXXX")) return null;

  return (
    <div
      ref={ref}
      className={`overflow-hidden ${className}`}
      style={{ minHeight }}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={fullWidth ? "true" : "false"}
      />
    </div>
  );
}

/* ---- Preset ad slots for common placements ---- */

/** Leaderboard banner (728×90 or responsive) — article top, homepage top */
export function AdBannerTop({ className = "" }: { className?: string }) {
  return (
    <div className={`my-4 flex justify-center ${className}`}>
      <AdSlot
        slot="1111111111"
        format="horizontal"
        className="w-full max-w-[728px] rounded-lg border border-slate-100 bg-slate-50"
        minHeight={90}
      />
    </div>
  );
}

/** In-article ad — between paragraphs */
export function AdInArticle({ className = "" }: { className?: string }) {
  return (
    <div className={`my-6 ${className}`}>
      <AdSlot
        slot="2222222222"
        format="auto"
        className="w-full rounded-lg border border-slate-100 bg-slate-50"
        minHeight={120}
      />
    </div>
  );
}

/** Bottom of article */
export function AdBannerBottom({ className = "" }: { className?: string }) {
  return (
    <div className={`my-4 flex justify-center ${className}`}>
      <AdSlot
        slot="3333333333"
        format="horizontal"
        className="w-full max-w-[728px] rounded-lg border border-slate-100 bg-slate-50"
        minHeight={90}
      />
    </div>
  );
}

/** Sidebar sticky ad */
export function AdSidebar({ className = "" }: { className?: string }) {
  return (
    <div className={`sticky top-24 ${className}`}>
      <AdSlot
        slot="4444444444"
        format="vertical"
        className="w-full rounded-lg border border-slate-100 bg-slate-50"
        minHeight={250}
      />
    </div>
  );
}

/** Anchor / sticky bottom ad (mobile) */
export function AdAnchor({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed bottom-16 left-0 right-0 z-40 flex justify-center md:bottom-0 ${className}`}>
      <AdSlot
        slot="5555555555"
        format="horizontal"
        className="w-full max-w-[728px] border-t border-slate-200 bg-white shadow-lg"
        minHeight={50}
      />
    </div>
  );
}
