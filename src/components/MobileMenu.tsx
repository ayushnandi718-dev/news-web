"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NAV_MAIN, NAV_CATEGORIES, NAV_OTHER, BRAND } from "@/lib/brand";
import { useActiveLive } from "@/hooks/useActiveLive";

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 px-5 pb-1 pt-4 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
      <span className="h-[3px] w-[3px] rounded-full bg-brand" aria-hidden />
      {children}
    </p>
  );
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const { hasActive } = useActiveLive();

  useEffect(() => setMounted(true), []);

  const close = useCallback(() => setOpen(false), []);

  // Bottom-nav "মেনু" opens the drawer via a window event (no shared state needed).
  useEffect(() => {
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("dk:open-menu", onOpen);
    return () => window.removeEventListener("dk:open-menu", onOpen);
  }, []);

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Body scroll lock + Escape + focus management.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <button
        type="button"
        aria-label="মেনু খুলুন"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 transition hover:bg-slate-100 active:bg-slate-200 md:hidden"
      >
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="সাইট মেনু"
          >
            <button
              type="button"
              aria-label="মেনু বন্ধ করুন"
              tabIndex={-1}
              className="animate-fade absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
              onClick={close}
            />
            <div className="animate-drawer absolute inset-y-0 left-0 flex w-[84vw] max-w-[340px] flex-col bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
              <Link href="/" onClick={close} className="flex flex-col" aria-label={`${BRAND.bn} — হোম`}>
                <span className="text-lg font-bold leading-none tracking-tight text-brand">{BRAND.bn}</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {BRAND.en}
                </span>
              </Link>
              <button
                ref={closeRef}
                type="button"
                aria-label="বন্ধ করুন"
                onClick={close}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Grouped navigation */}
            <nav aria-label="সাইট নেভিগেশন" className="flex-1 overflow-y-auto overscroll-contain pb-2">
              <GroupLabel>প্রধান</GroupLabel>
              {NAV_MAIN.map((n) => (
                <DrawerLink key={n.href} href={n.href} label={n.label} active={isActive(n.href)} onClick={close} />
              ))}

              <GroupLabel>বিভাগ</GroupLabel>
              {NAV_CATEGORIES.map((n) => (
                <DrawerLink
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  active={isActive(n.href)}
                  onClick={close}
                  accent={n.href === "/live" ? hasActive : false}
                />
              ))}

              <GroupLabel>আরও</GroupLabel>
              {NAV_OTHER.map((n) => (
                <DrawerLink
                  key={n.href}
                  href={n.href}
                  label={n.label}
                  active={isActive(n.href)}
                  onClick={close}
                />
              ))}
            </nav>

            {/* Drawer footer */}
            <div className="shrink-0 border-t border-slate-200 px-3 py-3 pb-safe">
              <p className="px-2 pb-2 text-[10px] leading-relaxed text-slate-400">
                {BRAND.tagline}
              </p>
            </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function DrawerLink({
  href,
  label,
  active,
  accent,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-[46px] items-center gap-2 pl-5 pr-5 text-[15px] font-semibold transition ${
        active ? "bg-brand/5 text-brand" : accent ? "text-red-600 hover:bg-slate-50" : "text-ink hover:bg-slate-50"
      }`}
    >
      {active && <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-brand" aria-hidden />}
      {accent && <span className="h-2 w-2 animate-pulseDot rounded-full bg-red-600" aria-hidden />}
      {label}
    </Link>
  );
}
