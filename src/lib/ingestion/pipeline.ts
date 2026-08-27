import { db } from "../db";
import { INGEST_FETCH_TIMEOUT_MS, INGEST_RETRIES } from "../config";
import { fetchSource, fetchNewsApi, parseFeed, type NormalizedItem } from "./feed";
import { extractArticleText } from "./extract";
import { detectDuplicate, loadDedupeCorpus } from "./dedupe";
import { hashId, slugify } from "../text";
import { invalidateTags } from "../cache";

export interface SourceRunResult {
  sourceId: string;
  sourceName: string;
  fetched: number;
  staged: number;
  duplicates: number;
  invalid: number;
  status: "OK" | "NOT_MODIFIED" | "ERROR";
  error?: string;
}

function validateItem(item: NormalizedItem): string | null {
  if (item.title.length < 10) return "title_too_short";
  if (!/^https?:\/\//i.test(item.url)) return "invalid_url";
  if (item.sourcePublishedAt) {
    const ageDays = (Date.now() - item.sourcePublishedAt.getTime()) / 86400_000;
    if (ageDays > 30) return "stale_source_date";
    if (ageDays < -1) return "future_source_date";
  }
  return null;
}

/**
 * Google News RSS titles always end with " - PublisherName". Strip that so
 * our headlines don't advertise third-party sources.
 */
function stripPublisherSuffix(item: NormalizedItem): void {
  if (!item.url || !/(^|\.)news\.google\.com$/i.test(new URL(item.url).hostname)) return;
  item.title = item.title.replace(/\s+-\s+[^-]{2,50}$/, "").trim() || item.title;
}

let cachedSystemAuthorId: string | null = null;
async function getSystemAuthorId(): Promise<string | null> {
  if (cachedSystemAuthorId) return cachedSystemAuthorId;
  const owner = await db.user.findFirst({ where: { role: "OWNER" }, orderBy: { createdAt: "asc" } });
  cachedSystemAuthorId =
    owner?.id ?? (await db.user.findFirst({ orderBy: { createdAt: "asc" } }))?.id ?? null;
  return cachedSystemAuthorId;
}

/**
 * Auto-publishes an imported item straight to the live site. Only used for
 * sources flagged autoPublish (non-local desks like tech / business /
 * entertainment / lifestyle). Items shorter than MIN_AUTO_PUBLISH_CHARS stay
 * in the inbox for a human editor instead.
 */
async function autoPublishItem(
  itemId: string,
  item: NormalizedItem,
  source: { id: string; name: string; defaultCategorySlug: string | null }
): Promise<boolean> {
  const contentText = (item.contentText ?? "").trim();
  if (!source.defaultCategorySlug || contentText.length < 400) return false;
  const cat = await db.category.findUnique({ where: { slug: source.defaultCategorySlug } });
  if (!cat) return false;
  const authorId = await getSystemAuthorId();
  if (!authorId) return false;

  const baseSlug = slugify(item.title) || `story-${Date.now()}`;
  let slug = baseSlug;
  let n = 1;
  while (await db.article.findUnique({ where: { slug } })) slug = `${baseSlug.slice(0, 80)}-${n++}`;

  const article = await db.article.create({
    data: {
      title: item.title,
      slug,
      excerpt: (item.summary ?? item.title).slice(0, 500),
      content: contentText,
      featuredImage: item.imageUrl ?? null,
      categoryId: cat.id,
      authorId,
      status: "PUBLISHED",
      publishedAt: new Date(),
      sourceName: source.name,
      sourceUrl: item.url,
      canonicalUrl: item.canonicalUrl ?? item.url,
      sourceId: source.id,
    },
  });
  await db.importedItem.update({
    where: { id: itemId },
    data: { status: "CONVERTED_DRAFT", draftArticleId: article.id },
  });
  return true;
}

/** Dedupe-checks and stages normalized items into ImportedItem. */
async function stageItems(
  items: NormalizedItem[],
  source: { id: string; name: string; defaultCategorySlug: string | null; autoPublish: boolean },
  result: SourceRunResult
): Promise<void> {
  const batch = items.slice(0, 50);
  for (const item of batch) stripPublisherSuffix(item);

  // Best-effort full-text extraction (5 at a time); keeps summary on failure.
  await mapLimit(batch, 5, async (item) => {
    if (!item.url) return;
    try {
      const ex = await extractArticleText(item.url);
      if (ex.ok && ex.text && ex.text.length > (item.contentText?.length ?? 0)) {
        item.contentText = ex.text;
        if (!item.imageUrl && ex.leadImage) item.imageUrl = ex.leadImage;
      }
    } catch {
      /* keep snippet */
    }
  });

  // similarity corpus loaded once per batch (not per item)
  const corpus = await loadDedupeCorpus();

  for (const item of batch) {
    const invalid = validateItem(item);
    if (invalid) {
      result.invalid++;
      continue;
    }
    try {
      const dup = await detectDuplicate(item, source.id, corpus);
      const externalId = hashId(item.url);
      const created = await db.importedItem.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId } },
        update: {
          title: item.title,
          summary: item.summary ?? null,
          contentText: item.contentText ?? null,
          imageUrl: item.imageUrl ?? null,
          sourcePublishedAt: item.sourcePublishedAt ?? null,
        },
        create: {
          sourceId: source.id,
          externalId,
          title: item.title,
          url: item.url,
          canonicalUrl: item.canonicalUrl ?? null,
          summary: item.summary ?? null,
          contentText: item.contentText ?? null,
          imageUrl: item.imageUrl ?? null,
          sourcePublishedAt: item.sourcePublishedAt ?? null,
          status: dup ? "DUPLICATE_CANDIDATE" : "PENDING",
          duplicateOfArticleId: dup?.kind === "ARTICLE" ? dup.id : null,
          similarity: dup?.similarity ?? null,
        },
      });
      if (dup) result.duplicates++;
      else result.staged++;
      if (!dup && source.autoPublish) {
        try {
          const published = await autoPublishItem(created.id, item, source);
          if (published) invalidateTags(["latest", "home", "trending", "admin_stats"]);
        } catch (err) {
          console.error(`[ingest] auto-publish failed in ${source.name}:`, err);
        }
      }
      } catch (err) {
        // Two app instances (dev + prod) poll the same feeds; losing the
        // insert race just means the other instance staged this item.
        if ((err as { code?: string })?.code === "P2002") continue;
        console.error(`[ingest] item error in ${source.name}:`, err);
      }
  }
}

async function mapLimit<T>(
  arr: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, arr.length) }, async () => {
    while (idx < arr.length) {
      const i = idx++;
      await fn(arr[i]);
    }
  });
  await Promise.all(workers);
}

async function runSource(source: {
  id: string;
  name: string;
  type: string;
  url: string;
  etag: string | null;
  lastModified: string | null;
  defaultCategorySlug: string | null;
  autoPublish: boolean;
}): Promise<SourceRunResult> {
  const result: SourceRunResult = {
    sourceId: source.id,
    sourceName: source.name,
    fetched: 0,
    staged: 0,
    duplicates: 0,
    invalid: 0,
    status: "ERROR",
  };

  // ---- NEWSAPI.org JSON sources -------------------------------------------
  if (source.type === "NEWSAPI") {
    const res = await fetchNewsApi(source.url, INGEST_FETCH_TIMEOUT_MS, INGEST_RETRIES);
    await db.source.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        lastStatus: res.status === "OK" ? "OK" : "ERROR",
        lastError: res.error ?? null,
        consecutiveFailures: res.status === "OK" ? 0 : { increment: 1 },
      },
    });
    if (res.status === "ERROR") {
      result.error = res.error;
      return result;
    }
    result.fetched = res.items.length;
    await stageItems(res.items, source, result);
    if (result.staged > 0) invalidateTags(["admin_stats", "inbox"]);
    result.status = "OK";
    return result;
  }

  // ---- RSS / Atom sources ---------------------------------------------------
  const res = await fetchSource(
    source.url,
    { etag: source.etag, lastModified: source.lastModified },
    INGEST_FETCH_TIMEOUT_MS,
    INGEST_RETRIES
  );
  if (res.status === "NOT_MODIFIED") {
    result.status = "NOT_MODIFIED";
    await db.source.update({
      where: { id: source.id },
      data: { lastFetchedAt: new Date(), lastStatus: "OK", consecutiveFailures: 0 },
    });
    return result;
  }
  if (res.status === "ERROR") {
    const failures = await db.source.update({
      where: { id: source.id },
      data: {
        lastFetchedAt: new Date(),
        lastStatus: "ERROR",
        lastError: res.error ?? "unknown",
        consecutiveFailures: { increment: 1 },
      },
    });
    result.error = res.error;
    if (
      failures.consecutiveFailures >= 10 &&
      failures.active
    ) {
      await db.source.update({ where: { id: source.id }, data: { active: false } });
      console.error(`[ingest] source ${source.name} auto-disabled after repeated failures`);
    }
    return result;
  }

  const items = parseFeed(res.body ?? "");
  result.fetched = items.length;
  await stageItems(items, source, result);

  await db.source.update({
    where: { id: source.id },
    data: {
      lastFetchedAt: new Date(),
      lastStatus: "OK",
      lastError: null,
      consecutiveFailures: 0,
      etag: res.etag ?? null,
      lastModified: res.lastModified ?? null,
    },
  });
  result.status = "OK";
  return result;
}

export async function runIngestionForSource(sourceId: string): Promise<SourceRunResult | null> {
  const source = await db.source.findUnique({ where: { id: sourceId } });
  if (!source || !source.active) return null;
  try {
    const r = await runSource(source);
    if (r.staged > 0) invalidateTags(["admin_stats", "inbox"]);
    return r;
  } catch (err) {
    console.error(`[ingest] fatal for ${source.name}:`, err);
    await db.source.update({
      where: { id: source.id },
      data: { lastStatus: "ERROR", lastError: "pipeline_crash", consecutiveFailures: { increment: 1 } },
    });
    return null;
  }
}

export async function runDueSources(): Promise<SourceRunResult[]> {
  const now = new Date();
  const sources = await db.source.findMany({ where: { active: true } });
  const due = sources.filter((s) => {
    if (!s.lastFetchedAt) return true;
    return now.getTime() - s.lastFetchedAt.getTime() >= s.pollIntervalMinutes * 60_000;
  });
  const results: SourceRunResult[] = [];
  const concurrency = 3;
  let idx = 0;
  async function worker() {
    while (idx < due.length) {
      const s = due[idx++];
      const r = await runIngestionForSource(s.id);
      if (r) results.push(r);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, due.length) }, worker));
  return results;
}
