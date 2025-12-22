"use client";

import { ClockIcon } from "@heroicons/react/24/outline";

interface ActivityItem {
  id: string;
  type: "user" | "appointment" | "doctor";
  action: string;
  description: string;
  timestamp: string;
  icon: typeof ClockIcon;
  color: string;
}

// Mock data - in real implementation, this would come from an API
const mockActivities: ActivityItem[] = [
  {
    id: "1",
    type: "user",
    action: "New user registered",
    description: "john.doe@example.com registered as PATIENT",
    timestamp: "2 minutes ago",
    icon: ClockIcon,
    color: "text-blue-600",
  },
  {
    id: "2",
    type: "appointment",
    action: "Appointment confirmed",
    description: "Appointment #1234 confirmed for Dr. Smith",
    timestamp: "15 minutes ago",
    icon: ClockIcon,
    color: "text-green-600",
  },
  {
    id: "3",
    type: "doctor",
    action: "Doctor profile updated",
    description: "Dr. Johnson's profile was updated",
    timestamp: "1 hour ago",
    icon: ClockIcon,
    color: "text-purple-600",
  },
  {
    id: "4",
    type: "appointment",
    action: "Appointment cancelled",
    description: "Appointment #1230 was cancelled",
    timestamp: "2 hours ago",
    icon: ClockIcon,
    color: "text-red-600",
  },
];

export function RecentActivity() {
  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Recent Activity
      </h3>
      <div className="space-y-4">
        {mockActivities.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No recent activity
          </p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            {/* Activity items */}
            <div className="space-y-6">
              {mockActivities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ${activity.color} border-2 border-gray-200`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-6">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.action}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {activity.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
