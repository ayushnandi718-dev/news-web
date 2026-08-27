import { describe, it, expect } from "vitest";
import { rateLimit, clientIp } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows first request", () => {
    expect(rateLimit("test1", 5, 60_000)).toBe(true);
  });

  it("allows requests within limit", () => {
    for (let i = 0; i < 4; i++) rateLimit("test2", 5, 60_000);
    expect(rateLimit("test2", 5, 60_000)).toBe(true);
  });

  it("blocks request over limit", () => {
    for (let i = 0; i < 5; i++) rateLimit("test3", 5, 60_000);
    expect(rateLimit("test3", 5, 60_000)).toBe(false);
  });

  it("different keys are independent", () => {
    for (let i = 0; i < 5; i++) rateLimit("keyA", 5, 60_000);
    expect(rateLimit("keyA", 5, 60_000)).toBe(false);
    expect(rateLimit("keyB", 5, 60_000)).toBe(true);
  });

  it("resets after window expires", () => {
    // Use a very short window
    rateLimit("test4", 2, 1); // 1ms window
    rateLimit("test4", 2, 1);
    expect(rateLimit("test4", 2, 1)).toBe(false);
    // Wait for reset
    return new Promise((resolve) => setTimeout(resolve, 5)).then(() => {
      expect(rateLimit("test4", 2, 1)).toBe(true);
    });
  });

  it("limit of 1 blocks second request immediately", () => {
    expect(rateLimit("test5", 1, 60_000)).toBe(true);
    expect(rateLimit("test5", 1, 60_000)).toBe(false);
  });
});

describe("clientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(clientIp(req)).toBe("1.2.3.4");
  });

  it("extracts IP from x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(clientIp(req)).toBe("9.8.7.6");
  });

  it("returns 'unknown' when no headers present", () => {
    const req = new Request("http://localhost");
    expect(clientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
      },
    });
    expect(clientIp(req)).toBe("1.1.1.1");
  });
});
