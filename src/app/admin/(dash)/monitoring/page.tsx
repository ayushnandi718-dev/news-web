"use client";

import { useEffect, useState } from "react";
import { 
  ApiAlert, 
  ApiHealthStatus, 
  getApiHealthSummary 
} from "@/lib/monitoring";

export default function MonitoringPage() {
  const [healthStatus, setHealthStatus] = useState<ApiHealthStatus[]>([]);
  const [alerts, setAlerts] = useState<ApiAlert[]>([]);
  const [summary, setSummary] = useState<ReturnType<typeof getApiHealthSummary> | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchMonitoringData() {
    try {
      const response = await fetch("/api/v1/admin/monitoring");
      const data = await response.json();
      if (data.ok) {
        setHealthStatus(data.data.health);
        setAlerts(data.data.alerts);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch monitoring data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function resolveAlert(alertId: string) {
    setResolving(alertId);
    try {
      const response = await fetch("/api/v1/admin/monitoring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      if (response.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (error) {
      console.error("Failed to resolve alert:", error);
    } finally {
      setResolving(null);
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "healthy": return "text-green-600";
      case "degraded": return "text-yellow-600";
      case "down": return "text-red-600";
      default: return "text-gray-600";
    }
  }

  function getSeverityColor(severity: string): string {
    switch (severity) {
      case "info": return "bg-blue-100 text-blue-800";
      case "warning": return "bg-yellow-100 text-yellow-800";
      case "error": return "bg-red-100 text-red-800";
      case "critical": return "bg-red-600 text-white";
      default: return "bg-gray-100 text-gray-800";
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">API Monitoring</h1>
        <div className="text-gray-600">Loading monitoring data...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">API Monitoring Dashboard</h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Providers</div>
            <div className="text-2xl font-bold">{summary.totalProviders}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Healthy</div>
            <div className="text-2xl font-bold text-green-600">{summary.healthy}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Issues</div>
            <div className="text-2xl font-bold text-red-600">
              {summary.degraded + summary.down}
            </div>
          </div>
        </div>
      )}

      {/* Health Status */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">API Health Status</h2>
        </div>
        <div className="p-4">
          {healthStatus.length === 0 ? (
            <div className="text-gray-600">No API health data available yet</div>
          ) : (
            <div className="space-y-3">
              {healthStatus.map((status) => (
                <div key={status.provider} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{status.provider}</div>
                    <div className="text-sm text-gray-600">
                      Last check: {new Date(status.lastCheck).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${getStatusColor(status.status)}`}>
                      {status.status.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Failures: {status.failureCount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Active Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Active Alerts ({alerts.length})</h2>
        </div>
        <div className="p-4">
          {alerts.length === 0 ? (
            <div className="text-green-600">No active alerts - All systems operational</div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-3 border rounded">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                        <span className="font-medium">{alert.provider}</span>
                      </div>
                      <div className="text-sm">{alert.message}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        {new Date(alert.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      disabled={resolving === alert.id}
                      className="ml-3 shrink-0 rounded border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 transition hover:border-green-600 hover:text-green-700 disabled:opacity-50"
                    >
                      {resolving === alert.id ? "Resolving…" : "Resolve"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* API Key Information */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 API Key Management Tips</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Monitor this dashboard regularly for API health status</li>
          <li>• "Degraded" status means 3+ consecutive failures</li>
          <li>• "Down" status means 5+ consecutive failures</li>
          <li>• Check console logs for detailed error messages</li>
          <li>• Consider setting up email/SMS alerts for critical failures</li>
          <li>• Market data refreshes every 2 minutes, weather every 1 hour</li>
        </ul>
      </div>
    </div>
  );
}
