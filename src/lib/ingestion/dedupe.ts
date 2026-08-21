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

export async function detectDuplicate(
  item: NormalizedItem,
  sourceId: string
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

  const lookback = new Date(Date.now() - INGEST_LOOKBACK_DAYS_FOR_DEDUPE * 86400_000);
  const recentArticles = await db.article.findMany({
    where: { createdAt: { gte: lookback }, status: { in: ["NEW", "DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "OLDER"] } },
    select: { id: true, title: true, slug: true, excerpt: true, content: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  let bestArticle: DuplicateMatch | null = null;
  for (const a of recentArticles) {
    let sim = titleSimilarity(item.title, a.title);
    if (sim < DUPLICATE_SIMILARITY_THRESHOLD && item.contentText && a.content) {
      sim = Math.max(sim, textSimilarity(item.contentText, a.content) * 0.95);
    }
    if (sim >= DUPLICATE_SIMILARITY_THRESHOLD && (!bestArticle || sim > bestArticle.similarity)) {
      bestArticle = { kind: "ARTICLE", id: a.id, title: a.title, slug: a.slug, similarity: Math.round(sim * 1000) / 1000, reason: "content_similarity" };
    }
  }
  if (bestArticle) return bestArticle;

  const recentImports = await db.importedItem.findMany({
    where: { fetchedAt: { gte: lookback }, status: { in: ["PENDING", "DUPLICATE_CANDIDATE"] } },
    select: { id: true, title: true, summary: true },
    take: 300,
  });
  for (const imp of recentImports) {
    const sim = titleSimilarity(item.title, imp.title);
    if (sim >= DUPLICATE_SIMILARITY_THRESHOLD) {
      return { kind: "IMPORT", id: imp.id, title: imp.title, similarity: Math.round(sim * 1000) / 1000, reason: "cross_source_similarity" };
    }
  }
  return null;
}
