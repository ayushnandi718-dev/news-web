import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";
import { serializeArticle } from "@/lib/serialize";
import { getLatest } from "@/lib/feeds";
import { ArticleCard } from "@/components/ArticleCard";
import ViewBeacon from "./ViewBeacon";
import ShareButtons from "./ShareButtons";
import Comments from "./Comments";

export const dynamic = "force-dynamic";

async function getArticle(slug: string) {
  const article = await db.article.findUnique({
    where: { slug },
    include: {
      category: { select: { slug: true, name: true } },
      author: { select: { name: true } },
    },
  });
  if (!article || !PUBLIC_VISIBLE_STATUSES.includes(article.status as never)) return null;
  return article;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Article not found" };
  const dto = serializeArticle(article);
  return {
    title: article.title,
    description: article.excerpt,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: dto.publishedAt ?? undefined,
      modifiedTime: dto.updatedAt ?? undefined,
      images: article.featuredImage ? [article.featuredImage] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const dto = serializeArticle(article);

  const related = await getLatest({ categorySlug: article.category.slug, limit: 4 });
  const relatedItems = related.items.filter((a) => a.id !== article.id).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: article.title,
    description: article.excerpt,
    image: article.featuredImage ? [article.featuredImage] : undefined,
    datePublished: dto.publishedAt,
    dateModified: dto.updatedAt,
    author: article.author?.name ? [{ "@type": "Person", name: article.author.name }] : undefined,
    publisher: { "@type": "Organization", name: "NewsWeb" },
    mainEntityOfPage: `/news/${article.slug}`,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "/" },
      { "@type": "ListItem", position: 2, name: article.category.name, item: `/category/${article.category.slug}` },
      { "@type": "ListItem", position: 3, name: article.title, item: `/news/${article.slug}` },
    ],
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ViewBeacon slug={article.slug} />

      <nav className="mb-3 text-sm text-slate-500">
        <Link href="/" className="hover:text-brand">Home</Link>
        {" / "}
        <Link href={`/category/${article.category.slug}`} className="font-semibold text-brand hover:underline">
          {article.category.name}
        </Link>
        {article.status !== "PUBLISHED" && (
          <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-600">
            {article.status === "ARCHIVED" ? "Archive" : "Older story"}
          </span>
        )}
      </nav>

      <h1 className="text-3xl font-black leading-tight text-slate-900 md:text-4xl">{article.title}</h1>
      <p className="mt-2 text-lg text-slate-600">{article.excerpt}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-slate-200 py-2 text-sm text-slate-500">
        {article.author?.name && <span className="font-semibold text-slate-700">{article.author.name}</span>}
        <span>{dto.freshness.ageLabel}</span>
        {dto.publishedAt && (
          <span>
            Published{" "}
            {new Intl.DateTimeFormat("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: process.env.NEWSROOM_TZ || "Asia/Kolkata",
            }).format(new Date(dto.publishedAt))}
          </span>
        )}
        {article.sourceName && <span>Source: {article.sourceName}</span>}
        <span>{article.views.toLocaleString()} views</span>
      </div>

      {article.featuredImage && (
        <figure className="mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.featuredImage} alt={article.imageCaption ?? ""} className="w-full rounded-lg object-cover" />
          {(article.imageCaption || article.imageCredit) && (
            <figcaption className="mt-1 text-xs text-slate-500">
              {article.imageCaption}
              {article.imageCredit && <span className="ml-2 italic">Credit: {article.imageCredit}</span>}
            </figcaption>
          )}
        </figure>
      )}

      <div className="prose prose-slate mt-5 max-w-none whitespace-pre-line leading-relaxed">{article.content}</div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <ShareButtons slug={article.slug} title={article.title} />
      </div>

      {relatedItems.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title">More in {article.category.name}</h2>
          <div className="space-y-4">
            {relatedItems.map((a) => (
              <ArticleCard key={a.id} a={a} variant="compact" />
            ))}
          </div>
        </section>
      )}

      <Comments slug={article.slug} enabled={article.commentsEnabled} />
    </main>
  );
}
