"use client";

import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { Button } from "@medbook/ui";
import Link from "next/link";

export function AuthStatus() {
  const { data: session, status } = useSession();
  const isExpired =
    session?.expires && new Date(session.expires).getTime() <= Date.now();

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (status !== "authenticated" || !session || isExpired) {
    return (
      <div className="flex items-center gap-4">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
        <Link href="/register">
          <Button variant="primary" size="sm">
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{session.user.email}</span>
        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
          {session.user.role}
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          signOut({ callbackUrl: "/" }).catch((err) =>
            console.error("[AuthStatus] Logout failed:", err)
          )
        }
      >
        Sign Out
      </Button>
    </div>
  );
}
