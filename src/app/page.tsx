import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getCategorySections, getLatest, getTrending } from "@/lib/feeds";
import NewsCard from "@/components/NewsCard";
import SectionHeader from "@/components/SectionHeader";
import TrendingList from "@/components/TrendingList";
import MarketWatch from "@/components/MarketWatch";
import Newsletter from "@/components/Newsletter";
import WeatherCard from "@/components/WeatherCard";
import LiveLatest from "@/components/LiveLatest";
import AdSlot from "@/components/AdSlot";
import { AdBannerTop, AdInArticle, AdSidebar } from "@/components/GoogleAdSense";
import { HOME_SECTION_SLUGS, bnLabel, BRAND, siteUrl, brandLogoUrl } from "@/lib/brand";
import { generateWebSiteSchema } from "@/lib/seo";
import { db } from "@/lib/db";
import { PLATFORM_LABELS, type LivePlatform } from "@/lib/live";

export const revalidate = 30;

const getActiveLiveStreams = unstable_cache(
  async () => db.liveStream.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 3,
    select: { id: true, title: true, url: true, bannerUrl: true, platform: true },
  }),
  ["home:live-streams"],
  { revalidate: 10, tags: ["live-streams"] }
);

export default async function HomePage() {
  const [latest, trending, categorySections, liveStreams] = await Promise.all([
    getLatest({ limit: 26 }),
    getTrending({ limit: 6 }),
    getCategorySections(6),
    getActiveLiveStreams(),
  ]);
  const live = liveStreams[0];

  const items = latest.items;
  const hero = items[0];
  const secondary = items.slice(1, 4);
  const strip = items.slice(4, 8);
  const latestGrid = items.slice(8, 20);

  const sectionMap = new Map(categorySections.map((s) => [s.slug, s]));
  const orderedSections = HOME_SECTION_SLUGS.map((slug) => sectionMap.get(slug)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s)
  );

  const base = siteUrl();
  const websiteSchema = generateWebSiteSchema(base, BRAND.bn);
  const orgSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: BRAND.bn,
    alternateName: BRAND.en,
    slogan: BRAND.tagline,
    url: base,
    logo: brandLogoUrl(),
    areaServed: [
      { "@type": "City", name: "Alipurduar" },
      { "@type": "AdministrativeArea", name: "Dooars" },
      { "@type": "AdministrativeArea", name: "North Bengal" },
      { "@type": "State", name: "West Bengal" },
      { "@type": "Country", name: "India" },
    ],
  });

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: websiteSchema }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: orgSchema }}
      />
      {/* ===== AD: HOME TOP ===== */}
      <AdSlot placement="HOME_TOP" />

      {/* ===== LIVE NOW STRIP ===== */}
      {live && (
        <section aria-label="এখন লাইভ" className="mb-5">
          <div className="flex items-stretch overflow-hidden rounded-xl border border-red-200 bg-white shadow-sm transition hover:border-red-400 hover:shadow-md">
            <a
              href={live.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-0 flex-1 items-stretch"
            >
            <div className="relative hidden w-44 shrink-0 bg-gradient-to-br from-slate-800 via-brand-dark to-slate-900 sm:block">
              {live.bannerUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={live.bannerUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-white/80">
                  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m22 8-6 4 6 4V8Z" /><rect x="2" y="6" width="14" height="12" rx="2" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-4 py-3">
              <p className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                  <span className="h-1.5 w-1.5 animate-pulseDot rounded-full bg-white" aria-hidden="true" />
                  এখন লাইভ
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  {PLATFORM_LABELS[live.platform as LivePlatform] ?? PLATFORM_LABELS.OTHER}
                </span>
              </p>
              <p className="truncate font-bold leading-snug text-brand-ink group-hover:text-brand">{live.title}</p>
              <p className="text-xs font-semibold text-slate-500 group-hover:text-slate-700">
                দেখুন → {PLATFORM_LABELS[live.platform as LivePlatform] ?? PLATFORM_LABELS.OTHER}-এ খুলবে
              </p>
            </div>
            </a>
            {liveStreams.length > 1 && (
              <Link
                href="/live"
                className="flex shrink-0 items-center border-l border-slate-100 px-3 text-xs font-bold text-brand hover:bg-brand/5"
              >
                +{liveStreams.length - 1} আরও
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ===== HERO BAND ===== */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label="প্রধান সংবাদ" className="min-w-0">
          {hero ? (
            <div className="grid gap-5 md:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
              <NewsCard a={hero} variant="hero" />
              <div className="border-t border-slate-200/80 md:border-t-0">
                {secondary.map((a) => (
                  <NewsCard key={a.id} a={a} variant="compact" />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex aspect-[16/9] max-h-72 items-center justify-center border border-dashed border-slate-300 bg-white">
              <p className="text-sm text-slate-400">এই মুহূর্তে নতুন সংবাদ নেই — আর্কাইভ দেখুন।</p>
            </div>
          )}
        </section>

        <aside aria-label="আবহাওয়া ও মার্কেট" className="space-y-4">
          <WeatherCard />
          <MarketWatch />
        </aside>
      </div>

      {/* ===== STORY STRIP (below hero) ===== */}
      <AdBannerTop />
      {strip.length > 0 && (
        <div className="mt-5 grid gap-x-6 border-y border-slate-200/80 py-1 sm:grid-cols-2 lg:grid-cols-4">
          {strip.map((a) => (
            <NewsCard key={a.id} a={a} variant="text" />
          ))}
        </div>
      )}

      {/* ===== LATEST + TRENDING ===== */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <LiveLatest initial={latestGrid} />

        <aside aria-label="ট্রেন্ডিং" className="space-y-4">
          <SectionHeader title="এই মুহূর্তে ট্রেন্ডিং" href="/trending" />
          <TrendingList items={trending.items} max={5} />
          <AdSlot placement="HOME_SIDEBAR" />
          <AdSidebar />
          {featuredLinkStrip()}
        </aside>
      </div>

      {/* ===== CATEGORY SECTIONS (Alipurduar-first order) ===== */}
      <AdInArticle />
      <div className="mt-10 space-y-10">
        {orderedSections.map((s) => {
          const [lead, ...rest] = s.items;
          if (!lead) return null;
          return (
            <section key={s.slug} aria-label={`${bnLabel(s.slug, s.name)} সংবাদ`} className="scroll-mt-32">
              <SectionHeader title={bnLabel(s.slug, s.name)} href={`/category/${s.slug}`} />
              <div className="grid gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <NewsCard a={lead} variant="lead" />
                <div className="grid content-start gap-x-6 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                  {rest.slice(0, 4).map((a) => (
                    <NewsCard key={a.id} a={a} variant="compact" />
                  ))}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-12 border-t border-slate-200/80 pt-6">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          আলিপুরদুয়ার → ডুয়ার্স → উত্তরবঙ্গ → পশ্চিমবঙ্গ → ভারত → বিশ্ব
        </p>
      </div>

      <Newsletter />
    </main>
  );
}

function featuredLinkStrip() {
  return (
    <div className="border border-slate-200/80 bg-white p-3">
      <p className="text-[11px] leading-relaxed text-slate-500">
        আপনার এলাকার প্রতিটি খবর এখন বাংলায়।{" "}
        <Link href="/archive" className="font-bold text-brand hover:underline">
          পুরোনো খবরাও পড়ুন →
        </Link>
      </p>
    </div>
  );
}
