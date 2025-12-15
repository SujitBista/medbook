import type { Appointment, AppointmentStatus } from "@medbook/types";
import type { Doctor } from "@/app/admin/types";

/**
 * Business logic utilities for appointment management
 */

export interface AppointmentFilters {
  search: string;
  status: AppointmentStatus | "ALL";
  doctorId: string;
  dateStart: string;
  dateEnd: string;
  upcomingOnly: boolean;
}

export interface PaymentInfo {
  status: "Paid" | "Pending" | "Insurance" | "Partial";
  amount: number;
}

export type VisitType =
  | "In-Person"
  | "Video Call"
  | "Phone"
  | "Follow-up"
  | "Initial Consultation";

/**
 * Creates a lookup map for doctors by ID
 */
export function createDoctorLookup(doctors: Doctor[]): Record<string, Doctor> {
  const lookup: Record<string, Doctor> = {};
  doctors.forEach((doctor) => {
    lookup[doctor.id] = doctor;
  });
  return lookup;
}

/**
 * Generates mock payment info based on appointment ID
 */
export function getPaymentInfo(appointmentId: string): PaymentInfo {
  const paymentTypes: PaymentInfo["status"][] = [
    "Paid",
    "Pending",
    "Insurance",
    "Partial",
  ];
  const amounts = [50, 75, 100, 125, 150, 200];
  const hash = appointmentId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return {
    status: paymentTypes[hash % paymentTypes.length],
    amount: amounts[hash % amounts.length],
  };
}

/**
 * Generates mock visit type based on appointment ID
 */
export function getVisitType(appointmentId: string): VisitType {
  const visitTypes: VisitType[] = [
    "In-Person",
    "Video Call",
    "Phone",
    "Follow-up",
    "Initial Consultation",
  ];
  const hash = appointmentId.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return visitTypes[hash % visitTypes.length];
}

/**
 * Filters appointments based on provided filters
 */
export function filterAppointments(
  appointments: Appointment[],
  filters: AppointmentFilters,
  doctorLookup: Record<string, Doctor>
): Appointment[] {
  let filtered = [...appointments];

  // Apply search filter
  if (filters.search.trim()) {
    const searchLower = filters.search.toLowerCase().trim();
    filtered = filtered.filter((apt) => {
      const doctor = doctorLookup[apt.doctorId];
      const doctorEmail = doctor?.userEmail?.toLowerCase() || "";
      const doctorSpec = doctor?.specialization?.toLowerCase() || "";
      return (
        apt.id.toLowerCase().includes(searchLower) ||
        (apt.patientEmail?.toLowerCase() || "").includes(searchLower) ||
        doctorEmail.includes(searchLower) ||
        doctorSpec.includes(searchLower)
      );
    });
  }

  // Apply status filter
  if (filters.status !== "ALL") {
    filtered = filtered.filter((apt) => apt.status === filters.status);
  }

  // Apply doctor filter
  if (filters.doctorId !== "ALL") {
    filtered = filtered.filter((apt) => apt.doctorId === filters.doctorId);
  }

  // Apply date range filter
  if (filters.dateStart) {
    const startDate = new Date(filters.dateStart);
    startDate.setHours(0, 0, 0, 0);
    filtered = filtered.filter((apt) => new Date(apt.startTime) >= startDate);
  }
  if (filters.dateEnd) {
    const endDate = new Date(filters.dateEnd);
    endDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((apt) => new Date(apt.startTime) <= endDate);
  }

  // Apply upcoming only filter
  if (filters.upcomingOnly) {
    const now = new Date();
    filtered = filtered.filter((apt) => new Date(apt.startTime) > now);
  }

  // Sort by start time (most recent first)
  filtered.sort(
    (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
  );

  return filtered;
}

/**
 * Checks if any filters are active
 */
export function hasActiveFilters(filters: AppointmentFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.status !== "ALL" ||
    filters.doctorId !== "ALL" ||
    filters.dateStart !== "" ||
    filters.dateEnd !== "" ||
    filters.upcomingOnly
  );
}

/**
 * Calculates pagination for appointments
 */
export function paginateAppointments<T>(
  items: T[],
  page: number,
  pageSize: number
): T[] {
  const startIndex = (page - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}

/**
 * Calculates total pages for pagination
 */
export function calculateTotalPages(
  itemCount: number,
  pageSize: number
): number {
  return Math.ceil(itemCount / pageSize);
}

/**
 * Calculates pagination range display
 */
export function getPaginationRange(
  page: number,
  pageSize: number,
  totalItems: number
): { start: number; end: number; total: number } {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  return { start, end, total: totalItems };
}

/**
 * Generates page numbers for pagination display
 */
export function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): number[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 3) {
    return Array.from({ length: maxVisible }, (_, i) => i + 1);
  }

  if (currentPage >= totalPages - 2) {
    return Array.from(
      { length: maxVisible },
      (_, i) => totalPages - maxVisible + i + 1
    );
  }

  return Array.from({ length: maxVisible }, (_, i) => currentPage - 2 + i);
}
