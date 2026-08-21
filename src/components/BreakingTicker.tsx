"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useNewsEvents } from "@/hooks/useNewsEvents";

interface BreakingItem {
  id: string;
  slug: string;
  title: string;
  url: string;
  breakingUntil: string | null;
  priority: number;
}

export default function BreakingTicker({ initial }: { initial: BreakingItem[] }) {
  const [items, setItems] = useState<BreakingItem[]>(initial);

  const { connected } = useNewsEvents((e) => {
    if (e.type === "breaking.updated" || e.type === "article.published") {
      refresh();
    }
  });

  async function refresh() {
    try {
      const res = await fetch("/api/v1/news/breaking", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setItems(json.data.items);
    } catch {}
  }

  useEffect(() => {
    const iv = setInterval(refresh, 60_000);
    return () => clearInterval(iv);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="flex items-stretch overflow-hidden bg-brand-ink text-white">
      <div className="flex shrink-0 items-center gap-2 bg-brand px-3 py-2 text-xs font-extrabold uppercase tracking-wider">
        <span className={`inline-block h-2 w-2 rounded-full bg-white ${connected ? "animate-pulseDot" : ""}`} />
        Breaking
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="whitespace-nowrap animate-ticker py-2 text-sm font-medium">
          {items.map((b, i) => (
            <span key={b.id}>
              <Link href={b.url} className="mx-6 hover:underline">
                {b.title}
              </Link>
              {i < items.length - 1 && <span className="text-white/40">◆</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
