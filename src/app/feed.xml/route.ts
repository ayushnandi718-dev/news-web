import { db } from "@/lib/db";
import { PUBLIC_VISIBLE_STATUSES } from "@/lib/config";
import { BRAND, siteUrl } from "@/lib/brand";

export const dynamic = "force-dynamic";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const base = siteUrl();
  const articles = await db.article.findMany({
    where: { status: { in: PUBLIC_VISIBLE_STATUSES }, publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 50,
    select: {
      title: true,
      slug: true,
      excerpt: true,
      publishedAt: true,
      featuredImage: true,
      category: { select: { slug: true, name: true } },
      author: { select: { name: true } },
    },
  });

  const items = articles
    .map((a) => {
      const url = `${base}/news/${a.slug}`;
      return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(a.excerpt)}</description>
      <category>${escapeXml(a.category.name)}</category>
      ${a.author?.name ? `<author>${escapeXml(a.author.name)}</author>` : ""}
      <pubDate>${a.publishedAt ? new Date(a.publishedAt).toUTCString() : ""}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(BRAND.bn)} | ${escapeXml(BRAND.en)}</title>
    <link>${base}</link>
    <description>${escapeXml(BRAND.tagline)} আলিপুরদুয়ার, ডুয়ার্স ও উত্তরবঙ্গের সর্বশেষ বাংলা সংবাদ।</description>
    <language>bn-IN</language>
    <atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
