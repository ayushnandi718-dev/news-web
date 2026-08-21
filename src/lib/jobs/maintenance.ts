import { db } from "../db";
import { ARCHIVE_AFTER_DAYS, OLDER_AFTER_HOURS } from "../config";
import { publishEvent } from "../events";
import { invalidateTags } from "../cache";

export async function expireBreakingNews(): Promise<number> {
  const now = new Date();
  const expired = await db.article.updateMany({
    where: { isBreaking: true, breakingUntil: { lte: now } },
    data: { isBreaking: false },
  });
  if (expired.count > 0) {
    invalidateTags(["breaking", "home", "admin_stats"]);
    publishEvent({ type: "breaking.updated" });
  }
  return expired.count;
}

export async function publishScheduled(): Promise<number> {
  const now = new Date();
  const due = await db.article.findMany({
    where: {
      status: "APPROVED",
      scheduledAt: { not: null, lte: now },
    },
    select: { id: true, slug: true, title: true, categoryId: true },
  });
  for (const a of due) {
    await db.article.update({
      where: { id: a.id },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    invalidateTags(["latest", "home", "admin_stats"]);
    publishEvent({
      type: "article.published",
      id: a.id,
      slug: a.slug,
      title: a.title,
      categoryId: a.categoryId,
      publishedAt: now.toISOString(),
      isBreaking: false,
    });
  }
  return due.length;
}

export async function transitionLifecycle(): Promise<{ toOlder: number; toArchived: number }> {
  const now = new Date();
  const olderCutoff = new Date(now.getTime() - OLDER_AFTER_HOURS * 3600_000);
  const archiveCutoff = new Date(now.getTime() - ARCHIVE_AFTER_DAYS * 86400_000);

  const toOlder = await db.article.updateMany({
    where: { status: "PUBLISHED", publishedAt: { not: null, lt: olderCutoff }, isBreaking: false },
    data: { status: "OLDER" },
  });

  const toArchived = await db.article.updateMany({
    where: { status: "OLDER", publishedAt: { not: null, lt: archiveCutoff } },
    data: { status: "ARCHIVED" },
  });

  if (toOlder.count > 0 || toArchived.count > 0) {
    invalidateTags(["latest", "home", "trending", "admin_stats"]);
  }
  return { toOlder: toOlder.count, toArchived: toArchived.count };
}
