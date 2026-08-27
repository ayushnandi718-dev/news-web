import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

interface HealthStatus {
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  uptime: number;
  checks: {
    database: "ok" | "error";
    scheduler: "ok" | "error";
  };
}

export async function GET(): Promise<NextResponse> {
  const start = Date.now();
  const checks: HealthStatus["checks"] = { database: "ok", scheduler: "ok" };

  // DB check
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    checks.database = "error";
  }

  // Scheduler check (globalThis flag set by startScheduler)
  if (!(globalThis as Record<string, unknown>).__schedulerRunning) {
    checks.scheduler = "error";
  }

  const allOk = checks.database === "ok" && checks.scheduler === "ok";
  const status: HealthStatus["status"] = allOk ? "healthy" : checks.database === "error" ? "down" : "degraded";

  const body: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };

  return NextResponse.json(body, {
    status: allOk ? 200 : 503,
    headers: { "Cache-Control": "no-store, must-revalidate", "X-Response-Time": `${Date.now() - start}ms` },
  });
}
