import { SystemStats } from "@/app/admin/types";
import {
  UsersIcon,
  UserIcon,
  BriefcaseIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/solid";

interface SystemStatsCardsProps {
  stats: SystemStats;
}

function formatGrowthTrend(change: number): {
  text: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
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
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-gray-100 p-2 group-hover:bg-gray-200 transition-colors">
                  <UsersIcon className="h-5 w-5 text-gray-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-500">
                  Total Users
                </h3>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalUsers}
                </p>
                {totalUsersTrend && (
                  <div className="flex items-center gap-1">
                    {(() => {
                      const TrendIcon = totalUsersTrend.icon;
                      return (
                        <TrendIcon
                          className={`h-4 w-4 ${totalUsersTrend.color}`}
                        />
                      );
                    })()}
                    <span
                      className={`text-sm font-medium ${totalUsersTrend.color}`}
                    >
                      {totalUsersTrend.text}
                    </span>
                  </div>
                )}
              </div>
              {totalUsersTrend && (
                <p className="mt-2 text-xs text-gray-500">vs last month</p>
              )}
            </div>
          </div>
        </div>

        {/* Patients Card */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-100 p-2 group-hover:bg-blue-200 transition-colors">
                  <UserIcon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-500">Patients</h3>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <p className="text-3xl font-bold text-blue-600">
                  {stats.usersByRole.PATIENT}
                </p>
                {patientTrend && (
                  <div className="flex items-center gap-1">
                    {(() => {
                      const TrendIcon = patientTrend.icon;
                      return (
                        <TrendIcon
                          className={`h-4 w-4 ${patientTrend.color}`}
                        />
                      );
                    })()}
                    <span
                      className={`text-sm font-medium ${patientTrend.color}`}
                    >
                      {patientTrend.text}
                    </span>
                  </div>
                )}
              </div>
              {patientTrend && (
                <p className="mt-2 text-xs text-gray-500">vs last month</p>
              )}
            </div>
          </div>
        </div>

        {/* Doctors Card */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-green-100 p-2 group-hover:bg-green-200 transition-colors">
                  <BriefcaseIcon className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-500">Doctors</h3>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <p className="text-3xl font-bold text-green-600">
                  {stats.usersByRole.DOCTOR}
                </p>
                {doctorTrend && (
                  <div className="flex items-center gap-1">
                    {(() => {
                      const TrendIcon = doctorTrend.icon;
                      return (
                        <TrendIcon className={`h-4 w-4 ${doctorTrend.color}`} />
                      );
                    })()}
                    <span
                      className={`text-sm font-medium ${doctorTrend.color}`}
                    >
                      {doctorTrend.text}
                    </span>
                  </div>
                )}
              </div>
              {doctorTrend && (
                <p className="mt-2 text-xs text-gray-500">vs last month</p>
              )}
            </div>
          </div>
        </div>

        {/* Admins Card */}
        <div className="group relative overflow-hidden rounded-lg bg-white p-6 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-purple-100 p-2 group-hover:bg-purple-200 transition-colors">
                  <ShieldCheckIcon className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-sm font-medium text-gray-500">Admins</h3>
              </div>
              <div className="mt-4 flex items-baseline justify-between">
                <p className="text-3xl font-bold text-purple-600">
                  {stats.usersByRole.ADMIN}
                </p>
                {adminTrend && (
                  <div className="flex items-center gap-1">
                    {(() => {
                      const TrendIcon = adminTrend.icon;
                      return (
                        <TrendIcon className={`h-4 w-4 ${adminTrend.color}`} />
                      );
                    })()}
                    <span className={`text-sm font-medium ${adminTrend.color}`}>
                      {adminTrend.text}
                    </span>
                  </div>
                )}
              </div>
              {adminTrend && (
                <p className="mt-2 text-xs text-gray-500">vs last month</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
