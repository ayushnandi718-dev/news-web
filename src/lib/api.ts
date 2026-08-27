import { AuthError } from "./auth";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json({ ok: true, data }, init);
}

export function apiError(message: string, status = 400, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof AuthError) return apiError(err.message, err.status);
  if (err && typeof err === "object" && "issues" in err) {
    const issues = (err as { issues: Array<{ path: unknown[]; message: string }> }).issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return apiError(`Validation failed: ${issues}`, 422);
  }
  Sentry.captureException(err);
  console.error("[api] unhandled error:", err);
  return apiError("Internal server error", 500);
}
