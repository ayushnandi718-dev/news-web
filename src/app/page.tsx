import Link from "next/link";
import { getBreaking, getCategorySections, getFeatured, getLatest, getTrending } from "@/lib/feeds";
import { ArticleCard } from "@/components/ArticleCard";
import BreakingTicker from "@/components/BreakingTicker";
import LiveFeed from "@/components/LiveFeed";
import Newsletter from "@/components/Newsletter";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [breaking, latest, featured, trending, sections] = await Promise.all([
    getBreaking(),
    getLatest({ limit: 8 }),
    getFeatured(3),
    getTrending({ limit: 5 }),
    getCategorySections(4),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-4">
      <BreakingTicker initial={breaking} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="section-title">Latest News</h2>
          {latest.items[0] ? (
            <div className="mb-5">
              <ArticleCard a={latest.items[0]} variant="hero" />
            </div>
          ) : null}
          <LiveFeed initialItems={latest.items.slice(1)} initialCursor={latest.next_cursor} />
        </section>

        <aside className="space-y-8">
          <section>
            <h2 className="section-title">Trending Now</h2>
            <ol className="space-y-3">
              {trending.items.map((a, i) => (
                <li key={a.id} className="flex gap-3">
                  <span className="text-xl font-black text-slate-300">{i + 1}</span>
                  <div>
                    <h3 className="text-sm font-semibold leading-snug hover:text-brand">
                      <Link href={a.url}>{a.title}</Link>
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {a.views.toLocaleString()} views · {a.category?.name}
                    </p>
                  </div>
                </li>
              ))}
              {trending.items.length === 0 && <li className="text-sm text-slate-500">Nothing trending yet.</li>}
            </ol>
          </section>

          {featured.length > 0 && (
            <section>
              <h2 className="section-title">Top Stories</h2>
              <div className="space-y-4">
                {featured.map((a) => (
                  <ArticleCard key={a.id} a={a} variant="compact" />
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {sections.map((s) => (
        <section key={s.slug} className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="section-title">{s.name}</h2>
            <Link href={`/category/${s.slug}`} className="text-sm font-semibold text-brand hover:underline">
              More {s.name} →
            </Link>
          </div>
          <div className={`grid gap-6 ${s.slug === "videos" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {s.items.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
          </div>
        </section>
      ))}

      <Newsletter />
    </main>
  );
}
