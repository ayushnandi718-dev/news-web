import { db } from "./db";
import { cacheWrap } from "./cache";
import {
  CACHE_TTL_SECONDS,
  DEFAULT_PAGE_SIZE,
  LATEST_WINDOW_HOURS,
  MAX_PAGE_SIZE,
  PUBLIC_VISIBLE_STATUSES,
  TRENDING_HALF_LIFE_HOURS,
  TRENDING_WEIGHTS,
  TRENDING_WINDOW_HOURS,
} from "./config";
import { decodeCursor, encodeCursor, serializeArticle } from "./serialize";
import { trendingScore } from "./freshness";

export interface Paginated<T> {
  items: T[];
  next_cursor: string | null;
}

type SerializedArticle = ReturnType<typeof serializeArticle>;

const articleInclude = {
  category: { select: { slug: true, name: true } },
  subcategory: { select: { slug: true, name: true } },
  region: { select: { slug: true, name: true } },
  author: { select: { name: true } },
} as const;

function windowStart(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 3600_000);
}

export async function getLatest(opts: {
  categorySlug?: string;
  regionSlug?: string;
  cursor?: string;
  limit?: number;
}): Promise<Paginated<SerializedArticle>> {
  const now = new Date();
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.limit ?? DEFAULT_PAGE_SIZE));
  const key = `latest:${opts.categorySlug ?? "all"}:${opts.regionSlug ?? "all"}:${opts.cursor ?? "0"}:${limit}`;
  return cacheWrap(
    key,
    CACHE_TTL_SECONDS.latest,
    ["latest", opts.categorySlug ? `latest:${opts.categorySlug}` : "latest:all", opts.regionSlug ? `latest:${opts.regionSlug}` : "latest:all"],
    async () => {
      const cursor = opts.cursor ? decodeCursor(opts.cursor) : null;
      const where: Record<string, unknown> = {
        status: "PUBLISHED",
        publishedAt: {
          not: null,
          lte: now,
          gte: windowStart(now, LATEST_WINDOW_HOURS),
        },
        ...(cursor
          ? {
              OR: [
                { publishedAt: { lt: cursor.date } },
                { AND: [{ publishedAt: cursor.date }, { id: { lt: cursor.id } }] },
              ],
            }
          : {}),
      };
      if (opts.categorySlug) where.category = { slug: opts.categorySlug };
      if (opts.regionSlug) where.region = { slug: opts.regionSlug };
      const rows = await db.article.findMany({
        where,
        include: articleInclude,
        orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
        take: limit + 1,
      });
      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;
      const last = page[page.length - 1];
      return {
        items: page.map((a) => serializeArticle(a, now)),
        next_cursor: hasMore && last?.publishedAt ? encodeCursor(last.publishedAt, last.id) : null,
      };
    }
  );
}

export interface BreakingItem {
  id: string;
  slug: string;
  title: string;
  url: string;
  publishedAt: string | null;
  breakingUntil: string | null;
  priority: number;
}

export async function getBreaking(): Promise<BreakingItem[]> {
  const now = new Date();
  return cacheWrap(`breaking:${Math.floor(now.getTime() / 5000)}`, CACHE_TTL_SECONDS.breaking, ["breaking"], async () => {
    const rows = await db.article.findMany({
      where: {
        status: { in: ["PUBLISHED", "OLDER"] },
        isBreaking: true,
        breakingUntil: { gt: now },
        publishedAt: { not: null },
      },
      include: articleInclude,
      orderBy: [{ breakingPriority: "desc" }, { publishedAt: "desc" }],
      take: 10,
    });
    return rows.map((a) => ({
      id: a.id,
      slug: a.slug,
      title: a.title,
      url: `/news/${a.slug}`,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      breakingUntil: a.breakingUntil ? a.breakingUntil.toISOString() : null,
      priority: a.breakingPriority,
    }));
  });
}

export async function getTrending(opts: {
  categorySlug?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: SerializedArticle[]; page: number; hasMore: boolean }> {
  const now = new Date();
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.limit ?? DEFAULT_PAGE_SIZE));
  const page = Math.max(0, opts.page ?? 0);
  return cacheWrap(
    `trending:${opts.categorySlug ?? "all"}:${page}:${limit}:${Math.floor(now.getTime() / 60_000)}`,
    CACHE_TTL_SECONDS.trending,
    ["trending"],
    async () => {
      const where: Record<string, unknown> = {
        status: { in: ["PUBLISHED", "OLDER"] },
        publishedAt: { not: null, lte: now, gte: windowStart(now, TRENDING_WINDOW_HOURS) },
      };
      if (opts.categorySlug) where.category = { slug: opts.categorySlug };
      const candidates = await db.article.findMany({
        where,
        include: articleInclude,
        orderBy: { publishedAt: "desc" },
        take: 500,
      });
      const scored = candidates
        .map((a) => ({
          a,
          s: trendingScore(a, now, TRENDING_WEIGHTS, TRENDING_HALF_LIFE_HOURS),
        }))
        .sort((x, y) => y.s - x.s);
      const slice = scored.slice(page * limit, page * limit + limit);
      return {
        items: slice.map((x) => serializeArticle(x.a, now)),
        page,
        hasMore: scored.length > page * limit + limit,
      };
    }
  );
}

export async function getArchive(opts: {
  categorySlug?: string;
  q?: string;
  year?: number;
  month?: number;
  cursor?: string;
  limit?: number;
}): Promise<Paginated<SerializedArticle>> {
  const now = new Date();
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, opts.limit ?? DEFAULT_PAGE_SIZE));
  const cursor = opts.cursor ? decodeCursor(opts.cursor) : null;
  const where: Record<string, unknown> = {
    status: { in: PUBLIC_VISIBLE_STATUSES },
    publishedAt: { not: null, lte: now },
    ...(cursor
      ? {
          OR: [
            { publishedAt: { lt: cursor.date } },
            { AND: [{ publishedAt: cursor.date }, { id: { lt: cursor.id } }] },
          ],
        }
      : {}),
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    ...(opts.q
      ? {
          OR: [
            { title: { contains: opts.q } },
            { excerpt: { contains: opts.q } },
            { content: { contains: opts.q } },
          ],
        }
      : {}),
  };
  if (opts.year) {
    const start = new Date(Date.UTC(opts.year, (opts.month ?? 1) - 1, 1));
    const end = opts.month
      ? new Date(Date.UTC(opts.year, opts.month, 1))
      : new Date(Date.UTC(opts.year + 1, 0, 1));
    const existing = where.publishedAt as Record<string, unknown>;
    where.publishedAt = { ...existing, gte: start, lt: end };
  }
  const rows = await db.article.findMany({
    where,
    include: articleInclude,
    orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const last = pageRows[pageRows.length - 1];
  return {
    items: pageRows.map((a) => serializeArticle(a, now)),
    next_cursor: hasMore && last?.publishedAt ? encodeCursor(last.publishedAt, last.id) : null,
  };
}

export async function searchNews(q: string, limit = 20): Promise<SerializedArticle[]> {
  const now = new Date();
  const rows = await db.article.findMany({
    where: {
      status: { in: PUBLIC_VISIBLE_STATUSES },
      publishedAt: { not: null },
      OR: [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { content: { contains: q } },
      ],
    },
    include: articleInclude,
    orderBy: { publishedAt: "desc" },
    take: Math.min(MAX_PAGE_SIZE, limit),
  });
  return rows.map((a) => serializeArticle(a, now));
}

/**
 * Related-story recommendations for the article page.
 * Priority: same subcategory > same category > same region > same geographic
 * scope > most recent. Never includes the current article.
 */
export async function getRelated(opts: {
  id: string;
  categoryId?: string | null;
  subcategoryId?: string | null;
  regionId?: string | null;
  geographicScope?: string | null;
  limit?: number;
}): Promise<SerializedArticle[]> {
  const limit = Math.min(12, Math.max(1, opts.limit ?? 6));
  const now = new Date();
  const base = {
    status: { in: PUBLIC_VISIBLE_STATUSES },
    publishedAt: { not: null, lte: now },
    id: { not: opts.id },
  };
  const seen = new Set<string>([opts.id]);
  const out: SerializedArticle[] = [];
  const collect = (rows: Awaited<ReturnType<typeof fetchStage>>) => {
    for (const row of rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        out.push(row);
      }
    }
  };
  const fetchStage = async (extra: Record<string, unknown>): Promise<SerializedArticle[]> => {
    const rows = await db.article.findMany({
      where: { ...base, ...extra },
      include: articleInclude,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      take: limit,
    });
    return rows.map((a) => serializeArticle(a, now));
  };

  try {
    if (opts.subcategoryId && out.length < limit) collect(await fetchStage({ subcategoryId: opts.subcategoryId }));
    if (opts.categoryId && out.length < limit) collect(await fetchStage({ categoryId: opts.categoryId }));
    if (opts.regionId && out.length < limit) collect(await fetchStage({ regionId: opts.regionId }));
    if (opts.geographicScope && out.length < limit) collect(await fetchStage({ geographicScope: opts.geographicScope }));
    if (out.length < limit) collect(await fetchStage({}));
  } catch {
    return out;
  }
  return out.slice(0, limit);
}

export async function getFeatured(limit = 4): Promise<SerializedArticle[]> {
  const now = new Date();
  return cacheWrap(`featured:${limit}:${Math.floor(now.getTime() / 60_000)}`, CACHE_TTL_SECONDS.home, ["home"], async () => {
    const rows = await db.article.findMany({
      where: {
        status: { in: ["PUBLISHED", "OLDER"] },
        isFeatured: true,
        publishedAt: { not: null, lte: now },
      },
      include: articleInclude,
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
    return rows.map((a) => serializeArticle(a, now));
  });
}

export async function getRegionSections(
  regionSlugs: string[],
  limit = 4
): Promise<Array<{ slug: string; name: string; items: SerializedArticle[] }>> {
  const now = new Date();
  if (!regionSlugs.length) return [];
  return cacheWrap(
    `regionsections:${regionSlugs.join("|")}:${limit}:${Math.floor(now.getTime() / 60_000)}`,
    CACHE_TTL_SECONDS.home,
    ["latest"],
    async () => {
      const regions = await db.region.findMany({ where: { slug: { in: regionSlugs } } });
      const out = [];
      for (const r of regionSlugs) {
        const region = regions.find((x) => x.slug === r);
        if (!region) continue;
        const rows = await db.article.findMany({
          where: {
            regionId: region.id,
            status: { in: ["PUBLISHED", "OLDER"] },
            publishedAt: { not: null, lte: now },
          },
          include: articleInclude,
          orderBy: { publishedAt: "desc" },
          take: limit,
        });
        if (rows.length > 0) {
          out.push({ slug: r, name: region.name, items: rows.map((a) => serializeArticle(a, now)) });
        }
      }
      return out;
    }
  );
}

export async function getCategorySections(limit = 4): Promise<
  Array<{ slug: string; name: string; items: SerializedArticle[] }>
> {
  const now = new Date();
  return cacheWrap(
    `catsections:${limit}:${Math.floor(now.getTime() / 60_000)}`,
    CACHE_TTL_SECONDS.home,
    ["home", "latest"],
    async () => {
      const cats = await db.category.findMany({ orderBy: [{ priority: "desc" }, { name: "asc" }] });
      const out = [];
      for (const c of cats) {
        const rows = await db.article.findMany({
          where: {
            categoryId: c.id,
            status: { in: ["PUBLISHED", "OLDER"] },
            publishedAt: { not: null, lte: now },
          },
          include: articleInclude,
          orderBy: { publishedAt: "desc" },
          take: limit,
        });
        out.push({ slug: c.slug, name: c.name, items: rows.map((a) => serializeArticle(a, now)) });
      }
      return out.filter((s) => s.items.length > 0);
    }
  );
}



