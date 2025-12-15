import { useState, useMemo, useEffect } from "react";
import type { AppointmentStatus, Appointment } from "@medbook/types";
import type { Doctor } from "@/app/admin/types";
import type { AppointmentFilters } from "@/utils/appointments";
import { filterAppointments, hasActiveFilters } from "@/utils/appointments";

interface UseAppointmentFiltersOptions {
  appointments: Appointment[];
  doctors: Doctor[];
  onFiltersChange?: () => void;
}

interface UseAppointmentFiltersReturn {
  filters: AppointmentFilters;
  filteredAppointments: Appointment[];
  hasActiveFilters: boolean;
  setSearch: (search: string) => void;
  setStatus: (status: AppointmentStatus | "ALL") => void;
  setDoctorId: (doctorId: string) => void;
  setDateStart: (dateStart: string) => void;
  setDateEnd: (dateEnd: string) => void;
  setUpcomingOnly: (upcomingOnly: boolean) => void;
  clearFilters: () => void;
  doctorLookup: Record<string, Doctor>;
}

/**
 * Custom hook for managing appointment filters
 */
export function useAppointmentFilters(
  options: UseAppointmentFiltersOptions
): UseAppointmentFiltersReturn {
  const { appointments, doctors, onFiltersChange } = options;

  const [filters, setFilters] = useState<AppointmentFilters>({
    search: "",
    status: "ALL",
    doctorId: "ALL",
    dateStart: "",
    dateEnd: "",
    upcomingOnly: false,
  });

  // Create doctor lookup
  const doctorLookup = useMemo(() => {
    const lookup: Record<string, Doctor> = {};
    doctors.forEach((doctor) => {
      lookup[doctor.id] = doctor;
    });
    return lookup;
  }, [doctors]);

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    return filterAppointments(appointments, filters, doctorLookup);
  }, [appointments, filters, doctorLookup]);

  // Check if any filters are active
  const hasActiveFiltersValue = useMemo(() => {
    return hasActiveFilters(filters);
  }, [filters]);

  // Notify when filters change
  useEffect(() => {
    onFiltersChange?.();
  }, [filters, onFiltersChange]);

  const setSearch = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  const setStatus = (status: AppointmentStatus | "ALL") => {
    setFilters((prev) => ({ ...prev, status }));
  };

  const setDoctorId = (doctorId: string) => {
    setFilters((prev) => ({ ...prev, doctorId }));
  };

  const setDateStart = (dateStart: string) => {
    setFilters((prev) => ({ ...prev, dateStart }));
  };

  const setDateEnd = (dateEnd: string) => {
    setFilters((prev) => ({ ...prev, dateEnd }));
  };

  const setUpcomingOnly = (upcomingOnly: boolean) => {
    setFilters((prev) => ({ ...prev, upcomingOnly }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "ALL",
      doctorId: "ALL",
      dateStart: "",
      dateEnd: "",
      upcomingOnly: false,
    });
  };

  return {
    filters,
    filteredAppointments,
    hasActiveFilters: hasActiveFiltersValue,
    setSearch,
    setStatus,
    setDoctorId,
    setDateStart,
    setDateEnd,
    setUpcomingOnly,
    clearFilters,
    doctorLookup,
  };
}
