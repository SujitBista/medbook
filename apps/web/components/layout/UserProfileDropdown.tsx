"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface UserProfileDropdownProps {
  className?: string;
}

/**
 * User profile dropdown menu component
 * Shows user email/role and provides logout functionality
 */
export function UserProfileDropdown({
  className = "",
}: UserProfileDropdownProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if user is on dashboard page (patient or doctor)
  const isOnDashboard =
    pathname === "/dashboard" || pathname === "/dashboard/patient";

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  if (!session?.user) {
    return null;
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const userInitial = session.user.email
    ? session.user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full bg-gray-100 p-2 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-medium text-white">
          {userInitial}
        </div>
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900">
            {session.user.email}
          </p>
          <p className="text-xs text-gray-500">{session.user.role}</p>
        </div>
        <svg
          className={`h-4 w-4 text-gray-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="py-1">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-900">
                {session.user.email}
              </p>
              <p className="text-xs text-gray-500 mt-1">{session.user.role}</p>
            </div>

            {/* Menu Items */}
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              View Profile
            </Link>

            {session.user.role === "PATIENT" && (
              <>
                {!isOnDashboard && (
                  <Link
                    href="/dashboard/patient"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  href="/appointments"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  My Appointments
                </Link>
              </>
            )}

            {session.user.role === "DOCTOR" && (
              <>
                <Link
                  href="/appointments"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  My Appointments
                </Link>
                <Link
                  href="/dashboard/doctor/availability"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Availability
                </Link>
              </>
            )}

            <div className="border-t border-gray-200 my-1"></div>

            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
