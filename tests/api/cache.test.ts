import { describe, it, expect, vi, beforeEach } from "vitest";

// Import the REAL cache module (not the mocked one from setup.ts)
let cacheGet: typeof import("@/lib/cache").cacheGet;
let cacheSet: typeof import("@/lib/cache").cacheSet;
let cacheWrap: typeof import("@/lib/cache").cacheWrap;
let invalidateTag: typeof import("@/lib/cache").invalidateTag;
let invalidateTags: typeof import("@/lib/cache").invalidateTags;

beforeEach(async () => {
  const mod = await vi.importActual<typeof import("@/lib/cache")>("@/lib/cache");
  cacheGet = mod.cacheGet;
  cacheSet = mod.cacheSet;
  cacheWrap = mod.cacheWrap;
  invalidateTag = mod.invalidateTag;
  invalidateTags = mod.invalidateTags;
  // Clear the global store
  invalidateTags(["*"]);
});

describe("cacheGet / cacheSet", () => {
  it("returns undefined for missing key", () => {
    expect(cacheGet("nonexistent")).toBeUndefined();
  });

  it("stores and retrieves a value", () => {
    cacheSet("k1", { data: "hello" }, 60);
    expect(cacheGet("k1")).toEqual({ data: "hello" });
  });

  it("returns undefined for expired entry", () => {
    cacheSet("expired", "value", -1); // expired immediately
    expect(cacheGet("expired")).toBeUndefined();
  });

  it("respects TTL — non-expired entry survives", () => {
    cacheSet("fresh", "value", 3600);
    expect(cacheGet("fresh")).toBe("value");
  });

  it("overwrites existing key", () => {
    cacheSet("ow", "first", 60);
    cacheSet("ow", "second", 60);
    expect(cacheGet("ow")).toBe("second");
  });

  it("different keys are independent", () => {
    cacheSet("a", 1, 60);
    cacheSet("b", 2, 60);
    expect(cacheGet("a")).toBe(1);
    expect(cacheGet("b")).toBe(2);
  });

  it("stores complex objects", () => {
    const obj = { items: [1, 2, 3], nested: { key: "val" } };
    cacheSet("complex", obj, 60);
    expect(cacheGet("complex")).toEqual(obj);
  });
});

describe("cacheWrap", () => {
  it("calls producer on cache miss", async () => {
    const producer = vi.fn().mockResolvedValue("result");
    const val = await cacheWrap("wrap-miss", 60, [], producer);
    expect(val).toBe("result");
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it("returns cached value without calling producer again", async () => {
    const producer = vi.fn().mockResolvedValue("cached");
    await cacheWrap("wrap-hit", 60, [], producer);
    const val = await cacheWrap("wrap-hit", 60, [], producer);
    expect(val).toBe("cached");
    expect(producer).toHaveBeenCalledTimes(1);
  });

  it("re-calls producer after expiration", async () => {
    const producer = vi.fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");
    await cacheWrap("wrap-exp", -1, [], producer); // expires immediately
    const val = await cacheWrap("wrap-exp", 60, [], producer);
    expect(val).toBe("second");
    expect(producer).toHaveBeenCalledTimes(2);
  });

  it("coalesces concurrent requests for same key", async () => {
    let callCount = 0;
    const producer = vi.fn().mockImplementation(() => {
      callCount++;
      return new Promise((resolve) => setTimeout(() => resolve(`result-${callCount}`), 10));
    });

    // Fire 5 concurrent requests for same key
    const results = await Promise.all([
      cacheWrap("coalesce", 60, [], producer),
      cacheWrap("coalesce", 60, [], producer),
      cacheWrap("coalesce", 60, [], producer),
      cacheWrap("coalesce", 60, [], producer),
      cacheWrap("coalesce", 60, [], producer),
    ]);

    // Producer should only be called once
    expect(producer).toHaveBeenCalledTimes(1);
    // All should get the same value
    expect(results.every((r) => r === results[0])).toBe(true);
  });

  it("tags are stored for later invalidation", async () => {
    await cacheWrap("tagged", 60, ["news", "latest"], () => Promise.resolve("data"));
    expect(cacheGet("tagged")).toBe("data");
    invalidateTag("news");
    expect(cacheGet("tagged")).toBeUndefined();
  });
});

describe("invalidateTag", () => {
  it("removes entries with matching tag", () => {
    cacheSet("t1", "v1", 60, ["alpha"]);
    cacheSet("t2", "v2", 60, ["beta"]);
    cacheSet("t3", "v3", 60, ["alpha", "beta"]);

    const removed = invalidateTag("alpha");
    expect(removed).toBe(2); // t1 and t3
    expect(cacheGet("t1")).toBeUndefined();
    expect(cacheGet("t3")).toBeUndefined();
    expect(cacheGet("t2")).toBe("v2"); // untouched
  });

  it("returns 0 when no entries match", () => {
    cacheSet("x", "y", 60, ["tag-a"]);
    expect(invalidateTag("nonexistent")).toBe(0);
    expect(cacheGet("x")).toBe("y");
  });

  it("returns 0 for empty cache", () => {
    expect(invalidateTag("anything")).toBe(0);
  });
});

describe("invalidateTags", () => {
  it("removes entries matching any of the given tags", () => {
    cacheSet("a", 1, 60, ["breaking"]);
    cacheSet("b", 2, 60, ["latest"]);
    cacheSet("c", 3, 60, ["breaking", "latest"]);
    cacheSet("d", 4, 60, ["other"]);

    invalidateTags(["breaking", "latest"]);
    expect(cacheGet("a")).toBeUndefined();
    expect(cacheGet("b")).toBeUndefined();
    expect(cacheGet("c")).toBeUndefined();
    expect(cacheGet("d")).toBe(4);
  });
});

describe("Cache key isolation", () => {
  it("different category slugs don't share cache", async () => {
    const p1 = vi.fn().mockResolvedValue("alipurduar");
    const p2 = vi.fn().mockResolvedValue("sports");

    await cacheWrap("latest:alipurduar:all:0:20", 60, [], p1);
    await cacheWrap("latest:sports:all:0:20", 60, [], p2);

    expect(cacheGet("latest:alipurduar:all:0:20")).toBe("alipurduar");
    expect(cacheGet("latest:sports:all:0:20")).toBe("sports");
    expect(p1).toHaveBeenCalledTimes(1);
    expect(p2).toHaveBeenCalledTimes(1);
  });

  it("different article slugs don't share cache", async () => {
    const p1 = vi.fn().mockResolvedValue({ title: "Article A" });
    const p2 = vi.fn().mockResolvedValue({ title: "Article B" });

    await cacheWrap("article:slug-a", 60, [], p1);
    await cacheWrap("article:slug-b", 60, [], p2);

    expect(p1).toHaveBeenCalledTimes(1);
    expect(p2).toHaveBeenCalledTimes(1);
  });
});
