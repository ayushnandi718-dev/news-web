import { db } from "@/lib/db";
import { requirePerm } from "@/lib/auth";
import { handleError, ok } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePerm("analytics.view");
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const weekAgo = new Date(now.getTime() - 7 * 86400_000);

    const [viewsToday, viewsWeek, topStories, topCategories, totals] = await Promise.all([
      db.viewEvent.count({ where: { createdAt: { gte: dayStart } } }),
      db.viewEvent.count({ where: { createdAt: { gte: weekAgo } } }),
      db.viewEvent.groupBy({
        by: ["articleId"],
        where: { createdAt: { gte: weekAgo } },
        _count: { _all: true },
        orderBy: { _count: { articleId: "desc" } },
        take: 8,
      }),
      db.article.groupBy({
        by: ["categoryId"],
        where: { status: { in: ["PUBLISHED", "OLDER"] } },
        _count: { _all: true },
        _sum: { views: true },
        orderBy: { _sum: { views: "desc" } },
        take: 7,
      }),
      db.article.aggregate({
        where: { status: { in: ["PUBLISHED", "OLDER"] } },
        _sum: { views: true, shares: true, commentsCount: true },
      }),
    ]);

    const storyIds = topStories.map((s) => s.articleId);
    const stories = await db.article.findMany({
      where: { id: { in: storyIds } },
      select: { id: true, title: true, slug: true, views: true, category: { select: { name: true } } },
    });
    const byId = new Map(stories.map((s) => [s.id, s]));
    const catIds = topCategories.map((c) => c.categoryId);
    const cats = await db.category.findMany({ where: { id: { in: catIds } }, select: { id: true, name: true, slug: true } });
    const catById = new Map(cats.map((c) => [c.id, c]));

    return ok({
      viewsToday,
      viewsWeek,
      totals: {
        views: totals._sum.views ?? 0,
        shares: totals._sum.shares ?? 0,
        comments: totals._sum.commentsCount ?? 0,
      },
      topStories: topStories.map((s) => {
        const a = byId.get(s.articleId);
        return {
          title: a?.title ?? "Deleted",
          slug: a?.slug,
          category: a?.category?.name,
          weekViews: s._count._all,
          lifetimeViews: a?.views ?? 0,
        };
      }),
      topCategories: topCategories.map((c) => ({
        name: catById.get(c.categoryId)?.name ?? "Unknown",
        slug: catById.get(c.categoryId)?.slug,
        articles: c._count._all,
        totalViews: c._sum.views ?? 0,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
