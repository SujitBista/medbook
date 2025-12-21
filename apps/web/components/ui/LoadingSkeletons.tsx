"use client";

import { Skeleton } from "@medbook/ui";

/**
 * Skeleton loader for appointment cards
 */
export function AppointmentCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
          <Skeleton variant="text" width="50%" height={16} />
        </div>
        <Skeleton variant="rectangular" width={80} height={32} />
      </div>
    </div>
  );
}

/**
 * Skeleton loader for doctor cards
 */
export function DoctorCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex gap-4">
        <Skeleton variant="circular" width={80} height={80} />
        <div className="flex-1 space-y-3">
          <Skeleton variant="text" width="70%" height={24} />
          <Skeleton variant="text" width="50%" height={16} />
          <Skeleton variant="text" width="80%" height={16} />
          <Skeleton variant="text" width="60%" height={16} />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for table rows
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" width="80%" height={16} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton loader for form fields
 */
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton variant="text" width="30%" height={16} />
      <Skeleton variant="rectangular" width="100%" height={40} />
    </div>
  );
}

/**
 * Skeleton loader for dashboard stats cards
 */
export function StatsCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <Skeleton variant="text" width="40%" height={16} className="mb-2" />
      <Skeleton variant="text" width="60%" height={32} />
    </div>
  );
}
