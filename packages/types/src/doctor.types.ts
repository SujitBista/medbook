/**
 * Doctor-related types
 * These will be expanded when Doctor model is added to the database
 */

export interface Doctor {
  id: string;
  userId: string;
  specialization?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
  userEmail?: string; // Included when fetching doctors list
}

export interface CreateDoctorInput {
  userId: string;
  specialization?: string;
  bio?: string;
}

export interface UpdateDoctorInput {
  specialization?: string;
  bio?: string;
}
