import { useState, useMemo, useEffect } from "react";
import {
  paginateAppointments,
  calculateTotalPages,
  getPaginationRange,
  generatePageNumbers,
} from "@/utils/appointments";
import type { Appointment } from "@medbook/types";

interface UseAppointmentPaginationOptions {
  appointments: Appointment[];
  initialPage?: number;
  initialPageSize?: number;
  onPageChange?: () => void;
}

interface UseAppointmentPaginationReturn {
  page: number;
  pageSize: number;
  paginatedAppointments: Appointment[];
  totalPages: number;
  paginationRange: { start: number; end: number; total: number };
  pageNumbers: number[];
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  canGoToPrevious: boolean;
  canGoToNext: boolean;
}

/**
 * Custom hook for managing appointment pagination
 */
export function useAppointmentPagination(
  options: UseAppointmentPaginationOptions
): UseAppointmentPaginationReturn {
  const {
    appointments,
    initialPage = 1,
    initialPageSize = 10,
    onPageChange,
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset to first page when appointments or page size changes
  useEffect(() => {
    setPage(1);
  }, [appointments.length, pageSize]);

  // Calculate pagination
  const paginatedAppointments = useMemo(() => {
    return paginateAppointments(appointments, page, pageSize);
  }, [appointments, page, pageSize]);

  const totalPages = useMemo(() => {
    return calculateTotalPages(appointments.length, pageSize);
  }, [appointments.length, pageSize]);

  const paginationRange = useMemo(() => {
    return getPaginationRange(page, pageSize, appointments.length);
  }, [page, pageSize, appointments.length]);

  const pageNumbers = useMemo(() => {
    return generatePageNumbers(page, totalPages, 5);
  }, [page, totalPages]);

  // Notify when page changes
  useEffect(() => {
    onPageChange?.();
  }, [page, onPageChange]);

  const goToFirstPage = () => {
    setPage(1);
  };

  const goToLastPage = () => {
    setPage(totalPages);
  };

  const goToNextPage = () => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  };

  const goToPreviousPage = () => {
    setPage((prev) => Math.max(1, prev - 1));
  };

  const canGoToPrevious = page > 1;
  const canGoToNext = page < totalPages;

  return {
    page,
    pageSize,
    paginatedAppointments,
    totalPages,
    paginationRange,
    pageNumbers,
    setPage,
    setPageSize,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoToPrevious,
    canGoToNext,
  };
}
