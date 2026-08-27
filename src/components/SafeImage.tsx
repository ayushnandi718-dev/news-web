"use client";

import Image from "next/image";
import { useState } from "react";

export function NewsImageFallback({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center gap-1 bg-[#eceadf] text-slate-400 ${
        compact ? "" : "gap-1.5"
      }`}
      aria-label="ছবি নেই"
    >
      <svg
        viewBox="0 0 24 24"
        className={compact ? "h-5 w-5" : "h-8 w-8"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-4 0V9" />
        <path d="M18 14h-8" />
        <path d="M15 18h-5" />
        <path d="M10 6h8v4h-8V6Z" />
      </svg>
      {!compact && <span className="text-xs font-medium">ছবি নেই</span>}
    </div>
  );
}

/**
 * Derives the thumbnail URL from an original upload URL.
 * "/uploads/2026/08/abc.webp" → "/uploads/2026/08/abc_thumb.webp"
 */
function thumbUrl(src: string): string | null {
  if (!src.startsWith("/uploads/")) return null;
  const lastSlash = src.lastIndexOf("/");
  const filename = src.slice(lastSlash + 1);
  const dotIdx = filename.lastIndexOf(".");
  if (dotIdx === -1) return null;
  return `${src.slice(0, lastSlash + 1)}${filename.slice(0, dotIdx)}_thumb${filename.slice(dotIdx)}`;
}

/**
 * Reader-facing image with graceful Bengali fallback.
 * Uses thumbnail (_thumb.webp) when `thumbnail` prop is true for smaller card views.
 * Only optimizes https/local upload sources; anything else renders the placeholder.
 */
export default function SafeImage({
  src,
  alt = "",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  className = "",
  compact = false,
  thumbnail = false,
}: {
  src: string | null | undefined;
  alt?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  compact?: boolean;
  thumbnail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const isLocal = src?.startsWith("/uploads/");
  const isRemote = src?.startsWith("https://");
  const usable = !!src && (isLocal || isRemote) && !failed;
  if (!usable) return <NewsImageFallback compact={compact} />;

  const imgSrc = thumbnail && isLocal ? (thumbUrl(src!) ?? src!) : src!;

  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
