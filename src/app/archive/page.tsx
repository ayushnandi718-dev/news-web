import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { getArchive } from "@/lib/feeds";
import { db } from "@/lib/db";
import { ArticleCard } from "@/components/ArticleCard";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "News Archive",
  description: "Browse the complete archive of published stories.",
};

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; year?: string; month?: string; q?: string; cursor?: string }>;
}) {
  const getAllCategories = unstable_cache(
    () => db.category.findMany({ orderBy: { name: "asc" }, select: { slug: true, name: true } }),
    ["archive:categories"],
    { revalidate: 600, tags: ["categories"] }
  );

  const sp = await searchParams;
  const [archive, categories] = await Promise.all([
    getArchive({
      categorySlug: sp.category,
      year: sp.year ? parseInt(sp.year, 10) : undefined,
      month: sp.month ? parseInt(sp.month, 10) : undefined,
      q: sp.q,
      cursor: sp.cursor,
      limit: 20,
    }),
    getAllCategories(),
  ]);

  const qs = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { category: sp.category, year: sp.year, month: sp.month, q: sp.q, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/archive?${p.toString()}`;
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="section-title">Archive</h1>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link
          href="/archive"
          className={`rounded-full border px-3 py-1 font-semibold ${!sp.category ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600 hover:border-brand"}`}
        >
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={qs({ category: c.slug })}
            className={`rounded-full border px-3 py-1 font-semibold ${sp.category === c.slug ? "border-brand bg-brand text-white" : "border-slate-300 text-slate-600 hover:border-brand"}`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {archive.items.map((a) => (
          <ArticleCard key={a.id} a={a} />
        ))}
        {archive.items.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No archived stories match these filters.</p>
        )}
      </div>

      {archive.next_cursor && (
        <div className="mt-6 text-center">
          <Link
            href={qs({ cursor: archive.next_cursor })}
            className="rounded border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
          >
            Older stories →
          </Link>
        </div>
      )}
    </main>
  );
}
