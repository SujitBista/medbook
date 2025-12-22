"use client";

import { useRouter } from "next/navigation";
import {
  UserPlusIcon,
  UserGroupIcon,
  CalendarIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: "add-doctor",
    label: "Add New Doctor",
    description: "Register a new doctor",
    icon: UserPlusIcon,
    href: "/admin?tab=doctors",
    color: "bg-blue-500 hover:bg-blue-600",
  },
  {
    id: "manage-users",
    label: "Manage Users",
    description: "View and manage all users",
    icon: UserGroupIcon,
    href: "/admin?tab=general",
    color: "bg-green-500 hover:bg-green-600",
  },
  {
    id: "view-appointments",
    label: "View Appointments",
    description: "See all appointments",
    icon: CalendarIcon,
    href: "/admin?tab=appointments",
    color: "bg-purple-500 hover:bg-purple-600",
  },
  {
    id: "settings",
    label: "System Settings",
    description: "Configure system settings",
    icon: Cog6ToothIcon,
    href: "/admin?tab=settings",
    color: "bg-gray-500 hover:bg-gray-600",
  },
];

export function QuickActions() {
  const router = useRouter();

  const handleAction = (href: string) => {
    router.push(href);
    // Close mobile sidebar if open
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      // Sidebar will close automatically on navigation
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">
        Quick Actions
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action.href)}
              className="group flex flex-col items-start rounded-lg border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-md"
            >
              <div
                className={`mb-3 rounded-lg p-2 ${action.color} text-white transition-colors`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-primary-600">
                {action.label}
              </h4>
              <p className="mt-1 text-xs text-gray-500">{action.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
