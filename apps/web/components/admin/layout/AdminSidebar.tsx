"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  CalendarIcon,
  ClockIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface AdminSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: typeof HomeIcon;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/admin?tab=dashboard",
    icon: HomeIcon,
  },
  { id: "users", label: "Users", href: "/admin?tab=general", icon: UsersIcon },
  {
    id: "doctors",
    label: "Doctors",
    href: "/admin?tab=doctors",
    icon: UserGroupIcon,
  },
  {
    id: "appointments",
    label: "Appointments",
    href: "/admin?tab=appointments",
    icon: CalendarIcon,
  },
  {
    id: "schedule-management",
    label: "Schedule Management",
    href: "/admin?tab=schedule-management",
    icon: ClockIcon,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin?tab=settings",
    icon: Cog6ToothIcon,
  },
];

export function AdminSidebar({ isOpen, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const currentTab = searchParams?.get("tab") || null;

  const isActive = (item: NavItem) => {
    if (item.id === "dashboard") {
      return currentTab === null || currentTab === "dashboard";
    }
    return currentTab === item.id;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
            <h2 className="text-xl font-bold text-gray-900">MedBook Admin</h2>
            <button
              onClick={onToggle}
              className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
              aria-label="Close sidebar"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    // Close sidebar on mobile when navigating
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                  className={`
                    group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                    ${
                      active
                        ? "bg-primary-50 text-primary-700"
                        : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                    }
                  `}
                >
                  <Icon
                    className={`
                      h-5 w-5 flex-shrink-0
                      ${
                        active
                          ? "text-primary-600"
                          : "text-gray-400 group-hover:text-gray-500"
                      }
                    `}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <p className="text-xs text-gray-500">MedBook v1.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
