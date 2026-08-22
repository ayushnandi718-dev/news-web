"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  IconArticle,
  IconChart,
  IconComment,
  IconDashboard,
  IconExternal,
  IconFolder,
  IconImage,
  IconInbox,
  IconLayers,
  IconMapPin,
  IconMenu,
  IconRss,
  IconSearch,
  IconShield,
  IconTag,
  IconUsers,
  IconX,
  IconZap,
} from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
  exact?: boolean;
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Newsroom",
    items: [
      { href: "/admin", label: "Dashboard", icon: IconDashboard, exact: true },
      { href: "/admin/articles", label: "Articles", icon: IconArticle },
      { href: "/admin/breaking", label: "Breaking", icon: IconZap },
      { href: "/admin/inbox", label: "Inbox", icon: IconInbox },
      { href: "/admin/media", label: "Media", icon: IconImage },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/categories", label: "Categories", icon: IconFolder },
      { href: "/admin/subcategories", label: "Subcategories", icon: IconLayers },
      { href: "/admin/regions", label: "Regions", icon: IconMapPin },
      { href: "/admin/tags", label: "Tags", icon: IconTag },
    ],
  },
  {
    label: "Editorial",
    items: [
      { href: "/admin/comments", label: "Comments", icon: IconComment },
      { href: "/admin/analytics", label: "Analytics", icon: IconChart },
      { href: "/admin/audit", label: "Audit", icon: IconShield },
      { href: "/admin/users", label: "Team", icon: IconUsers },
      { href: "/admin/sources", label: "Sources", icon: IconRss },
    ],
  },
];

const MOBILE_PRIMARY: NavItem[] = [
  NAV_GROUPS[0].items[0],
  NAV_GROUPS[0].items[1],
  NAV_GROUPS[0].items[2],
  NAV_GROUPS[0].items[3],
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export default function AdminShell({
  user,
  children,
}: {
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("newsroom_sidebar") === "collapsed");
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem("newsroom_sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  async function logout() {
    await fetch("/api/v1/admin/session", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className={`flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-200 px-4 ${collapsed ? "justify-center px-0" : ""}`}>
        <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-brand text-sm font-black text-white">N</span>
          {!collapsed && (
            <span className="truncate text-[15px] font-black tracking-tight text-brand-ink">
              NewsWeb <span className="font-semibold text-slate-400">Newsroom</span>
            </span>
          )}
        </Link>
      </div>

      <nav aria-label="Newsroom sections" className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-brand text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-brand-ink"
                      } ${collapsed ? "justify-center px-0" : ""}`}
                    >
                      <Icon className="h-[17px] w-[17px] shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`shrink-0 border-t border-slate-200 p-3 ${collapsed ? "px-1" : ""}`}>
        <div className={`flex items-center gap-2.5 ${collapsed ? "justify-center" : ""}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
            {initials || "?"}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-brand-ink">{user.name}</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{user.role.replace(/_/g, " ")}</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Log out
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100/60">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white transition-all duration-150 lg:block ${
          collapsed ? "w-[64px]" : "w-[232px]"
        }`}
      >
        {sidebarBody}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3.5 top-16 flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:text-brand"
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {collapsed ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}
          </svg>
        </button>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[260px] bg-white shadow-xl">
            {sidebarBody}
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={`flex min-h-screen flex-col transition-all duration-150 ${collapsed ? "lg:pl-[64px]" : "lg:pl-[232px]"}`}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <form action="/admin/articles" method="get" className="relative hidden max-w-sm flex-1 sm:block" role="search">
            <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              placeholder="Search articles…"
              aria-label="Search articles"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white"
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-brand sm:flex"
            >
              <IconExternal className="h-3.5 w-3.5" />
              View site
            </Link>
            <Link
              href="/admin/breaking"
              aria-label="Breaking news desk"
              className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-brand"
            >
              <IconZap className="h-[18px] w-[18px]" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand animate-pulseDot" aria-hidden="true" />
            </Link>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <div className="hidden items-center gap-2 sm:flex">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
                {initials || "?"}
              </span>
              <div className="hidden md:block">
                <p className="text-xs font-bold leading-tight text-brand-ink">{user.name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide leading-tight text-slate-400">{user.role.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-6">
          <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary newsroom navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
      >
        {MOBILE_PRIMARY.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition ${
                active ? "text-brand" : "text-slate-500 hover:text-brand-ink"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
              {active && <span className="sr-only">(current)</span>}
            </Link>
          );
        })}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-slate-500 transition hover:text-brand-ink"
        >
          <IconMenu className="h-5 w-5" />
          More
        </button>
      </nav>
    </div>
  );
}
