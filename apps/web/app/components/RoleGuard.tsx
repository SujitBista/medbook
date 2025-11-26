"use client";

import { useSession } from "next-auth/react";
import { UserRole } from "@medbook/types";
import { hasAnyRole } from "@/lib/roles";

interface RoleGuardProps {
  children: React.ReactNode;
  /**
   * Required roles - user must have at least one of these roles
   * If not provided, component will render children for any authenticated user
   */
  allowedRoles?: UserRole[];
  /**
   * Fallback content to show when user doesn't have required role
   * If not provided, nothing will be rendered
   */
  fallback?: React.ReactNode;
  /**
   * Show fallback even when not authenticated (default: false)
   */
  showFallbackWhenUnauthenticated?: boolean;
}

/**
 * RoleGuard component
 * Conditionally renders children based on user's role
 * Useful for showing/hiding UI elements based on user permissions
 *
 * @example
 * // Show only to admins
 * <RoleGuard allowedRoles={[UserRole.ADMIN]}>
 *   <AdminButton />
 * </RoleGuard>
 *
 * @example
 * // Show to admins or doctors
 * <RoleGuard allowedRoles={[UserRole.ADMIN, UserRole.DOCTOR]}>
 *   <DoctorTools />
 * </RoleGuard>
 *
 * @example
 * // Show to authenticated users, hide when not authenticated
 * <RoleGuard>
 *   <UserMenu />
 * </RoleGuard>
 *
 * @example
 * // Show custom message when user doesn't have access
 * <RoleGuard
 *   allowedRoles={[UserRole.ADMIN]}
 *   fallback={<p>Admin access required</p>}
 * >
 *   <AdminPanel />
 * </RoleGuard>
 */
export function RoleGuard({
  children,
  allowedRoles,
  fallback = null,
  showFallbackWhenUnauthenticated = false,
}: RoleGuardProps) {
  const { data: session, status } = useSession();

  // Show loading state while checking authentication
  if (status === "loading") {
    return null;
  }

  // If not authenticated
  if (!session) {
    if (showFallbackWhenUnauthenticated) {
      return <>{fallback}</>;
    }
    return null;
  }

  // If no roles specified, show to all authenticated users
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  // Check if user has required role
  const userRole = session.user?.role;
  if (!userRole || !hasAnyRole(userRole, allowedRoles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
