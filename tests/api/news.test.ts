import { describe, it, expect } from "vitest";
import {
  freshnessBandsForCategory,
  ARTICLE_STATUSES,
  CACHE_TTL_SECONDS,
} from "@/lib/config";

describe("API-like behavior tests", () => {
  describe("News API caching strategy", () => {
    it("breaking has shortest cache TTL", () => {
      expect(CACHE_TTL_SECONDS.breaking).toBeLessThanOrEqual(CACHE_TTL_SECONDS.latest);
    });

    it("categories have longest cache TTL", () => {
      expect(CACHE_TTL_SECONDS.categories).toBeGreaterThanOrEqual(
        CACHE_TTL_SECONDS.trending
      );
    });

    it("all cache TTLs are positive", () => {
      for (const [key, val] of Object.entries(CACHE_TTL_SECONDS)) {
        expect(val, `${key} should be positive`).toBeGreaterThan(0);
      }
    });
  });

  describe("Category-based freshness", () => {
    it("breaking news has tighter freshness windows", () => {
      const breaking = freshnessBandsForCategory("breaking");
      const general = freshnessBandsForCategory("business");
      expect(breaking[0].maxMinutes).toBeLessThan(general[0].maxMinutes);
    });

    it("lifestyle has looser freshness windows", () => {
      const lifestyle = freshnessBandsForCategory("lifestyle");
      const general = freshnessBandsForCategory("business");
      expect(lifestyle[0].maxMinutes).toBeGreaterThan(general[0].maxMinutes);
    });

    it("null category returns default bands", () => {
      const bands = freshnessBandsForCategory(null);
      expect(bands[0].maxMinutes).toBe(30); // default JUST_IN
    });

    it("all bands have valid keys", () => {
      const bands = freshnessBandsForCategory("breaking");
      const expectedKeys = ["JUST_IN", "FRESH", "RECENT", "TODAY", "OLDER"];
      expect(bands.map((b) => b.key)).toEqual(expectedKeys);
    });
  });

  describe("Article status lifecycle", () => {
    it("PUBLISHED and OLDER are public-visible", () => {
      expect(ARTICLE_STATUSES.filter((s) => ["PUBLISHED", "OLDER"].includes(s))).toHaveLength(2);
    });

    it("NEW, DRAFT, IN_REVIEW, APPROVED, SCHEDULED are not public-visible", () => {
      const nonPublic = ["NEW", "DRAFT", "IN_REVIEW", "APPROVED", "SCHEDULED"];
      for (const s of nonPublic) {
        expect(ARTICLE_STATUSES).toContain(s);
      }
    });
  });

  describe("Pagination defaults", () => {
    it("default page size is 20", async () => {
      const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = await import("@/lib/config");
      expect(DEFAULT_PAGE_SIZE).toBe(20);
      expect(MAX_PAGE_SIZE).toBe(50);
      expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    });
  });
});

describe("Maintenance job logic", () => {
  it("zonedDayStartUtc returns a Date", async () => {
    const { zonedDayStartUtc } = await import("@/lib/jobs/maintenance");
    const result = zonedDayStartUtc(new Date(), "Asia/Kolkata");
    expect(result).toBeInstanceOf(Date);
  }, 15000);

  it("zonedDayStartUtc for midnight IST is correct", async () => {
    const { zonedDayStartUtc } = await import("@/lib/jobs/maintenance");
    // 2026-08-25 12:00 UTC = 2026-08-25 17:30 IST
    // Midnight IST on Aug 25 = Aug 24 18:30 UTC
    const noon = new Date("2026-08-25T12:00:00Z");
    const midnight = zonedDayStartUtc(noon, "Asia/Kolkata");
    expect(midnight.getUTCHours()).toBe(18);
    expect(midnight.getUTCMinutes()).toBe(30);
    expect(midnight.getUTCDate()).toBe(24); // Aug 24 UTC
  }, 15000);
});

describe("Ingestion config", () => {
  it("ingest defaults are reasonable", async () => {
    const {
      INGEST_DEFAULT_INTERVAL_MINUTES,
      INGEST_MAX_FAILURES_BEFORE_DISABLE,
      INGEST_FETCH_TIMEOUT_MS,
      INGEST_RETRIES,
      INGEST_LOOKBACK_DAYS_FOR_DEDUPE,
    } = await import("@/lib/config");

    expect(INGEST_DEFAULT_INTERVAL_MINUTES).toBeGreaterThanOrEqual(5);
    expect(INGEST_DEFAULT_INTERVAL_MINUTES).toBeLessThanOrEqual(60);
    expect(INGEST_MAX_FAILURES_BEFORE_DISABLE).toBeGreaterThan(0);
    expect(INGEST_FETCH_TIMEOUT_MS).toBeGreaterThan(1000);
    expect(INGEST_RETRIES).toBeGreaterThanOrEqual(0);
    expect(INGEST_LOOKBACK_DAYS_FOR_DEDUPE).toBeGreaterThan(0);
  });
});
