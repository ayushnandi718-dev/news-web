import { describe, it, expect } from "vitest";
import {
  slugify,
  decodeSlug,
  normalizeTitle,
  tokenize,
  jaccard,
  diceBigram,
  titleSimilarity,
  textSimilarity,
  hashId,
} from "@/lib/text";

describe("slugify", () => {
  it("converts text to URL-safe slug (preserves case)", () => {
    expect(slugify("Hello World")).toBe("Hello-World");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! @World# $100")).toBe("Hello-World-100");
  });

  it("handles Bengali text", () => {
    const result = slugify("আলিপুরদুয়ার খবর");
    // Bengali characters + dashes are valid
    expect(result).toContain("আলিপুরদুয়ার");
    expect(result).toContain("খবর");
    expect(result.length).toBeGreaterThan(0);
  });

  it("handles Bengali text with combining marks (vowel signs)", () => {
    const title = "ছেলেকে শাসনের বলার নিতে শিক্ষককে কেন টেনে করল অভিভাবক";
    const result = slugify(title);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("শিক্ষককে");
    // Must not produce empty slug
    expect(result).not.toBe("");
    expect(result).not.toBe("-");
  });

  it("preserves Bengali combining marks (া, ে, ো)", () => {
    const result = slugify("বাংলা খবর");
    expect(result).toContain("বাংলা");
  });

  it("handles mixed Bengali+English titles", () => {
    const result = slugify("Alipurduar খবর today");
    expect(result).toContain("Alipurduar");
    expect(result).toContain("খবর");
    expect(result).toContain("today");
  });

  it("generates non-empty slug for Bengali-only title", () => {
    const result = slugify("একটি বাংলা শিরোনাম");
    expect(result.length).toBeGreaterThan(0);
    expect(result.split("").some((c) => c.charCodeAt(0) >= 0x0980 && c.charCodeAt(0) <= 0x09FF)).toBe(true);
  });

  it("trims whitespace and normalizes spaces", () => {
    expect(slugify("  hello   world  ")).toBe("hello-world");
  });

  it("collapses multiple dashes", () => {
    expect(slugify("a---b---c")).toBe("a-b-c");
  });

  it("truncates to 90 characters", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(90);
  });

  it("trims leading/trailing dashes", () => {
    expect(slugify(" hello ")).toBe("hello");
  });
});

describe("decodeSlug", () => {
  it("decodes percent-encoded slugs", () => {
    expect(decodeSlug("hello%20world")).toBe("hello world");
  });

  it("returns original on invalid encoding", () => {
    expect(decodeSlug("%E0%A4%")).toBe("%E0%A4%");
  });
});

describe("normalizeTitle", () => {
  it("lowercases and removes stopwords", () => {
    const result = normalizeTitle("The Quick Brown Fox");
    expect(result).not.toContain("the");
    expect(result).toContain("quick");
    expect(result).toContain("brown");
    expect(result).toContain("fox");
  });

  it("removes special characters", () => {
    expect(normalizeTitle("Hello, World!")).toBe("hello world");
  });

  it("handles empty string", () => {
    expect(normalizeTitle("")).toBe("");
  });
});

describe("tokenize", () => {
  it("returns a Set of words", () => {
    const tokens = tokenize("hello world test");
    expect(tokens).toBeInstanceOf(Set);
    expect(tokens.size).toBe(3);
    expect(tokens.has("hello")).toBe(true);
  });

  it("filters stopwords", () => {
    const tokens = tokenize("the cat is on the mat");
    expect(tokens.has("the")).toBe(false);
    expect(tokens.has("is")).toBe(false);
    expect(tokens.has("on")).toBe(false);
    expect(tokens.has("cat")).toBe(true);
    expect(tokens.has("mat")).toBe(true);
  });
});

describe("jaccard", () => {
  it("returns 1 for identical sets", () => {
    expect(jaccard(new Set(["a", "b", "c"]), new Set(["a", "b", "c"]))).toBe(1);
  });

  it("returns 0 for disjoint sets", () => {
    expect(jaccard(new Set(["a", "b"]), new Set(["c", "d"]))).toBe(0);
  });

  it("returns 0 for empty sets", () => {
    expect(jaccard(new Set(), new Set(["a"]))).toBe(0);
    expect(jaccard(new Set(["a"]), new Set())).toBe(0);
  });

  it("computes correct intersection over union", () => {
    // {a,b,c} ∩ {b,c,d} = {b,c}, union = {a,b,c,d}
    // jaccard = 2/4 = 0.5
    expect(jaccard(new Set(["a", "b", "c"]), new Set(["b", "c", "d"]))).toBe(0.5);
  });
});

describe("diceBigram", () => {
  it("returns 1 for identical strings", () => {
    expect(diceBigram("hello", "hello")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(diceBigram("ab", "xy")).toBe(0);
  });

  it("returns 0 for empty strings", () => {
    expect(diceBigram("", "hello")).toBe(0);
  });

  it("handles short strings (no bigrams possible)", () => {
    // Single chars have no bigrams, so dice returns 0
    expect(diceBigram("a", "a")).toBe(0);
    expect(diceBigram("ab", "ab")).toBe(1);
  });

  it("computes correct Dice coefficient", () => {
    // "night" → bigrams: ni, ig, gh, ht
    // "nacht" → bigrams: na, ac, ch, ht
    // intersection: ht → 1
    // dice = 2*1 / (4+4) = 0.25
    expect(diceBigram("night", "nacht")).toBe(0.25);
  });
});

describe("titleSimilarity", () => {
  it("returns 1 for identical titles", () => {
    expect(titleSimilarity("Breaking News Today", "Breaking News Today")).toBe(1);
  });

  it("returns high similarity for similar titles", () => {
    const sim = titleSimilarity(
      "Alipurduar Election Results 2026",
      "Alipurduar Election Results Announced 2026"
    );
    expect(sim).toBeGreaterThan(0.5);
  });

  it("returns low similarity for different titles", () => {
    const sim = titleSimilarity(
      "Weather Forecast for Alipurduar",
      "Stock Market Crashes in Mumbai"
    );
    expect(sim).toBeLessThan(0.5);
  });

  it("is commutative", () => {
    const a = "Apple launches new iPhone";
    const b = "Apple unveils new iPhone model";
    expect(titleSimilarity(a, b)).toBe(titleSimilarity(b, a));
  });
});

describe("textSimilarity", () => {
  it("returns 1 for identical text", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    expect(textSimilarity(text, text)).toBe(1);
  });

  it("returns 0 for empty text", () => {
    expect(textSimilarity("", "something")).toBe(0);
  });

  it("handles text longer than 2000 chars (sliced)", () => {
    const long = "word ".repeat(500);
    expect(textSimilarity(long, long)).toBe(1);
  });
});

describe("hashId", () => {
  it("returns a string", () => {
    expect(typeof hashId("test")).toBe("string");
  });

  it("is deterministic", () => {
    expect(hashId("https://example.com/article/1")).toBe(
      hashId("https://example.com/article/1")
    );
  });

  it("produces different hashes for different inputs", () => {
    expect(hashId("https://a.com")).not.toBe(hashId("https://b.com"));
  });

  it("is fast (10k hashes in <100ms)", () => {
    const start = Date.now();
    for (let i = 0; i < 10_000; i++) hashId(`url-${i}`);
    expect(Date.now() - start).toBeLessThan(100);
  });
});
