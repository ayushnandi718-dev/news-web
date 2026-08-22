import { db } from "../db";
import { ARCHIVE_ROLLUP_TZ } from "../config";
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

function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
  return asUtc - utcMs;
}

export function zonedDayStartUtc(now: Date, timeZone: string = ARCHIVE_ROLLUP_TZ): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = ymd.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  return new Date(guess - timeZoneOffsetMs(guess, timeZone));
}

/**
 * Midnight rollup (NEWSROOM_TZ): every article published before today's
 * 00:00 leaves the reader surface and becomes ARCHIVED. Dashboards keep
 * listing it under the "Archived" label.
 */
export async function transitionLifecycle(): Promise<{ toOlder: number; toArchived: number }> {
  const now = new Date();
  const todayStart = zonedDayStartUtc(now);

  const toArchived = await db.article.updateMany({
    where: { status: { in: ["PUBLISHED", "OLDER"] }, publishedAt: { not: null, lt: todayStart } },
    data: { status: "ARCHIVED" },
  });

  if (toArchived.count > 0) {
    invalidateTags(["latest", "home", "trending", "breaking", "admin_stats"]);
    publishEvent({ type: "article.archived" });
  }
  return { toOlder: 0, toArchived: toArchived.count };
}
