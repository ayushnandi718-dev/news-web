/**
 * API Monitoring and Alerting System
 * Tracks API failures, rate limits, and provides alerts for API issues
 */

export type AlertSeverity = "info" | "warning" | "error" | "critical";

export interface ApiAlert {
  id: string;
  provider: string;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface ApiHealthStatus {
  provider: string;
  status: "healthy" | "degraded" | "down";
  lastSuccess: string;
  lastFailure?: string;
  failureCount: number;
  lastCheck: string;
  rateLimitInfo?: {
    remaining: number;
    reset: string;
  };
}

const globalForMonitoring = globalThis as unknown as {
  apiAlerts?: ApiAlert[];
  apiHealth?: Map<string, ApiHealthStatus>;
};

function getAlerts(): ApiAlert[] {
  if (!globalForMonitoring.apiAlerts) {
    globalForMonitoring.apiAlerts = [];
  }
  return globalForMonitoring.apiAlerts;
}

function getHealthStatus(): Map<string, ApiHealthStatus> {
  if (!globalForMonitoring.apiHealth) {
    globalForMonitoring.apiHealth = new Map();
  }
  return globalForMonitoring.apiHealth;
}

/**
 * Log an API alert for monitoring
 */
export function logApiAlert(
  provider: string,
  severity: AlertSeverity,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const alerts = getAlerts();
  const alert: ApiAlert = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    provider,
    severity,
    message,
    timestamp: new Date().toISOString(),
    resolved: false,
    metadata,
  };
  
  alerts.unshift(alert);
  
  // Keep only last 100 alerts
  if (alerts.length > 100) {
    alerts.pop();
  }
  
  // Log to console for immediate visibility
  const severityEmoji = {
    info: "ℹ️",
    warning: "⚠️",
    error: "❌",
    critical: "🚨",
  };
  console.log(`${severityEmoji[severity]} [${provider.toUpperCase()}] ${message}`);
  
  // For critical alerts, you could add email/SMS notifications here
  if (severity === "critical") {
    console.error(`🚨 CRITICAL ALERT: ${provider} - ${message}`);
  }
}

/**
 * Update API health status
 */
export function updateApiHealth(
  provider: string,
  success: boolean,
  rateLimitInfo?: { remaining: number; reset: string }
): void {
  const health = getHealthStatus();
  const now = new Date().toISOString();
  
  let status = health.get(provider);
  if (!status) {
    status = {
      provider,
      status: "healthy",
      lastSuccess: now,
      failureCount: 0,
      lastCheck: now,
    };
  }
  
  status.lastCheck = now;
  status.rateLimitInfo = rateLimitInfo;
  
  if (success) {
    status.status = "healthy";
    status.lastSuccess = now;
    status.failureCount = 0;
  } else {
    status.lastFailure = now;
    status.failureCount++;
    
    // Determine status based on failure count
    if (status.failureCount >= 5) {
      status.status = "down";
      logApiAlert(provider, "critical", `Provider is down after ${status.failureCount} consecutive failures`);
    } else if (status.failureCount >= 3) {
      status.status = "degraded";
      logApiAlert(provider, "error", `Provider degraded after ${status.failureCount} failures`);
    } else {
      logApiAlert(provider, "warning", `Provider failure #${status.failureCount}`);
    }
  }
  
  health.set(provider, status);
}

/**
 * Get all current alerts
 */
export function getActiveAlerts(): ApiAlert[] {
  return getAlerts().filter(a => !a.resolved);
}

/**
 * Get all health statuses
 */
export function getAllHealthStatus(): ApiHealthStatus[] {
  return Array.from(getHealthStatus().values());
}

/**
 * Resolve an alert
 */
export function resolveAlert(alertId: string): void {
  const alerts = getAlerts();
  const alert = alerts.find(a => a.id === alertId);
  if (alert) {
    alert.resolved = true;
    alert.resolvedAt = new Date().toISOString();
  }
}

/**
 * Check if API key needs attention (expiration, low rate limit, etc.)
 */
export function checkApiKeyHealth(
  provider: string,
  rateLimitInfo?: { remaining: number; reset: string; limit: number }
): void {
  if (!rateLimitInfo) return;
  
  const usagePercent = ((rateLimitInfo.limit - rateLimitInfo.remaining) / rateLimitInfo.limit) * 100;
  
  if (usagePercent >= 90) {
    logApiAlert(provider, "critical", `API rate limit nearly exhausted: ${usagePercent.toFixed(1)}% used`, {
      remaining: rateLimitInfo.remaining,
      limit: rateLimitInfo.limit,
      reset: rateLimitInfo.reset,
    });
  } else if (usagePercent >= 75) {
    logApiAlert(provider, "warning", `API rate limit usage high: ${usagePercent.toFixed(1)}% used`, {
      remaining: rateLimitInfo.remaining,
      limit: rateLimitInfo.limit,
      reset: rateLimitInfo.reset,
    });
  }
}

/**
 * Get a summary of all API health for dashboard
 */
export function getApiHealthSummary(): {
  totalProviders: number;
  healthy: number;
  degraded: number;
  down: number;
  criticalAlerts: number;
  warningAlerts: number;
} {
  const healthStatuses = getAllHealthStatus();
  const activeAlerts = getActiveAlerts();
  
  return {
    totalProviders: healthStatuses.length,
    healthy: healthStatuses.filter(h => h.status === "healthy").length,
    degraded: healthStatuses.filter(h => h.status === "degraded").length,
    down: healthStatuses.filter(h => h.status === "down").length,
    criticalAlerts: activeAlerts.filter(a => a.severity === "critical").length,
    warningAlerts: activeAlerts.filter(a => a.severity === "warning").length,
  };
}
