import { describe, it, expect, vi } from "vitest";
import { hashToken, randomToken, hashPassword, verifyPassword } from "@/lib/auth";

describe("hashToken", () => {
  it("returns a hex string", () => {
    const hash = hashToken("test-token");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});

describe("randomToken", () => {
  it("returns a hex string of correct length", () => {
    const token = randomToken(32);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => randomToken()));
    expect(tokens.size).toBe(100);
  });

  it("supports custom byte lengths", () => {
    expect(randomToken(16)).toMatch(/^[a-f0-9]{32}$/);
    expect(randomToken(64)).toMatch(/^[a-f0-9]{128}$/);
  });
});

describe("hashPassword / verifyPassword", () => {
  it("hashes and verifies a password", async () => {
    const hash = await hashPassword("mypassword123");
    expect(hash).not.toBe("mypassword123");
    expect(await verifyPassword("mypassword123", hash)).toBe(true);
  });

  it("rejects wrong password", async () => {
    const hash = await hashPassword("correct-password");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces different hashes for same password (salt)", async () => {
    const h1 = await hashPassword("test");
    const h2 = await hashPassword("test");
    expect(h1).not.toBe(h2);
    // Both should verify correctly
    expect(await verifyPassword("test", h1)).toBe(true);
    expect(await verifyPassword("test", h2)).toBe(true);
  });
});

describe("login validation schema", () => {
  it("validates correct input", async () => {
    const { loginSchema } = await import("@/lib/validation");
    const result = loginSchema.safeParse({
      email: "admin@newsroom.local",
      password: "admin123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", async () => {
    const { loginSchema } = await import("@/lib/validation");
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "admin123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", async () => {
    const { loginSchema } = await import("@/lib/validation");
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "12345", // less than 6
    });
    expect(result.success).toBe(false);
  });
});

describe("rememberLoginSchema", () => {
  it("accepts rememberMe boolean", async () => {
    const { rememberLoginSchema } = await import("@/lib/validation");
    const result = rememberLoginSchema.safeParse({
      email: "admin@newsroom.local",
      password: "admin123",
      rememberMe: true,
    });
    expect(result.success).toBe(true);
  });

  it("works without rememberMe", async () => {
    const { rememberLoginSchema } = await import("@/lib/validation");
    const result = rememberLoginSchema.safeParse({
      email: "admin@newsroom.local",
      password: "admin123",
    });
    expect(result.success).toBe(true);
  });
});
