import { db } from "../src/lib/db";
import { slugify } from "../src/lib/text";

/** Fast resumable bulk-publish: loads slug/url sets in memory first. */
const admin = await db.user.findUnique({ where: { email: "admin@newsroom.local" } });
if (!admin) throw new Error("admin user missing");

const cats = await db.category.findMany({ select: { id: true, slug: true } });
const catBySlug = new Map(cats.map((c) => [c.slug, c.id]));
const fallbackCat = [...catBySlug.values()][0];

const [existingSlugs, existingUrls] = await Promise.all([
  db.article.findMany({ select: { slug: true } }).then((r) => new Set(r.map((x) => x.slug))),
  db.article.findMany({ select: { sourceUrl: true }, where: { NOT: { sourceUrl: null } } }).then((r) => new Set(r.map((x) => x.sourceUrl!))),
]);

const items = await db.importedItem.findMany({
  where: { status: "PENDING" },
  include: { source: { select: { name: true, defaultCategorySlug: true } } },
  orderBy: { fetchedAt: "desc" },
});

console.log(`pending items to process: ${items.length}`);
let published = 0;
let skipped = 0;

for (const item of items) {
  if (item.url && existingUrls.has(item.url)) {
    const a = await db.article.findFirst({ where: { sourceUrl: item.url }, select: { id: true } });
    if (a) {
      await db.importedItem.update({ where: { id: item.id }, data: { status: "CONVERTED_DRAFT", draftArticleId: a.id } });
      skipped++;
      continue;
    }
  }

  const categoryId = (item.source.defaultCategorySlug && catBySlug.get(item.source.defaultCategorySlug)) || fallbackCat!;
  let baseSlug = slugify(item.title) || `story-${Date.now()}`;
  if (baseSlug.length > 80) baseSlug = baseSlug.slice(0, 80);
  let slug = existingSlugs.has(baseSlug) ? `${baseSlug}-${published}` : baseSlug;
  while (existingSlugs.has(slug)) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
  existingSlugs.add(slug);
  if (item.url) existingUrls.add(item.url);

  const content = item.contentText ?? item.summary ?? item.title;
  const words = content.split(/\s+/).length;

  const article = await db.article.create({
    data: {
      title: item.title,
      slug,
      excerpt: item.summary ?? item.title,
      content,
      featuredImage: item.imageUrl,
      categoryId,
      authorId: admin.id,
      editorId: admin.id,
      status: "PUBLISHED",
      // Use NOW, not sourcePublishedAt: the lifecycle job archives anything
      // published before today 00:00, so source dates would insta-archive.
      publishedAt: new Date(),
      readingTimeMinutes: Math.max(1, Math.round(words / 200)),
      sourceName: item.source.name,
      sourceUrl: item.url,
      canonicalUrl: item.canonicalUrl ?? item.url,
      sourceId: item.sourceId,
    },
    select: { id: true },
  });

  await db.importedItem.update({
    where: { id: item.id },
    data: { status: "CONVERTED_DRAFT", draftArticleId: article.id },
  });
  published++;
}

console.log(`published: ${published}, skipped(existing): ${skipped}`);

const byCat = await db.article.groupBy({ by: ["categoryId"], _count: { _all: true }, where: { status: "PUBLISHED" } });
for (const g of byCat) {
  const c = cats.find((x) => x.id === g.categoryId);
  console.log(" ", (c?.slug ?? "?").padEnd(15), g._count._all);
}
await db.$disconnect();
