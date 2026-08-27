import { db } from "../db";
import { INGEST_LOOKBACK_DAYS_FOR_DEDUPE, DUPLICATE_SIMILARITY_THRESHOLD } from "../config";
import { hashId, textSimilarity, titleSimilarity } from "../text";
import type { NormalizedItem } from "./feed";

export interface DuplicateMatch {
  kind: "ARTICLE" | "IMPORT";
  id: string;
  title: string;
  slug?: string;
  similarity: number;
  reason: string;
}

/** Recent articles/imports used for similarity matching (lightweight rows). */
export interface DedupeCorpus {
  articles: Array<{ id: string; title: string; slug?: string; excerpt: string | null; content: string | null }>;
  imports: Array<{ id: string; title: string }>;
}

/**
 * Loads the dedupe comparison set ONCE per ingestion batch instead of per
 * item. Content is truncated server-side (LEFT) so we don't ship full
 * article bodies over the wire just for similarity scoring.
 */
export async function loadDedupeCorpus(): Promise<DedupeCorpus> {
  const lookback = new Date(Date.now() - INGEST_LOOKBACK_DAYS_FOR_DEDUPE * 86400_000);
  const [articles, imports] = await Promise.all([
    db.$queryRaw<{ id: string; title: string; slug: string; excerpt: string | null; content: string | null }[]>`
      SELECT id, title, slug, excerpt, LEFT(content, 1200) AS content
      FROM "Article"
      WHERE "createdAt" >= ${lookback}
        AND status IN ('NEW','DRAFT','IN_REVIEW','APPROVED','PUBLISHED','OLDER')
      ORDER BY "createdAt" DESC
      LIMIT 300`,
    db.importedItem.findMany({
      where: { fetchedAt: { gte: lookback }, status: { in: ["PENDING", "DUPLICATE_CANDIDATE"] } },
      select: { id: true, title: true },
      take: 300,
    }),
  ]);
  return { articles, imports };
}

export async function detectDuplicate(
  item: NormalizedItem,
  sourceId: string,
  corpus?: DedupeCorpus
): Promise<DuplicateMatch | null> {
  const urlHash = hashId(item.url);
  const existingByUrl = await db.importedItem.findFirst({
    where: { externalId: urlHash, sourceId },
  });
  if (existingByUrl) {
    return { kind: "IMPORT", id: existingByUrl.id, title: existingByUrl.title, similarity: 1, reason: "same_source_url" };
  }

  const canonical = item.canonicalUrl ?? item.url;
  const articleByUrl = await db.article.findFirst({
    where: {
      OR: [{ sourceUrl: canonical }, { canonicalUrl: canonical }],
      status: { in: ["NEW", "DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "OLDER"] },
    },
    select: { id: true, title: true, slug: true },
  });
  if (articleByUrl) {
    return { kind: "ARTICLE", id: articleByUrl.id, title: articleByUrl.title, slug: articleByUrl.slug, similarity: 1, reason: "canonical_url_match" };
  }

  const ctx =
    corpus ??
    (await (async () => {
      const lookback = new Date(Date.now() - INGEST_LOOKBACK_DAYS_FOR_DEDUPE * 86400_000);
      const [articles, recentImports] = await Promise.all([
        db.article.findMany({
          where: { createdAt: { gte: lookback }, status: { in: ["NEW", "DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "OLDER"] } },
          select: { id: true, title: true, slug: true, excerpt: true, content: true },
          orderBy: { createdAt: "desc" },
          take: 300,
        }),
        db.importedItem.findMany({
          where: { fetchedAt: { gte: lookback }, status: { in: ["PENDING", "DUPLICATE_CANDIDATE"] } },
          select: { id: true, title: true },
          take: 300,
        }),
      ]);
      return { articles, imports: recentImports };
    })());

  let bestArticle: DuplicateMatch | null = null;
  for (const a of ctx.articles) {
    let sim = titleSimilarity(item.title, a.title);
    if (sim < DUPLICATE_SIMILARITY_THRESHOLD && item.contentText && a.content) {
      sim = Math.max(sim, textSimilarity(item.contentText.slice(0, 1200), a.content) * 0.95);
    }
    if (sim >= DUPLICATE_SIMILARITY_THRESHOLD && (!bestArticle || sim > bestArticle.similarity)) {
      bestArticle = { kind: "ARTICLE", id: a.id, title: a.title, slug: a.slug, similarity: Math.round(sim * 1000) / 1000, reason: "content_similarity" };
    }
  }
  if (bestArticle) return bestArticle;

  for (const imp of ctx.imports) {
    const sim = titleSimilarity(item.title, imp.title);
    if (sim >= DUPLICATE_SIMILARITY_THRESHOLD) {
      return { kind: "IMPORT", id: imp.id, title: imp.title, similarity: Math.round(sim * 1000) / 1000, reason: "cross_source_similarity" };
    }
  }
  return null;
}
