"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { PRIMARY_NAV } from "@/lib/brand";
import { useActiveLive } from "@/hooks/useActiveLive";

/**
 * Horizontal scrollable section strip under the header.
 * Mobile-first: comfortable 36px+ touch targets, hidden scrollbar,
 * active category highlighted and auto-centered, edge fades hint scrollability.
 */
export default function SectionNav() {
  const pathname = usePathname();
  const stripRef = useRef<HTMLDivElement | null>(null);
  const { hasActive } = useActiveLive();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Keep the active category visible when landing on a deep-linked section.
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="প্রধান বিভাগসমূহ" className="relative">
      {/* right-edge fade hints more items */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-paper to-transparent" aria-hidden />
      <div
        ref={stripRef}
        className="nav-strip mx-auto flex max-w-[1280px] items-center gap-1 overflow-x-auto px-3 py-1.5 text-[13.5px] font-semibold text-slate-600"
      >
        {PRIMARY_NAV.map((n) => {
          const active = isActive(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[36px] shrink-0 items-center whitespace-nowrap rounded-full px-3 transition ${
                active ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100 hover:text-brand"
              }`}
            >
              {n.label}
              {n.href === "/live" && hasActive && (
                <span className="ml-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulseDot" aria-label="লাইভ চলছে" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
