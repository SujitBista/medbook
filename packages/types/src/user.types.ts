/**
 * User-related types
 */

export enum UserRole {
  PATIENT = "PATIENT",
  DOCTOR = "DOCTOR",
  ADMIN = "ADMIN",
}

export interface User {
  id: string;
  email: string;
  password: string;
  role: UserRole;
  mustResetPassword: boolean;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  /**
   * Optional URL to the user's profile picture.
   * May be null/undefined if the user has not uploaded one.
   */
  profilePictureUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithoutPassword extends Omit<User, "password"> {}

export interface CreateUserInput {
  email: string;
  password: string;
  role?: UserRole;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  profilePictureUrl?: string | null;
}

export interface UpdateUserInput {
  email?: string;
  password?: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePictureUrl?: string | null;
}
