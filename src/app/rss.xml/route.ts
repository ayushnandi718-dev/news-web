import { db } from "@/lib/db";
import { siteUrl, BRAND, bnLabel } from "@/lib/brand";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 50;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET() {
  const articles = await db.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: MAX_ITEMS,
    include: {
      category: { select: { slug: true, name: true } },
      author: { select: { name: true } },
    },
  });

  const base = siteUrl();
  const now = new Date().toUTCString();

  const items = articles
    .map((a) => {
      const link = `${base}/news/${a.slug}`;
      const cat = bnLabel(a.category.slug, a.category.name);
      const pubDate = a.publishedAt ? a.publishedAt.toUTCString() : now;
      const author = a.author?.name || BRAND.bn;
      const desc = a.excerpt || a.title;
      return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${esc(cat)}</category>
      <author>${esc(author)}</author>
      <description><![CDATA[${desc}]]></description>
      ${a.featuredImage ? `<enclosure url="${a.featuredImage.startsWith("http") ? a.featuredImage : `${base}${a.featuredImage}`}" type="image/jpeg" />` : ""}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(BRAND.bn)}</title>
    <link>${base}</link>
    <description>${esc(BRAND.tagline)}</description>
    <language>bn</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
    <ttl>15</ttl>
${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
