import { SystemStats } from "@/app/admin/types";

interface SystemStatsCardsProps {
  stats: SystemStats;
}

export function SystemStatsCards({ stats }: SystemStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {stats.totalUsers}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Patients</h3>
        <p className="mt-2 text-3xl font-bold text-blue-600">
          {stats.usersByRole.PATIENT}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Doctors</h3>
        <p className="mt-2 text-3xl font-bold text-green-600">
          {stats.usersByRole.DOCTOR}
        </p>
      </div>
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Admins</h3>
        <p className="mt-2 text-3xl font-bold text-purple-600">
          {stats.usersByRole.ADMIN}
        </p>
      </div>
    </div>
  );
}
