"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { AuthStatus } from "./AuthStatus";
import { UserProfileDropdown } from "@/components/layout/UserProfileDropdown";

/**
 * Header component for homepage
 * Handles client-side session checking for profile dropdown
 */
export function HomeHeader() {
  const { data: session } = useSession();

  return (
    <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/">
          <h1 className="text-2xl font-bold text-primary-600">MedBook</h1>
        </Link>
        {session?.user?.role === "PATIENT" ? (
          <UserProfileDropdown />
        ) : (
          <AuthStatus />
        )}
      </div>
    </header>
  );
}
