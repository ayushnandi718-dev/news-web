import { db } from "../db";
import { INGEST_FETCH_TIMEOUT_MS, INGEST_RETRIES } from "../config";
import { fetchSource, parseFeed, type NormalizedItem } from "./feed";
import { detectDuplicate } from "./dedupe";
import { hashId } from "../text";
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

async function runSource(source: {
  id: string;
  name: string;
  url: string;
  etag: string | null;
  lastModified: string | null;
  defaultCategorySlug: string | null;
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

  for (const item of items.slice(0, 50)) {
    const invalid = validateItem(item);
    if (invalid) {
      result.invalid++;
      continue;
    }
    try {
      const dup = await detectDuplicate(item, source.id);
      const externalId = hashId(item.url);
      const existing = await db.importedItem.findUnique({
        where: { sourceId_externalId: { sourceId: source.id, externalId } },
      });
      if (existing) continue;
      await db.importedItem.create({
        data: {
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
    } catch (err) {
      console.error(`[ingest] item error in ${source.name}:`, err);
    }
  }

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
