/**
 * Commission-related TypeScript types
 */

export enum CommissionStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export interface Commission {
  id: string;
  paymentId: string;
  appointmentId: string;
  doctorId: string;
  appointmentAmount: number;
  commissionRate: number; // e.g., 0.10 for 10%
  commissionAmount: number;
  doctorPayoutAmount: number;
  status: CommissionStatus;
  stripeTransferId?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DoctorCommissionSettings {
  id: string;
  doctorId: string;
  commissionRate: number; // e.g., 0.10 for 10%
  appointmentPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommissionInput {
  paymentId: string;
  appointmentId: string;
  doctorId: string;
  appointmentAmount: number;
  commissionRate: number;
}

export interface CreateCommissionSettingsInput {
  doctorId: string;
  commissionRate: number;
  appointmentPrice: number;
}

export interface UpdateCommissionSettingsInput {
  commissionRate?: number;
  appointmentPrice?: number;
}

export interface CommissionStats {
  totalCommissions: number;
  totalPayouts: number;
  pendingPayouts: number;
  byStatus: {
    PENDING: number;
    PAID: number;
    CANCELLED: number;
  };
}
