"use client";

import { useMemo } from "react";
import { Appointment, AppointmentStatus } from "@medbook/types";
import { Card } from "@medbook/ui";

interface AppointmentStatisticsProps {
  appointments: Appointment[];
  role?: "PATIENT" | "DOCTOR";
}

export function AppointmentStatistics({
  appointments,
  role = "PATIENT",
}: AppointmentStatisticsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // This week (start of week to end of week)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // This month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Last month (for comparison)
    const startOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1
    );
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    endOfLastMonth.setHours(23, 59, 59, 999);

    const total = appointments.length;
    const byStatus = appointments.reduce(
      (acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      },
      {} as Record<AppointmentStatus, number>
    );

    const upcoming = appointments.filter(
      (apt) => new Date(apt.startTime) > now
    ).length;
    const past = appointments.filter(
      (apt) => new Date(apt.startTime) <= now
    ).length;

    const todayCount = appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= today && aptDate < tomorrow;
    }).length;

    const thisWeekCount = appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfWeek && aptDate <= endOfWeek;
    }).length;

    const thisMonthCount = appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfMonth && aptDate <= endOfMonth;
    }).length;

    const lastMonthCount = appointments.filter((apt) => {
      const aptDate = new Date(apt.startTime);
      return aptDate >= startOfLastMonth && aptDate <= endOfLastMonth;
    }).length;

    const monthChange =
      lastMonthCount > 0
        ? ((thisMonthCount - lastMonthCount) / lastMonthCount) * 100
        : thisMonthCount > 0
          ? 100
          : 0;

    // Calculate average time between appointments
    const sortedAppointments = [...appointments].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    let totalDaysBetween = 0;
    let intervals = 0;
    for (let i = 1; i < sortedAppointments.length; i++) {
      const daysBetween =
        (new Date(sortedAppointments[i].startTime).getTime() -
          new Date(sortedAppointments[i - 1].startTime).getTime()) /
        (1000 * 60 * 60 * 24);
      totalDaysBetween += daysBetween;
      intervals++;
    }
    const avgDaysBetween =
      intervals > 0 ? Math.round(totalDaysBetween / intervals) : 0;

    // Most common status
    const statusCounts = Object.entries(byStatus).map(([status, count]) => ({
      status,
      count,
    }));
    const mostCommonStatus = statusCounts.reduce(
      (max, current) => (current.count > max.count ? current : max),
      { status: "N/A", count: 0 }
    );

    return {
      total,
      upcoming,
      past,
      today: todayCount,
      thisWeek: thisWeekCount,
      thisMonth: thisMonthCount,
      monthChange,
      byStatus: {
        pending: byStatus[AppointmentStatus.PENDING] || 0,
        confirmed: byStatus[AppointmentStatus.CONFIRMED] || 0,
        completed: byStatus[AppointmentStatus.COMPLETED] || 0,
        cancelled: byStatus[AppointmentStatus.CANCELLED] || 0,
      },
      avgDaysBetween,
      mostCommonStatus: mostCommonStatus.status,
    };
  }, [appointments]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        Appointment Statistics
      </h2>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Upcoming</p>
            <p className="text-3xl font-bold text-blue-600">{stats.upcoming}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Today</p>
            <p className="text-3xl font-bold text-indigo-600">{stats.today}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">This Week</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats.thisWeek}
            </p>
          </div>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-600">
              {stats.byStatus.pending}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Confirmed</p>
            <p className="text-3xl font-bold text-blue-600">
              {stats.byStatus.confirmed}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-3xl font-bold text-green-600">
              {stats.byStatus.completed}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Cancelled</p>
            <p className="text-3xl font-bold text-red-600">
              {stats.byStatus.cancelled}
            </p>
          </div>
        </Card>
      </div>

      {/* Insights & Analytics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">This Month</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-gray-900">
                {stats.thisMonth}
              </p>
              {stats.monthChange !== 0 && (
                <span
                  className={`text-sm font-medium ${
                    stats.monthChange > 0
                      ? "text-green-600"
                      : stats.monthChange < 0
                        ? "text-red-600"
                        : "text-gray-500"
                  }`}
                >
                  {stats.monthChange > 0 ? "+" : ""}
                  {stats.monthChange.toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">vs last month</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Past Appointments</p>
            <p className="text-3xl font-bold text-gray-600">{stats.past}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Avg. Days Between</p>
            <p className="text-3xl font-bold text-purple-600">
              {stats.avgDaysBetween > 0 ? stats.avgDaysBetween : "N/A"}
            </p>
            {stats.avgDaysBetween > 0 && (
              <p className="text-xs text-gray-500 mt-1">appointments</p>
            )}
          </div>
        </Card>
      </div>

      {/* Trends */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Insights & Trends
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Most Common Status</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.mostCommonStatus}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.total > 0
                  ? (
                      (stats.byStatus.completed /
                        (stats.total - stats.byStatus.cancelled)) *
                      100
                    ).toFixed(1)
                  : "0"}
                %
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Cancellation Rate</span>
              <span className="text-sm font-medium text-gray-900">
                {stats.total > 0
                  ? ((stats.byStatus.cancelled / stats.total) * 100).toFixed(1)
                  : "0"}
                %
              </span>
            </div>
            {stats.monthChange !== 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monthly Trend</span>
                <span
                  className={`text-sm font-medium ${
                    stats.monthChange > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {stats.monthChange > 0 ? "↑" : "↓"}{" "}
                  {Math.abs(stats.monthChange).toFixed(1)}% vs last month
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
