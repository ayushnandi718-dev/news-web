import Link from "next/link";
import { BRAND, bengaliToday, NAV_MAIN, NAV_CATEGORIES, NAV_OTHER, NAV_LEGAL } from "@/lib/brand";
import { getBreaking } from "@/lib/feeds";
import { getDistrictWeather, iconFor } from "@/lib/weather";
import { getMarketQuotes } from "@/lib/market/service";
import type { SiteSettings } from "@/lib/settings";
import { socialLinksFrom } from "@/lib/settings";
import BreakingTicker from "./BreakingTicker";
import MobileMenu from "./MobileMenu";
import SectionNav from "./SectionNav";
import SocialLinks from "./SocialLinks";
import ThemeToggle from "./ThemeToggle";
import FontSizeControl from "./FontSizeControl";

/** Editable brand bits resolved from Site Settings (falls back to static BRAND). */
export interface ChromeBrand {
  bn: string;
  en: string;
  tagline: string;
  logoUrl: string;
}

export function brandFromSettings(s: SiteSettings): ChromeBrand {
  return { bn: s.siteNameBn, en: s.siteNameEn || BRAND.en, tagline: s.tagline || BRAND.tagline, logoUrl: s.logoUrl };
}

function BrandLockup({ brand, big }: { brand: ChromeBrand; big?: boolean }) {
  const logo = brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={brand.logoUrl}
      alt=""
      className={`shrink-0 self-center object-contain ${big ? "h-10 w-10" : "h-8 w-8"}`}
    />
  ) : null;
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2" aria-label={`${brand.bn} — হোম`}>
      {logo}
      <span className="flex min-w-0 flex-col">
        <span className={`truncate font-bold leading-none tracking-tight text-brand ${big ? "[font-size:clamp(1.3rem,3vw,1.9rem)]" : ""}`}>
          {brand.bn}
        </span>
        {brand.en ? (
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:inline">
            {brand.en}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function SiteHeader({ settings }: { settings?: SiteSettings }) {
  const brand = settings ? brandFromSettings(settings) : { ...BRAND, logoUrl: "" };
  return (
    <>
      {/* Sticky cluster: utility strip (desktop) + brand row + section nav */}
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur">
        {/* Utility strip (desktop) */}
        <div className="hidden border-b border-slate-200/70 bg-[#eeebe1] lg:block">
          <div className="mx-auto flex h-8 max-w-[1280px] items-center justify-between px-4 text-[11px] text-slate-500">
            <span suppressHydrationWarning>{bengaliToday()}</span>
            <span className="font-medium text-brand">{brand.tagline}</span>
            <HeaderMiniStats />
            <a href="/rss.xml" target="_blank" rel="noopener noreferrer" className="ml-2 flex items-center gap-1 text-[11px] text-orange-500 hover:text-orange-600" aria-label="RSS Feed">
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><circle cx="6.18" cy="17.82" r="2.18"/><path d="M4 4.44v2.83c7.03 0 12.73 5.7 12.73 12.73h2.83c0-8.59-6.97-15.56-15.56-15.56zm0 5.66v2.83c3.9 0 7.07 3.17 7.07 7.07h2.83c0-5.47-4.43-9.9-9.9-9.9z"/></svg>
              RSS
            </a>
          </div>
        </div>

        {/* Brand row — 56px on mobile, roomier on desktop */}
        <div className="border-b border-slate-200">
          <div className="mx-auto flex h-14 max-w-[1280px] items-center gap-2 px-3 sm:px-4 md:h-auto md:gap-3 md:py-2.5">
            <MobileMenu />
            <BrandLockup brand={brand} />
            <span className="ml-auto hidden text-xs text-slate-400 md:block" suppressHydrationWarning>
              {bengaliToday()}
            </span>
            <SearchForm />
            <ThemeToggle />
            <FontSizeControl />
            <Link
              href="/saved"
              aria-label="সংরক্ষিত খবর"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-brand"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
            </Link>
            <Link
              href="/admin"
              className="flex h-9 shrink-0 items-center bg-brand px-2.5 text-[11px] font-bold text-white transition hover:bg-brand-dark sm:h-auto sm:py-1.5 sm:text-xs"
            >
              নিউজরুম
            </Link>
          </div>

          {/* Category nav — desktop/tablet only; mobile uses the drawer + bottom nav */}
          <div className="hidden md:block">
            <SectionNav />
          </div>
        </div>
      </header>

      {/* Breaking ticker scrolls away with the page (keeps sticky chrome slim) */}
      <HeaderTicker />
    </>
  );
}

async function HeaderTicker() {
  let breaking: Awaited<ReturnType<typeof getBreaking>> = [];
  try {
    breaking = await getBreaking();
  } catch {}
  return <BreakingTicker initial={breaking} />;
}

async function HeaderMiniStats() {
  const [weather, market] = await Promise.all([
    getDistrictWeather("alipurduar").catch(() => null),
    getMarketQuotes().catch(() => null),
  ]);
  const w = weather?.weather;
  const nifty = market?.quotes.find((q) => q.symbol === "NIFTY50");
  return (
    <span className="flex items-center gap-4 tabular-nums">
      {w && Number.isFinite(w.tempC) && (
        <span>
          আলিপুরদুয়ার {Math.round(w.tempC)}°C{" "}
          <span aria-hidden>{iconFor(w.iconCode)}</span>
        </span>
      )}
      {nifty && Number.isFinite(nifty.price) && Number.isFinite(nifty.changePercent) && (
        <span>
          নিফটি {new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(nifty.price)}{" "}
          <span className={nifty.changePercent >= 0 ? "font-bold text-emerald-600" : "font-bold text-brand"}>
            {nifty.changePercent >= 0 ? "▲" : "▼"} {Math.abs(nifty.changePercent).toFixed(2)}%
          </span>
        </span>
      )}
    </span>
  );
}

function SearchForm() {
  return (
    <>
      <form action="/search" role="search" className="relative ml-auto hidden sm:mr-1 sm:block">
        <input
          name="q"
          placeholder="খবর খুঁজুন…"
          aria-label="খবর খুঁজুন"
          className="w-44 rounded-full border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand md:w-52"
        />
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </form>
      <Link href="/search" aria-label="খবর খুঁজুন" className="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 sm:hidden">
        <svg viewBox="0 0 24 24" className="h-[21px] w-[21px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </Link>
    </>
  );
}

const FOOTER_COLUMNS = [
  { title: "সংবাদ", links: NAV_MAIN },
  { title: "বিভাগ", links: NAV_CATEGORIES },
  { title: "আরও", links: NAV_OTHER.filter((l) => l.href !== "/admin") },
  { title: "আইনি", links: NAV_LEGAL },
];

export function SiteFooter({ settings }: { settings?: SiteSettings }) {
  const brand = settings ? brandFromSettings(settings) : { ...BRAND, logoUrl: "" };
  return (
    <footer className="mt-12 border-t-2 border-brand bg-white pb-20 md:pb-0" aria-label="ফুটার">
      {/* Follow us strip */}
      <div className="border-b border-slate-100 bg-[#faf9f5]">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-3 px-4 py-6 sm:flex-row sm:justify-between">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-ink">আমাদের ফলো করুন</p>
          <SocialLinks links={settings ? socialLinksFrom(settings) : undefined} />
        </div>
      </div>

      {/* Link columns */}
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex flex-col" aria-label={`${brand.bn} — হোম`}>
            <span className="text-2xl font-bold tracking-tight text-brand">{brand.bn}</span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              DOOARSER KHABAR
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-500">
            আলিপুরদুয়ার ও উত্তরবঙ্গের নির্ভরযোগ্য স্থানীয় সংবাদ, সর্বশেষ খবর, মতামত, খেলা, বিনোদন ও
            জীবনযাত্রার আপডেট।
          </p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="mb-2 border-l-2 border-brand pl-2 text-xs font-bold text-ink">{col.title}</h3>
            <ul className="space-y-1.5 pl-[10px] text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-slate-600 transition hover:text-brand">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-100">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-1.5 px-4 py-4 text-center text-[11px] text-slate-400 sm:flex-row sm:justify-between sm:text-left">
          <p>© {new Date().getFullYear()} {brand.bn}. সর্বস্বত্ব সংরক্ষিত।</p>
          <p>Made for Alipurduar • North Bengal</p>
          <p>
            Designed by{" "}
            <a
              href="https://ayushapd.dpdns.org"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-slate-500 transition hover:text-brand"
            >
              AYUSH NANDI
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
