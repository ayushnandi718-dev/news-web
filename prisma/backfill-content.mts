import { db } from "../src/lib/db";
import { extractArticleText } from "../src/lib/ingestion/extract";

/**
 * One-time backfill: re-extracts full text for published articles whose
 * content is a thin snippet (< 800 chars) and that have a source URL.
 * Resumable — safe to re-run.
 */
const MIN_LEN = 800;
const articles = await db.article.findMany({
  where: { sourceUrl: { not: null }, content: { lt: "x" } },
  select: { id: true, title: true, content: true, featuredImage: true, sourceUrl: true },
});
const targets = articles.filter((a) => a.content.length < MIN_LEN);
console.log(`articles to backfill: ${targets.length} / ${articles.length}`);

let updated = 0;
let failed = 0;
let idx = 0;
const CONCURRENCY = 6;

async function worker() {
  while (idx < targets.length) {
    const a = targets[idx++];
    const ex = await extractArticleText(a.sourceUrl!);
    if (ex.ok && ex.text && ex.text.length > Math.max(a.content.length, MIN_LEN)) {
      const words = ex.text.split(/\s+/).length;
      await db.article.update({
        where: { id: a.id },
        data: {
          content: ex.text,
          readingTimeMinutes: Math.max(1, Math.round(words / 200)),
          ...( !a.featuredImage && ex.leadImage ? { featuredImage: ex.leadImage } : {}),
        },
      });
      updated++;
    } else {
      failed++;
    }
    if ((updated + failed) % 25 === 0) console.log(`  progress: ${updated + failed}/${targets.length}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

console.log(`done. updated: ${updated}, no-fulltext: ${failed}`);
await db.$disconnect();
