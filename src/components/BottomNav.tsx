"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import { useActiveLive } from "@/hooks/useActiveLive";

const icon = (d: string): ((p: { className?: string }) => ReactElement) =>
  function Icon({ className }) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    );
  };

const ITEMS: Array<{ href: string; label: string; Icon: (p: { className?: string }) => ReactElement }> = [
  { href: "/", label: "হোম", Icon: icon("M3 10.5 12 3l9 7.5M5.5 9.5V21h13V9.5") },
  { href: "/news", label: "সর্বশেষ", Icon: icon("M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z") },
  {
    href: "/trending",
    label: "ব্রেকিং",
    Icon: icon("M12 3v3m6.4-.4-2.1 2.1M20 12h-3M5.6 5.6l2.1 2.1M7 12H4m14.7 6a7.5 7.5 0 1 0-13.4 0Z"),
  },
  { href: "/live", label: "লাইভ", Icon: icon("M22 8-6 4 6 4V8ZM2 6h14v12H2z") },
  { href: "/weather", label: "আবহাওয়া", Icon: icon("M17.5 19a4.5 4.5 0 0 0 .4-9A6 6 0 0 0 6.2 8.6 4.5 4.5 0 0 0 6.5 19Z") },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { hasActive } = useActiveLive();
  if (pathname.startsWith("/admin")) return null;

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav
      aria-label="মোবাইল নেভিগেশন"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/92 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="grid h-[58px] grid-cols-6">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[9px] font-semibold transition ${
                active ? "text-brand" : "text-slate-500"
              }`}
            >
              {active && <span className="absolute top-0 h-[3px] w-9 rounded-full bg-brand" aria-hidden />}
              <span className="relative">
                <Icon className="h-[21px] w-[21px]" />
                {href === "/live" && hasActive && (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500 animate-pulseDot" aria-label="লাইভ চলছে" />
                )}
              </span>
              {label}
            </Link>
          );
        })}
        {/* Menu opens the header drawer */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("dk:open-menu"))}
          aria-label="মেনু খুলুন"
          className="relative flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[9px] font-semibold text-slate-500 transition active:bg-slate-100"
        >
          <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          মেনু
        </button>
      </div>
    </nav>
  );
}
