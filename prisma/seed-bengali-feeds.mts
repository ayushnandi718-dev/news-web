import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * Seeds direct Bengali publisher RSS sources. Google News search feeds only
 * expose news.google.com redirect URLs (unresolvable server-side), so items
 * from these direct feeds get full-text extraction.
 */
const SOURCES = [
  {
    name: "Uttarbanga Sambad",
    url: "https://www.uttarbangasambad.com/feed",
    defaultCategorySlug: "north-bengal",
  },
  {
    name: "Sangbad Pratidin",
    url: "https://www.sangbadpratidin.in/feed/",
    defaultCategorySlug: "north-bengal",
  },
];

for (const s of SOURCES) {
  const existing = await db.source.findFirst({ where: { name: s.name } });
  if (existing) {
    await db.source.update({
      where: { id: existing.id },
      data: { type: "RSS", url: s.url, defaultCategorySlug: s.defaultCategorySlug, active: true },
    });
    console.log("updated:", s.name);
  } else {
    await db.source.create({
      data: {
        name: s.name,
        type: "RSS",
        url: s.url,
        defaultCategorySlug: s.defaultCategorySlug,
        pollIntervalMinutes: 30,
        active: true,
      },
    });
    console.log("created:", s.name);
  }
}

await db.$disconnect();
