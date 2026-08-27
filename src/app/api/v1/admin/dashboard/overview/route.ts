import { db } from "@/lib/db";
import { getSession, AuthError } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { handleError, ok } from "@/lib/api";
import { getBreaking } from "@/lib/feeds";

export const dynamic = "force-dynamic";

/**
 * Single-request admin dashboard payload: stats + editorial queue + latest
 * stories + breaking, all independent queries run concurrently. Replaces the
 * browser-side fan-out to /admin/stats, /admin/news (x2) and /news/breaking.
 */
const cardSelect = {
  id: true,
  title: true,
  slug: true,
  status: true,
  featuredImage: true,
  geographicScope: true,
  publishedAt: true,
  updatedAt: true,
  category: { select: { name: true } },
  region: { select: { name: true } },
  author: { select: { name: true } },
} as const;

export async function GET() {
  try {
    const t0 = Date.now();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86400_000);
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    // perf timing (safe labels only — no session data logged)
    const timed = async <T>(label: string, fn: Promise<T>): Promise<T> => {
      const s = Date.now();
      try {
        return await fn;
      } finally {
        console.log(`[dash] ${label}: ${Date.now() - s}ms`);
      }
    };

    // Auth runs CONCURRENTLY with the queries (optimistic). Data is discarded
    // unless the session passes RBAC — unauthorized callers only waste work.
    const [
      session,
      counts,
      staleRows,
      queue,
      latestStories,
      breaking,
    ] = await Promise.all([
      timed("auth", getSession()),
      timed("counts", // all counters + next scheduled time in ONE roundtrip (matters on high-latency DB links)
      db.$queryRaw<{
        published: number;
        in_review: number;
        drafts: number;
        older: number;
        archived: number;
        scheduled: number;
        active_breaking: number;
        expired_breaking: number;
        published_today: number;
        next_scheduled_at: Date | null;
        pending_imports: number;
        duplicate_candidates: number;
        imported_today: number;
        failed_sources: number;
      }[]>`SELECT
        (SELECT COUNT(*) FROM "Article" WHERE status = 'PUBLISHED')::int AS published,
        (SELECT COUNT(*) FROM "Article" WHERE status = 'IN_REVIEW')::int AS in_review,
        (SELECT COUNT(*) FROM "Article" WHERE status = 'DRAFT')::int AS drafts,
        (SELECT COUNT(*) FROM "Article" WHERE status = 'OLDER')::int AS older,
        (SELECT COUNT(*) FROM "Article" WHERE status = 'ARCHIVED')::int AS archived,
        (SELECT COUNT(*) FROM "Article" WHERE status = 'SCHEDULED')::int AS scheduled,
        (SELECT COUNT(*) FROM "Article" WHERE "isBreaking" = true AND "breakingUntil" > now())::int AS active_breaking,
        (SELECT COUNT(*) FROM "Article" WHERE "isBreaking" = true AND "breakingUntil" <= now())::int AS expired_breaking,
        (SELECT COUNT(*) FROM "Article" WHERE status IN ('PUBLISHED','OLDER') AND "publishedAt" >= ${todayStart})::int AS published_today,
        (SELECT MIN("scheduledAt") FROM "Article" WHERE status = 'SCHEDULED' AND "scheduledAt" >= now()) AS next_scheduled_at,
        (SELECT COUNT(*) FROM "ImportedItem" WHERE status = 'PENDING')::int AS pending_imports,
        (SELECT COUNT(*) FROM "ImportedItem" WHERE status = 'DUPLICATE_CANDIDATE')::int AS duplicate_candidates,
        (SELECT COUNT(*) FROM "ImportedItem" WHERE "fetchedAt" >= ${todayStart})::int AS imported_today,
        (SELECT COUNT(*) FROM "Source" WHERE "lastStatus" = 'ERROR')::int AS failed_sources`),
      timed("stale-join", // coverage health: last publish per category in one join (replaces N+1)
      db.$queryRaw<{ slug: string; name: string; last_at: Date | null }[]>`
        SELECT c.slug, c.name, MAX(a."publishedAt") AS last_at
        FROM "Category" c
        LEFT JOIN "Article" a
          ON a."categoryId" = c.id
          AND a.status IN ('PUBLISHED','OLDER')
          AND a."publishedAt" IS NOT NULL
        GROUP BY c.id, c.slug, c.name
        ORDER BY c.name ASC`),
      timed("queue", db.article.findMany({
        where: { status: "IN_REVIEW" },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: cardSelect,
      })),
      timed("latest", db.article.findMany({
        orderBy: { updatedAt: "desc" },
        take: 8,
        select: cardSelect,
      })),
      timed("breaking", getBreaking()),
    ]);

    if (!session || !can(session.role, "dashboard.view")) {
      throw new AuthError("Authentication required", 401);
    }
    console.log(`[dash] total: ${Date.now() - t0}ms`);

    const c = counts[0];
    const staleCategories = staleRows.flatMap((r): { slug: string; name: string; hoursSinceLast: number; lastAt: string | null }[] => {
      if (!r.last_at) return [{ slug: r.slug, name: r.name, hoursSinceLast: -1, lastAt: null }];
      const hrs = (now.getTime() - r.last_at.getTime()) / 3600_000;
      if (hrs < 6) return [];
      return [{ slug: r.slug, name: r.name, hoursSinceLast: Math.floor(hrs), lastAt: r.last_at.toISOString() }];
    });

    return ok({
      stats: {
        totals: {
          published: c.published,
          inReview: c.in_review,
          drafts: c.drafts,
          pendingImports: c.pending_imports,
          duplicateCandidates: c.duplicate_candidates,
          failedSources: c.failed_sources,
          activeBreaking: c.active_breaking,
          expiredBreaking: c.expired_breaking,
          older: c.older,
          archived: c.archived,
          scheduled: c.scheduled,
        },
        today: {
          publishedToday: c.published_today,
          importedToday: c.imported_today,
          freshWindow: dayAgo.toISOString(),
          nextScheduledAt: c.next_scheduled_at ? new Date(c.next_scheduled_at).toISOString() : null,
        },
        staleCategories,
        server_time: now.toISOString(),
      },
      queue: queue.map((a) => ({ ...a, authorName: a.author?.name ?? null })),
      latest: latestStories.map((a) => ({ ...a, authorName: a.author?.name ?? null })),
      breaking,
    });
  } catch (err) {
    return handleError(err);
  }
}
