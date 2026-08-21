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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="rounded bg-brand px-2 py-1 text-lg font-black tracking-tight text-white">N</span>
          <span className="text-xl font-black tracking-tight text-brand-ink">NewsWeb</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <form action="/search" className="hidden sm:block">
            <input
              name="q"
              placeholder="Search news…"
              className="w-44 rounded-full border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-brand"
            />
          </form>
          <Link href="/admin" className="font-semibold text-slate-500 hover:text-brand">
            Newsroom
          </Link>
        </div>
      </div>
      <nav className="border-t border-slate-100">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1.5 text-sm font-semibold text-slate-600">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded px-3 py-1 hover:bg-slate-100 hover:text-brand">
              {n.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
      <p className="font-semibold text-slate-700">NewsWeb — Fresh News Engine</p>
      <p className="mt-1">
        Freshness controls Latest · Engagement controls Trending · Editorial priority controls Breaking
      </p>
      <p className="mt-2">
        <Link href="/archive" className="hover:text-brand">Archive</Link> ·{" "}
        <Link href="/news" className="hover:text-brand">Latest</Link> ·{" "}
        <a href="/api/v1/news/latest" className="hover:text-brand">API v1</a>
      </p>
    </footer>
  );
}
