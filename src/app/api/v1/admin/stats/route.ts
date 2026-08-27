import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePerm("dashboard.view");
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400_000);

    const [published, inReview, drafts, pendingImports, duplicateCandidates, failedImports, activeBreaking, expiredBreaking, older, archived, scheduled, nextScheduled, categories, latestByCategory] =
      await Promise.all([
        db.article.count({ where: { status: "PUBLISHED" } }),
        db.article.count({ where: { status: "IN_REVIEW" } }),
        db.article.count({ where: { status: "DRAFT" } }),
        db.importedItem.count({ where: { status: "PENDING" } }),
        db.importedItem.count({ where: { status: "DUPLICATE_CANDIDATE" } }),
        db.source.count({ where: { lastStatus: "ERROR" } }),
        db.article.count({ where: { isBreaking: true, breakingUntil: { gt: now } } }),
        db.article.count({ where: { isBreaking: true, breakingUntil: { lte: now } } }),
        db.article.count({ where: { status: "OLDER" } }),
        db.article.count({ where: { status: "ARCHIVED" } }),
        db.article.count({ where: { status: "SCHEDULED" } }),
        db.article.findFirst({
          where: { status: "SCHEDULED", scheduledAt: { gte: now } },
          orderBy: { scheduledAt: "asc" },
          select: { scheduledAt: true },
        }),
        db.category.findMany({
          select: { id: true, slug: true, name: true },
          orderBy: { name: "asc" },
        }),
        // one grouped query instead of a findFirst per category (N+1)
        db.article.groupBy({
          by: ["categoryId"],
          _max: { publishedAt: true },
          where: { status: { in: ["PUBLISHED", "OLDER"] }, publishedAt: { not: null } },
        }),
      ]);

    const lastAtByCat = new Map(latestByCategory.map((r) => [r.categoryId, r._max.publishedAt]));
    const staleCategories: Array<{ slug: string; name: string; hoursSinceLast: number; lastAt: string | null }> = [];
    for (const c of categories) {
      const last = lastAtByCat.get(c.id);
      if (!last) {
        staleCategories.push({ slug: c.slug, name: c.name, hoursSinceLast: -1, lastAt: null });
      } else {
        const hrs = (now.getTime() - last.getTime()) / 3600_000;
        if (hrs >= 6) {
          staleCategories.push({
            slug: c.slug,
            name: c.name,
            hoursSinceLast: Math.floor(hrs),
            lastAt: last.toISOString(),
          });
        }
      }
    }

    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);
    const [publishedToday, importedToday] = await Promise.all([
      db.article.count({ where: { status: { in: ["PUBLISHED", "OLDER"] }, publishedAt: { gte: todayStart } } }),
      db.importedItem.count({ where: { fetchedAt: { gte: todayStart } } }),
    ]);

    return ok({
      totals: {
        published,
        inReview,
        drafts,
        pendingImports,
        duplicateCandidates,
        failedSources: failedImports,
        activeBreaking,
        expiredBreaking,
        older,
        archived,
        scheduled,
      },
      today: {
        publishedToday,
        importedToday,
        freshWindow: dayAgo.toISOString(),
        nextScheduledAt: nextScheduled?.scheduledAt?.toISOString() ?? null,
      },
      staleCategories,
      server_time: now.toISOString(),
    });
  } catch (err) {
    return handleError(err);
  }
}
