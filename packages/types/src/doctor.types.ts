/**
 * Doctor-related types
 */

export interface DoctorDepartment {
  id: string;
  name: string;
  slug: string;
}

export interface Doctor {
  id: string;
  userId: string;
  departmentId?: string;
  /** @deprecated Use department (name/slug) instead */
  specialization?: string;
  /** Resolved from departmentId when present */
  department?: DoctorDepartment;
  bio?: string;
  licenseNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  yearsOfExperience?: number;
  education?: string;
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  userEmail?: string; // Included when fetching doctors list
  userFirstName?: string; // Included when fetching doctors list
  userLastName?: string; // Included when fetching doctors list
  userPhoneNumber?: string; // Included when fetching doctors list
  /** Present when includeNoSchedule=true: true if doctor has future available slots */
  hasSchedule?: boolean;
  /** Present when includeNoSchedule=true: earliest future slot start time, null if no schedule */
  nextAvailableSlotAt?: Date | null;
}

export interface CreateDoctorInput {
  userId: string;
  departmentId?: string;
  /** @deprecated Use departmentId */
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
}

export interface UpdateDoctorInput {
  departmentId?: string;
  /** @deprecated Use departmentId */
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
}
