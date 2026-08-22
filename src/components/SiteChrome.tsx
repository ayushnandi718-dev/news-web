import Link from "next/link";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/news", label: "Latest" },
  { href: "/trending", label: "Trending" },
  { href: "/category/india", label: "India" },
  { href: "/category/world", label: "World" },
  { href: "/category/sports", label: "Sports" },
  { href: "/category/business", label: "Business" },
  { href: "/category/technology", label: "Tech" },
  { href: "/archive", label: "Archive" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-2.5">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="NewsWeb home">
          <span className="flex h-8 w-8 items-center justify-center rounded bg-brand text-base font-black text-white">N</span>
          <span className="text-xl font-black tracking-tight text-brand-ink">NewsWeb</span>
        </Link>
        <div className="flex items-center gap-2">
          <form action="/search" role="search" className="relative hidden sm:block">
            <input
              name="q"
              placeholder="Search news…"
              aria-label="Search news"
              className="w-48 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white md:w-56"
            />
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </form>
          <Link
            href="/search"
            aria-label="Search"
            className="rounded-full p-2 text-slate-600 hover:bg-slate-100 sm:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <Link
            href="/admin"
            className="rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-brand"
          >
            Newsroom
          </Link>
        </div>
      </div>
      <nav aria-label="Primary sections" className="border-t border-slate-100">
        <div className="mx-auto flex max-w-[1280px] gap-0.5 overflow-x-auto px-3 py-1 text-[13px] font-semibold text-slate-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded px-2.5 py-1 transition hover:bg-slate-100 hover:text-brand"
            >
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

const FOOTER_SECTIONS = [
  {
    title: "News",
    links: [
      { href: "/", label: "Home" },
      { href: "/news", label: "Latest" },
      { href: "/trending", label: "Trending" },
      { href: "/category/alipurduar", label: "Alipurduar" },
      { href: "/archive", label: "Archive" },
    ],
  },
  {
    title: "Sections",
    links: [
      { href: "/category/india", label: "India" },
      { href: "/category/world", label: "World" },
      { href: "/category/sports", label: "Sports" },
      { href: "/category/business", label: "Business" },
      { href: "/category/technology", label: "Tech" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/search", label: "Search" },
      { href: "/api/v1/news/latest", label: "API v1" },
      { href: "/sitemap.xml", label: "Sitemap" },
      { href: "/admin", label: "Newsroom" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white pb-20 md:pb-0">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded bg-brand text-sm font-black text-white">N</span>
            <span className="text-lg font-black tracking-tight text-brand-ink">NewsWeb</span>
          </Link>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">
            Independent local-first digital news for Alipurduar, North Bengal, India and the world — fresh, fast and factual.
          </p>
        </div>
        {FOOTER_SECTIONS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="mb-2 text-[11px] font-black uppercase tracking-widest text-slate-400">{col.title}</h3>
            <ul className="space-y-1.5 text-sm">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-slate-600 transition hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} NewsWeb. All rights reserved.</p>
          <p>Freshness drives Latest · Engagement drives Trending · Editorial priority drives Breaking</p>
        </div>
      </div>
    </footer>
  );
}
