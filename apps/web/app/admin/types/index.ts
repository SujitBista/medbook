import { UserRole, AppointmentStatus } from "@medbook/types";

/**
 * Type definitions for admin dashboard
 */

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface SystemStats {
  totalUsers: number;
  usersByRole: {
    PATIENT: number;
    DOCTOR: number;
    ADMIN: number;
  };
}

export interface AppointmentStats {
  total: number;
  byStatus: {
    PENDING: number;
    CONFIRMED: number;
    CANCELLED: number;
    COMPLETED: number;
  };
  upcoming: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  recentActivity: {
    createdToday: number;
    createdThisWeek: number;
    createdThisMonth: number;
  };
}

export interface Doctor {
  id: string;
  userId: string;
  specialization?: string;
  bio?: string;
  licenseNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  yearsOfExperience?: number;
  education?: string;
  profilePictureUrl?: string;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  userPhoneNumber?: string;
}

export interface DoctorStats {
  totalDoctors: number;
  doctorsBySpecialization: Record<string, number>;
}

export type TabType =
  | "general"
  | "doctors"
  | "schedule-management"
  | "appointments";
