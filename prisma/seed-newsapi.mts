import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Seeds NewsAPI.org sources for the English desk sections.
 * Requires NEWS_API_KEY in .env. Free dev key allows ~100 req/day, so these
 * poll at 120-minute intervals (5 sources x 12 runs/day = 60 requests/day).
 */
const SOURCES = [
  {
    name: "NewsAPI — Technology",
    url: "top-headlines?category=technology&language=en&pageSize=25",
    defaultCategorySlug: "technology",
  },
  {
    name: "NewsAPI — Sports",
    url: "top-headlines?category=sports&language=en&pageSize=25",
    defaultCategorySlug: "sports",
  },
  {
    name: "NewsAPI — Entertainment",
    url: "top-headlines?category=entertainment&language=en&pageSize=25",
    defaultCategorySlug: "entertainment",
  },
  {
    name: "NewsAPI — World",
    url: "everything?q=world&language=en&sortBy=publishedAt&pageSize=25",
    defaultCategorySlug: "world",
  },
  {
    name: "NewsAPI — Lifestyle",
    url: "everything?q=lifestyle&language=en&sortBy=publishedAt&pageSize=25",
    defaultCategorySlug: "lifestyle",
  },
];

for (const s of SOURCES) {
  const existing = await db.source.findFirst({ where: { name: s.name } });
  if (existing) {
    await db.source.update({
      where: { id: existing.id },
      data: { type: "NEWSAPI", url: s.url, defaultCategorySlug: s.defaultCategorySlug, active: true },
    });
    console.log("updated:", s.name);
  } else {
    await db.source.create({
      data: {
        name: s.name,
        type: "NEWSAPI",
        url: s.url,
        defaultCategorySlug: s.defaultCategorySlug,
        pollIntervalMinutes: 120,
        active: true,
      },
    });
    console.log("created:", s.name);
  }
}

await db.$disconnect();
