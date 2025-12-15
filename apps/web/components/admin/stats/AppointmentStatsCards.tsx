import { AppointmentStats } from "@/app/admin/types";

interface AppointmentStatsCardsProps {
  stats: AppointmentStats;
  loading?: boolean;
}

function formatGrowthTrend(change: number): { text: string; color: string } {
  if (change > 0) {
    return { text: `+${change.toFixed(1)}%`, color: "text-green-600" };
  } else if (change < 0) {
    return { text: `${change.toFixed(1)}%`, color: "text-red-600" };
  }
  return { text: "0%", color: "text-gray-500" };
}

export function AppointmentStatsCards({
  stats,
  loading,
}: AppointmentStatsCardsProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-gray-500">Loading appointment statistics...</p>
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
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Total Appointments
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Upcoming</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {stats.upcoming}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Today</h3>
          <p className="mt-2 text-3xl font-bold text-indigo-600">
            {stats.today}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">This Week</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            {stats.thisWeek}
          </p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Pending</h3>
          <p className="mt-2 text-3xl font-bold text-yellow-600">
            {stats.byStatus.PENDING}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Confirmed</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {stats.byStatus.CONFIRMED}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Completed</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {stats.byStatus.COMPLETED}
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Cancelled</h3>
          <p className="mt-2 text-3xl font-bold text-red-600">
            {stats.byStatus.CANCELLED}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Recent Activity
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Created Today</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {stats.recentActivity.createdToday}
            </p>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-gray-500">Created This Week</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.recentActivity.createdThisWeek}
                </p>
              </div>
              {weekTrend && (
                <span className={`text-sm font-medium ${weekTrend.color}`}>
                  {weekTrend.text}
                </span>
              )}
            </div>
            {weekTrend && (
              <p className="mt-1 text-xs text-gray-500">vs last week</p>
            )}
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm text-gray-500">Created This Month</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stats.recentActivity.createdThisMonth}
                </p>
              </div>
              {monthTrend && (
                <span className={`text-sm font-medium ${monthTrend.color}`}>
                  {monthTrend.text}
                </span>
              )}
            </div>
            {monthTrend && (
              <p className="mt-1 text-xs text-gray-500">vs last month</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
