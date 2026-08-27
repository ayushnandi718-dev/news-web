import { describe, it, expect } from "vitest";
import {
  ageMinutes,
  formatAgeLabel,
  classifyFreshness,
  isBreakingActive,
  recencyScore,
  freshnessScore,
  trendingScore,
} from "@/lib/freshness";

describe("ageMinutes", () => {
  it("returns 0 for publishedAt = now", () => {
    const now = new Date("2026-08-25T12:00:00Z");
    expect(ageMinutes(new Date("2026-08-25T12:00:00Z"), now)).toBe(0);
  });

  it("returns correct minutes for past date", () => {
    const now = new Date("2026-08-25T13:00:00Z"); // 60 min later
    expect(ageMinutes(new Date("2026-08-25T12:00:00Z"), now)).toBe(60);
  });

  it("returns Infinity for null", () => {
    expect(ageMinutes(null, new Date())).toBe(Number.POSITIVE_INFINITY);
  });

  it("returns Infinity for undefined", () => {
    expect(ageMinutes(undefined, new Date())).toBe(Number.POSITIVE_INFINITY);
  });

  it("handles ISO string input", () => {
    const now = new Date("2026-08-25T12:00:00Z");
    expect(ageMinutes("2026-08-25T11:30:00Z", now)).toBe(30);
  });

  it("clamps to 0 for future dates", () => {
    const now = new Date("2026-08-25T12:00:00Z");
    expect(ageMinutes(new Date("2026-08-25T13:00:00Z"), now)).toBe(0);
  });
});

describe("formatAgeLabel", () => {
  it("empty string for Infinity", () => {
    expect(formatAgeLabel(Number.POSITIVE_INFINITY)).toBe("");
  });

  it("'just now' for < 1 min", () => {
    expect(formatAgeLabel(0.5)).toBe("just now");
    expect(formatAgeLabel(0)).toBe("just now");
  });

  it("minutes for 1–59 min", () => {
    expect(formatAgeLabel(1)).toBe("1 min ago");
    expect(formatAgeLabel(30)).toBe("30 min ago");
    expect(formatAgeLabel(59)).toBe("59 min ago");
  });

  it("hours for 60–1439 min", () => {
    expect(formatAgeLabel(60)).toBe("1 hr ago");
    expect(formatAgeLabel(120)).toBe("2 hr ago");
    expect(formatAgeLabel(720)).toBe("12 hr ago");
  });

  it("days for 1440–10079 min", () => {
    expect(formatAgeLabel(1440)).toBe("1d ago");
    expect(formatAgeLabel(4320)).toBe("3d ago");
  });

  it("weeks for >= 10080 min", () => {
    expect(formatAgeLabel(10080)).toBe("1w ago");
    expect(formatAgeLabel(20160)).toBe("2w ago");
  });
});

describe("classifyFreshness", () => {
  it("returns JUST_IN for very recent articles", () => {
    const now = new Date("2026-08-25T12:00:00Z");
    const pub = new Date("2026-08-25T11:55:00Z"); // 5 min ago
    const info = classifyFreshness(pub, now, null);
    expect(info.key).toBe("JUST_IN");
    expect(info.ageMinutes).toBe(5);
  });

  it("returns OLDER for very old articles", () => {
    const now = new Date("2026-08-25T12:00:00Z");
    const pub = new Date("2026-08-20T12:00:00Z"); // 5 days ago
    const info = classifyFreshness(pub, now, null);
    expect(info.key).toBe("OLDER");
  });

  it("returns OLDER for null publishedAt", () => {
    const info = classifyFreshness(null, new Date(), null);
    expect(info.key).toBe("OLDER");
    expect(info.ageLabel).toBe("");
  });

  it("all freshness keys are valid", () => {
    const validKeys = ["JUST_IN", "FRESH", "RECENT", "TODAY", "OLDER"];
    const now = new Date();

    // Test various ages
    const ages = [0, 5, 15, 30, 60, 120, 360, 1440, 4320];
    for (const mins of ages) {
      const pub = new Date(now.getTime() - mins * 60_000);
      const info = classifyFreshness(pub, now, null);
      expect(validKeys).toContain(info.key);
    }
  });
});

describe("isBreakingActive", () => {
  it("returns true when isBreaking and breakingUntil is in the future", () => {
    const future = new Date(Date.now() + 3600_000);
    expect(isBreakingActive(true, future)).toBe(true);
  });

  it("returns false when isBreaking is false", () => {
    const future = new Date(Date.now() + 3600_000);
    expect(isBreakingActive(false, future)).toBe(false);
  });

  it("returns false when breakingUntil is in the past", () => {
    const past = new Date(Date.now() - 3600_000);
    expect(isBreakingActive(true, past)).toBe(false);
  });

  it("returns false when breakingUntil is null", () => {
    expect(isBreakingActive(true, null)).toBe(false);
  });

  it("returns false when both are false/null", () => {
    expect(isBreakingActive(false, null)).toBe(false);
  });

  it("handles string date input", () => {
    const future = new Date(Date.now() + 3600_000).toISOString();
    expect(isBreakingActive(true, future)).toBe(true);
  });
});

describe("recencyScore", () => {
  it("returns 100 for ageHrs = 0", () => {
    expect(recencyScore(0, 12)).toBe(100);
  });

  it("returns ~50 at halfLife", () => {
    const score = recencyScore(12, 12);
    expect(score).toBeCloseTo(50, 0);
  });

  it("decays toward 0 as age increases", () => {
    expect(recencyScore(100, 12)).toBeLessThan(1);
  });

  it("higher halfLife decays slower", () => {
    const fast = recencyScore(24, 6);
    const slow = recencyScore(24, 24);
    expect(slow).toBeGreaterThan(fast);
  });
});

describe("freshnessScore", () => {
  it("returns 0 for null publishedAt", () => {
    expect(freshnessScore({ publishedAt: null })).toBe(0);
  });

  it("returns 0 for undefined publishedAt", () => {
    expect(freshnessScore({})).toBe(0);
  });

  it("returns > 0 for recent article", () => {
    const score = freshnessScore({
      publishedAt: new Date(),
      editorialPriority: 0,
      geographicPriority: 0,
    });
    expect(score).toBeGreaterThan(0);
  });

  it("featured boost adds points", () => {
    const base = freshnessScore({ publishedAt: new Date(), isFeatured: false });
    const featured = freshnessScore({ publishedAt: new Date(), isFeatured: true });
    expect(featured).toBeGreaterThan(base);
  });

  it("editorial priority adds points", () => {
    const none = freshnessScore({ publishedAt: new Date(), editorialPriority: 0 });
    const high = freshnessScore({ publishedAt: new Date(), editorialPriority: 5 });
    expect(high).toBeGreaterThan(none);
  });

  it("engagement adds points", () => {
    const noEngagement = freshnessScore({ publishedAt: new Date(), views: 0, shares: 0 });
    const highEngagement = freshnessScore({
      publishedAt: new Date(),
      views: 10000,
      shares: 500,
      commentsCount: 200,
    });
    expect(highEngagement).toBeGreaterThan(noEngagement);
  });

  it("geographic priority adds points", () => {
    const local = freshnessScore({
      publishedAt: new Date(),
      geographicScope: "local",
      geographicPriority: 0,
    });
    const national = freshnessScore({
      publishedAt: new Date(),
      geographicScope: "national",
      geographicPriority: 0,
    });
    expect(local).toBeGreaterThanOrEqual(national);
  });
});

describe("trendingScore", () => {
  it("returns 0 for null publishedAt", () => {
    expect(trendingScore({ publishedAt: null })).toBe(0);
  });

  it("returns > 0 for recent article with engagement", () => {
    const score = trendingScore({
      publishedAt: new Date(),
      views: 100,
      shares: 10,
      commentsCount: 5,
    });
    expect(score).toBeGreaterThan(0);
  });

  it("views boost trending score", () => {
    const low = trendingScore({ publishedAt: new Date(), views: 10 });
    const high = trendingScore({ publishedAt: new Date(), views: 10000 });
    expect(high).toBeGreaterThan(low);
  });

  it("recency heavily influences trending", () => {
    // Fresh article with zero engagement still scores > 0
    const fresh = trendingScore({ publishedAt: new Date() });
    expect(fresh).toBeGreaterThan(0);

    // Old article with no engagement scores lower than fresh
    const oldNoEngagement = trendingScore({ publishedAt: new Date(Date.now() - 12 * 3600_000) });
    expect(fresh).toBeGreaterThan(oldNoEngagement);

    // 24h-old article with zero engagement still has some residual recency
    const oldZero = trendingScore({ publishedAt: new Date(Date.now() - 24 * 3600_000) });
    expect(oldZero).toBeGreaterThan(0); // residual from recency decay
    expect(oldZero).toBeLessThan(fresh); // but less than fresh
  });

  it("custom weights change ranking", () => {
    const scoreA = trendingScore({ publishedAt: new Date(), views: 1000 }, undefined, {
      views: 20,
      shares: 0,
      comments: 0,
      recency: 0,
    });
    const scoreB = trendingScore({ publishedAt: new Date(), views: 1000 }, undefined, {
      views: 5,
      shares: 0,
      comments: 0,
      recency: 0,
    });
    expect(scoreA).toBeGreaterThan(scoreB);
  });
});
