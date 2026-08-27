import { describe, it, expect } from "vitest";
import {
  generateNewsArticleSchema,
  generateOrganizationSchema,
  generateWebSiteSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateCollectionPageSchema,
  generateItemListSchema,
  generateWebPageSchema,
  generatePersonSchema,
  generateLocalKeywords,
} from "@/lib/seo";

function parse(json: string) {
  return JSON.parse(json);
}

describe("generateNewsArticleSchema", () => {
  it("produces valid NewsArticle with @context", () => {
    const schema = parse(
      generateNewsArticleSchema({
        headline: "Test Article",
        description: "A test",
        image: ["/img.jpg"],
        datePublished: "2026-01-01",
        dateModified: "2026-01-02",
        author: { "@type": "Person", name: "Reporter" },
        publisher: { "@type": "Organization", name: "DK", logo: "/logo.png" },
        mainEntityOfPage: "https://example.com/news/test",
        articleSection: "Politics",
        wordCount: 500,
      })
    );
    expect(schema["@context"]).toBe("https://schema.org");
    expect(schema["@type"]).toBe("NewsArticle");
    expect(schema.headline).toBe("Test Article");
    expect(schema.author.name).toBe("Reporter");
    expect(schema.wordCount).toBe(500);
  });
});

describe("generateOrganizationSchema", () => {
  it("produces valid NewsMediaOrganization", () => {
    const schema = parse(
      generateOrganizationSchema({
        name: "Dooarser Khabar",
        description: "Local news",
        address: { streetAddress: "1 Main", addressLocality: "Alipurduar", addressRegion: "WB", postalCode: "736101", addressCountry: "IN" },
        telephone: "+911234567890",
        email: "test@test.com",
        url: "https://example.com",
      })
    );
    expect(schema["@type"]).toBe("NewsMediaOrganization");
    expect(schema.areaServed).toBeDefined();
    expect(schema.areaServed.length).toBe(3);
  });
});

describe("generateWebSiteSchema", () => {
  it("includes SearchAction", () => {
    const schema = parse(generateWebSiteSchema("https://example.com", "Test Site"));
    expect(schema.potentialAction["@type"]).toBe("SearchAction");
    expect(schema.potentialAction.target.urlTemplate).toContain("{search_term_string}");
  });
});

describe("generateBreadcrumbSchema", () => {
  it("generates position-indexed list items", () => {
    const schema = parse(
      generateBreadcrumbSchema([
        { name: "Home", item: "https://example.com" },
        { name: "Category", item: "https://example.com/cat" },
      ])
    );
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[1].position).toBe(2);
  });
});

describe("generateFAQSchema", () => {
  it("wraps questions in FAQPage", () => {
    const schema = parse(
      generateFAQSchema([
        { question: "Q1?", answer: "A1" },
        { question: "Q2?", answer: "A2" },
      ])
    );
    expect(schema["@type"]).toBe("FAQPage");
    expect(schema.mainEntity).toHaveLength(2);
    expect(schema.mainEntity[0].name).toBe("Q1?");
    expect(schema.mainEntity[0].acceptedAnswer.text).toBe("A1");
  });
});

describe("generateCollectionPageSchema", () => {
  it("creates CollectionPage with NewsArticle items", () => {
    const schema = parse(
      generateCollectionPageSchema("Politics", "Political news", "https://example.com/politics", [
        { name: "Article 1", url: "https://example.com/news/1", datePublished: "2026-01-01" },
      ])
    );
    expect(schema["@type"]).toBe("CollectionPage");
    expect(schema.hasPart).toHaveLength(1);
    expect(schema.hasPart[0]["@type"]).toBe("NewsArticle");
  });
});

describe("generateItemListSchema", () => {
  it("creates ItemList with positional items", () => {
    const schema = parse(
      generateItemListSchema("Trending", [
        { name: "A", url: "https://a.com", position: 1 },
        { name: "B", url: "https://b.com", position: 2 },
      ])
    );
    expect(schema["@type"]).toBe("ItemList");
    expect(schema.itemListElement).toHaveLength(2);
    expect(schema.itemListElement[0].position).toBe(1);
  });
});

describe("generateWebPageSchema", () => {
  it("produces WebPage with optional dateModified", () => {
    const schema = parse(generateWebPageSchema("About", "About us", "https://example.com/about", "2026-08-01"));
    expect(schema["@type"]).toBe("WebPage");
    expect(schema.dateModified).toBe("2026-08-01");
    expect(schema.isPartOf.name).toBeDefined();
  });

  it("omits dateModified when not provided", () => {
    const schema = parse(generateWebPageSchema("About", "About us", "https://example.com/about"));
    expect(schema.dateModified).toBeUndefined();
  });
});

describe("generatePersonSchema", () => {
  it("wraps person with worksFor", () => {
    const schema = parse(generatePersonSchema("John", "Reporter", "https://example.com/john", "DK", ["https://twitter.com/john"]));
    expect(schema["@type"]).toBe("Person");
    expect(schema.worksFor.name).toBe("DK");
    expect(schema.sameAs).toHaveLength(1);
  });
});

describe("generateLocalKeywords", () => {
  it("includes base Bengali + English keywords", () => {
    const kws = generateLocalKeywords("politics");
    expect(kws).toContainEqual("Alipurduar news");
    expect(kws).toContainEqual("Alipurduar খবর");
    expect(kws.some((k) => k.includes("politics"))).toBe(true);
  });

  it("supports custom location", () => {
    const kws = generateLocalKeywords("sports", "Jalpaiguri");
    expect(kws).toContainEqual("Jalpaiguri news");
  });

  it("returns base keywords for unknown categories", () => {
    const kws = generateLocalKeywords("unknown");
    expect(kws.length).toBeGreaterThanOrEqual(6);
  });
});
