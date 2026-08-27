import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { decodeSlug } from "@/lib/text";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";
import { serializeArticle } from "@/lib/serialize";
import { getLatest, getRelated, getTrending } from "@/lib/feeds";
import { bnLabel, BRAND, siteUrl, ogImageUrl, brandLogoUrl } from "@/lib/brand";
import { 
  generateNewsArticleSchema, 
  generateBreadcrumbSchema,
  generateLocalKeywords 
} from "@/lib/seo";
import NewsCard from "@/components/NewsCard";
import SectionHeader from "@/components/SectionHeader";
import TrendingList from "@/components/TrendingList";
import SafeImage from "@/components/SafeImage";
import ShareBar from "@/components/ShareBar";
import BookmarkButton from "@/components/BookmarkButton";
import TranslateButton from "@/components/TranslateButton";
import { AdBannerTop, AdInArticle, AdBannerBottom, AdSidebar } from "@/components/GoogleAdSense";
import ReadingProgress from "@/components/ReadingProgress";
import MarketWatch from "@/components/MarketWatch";
import WeatherCard from "@/components/WeatherCard";
import ViewBeacon from "./ViewBeacon";
import Comments from "./Comments";
import ContinueReading from "@/components/ContinueReading";
import NewsletterInline from "@/components/NewsletterInline";

export const revalidate = 120;

const getArticle = unstable_cache(
  async (slug: string) => {
    const article = await db.article.findUnique({
      where: { slug: decodeSlug(slug) },
      include: {
        category: { select: { slug: true, name: true } },
        author: { select: { name: true } },
      },
    });
    if (!article || !PUBLIC_VISIBLE_STATUSES.includes(article.status as never)) return null;
    return article;
  },
  ["article:by-slug"],
  { revalidate: 120, tags: ["articles"] }
);

function bnDateTime(iso: string): string {
  return new Intl.DateTimeFormat("bn-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: process.env.NEWSROOM_TZ || "Asia/Kolkata",
  }).format(new Date(iso));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  const base = siteUrl();

  if (!article) {
    return {
      title: "খবরটি পাওয়া যায়নি",
      description: `আপনি যে খবরটি খুঁজছেন তা পাওয়া যায়নি। ${BRAND.bn} — সর্বশেষ বাংলা সংবাদ।`,
      robots: { index: false, follow: true },
    };
  }

  const dto = serializeArticle(article);
  const canonical = `${base}/news/${article.slug}`;
  const keywords = generateLocalKeywords(article.category.slug, article.geographicScope || 'Alipurduar');
  const shareImage = article.featuredImage
    ? [{ url: article.featuredImage, width: 1200, height: 630, alt: article.title }]
    : [{ url: ogImageUrl({ title: article.title, subtitle: bnLabel(article.category.slug, article.category.name) }), width: 1200, height: 630, alt: article.title }];

  return {
    title: article.title,
    description: article.excerpt || `${article.title} - ${BRAND.bn}`,
    keywords,
    alternates: { canonical },
    openGraph: {
      title: article.title,
      description: article.excerpt || `${article.title} - ${BRAND.bn}`,
      type: "article",
      publishedTime: dto.publishedAt ?? undefined,
      modifiedTime: dto.updatedAt ?? undefined,
      url: canonical,
      images: shareImage,
      siteName: BRAND.bn,
      locale: "bn_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt || `${article.title} - ${BRAND.bn}`,
      images: shareImage.map((i) => i.url),
      creator: BRAND.twitter,
    },
    authors: article.author?.name ? [{ name: article.author.name }] : undefined,
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const dto = serializeArticle(article);

  const [related, moreFromCategory, trending] = await Promise.all([
    getRelated({
      id: article.id,
      categoryId: article.categoryId,
      subcategoryId: article.subcategoryId,
      regionId: article.regionId,
      geographicScope: article.geographicScope,
      limit: 6,
    }),
    getLatest({ categorySlug: article.category.slug, limit: 5 }),
    getTrending({ limit: 5 }),
  ]);

  const relatedIds = new Set(related.map((a) => a.id));
  const categoryMore = moreFromCategory.items
    .filter((a) => a.id !== article.id && !relatedIds.has(a.id))
    .slice(0, 4);

  const baseUrl = siteUrl();

  // Enhanced NewsArticle schema
  const newsArticleSchema = generateNewsArticleSchema({
    headline: article.title,
    description: article.excerpt || `${article.title} - ${BRAND.bn}`,
    image: article.featuredImage
      ? [article.featuredImage]
      : [ogImageUrl({ title: article.title, subtitle: bnLabel(article.category.slug, article.category.name) })],
    datePublished: new Date(dto.publishedAt ?? article.createdAt).toISOString(),
    dateModified: new Date(dto.updatedAt ?? article.updatedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: article.author?.name || BRAND.bn,
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND.bn,
      logo: brandLogoUrl(),
    },
    mainEntityOfPage: `${baseUrl}/news/${article.slug}`,
    articleSection: article.category.name,
    wordCount: article.content ? article.content.split(/\s+/).length : 0,
  });

  // Enhanced Breadcrumb schema
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "হোম", item: `${baseUrl}/` },
    { name: bnLabel(article.category.slug, article.category.name), item: `${baseUrl}/category/${article.category.slug}` },
    { name: article.title, item: `${baseUrl}/news/${article.slug}` },
  ]);

  return (
    <main className="mx-auto max-w-[1080px] px-4 py-5">
      <ReadingProgress />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: newsArticleSchema }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbSchema }} />
      <ViewBeacon
        slug={article.slug}
        title={article.title}
        category={article.category.name}
        image={article.featuredImage ?? undefined}
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* ===== Article column ===== */}
        <article className="min-w-0">
          <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="hover:text-brand">হোম</Link>
            <span aria-hidden>/</span>
            <Link href={`/category/${article.category.slug}`} className="font-semibold text-brand hover:underline">
              {bnLabel(article.category.slug, article.category.name)}
            </Link>
            {(article.status === "OLDER" || article.status === "ARCHIVED") && (
              <span className="bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                {article.status === "ARCHIVED" ? "আর্কাইভ" : "পুরোনো"}
              </span>
            )}
          </nav>

          <header>
            <div className="flex flex-wrap items-center gap-2">
              {dto.breakingActive && (
                <span className="bg-brand px-2 py-0.5 text-[11px] font-bold text-white">ব্রেকিং</span>
              )}
              {article.isFeatured && (
                <span className="border border-brand px-2 py-0.5 text-[11px] font-bold text-brand">গুরুত্বপূর্ণ</span>
              )}
              <Link href={`/category/${article.category.slug}`} className="text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-brand">
                {bnLabel(article.category.slug, article.category.name)}
              </Link>
            </div>

            <h1 className="mt-2 font-bold leading-[1.3] text-ink [font-size:clamp(1.4rem,5.6vw,2.5rem)] [line-height:1.3] md:[font-size:clamp(1.8rem,3.4vw,2.5rem)]">
              {article.title}
            </h1>
            {article.excerpt && <p className="mt-2.5 text-base leading-relaxed text-slate-600 md:text-lg">{article.excerpt}</p>}
          </header>

          <AdBannerTop />

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-slate-200/80 py-2 text-xs text-slate-500">
            {article.author?.name && <span className="font-semibold text-slate-700">{article.author.name}</span>}
            {dto.publishedAt && (
              <span>
                প্রকাশ <time dateTime={dto.publishedAt}>{bnDateTime(dto.publishedAt)}</time>
              </span>
            )}
            {dto.updatedAt && dto.updatedAt !== dto.publishedAt && (
              <span>আপডেট {bnDateTime(dto.updatedAt)}</span>
            )}
            <span>{article.views.toLocaleString("bn-IN")} বার পঠিত</span>
          </div>

          <figure className="mt-4">
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
              <SafeImage
                src={article.featuredImage}
                alt={article.imageCaption ?? ""}
                priority
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </div>
            {(article.imageCaption || article.imageCredit) && (
              <figcaption className="mt-1 text-[11px] text-slate-500">
                {article.imageCaption}
                {article.imageCredit && <span className="ml-2 italic">ছবি: {article.imageCredit}</span>}
              </figcaption>
            )}
          </figure>

          <div className="article-body mt-5 whitespace-pre-line text-slate-800">{article.content}</div>

          <AdInArticle />

          <div className="mt-6 border-t border-slate-200/80 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <ShareBar slug={article.slug} title={article.title} />
              <TranslateButton />
            </div>
            <div className="mt-2">
              <BookmarkButton articleId={article.id} />
            </div>
          </div>

          <AdBannerBottom />

          {/* Newsletter CTA */}
          <div className="mt-8">
            <NewsletterInline />
          </div>

          {/* ===== Related stories ===== */}
          {related.length > 0 && (
            <section className="mt-10" aria-label="সম্পর্কিত খবর">
              <SectionHeader title="আরও পড়ুন" />
              <div className="grid gap-x-5 sm:grid-cols-2">
                {related.map((a) => (
                  <NewsCard key={a.id} a={a} variant="compact" />
                ))}
              </div>
            </section>
          )}

          {categoryMore.length > 0 && (
            <section className="mt-9" aria-label="এই বিভাগে আরও">
              <SectionHeader title="এই বিভাগে আরও" href={`/category/${article.category.slug}`} />
              <div className="grid gap-x-5 sm:grid-cols-2">
                {categoryMore.map((a) => (
                  <NewsCard key={a.id} a={a} variant="compact" />
                ))}
              </div>
            </section>
          )}

          <Comments slug={article.slug} enabled={article.commentsEnabled} />
        </article>

        {/* ===== Sidebar ===== */}
        <aside className="space-y-6 min-w-0" aria-label="পার্শ্ব তথ্য">
          <ContinueReading />
          <AdSidebar />
          <section>
            <SectionHeader title="এই মুহূর্তে ট্রেন্ডিং" href="/trending" />
            <TrendingList items={trending.items} max={5} />
          </section>
          <WeatherCard />
          <MarketWatch />
          <section>
            <SectionHeader title="সর্বশেষ খবর" href="/news" />
            <div className="border border-slate-200/80 bg-white px-3">
              <SidebarLatest slugExclude={article.slug} />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

async function SidebarLatest({ slugExclude }: { slugExclude: string }) {
  const latest = await getLatest({ limit: 6 });
  const items = latest.items.filter((a) => a.slug !== slugExclude).slice(0, 5);
  if (items.length === 0) return <p className="py-3 text-xs text-slate-500">এখনও কোনও সংবাদ নেই।</p>;
  return (
    <>
      {items.map((a) => (
        <NewsCard key={a.id} a={a} variant="text" />
      ))}
    </>
  );
}
