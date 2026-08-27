import { ok, handleError, apiError } from "@/lib/api";
import {
  getActiveAlerts,
  getAllHealthStatus,
  getApiHealthSummary,
  resolveAlert
} from "@/lib/monitoring";
import { requirePerm } from "@/lib/auth";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/monitoring
 * Get API health status and alerts (newsroom staff only)
 */
export async function GET(request: NextRequest) {
  try {
    await requirePerm("dashboard.view");
    const { searchParams } = new URL(request.url);
    const summary = searchParams.get("summary") === "true";

    if (summary) {
      return ok(getApiHealthSummary());
    }

    return ok({
      health: getAllHealthStatus(),
      alerts: getActiveAlerts(),
      summary: getApiHealthSummary(),
    });
  } catch (err) {
    return handleError(err);
  }
}

/**
 * POST /api/v1/admin/monitoring
 * Resolve an alert
 */
export async function POST(request: NextRequest) {
  try {
    await requirePerm("dashboard.view");
    let body: { alertId?: string };
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }
    const { alertId } = body;

    if (!alertId || typeof alertId !== "string") {
      return apiError("alertId is required", 400);
    }

    resolveAlert(alertId);
    return ok({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
