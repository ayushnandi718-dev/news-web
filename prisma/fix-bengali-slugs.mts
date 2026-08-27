import { db } from "../src/lib/db";
import { slugify } from "../src/lib/text";

/**
 * One-time: re-slugs articles whose slugs lost Bengali matras to the old
 * slugify. Detects corruption as: title has combining marks but slug doesn't.
 */
const articles = await db.article.findMany({
  select: { id: true, title: true, slug: true },
});

const MARK = /[\p{M}]/u;
let fixed = 0;
const usedSlugs = new Set<string>();

// preload existing slugs for uniqueness
for (const a of articles) usedSlugs.add(a.slug);

for (const a of articles) {
  if (!MARK.test(a.title) || MARK.test(a.slug)) continue;
  let base = slugify(a.title);
  if (!base || !MARK.test(base)) continue; // can't build better slug
  let slug = base;
  let n = 1;
  while (usedSlugs.has(slug)) slug = `${base.slice(0, 80)}-${n++}`;
  usedSlugs.add(slug);
  await db.article.update({ where: { id: a.id }, data: { slug } });
  fixed++;
}

console.log(`re-slugged ${fixed} of ${articles.length} articles`);
await db.$disconnect();
