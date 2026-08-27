const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

function slugify(text) {
  return text
    .replace(/[^\p{L}\p{M}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

async function main() {
  const ads = await db.advertisement.findMany({
    where: { slug: null },
    select: { id: true, internalName: true, title: true },
  });
  console.log("Ads needing slugs:", ads.length);
  for (const ad of ads) {
    const base = slugify(ad.internalName || ad.title || "ad");
    let slug = base || `ad-${Date.now()}`;
    let n = 1;
    while (await db.advertisement.findUnique({ where: { slug } })) {
      n++;
      slug = `${base.slice(0, 80)}-${n}`;
    }
    await db.advertisement.update({ where: { id: ad.id }, data: { slug } });
    console.log("Updated:", ad.id, "->", slug);
  }
  console.log("Done");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
