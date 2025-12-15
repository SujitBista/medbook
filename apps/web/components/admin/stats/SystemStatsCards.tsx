import { SystemStats } from "@/app/admin/types";

interface SystemStatsCardsProps {
  stats: SystemStats;
}

function formatGrowthTrend(change: number): { text: string; color: string } {
  if (change > 0) {
    return { text: `+${change.toFixed(1)}%`, color: "text-green-600" };
  } else if (change < 0) {
    return { text: `${change.toFixed(1)}%`, color: "text-red-600" };
  }
  return { text: "0%", color: "text-gray-500" };
}

export function SystemStatsCards({ stats }: SystemStatsCardsProps) {
  const totalUsersTrend = stats.growthTrends
    ? formatGrowthTrend(stats.growthTrends.totalUsersChange)
    : null;
  const patientTrend = stats.growthTrends
    ? formatGrowthTrend(stats.growthTrends.usersByRoleChange.PATIENT)
    : null;
  const doctorTrend = stats.growthTrends
    ? formatGrowthTrend(stats.growthTrends.usersByRoleChange.DOCTOR)
    : null;
  const adminTrend = stats.growthTrends
    ? formatGrowthTrend(stats.growthTrends.usersByRoleChange.ADMIN)
    : null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">User Statistics</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-gray-900">
              {stats.totalUsers}
            </p>
            {totalUsersTrend && (
              <span className={`text-sm font-medium ${totalUsersTrend.color}`}>
                {totalUsersTrend.text}
              </span>
            )}
          </div>
          {totalUsersTrend && (
            <p className="mt-1 text-xs text-gray-500">vs last month</p>
          )}
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Patients</h3>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-blue-600">
              {stats.usersByRole.PATIENT}
            </p>
            {patientTrend && (
              <span className={`text-sm font-medium ${patientTrend.color}`}>
                {patientTrend.text}
              </span>
            )}
          </div>
          {patientTrend && (
            <p className="mt-1 text-xs text-gray-500">vs last month</p>
          )}
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Doctors</h3>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-green-600">
              {stats.usersByRole.DOCTOR}
            </p>
            {doctorTrend && (
              <span className={`text-sm font-medium ${doctorTrend.color}`}>
                {doctorTrend.text}
              </span>
            )}
          </div>
          {doctorTrend && (
            <p className="mt-1 text-xs text-gray-500">vs last month</p>
          )}
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Admins</h3>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-3xl font-bold text-purple-600">
              {stats.usersByRole.ADMIN}
            </p>
            {adminTrend && (
              <span className={`text-sm font-medium ${adminTrend.color}`}>
                {adminTrend.text}
              </span>
            )}
          </div>
          {adminTrend && (
            <p className="mt-1 text-xs text-gray-500">vs last month</p>
          )}
        </div>
      </div>
    </div>
  );
}
