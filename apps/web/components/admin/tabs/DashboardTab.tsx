"use client";

import { SystemStats, AppointmentStats } from "@/app/admin/types";
import { SystemStatsCards } from "../stats/SystemStatsCards";
import { AppointmentStatsCards } from "../stats/AppointmentStatsCards";
import { QuickActions } from "../widgets/QuickActions";
import { RecentActivity } from "../widgets/RecentActivity";
import { SystemHealthIndicators } from "../stats/SystemHealthIndicators";
import { AppointmentTrendsChart } from "../charts/AppointmentTrendsChart";
import { UserGrowthChart } from "../charts/UserGrowthChart";

interface DashboardTabProps {
  stats: SystemStats | null;
  appointmentStats: AppointmentStats | null;
  appointmentStatsLoading: boolean;
}

export function DashboardTab({
  stats,
  appointmentStats,
  appointmentStatsLoading,
}: DashboardTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of system statistics and recent activity
        </p>
      </div>

      {/* System Health Indicators */}
      <SystemHealthIndicators />

      {/* Key Statistics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* User Statistics */}
        {stats && (
          <div>
            <SystemStatsCards stats={stats} />
          </div>
        )}

        {/* Appointment Statistics */}
        {appointmentStats && (
          <div>
            <AppointmentStatsCards
              stats={appointmentStats}
              loading={appointmentStatsLoading}
            />
          </div>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AppointmentTrendsChart data={[]} />
        <UserGrowthChart data={[]} />
      </div>

      {/* Quick Actions and Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <QuickActions />
        <RecentActivity />
      </div>
    </div>
  );
}
