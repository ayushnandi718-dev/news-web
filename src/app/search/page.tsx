import type { Metadata } from "next";
import { searchNews } from "@/lib/feeds";
import { ArticleCard } from "@/components/ArticleCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query.length >= 2 ? await searchNews(query, 30) : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="section-title">Search</h1>
      <form action="/search" className="mb-5 flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search news…"
          className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button className="rounded bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
          Search
        </button>
      </form>

      {query.length < 2 ? (
        <p className="text-sm text-slate-500">Type at least two characters to search.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
          </p>
          <div className="space-y-4">
            {results.map((a) => (
              <ArticleCard key={a.id} a={a} />
            ))}
            {results.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No stories found.</p>}
          </div>
        </>
      )}
    </main>
  );
}
