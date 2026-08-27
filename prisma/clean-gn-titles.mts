import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const GN_HOST = /(^|\.|\b)news\.google\.com/i;
const SUFFIX = /\s+-\s+[^-]{2,50}$/;

let fixed = 0;

async function clean(
  model: "importedItem" | "article",
  rows: { id: string; title: string }[]
) {
  for (const r of rows) {
    const t = r.title.replace(SUFFIX, "").trim();
    if (t && t !== r.title && t.length >= 10) {
      try {
        await db[model].update({ where: { id: r.id }, data: { title: t } });
        fixed++;
      } catch (e) {
        console.log("skip", r.id.slice(0, 8), e.message?.slice(0, 60));
      }
    }
  }
  console.log(`${model}: scanned ${rows.length}`);
}

await clean("importedItem", await db.importedItem.findMany({ where: { url: { contains: "news.google.com" } }, select: { id: true, title: true } }));
await clean("article", await db.article.findMany({ where: { sourceUrl: { contains: "news.google.com" } }, select: { id: true, title: true } }));
console.log("titles cleaned:", fixed);
await db.$disconnect();
