/**
 * Role checking utilities
 * Helper functions for checking user roles and permissions
 */

import { UserRole } from "@medbook/types";

/**
 * Check if a user has a specific role
 * @param userRole The user's role
 * @param requiredRole The required role
 * @returns True if user has the required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return userRole === requiredRole;
}

/**
 * Check if a user has one of the required roles
 * @param userRole The user's role
 * @param requiredRoles Array of acceptable roles
 * @returns True if user has at least one of the required roles
 */
export function hasAnyRole(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user is an admin
 * @param userRole The user's role
 * @returns True if user is an admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

/**
 * Check if user is a doctor
 * @param userRole The user's role
 * @returns True if user is a doctor
 */
export function isDoctor(userRole: UserRole): boolean {
  return userRole === UserRole.DOCTOR;
}

/**
 * Check if user is a patient
 * @param userRole The user's role
 * @returns True if user is a patient
 */
export function isPatient(userRole: UserRole): boolean {
  return userRole === UserRole.PATIENT;
}

/**
 * Check if user is admin or doctor (useful for doctor-specific features)
 * @param userRole The user's role
 * @returns True if user is admin or doctor
 */
export function isAdminOrDoctor(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.DOCTOR;
}

/**
 * Check if user is admin or patient (useful for patient-specific features)
 * @param userRole The user's role
 * @returns True if user is admin or patient
 */
export function isAdminOrPatient(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN || userRole === UserRole.PATIENT;
}
