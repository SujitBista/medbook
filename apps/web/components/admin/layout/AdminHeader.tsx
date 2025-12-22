"use client";

import { useState } from "react";
import { Bars3Icon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { UserProfileDropdown } from "@/components/layout/UserProfileDropdown";

interface AdminHeaderProps {
  onMenuToggle: () => void;
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement global search functionality
    console.log("[AdminHeader] Search:", searchQuery);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
      {/* Left: Menu toggle and logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden"
          aria-label="Toggle menu"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <h1 className="hidden text-lg font-semibold text-gray-900 lg:block">
          Admin Dashboard
        </h1>
      </div>

      {/* Center: Search bar */}
      <form
        onSubmit={handleSearch}
        className="hidden flex-1 max-w-md items-center gap-2 md:flex"
      >
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users, doctors, appointments..."
            className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
      </form>

      {/* Right: Notifications and user profile */}
      <div className="flex items-center gap-4">
        {/* Notifications placeholder - can be implemented later */}
        <button
          className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Notifications"
          title="Notifications (coming soon)"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </button>

        <UserProfileDropdown />
      </div>
    </header>
  );
}
