import { describe, it, expect } from "vitest";
import { parseFeed } from "@/lib/ingestion/feed";
import { titleSimilarity } from "@/lib/text";
import { DUPLICATE_SIMILARITY_THRESHOLD } from "@/lib/config";

describe("parseFeed", () => {
  it("parses a basic RSS 2.0 feed", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test News</title>
    <item>
      <title>Breaking: Alipurduar Bridge Opens</title>
      <link>https://example.com/news/bridge-opens</link>
      <description>New bridge connects Alipurduar to Lataguri</description>
      <pubDate>Mon, 25 Aug 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Weather Update: Heavy Rain Expected</title>
      <link>https://example.com/news/weather-rain</link>
      <description>IMD predicts heavy rainfall in Dooars region</description>
    </item>
  </channel>
</rss>`;

    const items = parseFeed(xml);
    expect(items.length).toBe(2);
    expect(items[0].title).toBe("Breaking: Alipurduar Bridge Opens");
    expect(items[0].url).toBe("https://example.com/news/bridge-opens");
    expect(items[0].summary).toContain("New bridge");
    expect(items[0].sourcePublishedAt).toBeInstanceOf(Date);
  });

  it("parses an Atom feed", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2020/Atom">
  <title>Test Feed</title>
  <entry>
    <title>Tech News: New AI Model Released</title>
    <link href="https://example.com/tech/ai-model" />
    <summary>A new AI model has been released today</summary>
    <published>2026-08-25T10:00:00Z</published>
  </entry>
</feed>`;

    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Tech News: New AI Model Released");
    expect(items[0].url).toBe("https://example.com/tech/ai-model");
  });

  it("parses RSS with enclosures (images)", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Photo Story: Dooars Wildlife</title>
      <link>https://example.com/photo-story</link>
      <description>A photo gallery of Dooars wildlife</description>
      <enclosure url="https://example.com/images/dooars.jpg" type="image/jpeg" length="123456" />
    </item>
  </channel>
</rss>`;

    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].imageUrl).toBe("https://example.com/images/dooars.jpg");
  });

  it("skips items without title or link", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Valid Article</title>
      <link>https://example.com/valid</link>
    </item>
    <item>
      <title>No Link Here</title>
    </item>
    <item>
      <link>https://example.com/no-title</link>
    </item>
  </channel>
</rss>`;

    const items = parseFeed(xml);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Valid Article");
  });

  it("returns empty array for malformed XML", () => {
    expect(parseFeed("this is not xml")).toEqual([]);
    expect(parseFeed("")).toEqual([]);
  });

  it("strips HTML from titles", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>&lt;b&gt;Bold&lt;/b&gt; News Title</title>
      <link>https://example.com/bold</link>
    </item>
  </channel>
</rss>`;

    const items = parseFeed(xml);
    expect(items[0].title).toBe("Bold News Title");
    expect(items[0].title).not.toContain("<b>");
  });

  it("truncates summary to 500 chars", () => {
    const longSummary = "A".repeat(600);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Long Summary Article</title>
      <link>https://example.com/long</link>
      <description>${longSummary}</description>
    </item>
  </channel>
</rss>`;

    const items = parseFeed(xml);
    expect(items[0].summary!.length).toBeLessThanOrEqual(500);
  });

  it("generates externalId from URL via hashId", () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Test Hash ID</title>
      <link>https://example.com/test-hash</link>
    </item>
  </channel>
</rss>`;

    const items = parseFeed(xml);
    expect(items[0].externalId).toBeTruthy();
    expect(typeof items[0].externalId).toBe("string");
  });
});

describe("Deduplication logic", () => {
  it("identical titles should score similarity >= threshold", () => {
    const title = "Alipurduar District Election Results Announced";
    const sim = titleSimilarity(title, title);
    expect(sim).toBeGreaterThanOrEqual(DUPLICATE_SIMILARITY_THRESHOLD);
  });

  it("same article from different sources should score high", () => {
    const a = "Alipurduar District Election Results Announced Today";
    const b = "Alipurduar District Election Results Announced Today by Commission";
    const sim = titleSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(DUPLICATE_SIMILARITY_THRESHOLD);
  });

  it("different articles should score below threshold", () => {
    const a = "Weather Forecast: Heavy Rain Expected in Alipurduar";
    const b = "Stock Market Reaches All-Time High on Dalal Street";
    const sim = titleSimilarity(a, b);
    expect(sim).toBeLessThan(DUPLICATE_SIMILARITY_THRESHOLD);
  });

  it("minor wording changes should still detect duplicate", () => {
    const a = "New Bridge Opens Connecting Alipurduar to Lataguri";
    const b = "Alipurduar-Lataguri Bridge Officially Opens Today";
    const sim = titleSimilarity(a, b);
    // These share enough keywords that Jaccard should pick them up
    expect(sim).toBeGreaterThan(0.3);
  });

  it("completely unrelated articles score near 0", () => {
    const a = "Cricket World Cup India vs Australia Final";
    const b = "New Smartphone Released with AI Camera Features";
    const sim = titleSimilarity(a, b);
    expect(sim).toBeLessThan(0.3);
  });

  it("Bengali titles work with similarity", () => {
    const a = "আলিপুরদুয়ারে নির্বাচনের ফলাফল ঘোষণা";
    const b = "আলিপুরদুয়ার নির্বাচন ফলাফল ঘোষিত হয়েছে";
    const sim = titleSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.3);
  });
});
