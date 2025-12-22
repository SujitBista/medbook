import { AppointmentStats } from "@/app/admin/types";
import {
  CalendarIcon,
  ClockIcon,
  CalendarDaysIcon,
  CalendarDaysIcon as WeekIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/solid";

interface AppointmentStatsCardsProps {
  stats: AppointmentStats;
  loading?: boolean;
}

function formatGrowthTrend(change: number): {
  text: string;
  color: string;
  icon: typeof ArrowTrendingUpIcon;
} {
  if (change > 0) {
    return {
      text: `+${change.toFixed(1)}%`,
      color: "text-green-600",
      icon: ArrowTrendingUpIcon,
    };
  } else if (change < 0) {
    return {
      text: `${change.toFixed(1)}%`,
      color: "text-red-600",
      icon: ArrowTrendingDownIcon,
    };
  }
  return { text: "0%", color: "text-gray-500", icon: ArrowTrendingUpIcon };
}

export function AppointmentStatsCards({
  stats,
  loading,
}: AppointmentStatsCardsProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary-600"></div>
          <p className="text-gray-500">Loading appointment statistics...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const monthTrend = stats.growthTrends
    ? formatGrowthTrend(stats.growthTrends.thisMonthChange)
    : null;
  const weekTrend = stats.growthTrends
    ? formatGrowthTrend(stats.growthTrends.thisWeekChange)
    : null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">
        Appointment Statistics
      </h2>

      {/* Main Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Appointments */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-gray-200 transition-colors">
              <CalendarIcon className="h-5 w-5 text-gray-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">
              Total Appointments
            </h3>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>

        {/* Upcoming */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2 group-hover:bg-blue-200 transition-colors">
              <ClockIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Upcoming</h3>
          </div>
          <p className="mt-4 text-3xl font-bold text-blue-600">
            {stats.upcoming}
          </p>
        </div>

        {/* Today */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-2 group-hover:bg-indigo-200 transition-colors">
              <CalendarDaysIcon className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Today</h3>
          </div>
          <p className="mt-4 text-3xl font-bold text-indigo-600">
            {stats.today}
          </p>
        </div>

        {/* This Week */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-2 group-hover:bg-purple-200 transition-colors">
              <WeekIcon className="h-5 w-5 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">This Week</h3>
          </div>
          <p className="mt-4 text-3xl font-bold text-purple-600">
            {stats.thisWeek}
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Pending */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-yellow-100 p-2 group-hover:bg-yellow-200 transition-colors">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Pending</h3>
          </div>
          <p className="mt-4 text-3xl font-bold text-yellow-600">
            {stats.byStatus.PENDING}
          </p>
        </div>

        {/* Confirmed */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2 group-hover:bg-blue-200 transition-colors">
              <CheckBadgeIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Confirmed</h3>
          </div>
          <p className="mt-4 text-3xl font-bold text-blue-600">
            {stats.byStatus.CONFIRMED}
          </p>
        </div>

        {/* Completed */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-green-100 p-2 group-hover:bg-green-200 transition-colors">
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          </div>
          <p className="mt-4 text-3xl font-bold text-green-600">
            {stats.byStatus.COMPLETED}
          </p>
        </div>

        {/* Cancelled */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-100 p-2 group-hover:bg-red-200 transition-colors">
              <XCircleIcon className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-500">Cancelled</h3>
          </div>
          <p className="mt-4 text-3xl font-bold text-red-600">
            {stats.byStatus.CANCELLED}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Activity
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Created Today</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {stats.recentActivity.createdToday}
            </p>
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-gray-500">Created This Week</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {stats.recentActivity.createdThisWeek}
                </p>
              </div>
              {weekTrend && (
                <div className="flex items-center gap-1">
                  {(() => {
                    const TrendIcon = weekTrend.icon;
                    return (
                      <TrendIcon className={`h-4 w-4 ${weekTrend.color}`} />
                    );
                  })()}
                  <span className={`text-sm font-medium ${weekTrend.color}`}>
                    {weekTrend.text}
                  </span>
                </div>
              )}
            </div>
            {weekTrend && (
              <p className="mt-2 text-xs text-gray-500">vs last week</p>
            )}
          </div>
          <div className="rounded-lg border border-gray-100 p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-gray-500">Created This Month</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {stats.recentActivity.createdThisMonth}
                </p>
              </div>
              {monthTrend && (
                <div className="flex items-center gap-1">
                  {(() => {
                    const TrendIcon = monthTrend.icon;
                    return (
                      <TrendIcon className={`h-4 w-4 ${monthTrend.color}`} />
                    );
                  })()}
                  <span className={`text-sm font-medium ${monthTrend.color}`}>
                    {monthTrend.text}
                  </span>
                </div>
              )}
            </div>
            {monthTrend && (
              <p className="mt-2 text-xs text-gray-500">vs last month</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
