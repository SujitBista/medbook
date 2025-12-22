"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/24/outline";

interface BreadcrumbItem {
  label: string;
  href: string;
}

const tabLabels: Record<string, string> = {
  dashboard: "Dashboard",
  general: "Users",
  doctors: "Doctors",
  appointments: "Appointments",
  "schedule-management": "Schedule Management",
  settings: "Settings",
};

export function AdminBreadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab") || "dashboard";

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Admin", href: "/admin?tab=dashboard" },
  ];

  if (tab !== "dashboard") {
    breadcrumbs.push({
      label: tabLabels[tab] || tab,
      href: `/admin?tab=${tab}`,
    });
  }

  // Don't show breadcrumbs if only on dashboard
  if (breadcrumbs.length === 1) {
    return null;
  }

  return (
    <nav
      className="mb-4 flex items-center space-x-2 text-sm"
      aria-label="Breadcrumb"
    >
      <ol className="flex items-center space-x-2">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li key={crumb.href} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="mx-2 h-4 w-4 text-gray-400" />
              )}
              {isLast ? (
                <span className="font-medium text-gray-900">{crumb.label}</span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {index === 0 ? (
                    <div className="flex items-center gap-1">
                      <HomeIcon className="h-4 w-4" />
                      <span>{crumb.label}</span>
                    </div>
                  ) : (
                    crumb.label
                  )}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
