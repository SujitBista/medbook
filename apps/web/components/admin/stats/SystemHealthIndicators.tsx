"use client";

import { useEffect, useState } from "react";
import { SystemHealth } from "@/app/admin/types";

interface SystemHealthIndicatorsProps {
  onError?: (error: string) => void;
}

export function SystemHealthIndicators({
  onError,
}: SystemHealthIndicatorsProps) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/health", {
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        let errorMessage = "Failed to fetch system health";
        try {
          const data = await response.json();
          errorMessage = data.error?.message || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setHealth(data.health);
    } catch (err) {
      console.error("[SystemHealthIndicators] Error fetching health:", err);
      if (onError) {
        onError(
          err instanceof Error ? err.message : "Failed to fetch system health"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-gray-500">Loading system health...</p>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-lg bg-red-50 p-6 shadow">
        <p className="text-red-600">Unable to fetch system health</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "connected":
      case "configured":
        return "text-green-600 bg-green-100";
      case "degraded":
      case "not_configured":
        return "text-yellow-600 bg-yellow-100";
      case "unhealthy":
      case "disconnected":
      case "unknown":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (healthy: boolean) => {
    return healthy ? "✓" : "✗";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">System Health</h2>
        <button
          onClick={fetchHealth}
          className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        {/* Overall Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Overall Status
            </h3>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(health.status)}`}
            >
              {health.status.toUpperCase()}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Environment:{" "}
            <span className="font-medium">{health.environment}</span>
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Last updated: {new Date(health.timestamp).toLocaleString()}
          </p>
        </div>

        {/* Service Status */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Database Status */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Database</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Connection status: {health.database.status}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${getStatusColor(health.database.status)}`}
              >
                {getStatusIcon(health.database.healthy)}
              </div>
            </div>
          </div>

          {/* Email Status */}
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-gray-900">Email Service</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Status: {health.email.status.replace("_", " ")}
                </p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ${getStatusColor(health.email.status)}`}
              >
                {getStatusIcon(health.email.healthy)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
