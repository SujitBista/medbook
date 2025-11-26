/**
 * Role checking utilities for frontend
 * Helper functions for checking user roles and permissions
 */

import { UserRole } from "@medbook/types";

/**
 * Check if a user has a specific role
 * @param userRole The user's role (string from session)
 * @param requiredRole The required role
 * @returns True if user has the required role
 */
export function hasRole(
  userRole: string | undefined,
  requiredRole: UserRole
): boolean {
  if (!userRole) return false;
  return userRole === requiredRole;
}

/**
 * Check if a user has one of the required roles
 * @param userRole The user's role (string from session)
 * @param requiredRoles Array of acceptable roles
 * @returns True if user has at least one of the required roles
 */
export function hasAnyRole(
  userRole: string | undefined,
  requiredRoles: UserRole[]
): boolean {
  if (!userRole) return false;
  return requiredRoles.includes(userRole as UserRole);
}

/**
 * Check if user is an admin
 * @param userRole The user's role (string from session)
 * @returns True if user is an admin
 */
export function isAdmin(userRole: string | undefined): boolean {
  return hasRole(userRole, UserRole.ADMIN);
}

/**
 * Check if user is a doctor
 * @param userRole The user's role (string from session)
 * @returns True if user is a doctor
 */
export function isDoctor(userRole: string | undefined): boolean {
  return hasRole(userRole, UserRole.DOCTOR);
}

/**
 * Check if user is a patient
 * @param userRole The user's role (string from session)
 * @returns True if user is a patient
 */
export function isPatient(userRole: string | undefined): boolean {
  return hasRole(userRole, UserRole.PATIENT);
}

/**
 * Check if user is admin or doctor (useful for doctor-specific features)
 * @param userRole The user's role (string from session)
 * @returns True if user is admin or doctor
 */
export function isAdminOrDoctor(userRole: string | undefined): boolean {
  if (!userRole) return false;
  return userRole === UserRole.ADMIN || userRole === UserRole.DOCTOR;
}

/**
 * Check if user is admin or patient (useful for patient-specific features)
 * @param userRole The user's role (string from session)
 * @returns True if user is admin or patient
 */
export function isAdminOrPatient(userRole: string | undefined): boolean {
  if (!userRole) return false;
  return userRole === UserRole.ADMIN || userRole === UserRole.PATIENT;
}
