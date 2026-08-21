"use client";

import { useEffect, useState } from "react";
import { computeFreshness, type ClientFreshness } from "@/lib/format";

const STYLES: Record<string, string> = {
  JUST_IN: "bg-red-600 text-white",
  FRESH: "bg-orange-500 text-white",
  RECENT: "bg-amber-400 text-black",
  TODAY: "bg-slate-200 text-slate-700",
  OLDER: "bg-slate-100 text-slate-500",
};

export default function FreshnessBadge({
  publishedAt,
  categorySlug,
  className = "",
}: {
  publishedAt: string | null;
  categorySlug?: string | null;
  className?: string;
}) {
  const [f, setF] = useState<ClientFreshness | null>(null);

  useEffect(() => {
    const tick = () => setF(computeFreshness(publishedAt, Date.now(), categorySlug));
    tick();
    const iv = setInterval(tick, 30_000);
    return () => clearInterval(iv);
  }, [publishedAt, categorySlug]);

  if (!f) return null;
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STYLES[f.key] ?? STYLES.OLDER} ${className}`}
    >
      {f.label}
    </span>
  );
}
