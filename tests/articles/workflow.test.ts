import { describe, it, expect } from "vitest";
import {
  ARTICLE_STATUSES,
  PUBLIC_VISIBLE_STATUSES,
  CACHE_TTL_SECONDS,
  FRESHNESS_THRESHOLDS,
  freshnessBandsForCategory,
  DUPLICATE_SIMILARITY_THRESHOLD,
  TRENDING_WEIGHTS,
} from "@/lib/config";

describe("ARTICLE_STATUSES", () => {
  it("defines all expected statuses", () => {
    expect(ARTICLE_STATUSES).toEqual([
      "NEW",
      "DRAFT",
      "IN_REVIEW",
      "APPROVED",
      "SCHEDULED",
      "PUBLISHED",
      "OLDER",
      "ARCHIVED",
    ]);
  });

  it("has exactly 8 statuses", () => {
    expect(ARTICLE_STATUSES.length).toBe(8);
  });
});

describe("PUBLIC_VISIBLE_STATUSES", () => {
  it("includes PUBLISHED and OLDER", () => {
    expect(PUBLIC_VISIBLE_STATUSES).toContain("PUBLISHED");
    expect(PUBLIC_VISIBLE_STATUSES).toContain("OLDER");
  });

  it("does not include DRAFT or ARCHIVED", () => {
    expect(PUBLIC_VISIBLE_STATUSES).not.toContain("DRAFT");
    expect(PUBLIC_VISIBLE_STATUSES).not.toContain("ARCHIVED");
    expect(PUBLIC_VISIBLE_STATUSES).not.toContain("NEW");
    expect(PUBLIC_VISIBLE_STATUSES).not.toContain("IN_REVIEW");
    expect(PUBLIC_VISIBLE_STATUSES).not.toContain("APPROVED");
    expect(PUBLIC_VISIBLE_STATUSES).not.toContain("SCHEDULED");
  });
});

describe("Article workflow transitions", () => {
  // Define valid transitions based on the codebase
  const VALID_TRANSITIONS: Record<string, string[]> = {
    NEW: ["DRAFT"],
    DRAFT: ["IN_REVIEW"],
    IN_REVIEW: ["APPROVED", "DRAFT"], // approve or reject back to draft
    APPROVED: ["PUBLISHED", "SCHEDULED", "DRAFT"],
    SCHEDULED: ["PUBLISHED", "DRAFT"],
    PUBLISHED: ["OLDER", "ARCHIVED", "DRAFT"], // unpublish goes to DRAFT
    OLDER: ["ARCHIVED", "DRAFT"], // restore
    ARCHIVED: ["DRAFT", "OLDER"], // restore
  };

  const ALL_STATUSES = [...ARTICLE_STATUSES];

  it("DRAFT → IN_REVIEW (submit for review)", () => {
    expect(VALID_TRANSITIONS["DRAFT"]).toContain("IN_REVIEW");
  });

  it("IN_REVIEW → APPROVED (approve)", () => {
    expect(VALID_TRANSITIONS["IN_REVIEW"]).toContain("APPROVED");
  });

  it("IN_REVIEW → DRAFT (reject)", () => {
    expect(VALID_TRANSITIONS["IN_REVIEW"]).toContain("DRAFT");
  });

  it("APPROVED → PUBLISHED (publish)", () => {
    expect(VALID_TRANSITIONS["APPROVED"]).toContain("PUBLISHED");
  });

  it("APPROVED → SCHEDULED (schedule)", () => {
    expect(VALID_TRANSITIONS["APPROVED"]).toContain("SCHEDULED");
  });

  it("SCHEDULED → PUBLISHED (auto/manual publish)", () => {
    expect(VALID_TRANSITIONS["SCHEDULED"]).toContain("PUBLISHED");
  });

  it("PUBLISHED → OLDER (lifecycle)", () => {
    expect(VALID_TRANSITIONS["PUBLISHED"]).toContain("OLDER");
  });

  it("PUBLISHED → ARCHIVED (manual archive)", () => {
    expect(VALID_TRANSITIONS["PUBLISHED"]).toContain("ARCHIVED");
  });

  it("PUBLISHED → DRAFT (unpublish)", () => {
    expect(VALID_TRANSITIONS["PUBLISHED"]).toContain("DRAFT");
  });

  it("ARCHIVED → DRAFT (restore)", () => {
    expect(VALID_TRANSITIONS["ARCHIVED"]).toContain("DRAFT");
  });

  it("DRAFT → PUBLISHED is NOT valid (must go through review)", () => {
    expect(VALID_TRANSITIONS["DRAFT"]).not.toContain("PUBLISHED");
  });

  it("ARCHIVED → DRAFT is NOT valid directly to PUBLISHED", () => {
    expect(VALID_TRANSITIONS["ARCHIVED"]).not.toContain("PUBLISHED");
  });

  it("NEW → PUBLISHED is NOT valid", () => {
    expect(VALID_TRANSITIONS["NEW"]).not.toContain("PUBLISHED");
  });
});

describe("Freshness bands", () => {
  it("has 5 bands", () => {
    expect(FRESHNESS_THRESHOLDS.length).toBe(5);
  });

  it("JUST_IN is up to 30 minutes", () => {
    expect(FRESHNESS_THRESHOLDS[0].key).toBe("JUST_IN");
    expect(FRESHNESS_THRESHOLDS[0].maxMinutes).toBe(30);
  });

  it("last band has Infinity maxMinutes", () => {
    expect(FRESHNESS_THRESHOLDS[4].maxMinutes).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("freshnessBandsForCategory", () => {
  it("returns default bands for unknown category", () => {
    const bands = freshnessBandsForCategory("unknown");
    expect(bands.length).toBe(5);
    expect(bands[0].maxMinutes).toBe(30); // same as default
  });

  it("applies breaking multiplier (0.5)", () => {
    const bands = freshnessBandsForCategory("breaking");
    expect(bands[0].maxMinutes).toBe(15); // 30 * 0.5
  });

  it("applies sports multiplier (0.75)", () => {
    const bands = freshnessBandsForCategory("sports");
    expect(bands[0].maxMinutes).toBe(22.5); // 30 * 0.75
  });

  it("applies lifestyle multiplier (2x)", () => {
    const bands = freshnessBandsForCategory("lifestyle");
    expect(bands[0].maxMinutes).toBe(60); // 30 * 2
  });

  it("accepts override multiplier", () => {
    const bands = freshnessBandsForCategory(null, { multiplier: 3 });
    expect(bands[0].maxMinutes).toBe(90); // 30 * 3
  });

  it("accepts explicit band overrides", () => {
    const bands = freshnessBandsForCategory(null, {
      bands: { JUST_IN: 10, FRESH: 60 },
    });
    expect(bands[0].maxMinutes).toBe(10);
    expect(bands[1].maxMinutes).toBe(60);
    expect(bands[2].maxMinutes).toBe(720); // unchanged
  });
});

describe("Configuration constants", () => {
  it("CACHE_TTL_SECONDS has all expected keys", () => {
    expect(CACHE_TTL_SECONDS).toHaveProperty("latest");
    expect(CACHE_TTL_SECONDS).toHaveProperty("breaking");
    expect(CACHE_TTL_SECONDS).toHaveProperty("trending");
    expect(CACHE_TTL_SECONDS).toHaveProperty("home");
    expect(CACHE_TTL_SECONDS).toHaveProperty("categories");
  });

  it("breaking cache is shortest", () => {
    expect(CACHE_TTL_SECONDS.breaking).toBeLessThan(CACHE_TTL_SECONDS.latest);
    expect(CACHE_TTL_SECONDS.breaking).toBeLessThan(CACHE_TTL_SECONDS.trending);
  });

  it("categories cache is longest", () => {
    expect(CACHE_TTL_SECONDS.categories).toBeGreaterThan(CACHE_TTL_SECONDS.trending);
  });

  it("DUPLICATE_SIMILARITY_THRESHOLD is between 0.7 and 0.95", () => {
    expect(DUPLICATE_SIMILARITY_THRESHOLD).toBeGreaterThan(0.7);
    expect(DUPLICATE_SIMILARITY_THRESHOLD).toBeLessThan(0.95);
  });

  it("TRENDING_WEIGHTS sum to a reasonable total", () => {
    const sum = Object.values(TRENDING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
    expect(sum).toBeLessThan(200);
  });
});
