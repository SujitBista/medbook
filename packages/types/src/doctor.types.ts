/**
 * Doctor-related types
 */

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
  createdAt: Date;
  updatedAt: Date;
  userEmail?: string; // Included when fetching doctors list
  userFirstName?: string; // Included when fetching doctors list
  userLastName?: string; // Included when fetching doctors list
  userPhoneNumber?: string; // Included when fetching doctors list
}

export interface CreateDoctorInput {
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
}

export interface UpdateDoctorInput {
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
