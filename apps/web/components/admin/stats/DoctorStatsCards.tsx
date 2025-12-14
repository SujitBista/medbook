import { DoctorStats } from "@/app/admin/types";

interface DoctorStatsCardsProps {
  stats: DoctorStats;
}

export function DoctorStatsCards({ stats }: DoctorStatsCardsProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="text-sm font-medium text-gray-500">Total Doctors</h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {stats.totalDoctors}
        </p>
      </div>
      {Object.keys(stats.doctorsBySpecialization).length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Doctors by Specialization
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.doctorsBySpecialization).map(
              ([specialization, count]) => (
                <div
                  key={specialization}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700">
                    {specialization || "No Specialization"}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {count}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
