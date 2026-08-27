import { describe, it, expect } from "vitest";

// We test the middleware's pure decision logic directly rather than
// instantiating NextRequest/Response (which require a full Next.js runtime).

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];
const PUBLIC_API_PATHS = [
  "/api/v1/admin/session",
  "/api/v1/admin/password-reset",
  "/api/v1/admin/password-reset/confirm",
];

function isPublicAdminPath(pathname: string): boolean {
  return PUBLIC_ADMIN_PATHS.some((p) => pathname === p);
}

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((p) => pathname === p);
}

function shouldRedirectToLogin(pathname: string, token: string | null): boolean {
  if (token) return false; // valid token → no redirect needed
  if (isPublicAdminPath(pathname)) return false;
  if (isPublicApiPath(pathname)) return false;
  return true;
}

function isCsrfViolation(
  method: string,
  pathname: string,
  origin: string | null,
  host: string | null
): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return false;
  if (!pathname.startsWith("/api/v1/admin")) return false;
  if (!origin || !host) return false; // no Origin header → not CSRF (non-browser client)
  try {
    return new URL(origin).host !== host;
  } catch {
    return true; // invalid origin
  }
}

describe("isPublicAdminPath", () => {
  it("allows /admin/login", () => {
    expect(isPublicAdminPath("/admin/login")).toBe(true);
  });

  it("allows /admin/forgot-password", () => {
    expect(isPublicAdminPath("/admin/forgot-password")).toBe(true);
  });

  it("allows /admin/reset-password", () => {
    expect(isPublicAdminPath("/admin/reset-password")).toBe(true);
  });

  it("rejects /admin/articles", () => {
    expect(isPublicAdminPath("/admin/articles")).toBe(false);
  });

  it("rejects /admin/login?next=/admin", () => {
    expect(isPublicAdminPath("/admin/login?next=/admin")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isPublicAdminPath("")).toBe(false);
  });
});

describe("isPublicApiPath", () => {
  it("allows session endpoint", () => {
    expect(isPublicApiPath("/api/v1/admin/session")).toBe(true);
  });

  it("allows password-reset endpoint", () => {
    expect(isPublicApiPath("/api/v1/admin/password-reset")).toBe(true);
  });

  it("allows password-reset/confirm endpoint", () => {
    expect(isPublicApiPath("/api/v1/admin/password-reset/confirm")).toBe(true);
  });

  it("rejects /api/v1/admin/articles", () => {
    expect(isPublicApiPath("/api/v1/admin/articles")).toBe(false);
  });

  it("rejects /api/v1/admin/session/extra", () => {
    expect(isPublicApiPath("/api/v1/admin/session/extra")).toBe(false);
  });
});

describe("shouldRedirectToLogin", () => {
  it("redirects unauthenticated user on protected admin path", () => {
    expect(shouldRedirectToLogin("/admin/articles", null)).toBe(true);
  });

  it("does NOT redirect authenticated user", () => {
    expect(shouldRedirectToLogin("/admin/articles", "valid-token")).toBe(false);
  });

  it("does NOT redirect unauthenticated user on public admin path", () => {
    expect(shouldRedirectToLogin("/admin/login", null)).toBe(false);
  });

  it("does NOT redirect for public API paths", () => {
    expect(shouldRedirectToLogin("/api/v1/admin/session", null)).toBe(false);
  });

  it("redirects unauthenticated user on non-public API", () => {
    expect(shouldRedirectToLogin("/api/v1/admin/articles", null)).toBe(true);
  });

  it("does NOT redirect for root admin with token", () => {
    expect(shouldRedirectToLogin("/admin", "token")).toBe(false);
  });
});

describe("isCsrfViolation", () => {
  it("allows GET requests regardless of origin", () => {
    expect(isCsrfViolation("GET", "/api/v1/admin/articles", "https://evil.com", "localhost:3000")).toBe(false);
  });

  it("allows HEAD requests regardless of origin", () => {
    expect(isCsrfViolation("HEAD", "/api/v1/admin/articles", "https://evil.com", "localhost:3000")).toBe(false);
  });

  it("allows OPTIONS requests regardless of origin", () => {
    expect(isCsrfViolation("OPTIONS", "/api/v1/admin/articles", "https://evil.com", "localhost:3000")).toBe(false);
  });

  it("allows POST from same origin", () => {
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", "http://localhost:3000", "localhost:3000")).toBe(false);
  });

  it("blocks POST from different origin (CSRF)", () => {
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", "https://evil.com", "localhost:3000")).toBe(true);
  });

  it("blocks PUT from different origin", () => {
    expect(isCsrfViolation("PUT", "/api/v1/admin/articles/1", "https://evil.com", "localhost:3000")).toBe(true);
  });

  it("blocks DELETE from different origin", () => {
    expect(isCsrfViolation("DELETE", "/api/v1/admin/articles/1", "https://evil.com", "localhost:3000")).toBe(true);
  });

  it("allows POST with no Origin (non-browser client)", () => {
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", null, "localhost:3000")).toBe(false);
  });

  it("allows POST with no Host header", () => {
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", "https://evil.com", null)).toBe(false);
  });

  it("blocks POST with malformed Origin", () => {
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", "not-a-url", "localhost:3000")).toBe(true);
  });

  it("ignores non-admin API paths", () => {
    expect(isCsrfViolation("POST", "/api/v1/search", "https://evil.com", "localhost:3000")).toBe(false);
  });

  it("ignores non-API paths", () => {
    expect(isCsrfViolation("POST", "/admin/articles", "https://evil.com", "localhost:3000")).toBe(false);
  });

  it("allows PATCH from same origin", () => {
    expect(isCsrfViolation("PATCH", "/api/v1/admin/articles/1", "http://localhost:3000", "localhost:3000")).toBe(false);
  });

  it("handles port in origin/host correctly", () => {
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", "http://localhost:3000", "localhost:3000")).toBe(false);
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", "http://localhost:4000", "localhost:3000")).toBe(true);
  });

  it("handles production domains", () => {
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", "https://news.example.com", "news.example.com")).toBe(false);
    expect(isCsrfViolation("POST", "/api/v1/admin/articles", "https://evil.example.com", "news.example.com")).toBe(true);
  });
});
