"use client";

import { useEffect, useState } from "react";
import { SystemHealth } from "@/app/admin/types";

interface SettingsTabProps {
  onError?: (error: string) => void;
}

export function SettingsTab({ onError }: SettingsTabProps) {
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
        throw new Error("Failed to fetch system health");
      }

      const data = await response.json();
      setHealth(data.health);
    } catch (err) {
      console.error("[SettingsTab] Error fetching health:", err);
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
      <div className="flex items-center justify-center rounded-lg bg-white p-12 shadow">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="mt-2 text-gray-600">
          View and manage system configuration
        </p>
      </div>

      {/* System Configuration */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          System Configuration
        </h3>

        {health && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Environment
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {health.environment}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  System Status
                </label>
                <p className="mt-1 text-sm text-gray-900 capitalize">
                  {health.status}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-900">
                Service Status
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Database
                  </label>
                  <div className="mt-1 flex items-center">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        health.database.healthy ? "bg-green-500" : "bg-red-500"
                      }`}
                    ></span>
                    <span className="ml-2 text-sm text-gray-900 capitalize">
                      {health.database.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Service
                  </label>
                  <div className="mt-1 flex items-center">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        health.email.healthy ? "bg-green-500" : "bg-yellow-500"
                      }`}
                    ></span>
                    <span className="ml-2 text-sm text-gray-900 capitalize">
                      {health.email.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700">
                Last Updated
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(health.timestamp).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Future Settings Sections */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Email Configuration
        </h3>
        <p className="text-sm text-gray-600">
          Email service configuration is managed through environment variables.
          In production, ensure{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
            RESEND_API_KEY
          </code>{" "}
          is set.
        </p>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Feature Flags
        </h3>
        <p className="text-sm text-gray-600">
          Feature flags will be available in a future update.
        </p>
      </div>
    </div>
  );
}
