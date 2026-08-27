import type { Metadata } from "next";
import { searchNews } from "@/lib/feeds";
import { ArticleCard } from "@/components/ArticleCard";
import { TrendingTopics, RecentSearches } from "./SearchHelpers";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "খবর খুঁজুন",
  description: "দুয়ার্সের খবর — সব বাংলা সংবাদ অনুসন্ধান করুন।",
};

const TRENDING_TOPICS = [
  "আলিপুরদুয়ার",
  "ডুয়ার্স",
  "উত্তরবঙ্গ",
  "আবহাওয়া",
  "ক্রিকেট",
  "পশ্চিমবঙ্গ",
  "রেল",
  "নির্মাণ",
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query.length >= 2 ? await searchNews(query, 30) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-5 md:py-6">
      <h1 className="section-title">খবর খুঁজুন</h1>

      <form action="/search" role="search" className="mb-4 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          autoFocus
          inputMode="search"
          placeholder="খবর খুঁজুন…"
          aria-label="খবর খুঁজুন"
          className="min-h-[46px] flex-1 rounded-lg border border-slate-300 bg-white px-3.5 text-[15px] outline-none transition placeholder:text-slate-400 focus:border-brand"
        />
        <button className="min-h-[46px] rounded-lg bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark">
          খুঁজুন
        </button>
      </form>

      {query.length < 2 ? (
        <div className="space-y-5">
          <RecentSearches />
          <section aria-label="ট্রেন্ডিং বিষয়">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">ট্রেন্ডিং বিষয়</h2>
            <TrendingTopics topics={TRENDING_TOPICS} />
          </section>
          <p className="rounded-lg border border-dashed border-slate-300 bg-white py-8 text-center text-sm text-slate-500">
            কমপক্ষে দুটি অক্ষর লিখে খুঁজুন।
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            “{query}” এর জন্য {new Intl.NumberFormat("bn-IN").format(results.length)} টি ফলাফল
          </p>
          <div className="space-y-1">
            {results.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
            {results.length === 0 && (
              <p className="rounded-lg border border-dashed border-slate-300 bg-white py-10 text-center text-sm text-slate-500">
                কোনও খবর পাওয়া যায়নি। অন্য শব্দ দিয়ে খুঁজে দেখুন।
              </p>
            )}
          </div>
          <RecentSearches saveQuery={query} />
        </>
      )}
    </main>
  );
}
