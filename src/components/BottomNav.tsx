"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/news", label: "Latest", icon: "⚡" },
  { href: "/trending", label: "Trending", icon: "🔥" },
  { href: "/archive", label: "Archive", icon: "▤" },
  { href: "/search", label: "Search", icon: "⌕" },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden">
      {ITEMS.map((i) => {
        const active = i.href === "/" ? pathname === "/" : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center py-2 text-[10px] font-semibold ${active ? "text-brand" : "text-slate-500"}`}
          >
            <span className="text-lg leading-none">{i.icon}</span>
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
