"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { UserRole } from "@medbook/types";
import { hasAnyRole } from "@/lib/roles";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Required roles - user must have at least one of these roles
   * If not provided, route is accessible to any authenticated user
   */
  requiredRoles?: UserRole[];
}

/**
 * Client-side protected route wrapper
 * Shows loading state while checking authentication
 * Redirects to login if not authenticated
 */
function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (status === "unauthenticated") {
      // Preserve both pathname and query parameters in callbackUrl
      const fullPath =
        pathname +
        (searchParams.toString() ? `?${searchParams.toString()}` : "");
      const loginUrl = `/login${fullPath ? `?callbackUrl=${encodeURIComponent(fullPath)}` : ""}`;
      router.push(loginUrl);
    } else if (
      status === "authenticated" &&
      requiredRoles &&
      requiredRoles.length > 0 &&
      !hasAnyRole(session?.user?.role, requiredRoles)
    ) {
      // Redirect if user doesn't have required role
      router.push("/");
    }
  }, [status, session, router, requiredRoles, pathname, searchParams]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect via useEffect
  }

  if (
    requiredRoles &&
    requiredRoles.length > 0 &&
    !hasAnyRole(session?.user?.role, requiredRoles)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export { ProtectedRoute };
