import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { getLatest, getTrending } from "@/lib/feeds";
import LiveFeed from "@/components/LiveFeed";
import AdSlot from "@/components/AdSlot";
import { AdBannerTop, AdSidebar } from "@/components/GoogleAdSense";
import { ArticleCard } from "@/components/ArticleCard";
import { BRAND, bnLabel, siteUrl, ogImageUrl } from "@/lib/brand";
import { generateLocalKeywords, generateCollectionPageSchema } from "@/lib/seo";

export const revalidate = 60;

const getCategory = unstable_cache(
  async (slug: string) => db.category.findUnique({ where: { slug: decodeSlug(slug) } }),
  ["category:by-slug"],
  { revalidate: 300, tags: ["categories"] }
);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) return { title: "খবর পাওয়া যায়নি" };
  const name = bnLabel(slug, cat.name);
  const base = siteUrl();
  const description = cat.description?.trim()
    ? `${name} বিভাগের সর্বশেষ বাংলা খবর — ${cat.description}`
    : `${name} এর সর্বশেষ বাংলা সংবাদ, ব্রেকিং নিউজ ও বিশ্লেষণ — ${BRAND.bn}।`;
  return {
    title: `${name} — সর্বশেষ খবর`,
    description,
    keywords: generateLocalKeywords(cat.slug),
    alternates: { canonical: `${base}/category/${slug}` },
    openGraph: {
      title: `${name} | ${BRAND.bn}`,
      description,
      url: `${base}/category/${slug}`,
      images: [ogImageUrl({ title: name, subtitle: BRAND.bn })],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} | ${BRAND.bn}`,
      description,
      images: [ogImageUrl({ title: name, subtitle: BRAND.bn })],
    },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();

  const [latest, trending] = await Promise.all([
    getLatest({ categorySlug: slug, limit: 10 }),
    getTrending({ categorySlug: slug, limit: 4 }),
  ]);

  const nameBn = bnLabel(slug, cat.name);
  const collectionSchema = generateCollectionPageSchema(
    `${nameBn} — ${BRAND.bn}`,
    cat.description ?? `${nameBn} এর সর্বশেষ বাংলা সংবাদ`,
    `${siteUrl()}/category/${slug}`,
    latest.items.slice(0, 10).map((a) => ({
      name: a.title,
      url: `${siteUrl()}/news/${a.slug}`,
      datePublished: a.publishedAt ?? undefined,
    }))
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: collectionSchema }}
      />
      <h1 className="section-title">{nameBn} — সর্বশেষ</h1>
      <div className="mb-4">
        <AdSlot placement="CATEGORY_TOP" />
        <AdBannerTop />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <LiveFeed initialItems={latest.items} initialCursor={latest.next_cursor} category={slug} />
        <aside className="space-y-4">
          <AdSidebar />
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
