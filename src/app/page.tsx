import Link from "next/link";
import { getBreaking, getCategorySections, getFeatured, getLatest, getRegionSections, getTrending } from "@/lib/feeds";
import { ArticleCard } from "@/components/ArticleCard";
import BreakingTicker from "@/components/BreakingTicker";
import LiveFeed from "@/components/LiveFeed";
import MarketWatch from "@/components/MarketWatch";
import Newsletter from "@/components/Newsletter";
import WeatherCard from "@/components/WeatherCard";

export const dynamic = "force-dynamic";

const LOCAL_REGION_SLUGS = (process.env.HOME_REGION_SECTIONS ?? "alipurduar-region,north-bengal")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function SectionHeading({ title, href, label }: { title: string; href?: string; label?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b-2 border-brand-ink/90 pb-1.5">
      <h2 className="text-[15px] font-black uppercase tracking-wide text-brand-ink">{title}</h2>
      {href && (
        <Link href={href} className="text-xs font-bold text-brand hover:underline">
          {label ?? "View all"} →
        </Link>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [breaking, latest, featured, trending, sections, localSections] = await Promise.all([
    getBreaking(),
    getLatest({ limit: 12 }),
    getFeatured(4),
    getTrending({ limit: 6 }),
    getCategorySections(5),
    getRegionSections(LOCAL_REGION_SLUGS, 5),
  ]);

  const items = latest.items;
  const hero = items[0];
  const secondary = items.slice(1, 3);
  const feedItems = items.slice(3);

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-5">
      <BreakingTicker initial={breaking} />

      {/* Hero band */}
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section aria-label="Top story" className="min-w-0">
          {hero ? (
            <div className="grid gap-6 md:grid-cols-[1fr_240px]">
              {/* Main hero */}
              <article className="group min-w-0">
                <Link href={hero.url} className="block overflow-hidden rounded-xl bg-slate-100">
                  {hero.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={hero.image}
                      alt=""
                      className="aspect-[16/9] w-full object-cover transition duration-200 group-hover:scale-[1.015]"
                      fetchPriority="high"
                    />
                  ) : (
                    <span className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                      <span className="text-3xl font-black tracking-tight text-white/80">NewsWeb</span>
                    </span>
                  )}
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  {hero.isBreaking && (
                    <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Breaking</span>
                  )}
                  {hero.category && (
                    <Link href={`/category/${hero.category.slug}`} className="text-[11px] font-bold uppercase tracking-wide text-brand hover:underline">
                      {hero.category.name}
                    </Link>
                  )}
                  {hero.region && (
                    <Link href="/news" className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-200">
                      {hero.region.name}
                    </Link>
                  )}
                </div>
                <h2 className="mt-1.5 font-black leading-tight tracking-tight text-brand-ink [font-size:clamp(1.7rem,3vw,2.6rem)] [line-height:1.15]">
                  <Link href={hero.url} className="hover:text-brand">
                    {hero.title}
                  </Link>
                </h2>
                {hero.excerpt && <p className="mt-2 line-clamp-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">{hero.excerpt}</p>}
                <p className="mt-2 text-xs text-slate-500">
                  {hero.authorName && <span>{hero.authorName} · </span>}
                  <time dateTime={hero.publishedAt ?? undefined}>{new Date(hero.publishedAt ?? Date.now()).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true, day: "numeric", month: "short" })}</time>
                </p>

                {/* Secondary stories beside hero on md+ */}
                <ul className="mt-4 hidden divide-y divide-slate-100 border-t border-slate-100 md:block">
                  {secondary.map((a) => (
                    <li key={a.id}>
                      <ArticleCard a={a} variant="compact" />
                    </li>
                  ))}
                </ul>
              </article>

              {/* Mobile secondary stack */}
              <div className="space-y-5 md:hidden">
                {secondary.map((a) => (
                  <ArticleCard key={a.id} a={a} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex aspect-[16/9] max-h-72 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white">
              <p className="text-sm text-slate-400">No fresh stories right now — check the archive.</p>
            </div>
          )}
        </section>

        {/* Right rail: weather + market + top stories */}
        <div className="space-y-6">
          <WeatherCard />
          <MarketWatch />

          {featured.length > 0 && (
            <section aria-label="Top stories" className="hidden lg:block">
              <SectionHeading title="Top Stories" />
              <div className="divide-y divide-slate-100">
                {featured.map((a) => (
                  <ArticleCard key={a.id} a={a} variant="compact" />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Latest + Trending band */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-label="Latest news" className="min-w-0">
          <SectionHeading title="Latest News" href="/news" />
          <LiveFeed initialItems={feedItems.length ? feedItems : items.slice(1)} initialCursor={latest.next_cursor} />
        </section>

        <aside aria-label="Trending now">
          <SectionHeading title="Trending Now" href="/trending" />
          <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {trending.items.map((a, i) => (
              <li key={a.id} className="flex gap-3 px-4 py-2.5 transition hover:bg-slate-50">
                <span className="w-6 shrink-0 text-lg font-black leading-none tabular-nims text-slate-200">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold leading-snug text-brand-ink">
                    <Link href={a.url} className="hover:text-brand">
                      {a.title}
                    </Link>
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {a.category?.name} · {a.views.toLocaleString("en-IN")} views
                  </p>
                </div>
              </li>
            ))}
            {trending.items.length === 0 && (
              <li className="px-4 py-4 text-sm text-slate-500">Nothing trending yet.</li>
            )}
          </ol>
        </aside>
      </div>

      {/* Local-first sections */}
      {localSections.length > 0 && (
        <div className={`mt-10 grid gap-8 ${localSections.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {localSections.map((s) => {
            const [lead, ...rest] = s.items;
            return (
              <section key={s.slug} aria-label={`${s.name} news`}>
                <SectionHeading title={s.name.toUpperCase()} href="/news" label="More local" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <ArticleCard a={lead} />
                  <ul className="space-y-3">
                    {rest.slice(0, 3).map((a) => (
                      <li key={a.id}>
                        <ArticleCard a={a} variant="compact" />
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Category sections */}
      <div className="mt-10 space-y-10">
        {sections.map((s) => {
          const [lead, ...rest] = s.items;
          if (!lead) return null;
          return (
            <section key={s.slug} aria-label={`${s.name} news`}>
              <SectionHeading title={s.name.toUpperCase()} href={`/category/${s.slug}`} />
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <ArticleCard a={lead} />
                <ul className="grid content-start gap-x-6 sm:grid-cols-2">
                  {rest.slice(0, 4).map((a) => (
                    <li key={a.id} className="border-b border-slate-100 sm:border-b sm:last:border-0">
                      <ArticleCard a={a} variant="compact" />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          );
        })}
      </div>

      <Newsletter />
    </main>
  );
}
