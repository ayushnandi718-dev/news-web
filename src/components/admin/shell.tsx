"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BRAND } from "@/lib/brand";
import UIProvider from "@/components/ui/overlay";
import ThemeToggle from "@/components/ThemeToggle";
import { useActiveLive } from "@/hooks/useActiveLive";
import {
  IconArticle,
  IconChart,
  IconComment,
  IconDashboard,
  IconExternal,
  IconFolder,
  IconImage,
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
  IconActivity,
  IconGear,
  IconLifeBuoy,
  IconMegaphone,
  IconBell,
  IconGallery,
  IconPoll,
} from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: (p: { className?: string }) => React.ReactElement;
  exact?: boolean;
  /** required permission — hidden when the user lacks it */
  permission?: string;
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Newsroom",
    items: [
      { href: "/admin", label: "Dashboard", icon: IconDashboard, exact: true },
      { href: "/admin/articles", label: "Articles", icon: IconArticle, permission: "article.create" },
      { href: "/admin/breaking", label: "Breaking", icon: IconZap, permission: "breaking.manage" },
      { href: "/admin/live", label: "Live", icon: IconActivity, permission: "live.manage" },
      { href: "/admin/media", label: "Media", icon: IconImage, permission: "media.upload" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/categories", label: "Categories", icon: IconFolder, permission: "category.manage" },
      { href: "/admin/subcategories", label: "Subcategories", icon: IconLayers, permission: "subcategory.manage" },
      { href: "/admin/regions", label: "Regions", icon: IconMapPin, permission: "region.manage" },
      { href: "/admin/tags", label: "Tags", icon: IconTag, permission: "tag.manage" },
    ],
  },
  {
    label: "Editorial",
    items: [
      { href: "/admin/comments", label: "Comments", icon: IconComment, permission: "comment.moderate" },
      { href: "/admin/analytics", label: "Analytics", icon: IconChart, permission: "analytics.view" },
      { href: "/admin/audit", label: "Audit", icon: IconShield, permission: "audit.view" },
      { href: "/admin/users", label: "Team", icon: IconUsers, permission: "user.view" },
      { href: "/admin/sources", label: "Sources", icon: IconRss, permission: "source.view" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/settings", label: "Site Settings", icon: IconGear, permission: "settings.manage" },
      { href: "/admin/push", label: "Push Notifications", icon: IconBell, permission: "article.publish" },
      { href: "/admin/security", label: "Security", icon: IconShield, exact: false },
      { href: "/admin/monitoring", label: "API Health", icon: IconActivity, permission: "dashboard.view" },
    ],
  },
  {
    label: "Advertisement",
    items: [{ href: "/admin/ads", label: "Ads Manager", icon: IconMegaphone, permission: "ads.manage" }],
  },
  {
    label: "Community",
    items: [
      { href: "/admin/gallery", label: "Photo Gallery", icon: IconGallery, permission: "gallery.create" },
      { href: "/admin/polls", label: "Polls & Surveys", icon: IconPoll, permission: "poll.create" },
      { href: "/admin/obituaries", label: "Obituaries", icon: IconComment },
      { href: "/admin/tips", label: "News Tips", icon: IconBell },
    ],
  },
  {
    label: "Support",
    items: [{ href: "/admin/support", label: "Tech Support", icon: IconLifeBuoy, exact: true }],
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
  user: { name: string; email: string; role: string; permissions?: string[] };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { hasActive: liveActive } = useActiveLive();

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

  const perms = user.permissions ?? [];
  const canViewAudit = perms.includes("audit.view");
  const canViewUsers = perms.includes("user.view");

  const userMenu = (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        className="flex items-center gap-2 rounded-lg p-1 pr-2 transition hover:bg-slate-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white">
          {initials || "?"}
        </span>
        <div className="hidden text-left md:block">
          <p className="text-xs font-bold leading-tight text-brand-ink">{user.name}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide leading-tight text-slate-400">
            {user.role.replace(/_/g, " ")}
          </p>
        </div>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={`hidden text-slate-400 transition md:block ${menuOpen ? "rotate-180" : ""}`} aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {menuOpen && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} />
          <div role="menu" className="absolute right-0 z-50 mt-1.5 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg">
            <div className="border-b border-slate-100 px-3.5 pb-2.5 pt-1.5">
              <p className="truncate text-sm font-bold text-brand-ink">{user.name}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              <span className="mt-1.5 inline-block rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand">
                {user.role.replace(/_/g, " ")}
              </span>
            </div>
            <a href="/admin/security" role="menuitem" onClick={() => setMenuOpen(false)} className="block px-3.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-brand-ink">
              Security
            </a>
            {canViewAudit && (
              <a href="/admin/audit" role="menuitem" onClick={() => setMenuOpen(false)} className="block px-3.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-brand-ink">
                Activity
              </a>
            )}
            {canViewUsers && (
              <a href="/admin/users" role="menuitem" onClick={() => setMenuOpen(false)} className="block px-3.5 py-2 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-brand-ink">
                Profile &amp; Team
              </a>
            )}
            <div className="mt-1 border-t border-slate-100 pt-1">
              <button
                role="menuitem"
                onClick={logout}
                className="w-full px-3.5 py-2 text-left text-[13px] font-semibold text-red-600 transition hover:bg-red-50"
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  const sidebarBody = (
    <div className="flex h-full flex-col">
      <div className={`flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-200 px-4 ${collapsed ? "justify-center px-0" : ""}`}>
        <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
          <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded bg-brand px-1 text-xs font-black tracking-tight text-white">DK</span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[15px] font-black tracking-tight text-brand-ink">{BRAND.bn}</span>
              <span className="truncate text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">Newsroom</span>
            </span>
          )}
        </Link>
      </div>

      <nav aria-label="Newsroom sections" className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => {
          const visible = group.items.filter((item) => !item.permission || perms.includes(item.permission));
          if (visible.length === 0) return null;
          return (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {visible.map((item) => {
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
                      {!collapsed && item.href === "/admin/live" && liveActive && (
                        <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulseDot" aria-label="Live active" />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
          );
        })}
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
    <UIProvider>
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
              href="/admin/live"
              aria-label="Live desk"
              className="relative rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 hover:text-brand"
            >
              <IconActivity className="h-[18px] w-[18px]" />
              {liveActive && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulseDot ring-2 ring-white" aria-hidden="true" />
              )}
            </Link>
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
            <ThemeToggle />
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
            {userMenu}
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
        {MOBILE_PRIMARY.filter((item) => !item.permission || perms.includes(item.permission)).map((item) => {
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
    </UIProvider>
  );
}
