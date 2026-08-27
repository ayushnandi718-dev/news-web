import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  
  // Static pages with highest priority
  const staticPages = [
    { url: base, changeFrequency: "hourly" as const, priority: 1 },
    { url: `${base}/news`, changeFrequency: "hourly" as const, priority: 0.9 },
    { url: `${base}/live`, changeFrequency: "hourly" as const, priority: 0.9 },
    { url: `${base}/trending`, changeFrequency: "hourly" as const, priority: 0.8 },
    { url: `${base}/archive`, changeFrequency: "daily" as const, priority: 0.7 },
    { url: `${base}/search`, changeFrequency: "daily" as const, priority: 0.6 },
    { url: `${base}/weather`, changeFrequency: "hourly" as const, priority: 0.5 },
    { url: `${base}/market`, changeFrequency: "hourly" as const, priority: 0.5 },
    { url: `${base}/obituary`, changeFrequency: "weekly" as const, priority: 0.4 },
    { url: `${base}/tip`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${base}/advertise`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${base}/about`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${base}/contact`, changeFrequency: "monthly" as const, priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly" as const, priority: 0.1 },
    { url: `${base}/terms`, changeFrequency: "yearly" as const, priority: 0.1 },
    { url: `${base}/corrections`, changeFrequency: "yearly" as const, priority: 0.1 },
    { url: `${base}/cookies`, changeFrequency: "yearly" as const, priority: 0.1 },
  ];

  // Categories with high priority
  const categories = await db.category.findMany({
    select: { slug: true },
    orderBy: { priority: 'desc' }
  });

  const categoryPages = categories.map((c) => ({
    url: `${base}/category/${c.slug}`,
    changeFrequency: "hourly" as const,
    priority: 0.8,
  }));

  // Published articles with dynamic priority based on freshness
  const articles = await db.article.findMany({
    where: { 
      status: { in: PUBLIC_VISIBLE_STATUSES }, 
      publishedAt: { not: null } 
    },
    orderBy: { publishedAt: "desc" },
    take: 10000,
    select: { 
      slug: true, 
      publishedAt: true, 
      updatedAt: true,
      status: true,
      isFeatured: true,
    },
  });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const articlePages = articles.map((a) => {
    let priority = 0.5;
    let changeFrequency: "hourly" | "daily" | "weekly" | "monthly" = "monthly";

    // Dynamic priority based on freshness and features
    if (a.isFeatured) {
      priority = 0.9;
      changeFrequency = "hourly";
    } else if (a.publishedAt && new Date(a.publishedAt) > oneDayAgo) {
      priority = 0.8;
      changeFrequency = "hourly";
    } else if (a.publishedAt && new Date(a.publishedAt) > oneWeekAgo) {
      priority = 0.7;
      changeFrequency = "daily";
    } else {
      priority = 0.5;
      changeFrequency = "weekly";
    }

    return {
      url: `${base}/news/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency,
      priority,
    };
  });

  return [
    ...staticPages,
    ...categoryPages,
    ...articlePages,
  ];
}
