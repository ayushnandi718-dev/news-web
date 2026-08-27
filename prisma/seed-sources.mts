import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SOURCES = [
  {
    name: "Google News — আলিপুরদুয়ার",
    url: "https://news.google.com/rss/search?q=Alipurduar+OR+%E0%A6%86%E0%A6%B2%E0%A6%BF%E0%A6%AA%E0%A7%81%E0%A6%B0%E0%A6%A6%E0%A7%81%E0%A6%AF%E0%A6%BC%E0%A6%BE%E0%A6%B0&hl=bn&gl=IN&ceid=IN:bn",
    defaultCategorySlug: "alipurduar",
  },
  {
    name: "Google News — ডুয়ার্স",
    url: "https://news.google.com/rss/search?q=Dooars+OR+%E0%A6%A1%E0%A7%81%E0%A6%AF%E0%A6%BC%E0%A6%BE%E0%A6%B0%E0%A7%8D%E0%A6%B8&hl=bn&gl=IN&ceid=IN:bn",
    defaultCategorySlug: "dooars",
  },
  {
    name: "Google News — উত্তরবঙ্গ",
    url: "https://news.google.com/rss/search?q=%E0%A6%89%E0%A6%A4%E0%A7%8D%E0%A6%A4%E0%A6%B0%E0%A6%AC%E0%A6%99%E0%A7%8D%E0%A6%97+%E0%A6%96%E0%A6%AC%E0%A6%B0&hl=bn&gl=IN&ceid=IN:bn",
    defaultCategorySlug: "north-bengal",
  },
  {
    name: "Google News — পশ্চিমবঙ্গ",
    url: "https://news.google.com/rss/search?q=%E0%A6%AA%E0%A6%B6%E0%A7%8D%E0%A6%9A%E0%A6%BF%E0%A6%AE%E0%A6%AC%E0%A6%99%E0%A7%8D%E0%A6%97+%E0%A6%96%E0%A6%AC%E0%A6%B0&hl=bn&gl=IN&ceid=IN:bn",
    defaultCategorySlug: "west-bengal",
  },
  {
    name: "BBC Bangla",
    url: "https://feeds.bbci.co.uk/bengali/rss.xml",
    defaultCategorySlug: "india",
  },
];

for (const s of SOURCES) {
  const existing = await db.source.findFirst({ where: { url: s.url } });
  if (existing) {
    await db.source.update({
      where: { id: existing.id },
      data: { active: true, authorized: true, defaultCategorySlug: s.defaultCategorySlug, name: s.name },
    });
  } else {
    await db.source.create({
      data: {
        name: s.name,
        url: s.url,
        type: "RSS",
        active: true,
        authorized: true,
        pollIntervalMinutes: 15,
        defaultCategorySlug: s.defaultCategorySlug,
      },
    });
  }
}
console.log(`sources seeded: ${SOURCES.length}`);

// Remove redesign smoke-test articles (cascades comments/views/shares)
const gone = await db.article.deleteMany({
  where: { slug: { in: ["smoke-redesign-demo-story", "smoke-redesign-demo-story-2"] } },
});
console.log(`test articles deleted: ${gone.count}`);

const remaining = await db.article.groupBy({ by: ["status"], _count: true });
console.log(JSON.stringify(remaining));
await db.$disconnect();
