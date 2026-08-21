import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const articles = await db.article.findMany({
    where: { status: { in: ["PUBLISHED", "OLDER", "ARCHIVED"] }, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 5000,
    select: { slug: true, publishedAt: true, updatedAt: true },
  });
  const categories = await db.category.findMany({ select: { slug: true } });

  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/news`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/trending`, changeFrequency: "hourly", priority: 0.6 },
    { url: `${base}/archive`, changeFrequency: "daily", priority: 0.4 },
    ...categories.map((c) => ({
      url: `${base}/category/${c.slug}`,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: `${base}/news/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
