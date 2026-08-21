import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getLatest, getTrending } from "@/lib/feeds";
import LiveFeed from "@/components/LiveFeed";
import { ArticleCard } from "@/components/ArticleCard";

export const dynamic = "force-dynamic";

async function getCategory(slug: string) {
  return db.category.findUnique({ where: { slug } });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) return { title: "Category not found" };
  return { title: `${cat.name} News`, description: cat.description ?? `Latest ${cat.name} news` };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();

  const [latest, trending] = await Promise.all([
    getLatest({ categorySlug: slug, limit: 10 }),
    getTrending({ categorySlug: slug, limit: 4 }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="section-title">{cat.name} — Latest</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <LiveFeed initialItems={latest.items} initialCursor={latest.next_cursor} category={slug} />
        <aside>
          <h2 className="section-title">Trending in {cat.name}</h2>
          <div className="space-y-3">
            {trending.items.map((a) => (
              <ArticleCard key={a.id} a={a} variant="compact" />
            ))}
            {trending.items.length === 0 && <p className="text-sm text-slate-500">Nothing trending here yet.</p>}
          </div>
          <Link href={`/archive?category=${slug}`} className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
            Browse {cat.name} archive →
          </Link>
        </aside>
      </div>
    </main>
  );
}
