import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db module
vi.mock("@/lib/db", () => ({
  db: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
  },
}));

describe("GET /api/health", () => {
  let GET: typeof import("@/app/api/health/route").GET;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T12:00:00Z"));
    // Dynamic import so mock is applied
    const mod = await import("@/app/api/health/route");
    GET = mod.GET;
  });

  it("returns healthy when DB + scheduler OK", async () => {
    (globalThis as Record<string, unknown>).__schedulerRunning = true;
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.checks.database).toBe("ok");
    expect(body.checks.scheduler).toBe("ok");
    expect(body.timestamp).toBe("2026-08-25T12:00:00.000Z");
    expect(typeof body.uptime).toBe("number");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("no-store");
  });

  it("returns down when DB fails", async () => {
    (globalThis as Record<string, unknown>).__schedulerRunning = true;
    const { db } = await import("@/lib/db");
    (db.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("connection refused"));
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("down");
    expect(body.checks.database).toBe("error");
    expect(res.status).toBe(503);
  });

  it("returns degraded when scheduler not running", async () => {
    (globalThis as Record<string, unknown>).__schedulerRunning = false;
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.checks.scheduler).toBe("error");
    expect(body.checks.database).toBe("ok");
    expect(res.status).toBe(503);
  });

  it("returns down when both fail", async () => {
    (globalThis as Record<string, unknown>).__schedulerRunning = false;
    const { db } = await import("@/lib/db");
    (db.$queryRaw as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("down"));
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("down");
    expect(res.status).toBe(503);
  });

  it("includes X-Response-Time header", async () => {
    (globalThis as Record<string, unknown>).__schedulerRunning = true;
    const res = await GET();
    expect(res.headers.get("X-Response-Time")).toMatch(/\d+ms/);
  });
});
