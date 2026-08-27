import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/config";
import { sessionSecretKey } from "./lib/session-secret";

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/forgot-password", "/admin/reset-password"];

/** API endpoints reachable without a session (CSRF check above still applies). */
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

/** Content Security Policy — report-only in dev, enforced in production. */
function cspHeader(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://translate.google.com https://tpc.googlesyndication.com https://www.google.com https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google-analytics.com",
    "frame-src https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://translate.google.com https://www.youtube.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // CSRF hardening for admin mutations: browsers always attach Origin on
  // cross-site POSTs. If it disagrees with Host, block. Non-browser clients
  // (no Origin) are unaffected — they cannot be CSRF'd.
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && pathname.startsWith("/api/v1/admin")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        if (new URL(origin).host !== host) {
          return new NextResponse(JSON.stringify({ ok: false, error: "Cross-origin request blocked" }), {
            status: 403,
            headers: { "content-type": "application/json" },
          });
        }
      } catch {
        return new NextResponse(JSON.stringify({ ok: false, error: "Invalid origin" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
    }
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;

  let valid = false;
  if (token) {
    try {
      await jwtVerify(token, sessionSecretKey());
      valid = true;
    } catch {
      valid = false;
    }
  }

  let res: NextResponse;
  if (!valid && !isPublicAdminPath(pathname) && !isPublicApiPath(pathname)) {
    // APIs answer with JSON, never with a login redirect.
    if (pathname.startsWith("/api/")) {
      res = new NextResponse(JSON.stringify({ ok: false, error: "Authentication required" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    } else {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      const next = `${pathname}${search}`;
      if (next !== "/admin") url.searchParams.set("next", next);
      res = NextResponse.redirect(url);
      if (token) res.cookies.delete(SESSION_COOKIE);
    }
  } else {
    res = NextResponse.next();
  }

  // Security headers on all responses
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // CSP: report-only in dev to avoid breaking hot-reload; enforced in prod
  const csp = cspHeader();
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Content-Security-Policy", csp);
  } else {
    res.headers.set("Content-Security-Policy-Report-Only", csp);
  }

  return res;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/v1/admin/:path*"],
};
