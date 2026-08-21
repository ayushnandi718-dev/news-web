import { classifyFreshness, isBreakingActive, freshnessScore } from "./freshness";

export interface ArticleLike {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  isBreaking?: boolean;
  breakingUntil?: Date | null;
  isFeatured?: boolean;
  editorialPriority?: number;
  geographicPriority?: number;
  geographicScope?: string;
  views?: number;
  shares?: number;
  commentsCount?: number;
  status?: string;
  sourceName?: string | null;
  category?: { slug: string; name: string } | null;
  subcategory?: { slug: string; name: string } | null;
  region?: { slug: string; name: string } | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  categoryId?: string;
  author?: { name: string } | null;
}

export interface ArticleDTO {
  id: string;
  title: string;
  slug: string;
  url: string;
  excerpt: string;
  image: string | null;
  category: { slug: string; name: string } | null;
  subcategory: { slug: string; name: string } | null;
  region: { slug: string; name: string } | null;
  geographicScope: string;
  authorName: string | null;
  status: string;
  publishedAt: string | null;
  updatedAt: string | null;
  freshness: ReturnType<typeof classifyFreshness>;
  isBreaking: boolean;
  breakingActive: boolean;
  breakingUntil: string | null;
  isFeatured: boolean;
  views: number;
  shares: number;
  commentsCount: number;
  score: number;
}

export function serializeArticle(a: ArticleLike, now: Date = new Date()): ArticleDTO {
  const cat = a.category ?? null;
  const subcat = a.subcategory ?? null;
  const reg = a.region ?? null;
  const freshness = classifyFreshness(a.publishedAt ?? null, now, cat?.slug);
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    url: `/news/${a.slug}`,
    excerpt: a.excerpt,
    image: a.featuredImage ?? null,
    category: cat ? { slug: cat.slug, name: cat.name } : null,
    subcategory: subcat ? { slug: subcat.slug, name: subcat.name } : null,
    region: reg ? { slug: reg.slug, name: reg.name } : null,
    geographicScope: a.geographicScope ?? "LOCAL",
    authorName: a.author?.name ?? null,
    status: a.status ?? "PUBLISHED",
    publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : null,
    updatedAt: a.updatedAt ? new Date(a.updatedAt).toISOString() : null,
    freshness,
    isBreaking: !!a.isBreaking,
    breakingActive: isBreakingActive(!!a.isBreaking, a.breakingUntil ?? null, now),
    breakingUntil: a.breakingUntil ? new Date(a.breakingUntil).toISOString() : null,
    isFeatured: !!a.isFeatured,
    views: a.views ?? 0,
    shares: a.shares ?? 0,
    commentsCount: a.commentsCount ?? 0,
    score: Math.round(freshnessScore(a, now) * 10) / 10,
  };
}

export function encodeCursor(publishedAt: Date | string, id: string): string {
  const iso = typeof publishedAt === "string" ? publishedAt : publishedAt.toISOString();
  return Buffer.from(`${iso}|${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): { date: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const idx = raw.indexOf("|");
    if (idx < 0) return null;
    const date = new Date(raw.slice(0, idx));
    const id = raw.slice(idx + 1);
    if (isNaN(date.getTime()) || !id) return null;
    return { date, id };
  } catch {
    return null;
  }
}
