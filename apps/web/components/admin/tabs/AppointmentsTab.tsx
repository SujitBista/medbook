"use client";

import { useState, useEffect, useMemo } from "react";
import { AppointmentStatus } from "@medbook/types";
import type { Appointment } from "@medbook/types";
import type { Doctor } from "@/app/admin/types";
import { Button, Card } from "@medbook/ui";
import { useAppointments } from "@/hooks/useAppointments";
import { useAppointmentFilters } from "@/hooks/useAppointmentFilters";
import { useAppointmentPagination } from "@/hooks/useAppointmentPagination";
import { getPaymentInfo, getVisitType } from "@/utils/appointments";
import jsPDF from "jspdf";

interface AppointmentsTabProps {
  doctors: Doctor[];
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export function AppointmentsTab({
  doctors,
  onError,
  onSuccess,
}: AppointmentsTabProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDoctorForModal, setSelectedDoctorForModal] =
    useState<Doctor | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch appointments
  const {
    appointments,
    loading: appointmentsLoading,
    fetchAppointments,
    updateAppointmentStatus,
    updatingId: updatingAppointmentId,
  } = useAppointments({ onError, onSuccess });

  // Filter appointments
  const {
    filteredAppointments,
    hasActiveFilters,
    setSearch,
    setStatus,
    setDoctorId,
    setDateStart,
    setDateEnd,
    setUpcomingOnly,
    clearFilters,
    doctorLookup,
    filters,
  } = useAppointmentFilters({
    appointments,
    doctors,
  });

  // Paginate appointments
  const {
    page: appointmentPage,
    pageSize: appointmentPageSize,
    paginatedAppointments,
    paginationRange,
    pageNumbers,
    setPage: setAppointmentPage,
    setPageSize: setAppointmentPageSize,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    canGoToPrevious,
    canGoToNext,
  } = useAppointmentPagination({
    appointments: filteredAppointments,
  });

  // Fetch appointments when component mounts
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "PENDING").length,
      confirmed: appointments.filter((a) => a.status === "CONFIRMED").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
    };
  }, [appointments]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return [
      filters.search,
      filters.status !== "ALL",
      filters.doctorId !== "ALL",
      filters.dateStart,
      filters.dateEnd,
      filters.upcomingOnly,
    ].filter(Boolean).length;
  }, [filters]);

  // Export to CSV
  const handleExportCSV = () => {
    setExportLoading(true);
    try {
      const headers = [
        "ID",
        "Date",
        "Time",
        "Status",
        "Patient",
        "Doctor",
        "Duration (minutes)",
        "Visit Type",
        "Payment Status",
        "Payment Amount",
        "Notes",
      ];

      const rows = filteredAppointments.map((apt) => {
        const startDate = new Date(apt.startTime);
        const endDate = new Date(apt.endTime);
        const duration = Math.round(
          (endDate.getTime() - startDate.getTime()) / 60000
        );
        const doctor = doctorLookup[apt.doctorId];
        const payment = getPaymentInfo(apt.id, apt.payment);
        const visitType = getVisitType(apt.id);

        const doctorName =
          doctor?.userFirstName || doctor?.userLastName
            ? `Dr. ${doctor.userFirstName || ""} ${doctor.userLastName || ""}`.trim()
            : doctor?.userEmail || apt.doctorId;

        return [
          apt.id,
          startDate.toLocaleDateString(),
          startDate.toLocaleTimeString(),
          apt.status,
          apt.patientEmail || "N/A",
          doctorName,
          duration.toString(),
          visitType,
          payment.status,
          `$${payment.amount}`,
          apt.notes || "",
        ];
      });

      const csvContent = [headers, ...rows]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appointments-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[AppointmentsTab] Error exporting CSV:", err);
      onError("Failed to export appointments. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  // Export to PDF
  const handleExportPDF = () => {
    setExportLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const startY = 20;
      let y = startY;

      // Title
      doc.setFontSize(18);
      doc.text("Appointments Report", margin, y);
      y += 10;

      // Date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
      y += 5;

      // Summary
      doc.setFontSize(12);
      doc.text(
        `Total: ${filteredAppointments.length} appointment(s)`,
        margin,
        y
      );
      y += 10;

      // Table headers
      doc.setFontSize(10);
      const headers = ["No.", "Date", "Time", "Status", "Patient", "Doctor"];
      const colWidths = [25, 30, 25, 25, 40, 35];
      let x = margin;

      doc.setFillColor(240, 240, 240);
      doc.rect(x, y, pageWidth - 2 * margin, 8, "F");
      doc.setFont("helvetica", "bold");

      headers.forEach((header, i) => {
        doc.text(header, x + 2, y + 6);
        x += colWidths[i];
      });

      y += 10;
      doc.setFont("helvetica", "normal");

      // Table rows
      filteredAppointments.forEach((apt, index) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = startY;
        }

        const startDate = new Date(apt.startTime);
        const doctor = doctorLookup[apt.doctorId];
        const doctorName =
          doctor?.userFirstName || doctor?.userLastName
            ? `Dr. ${doctor.userFirstName || ""} ${doctor.userLastName || ""}`.trim()
            : doctor?.userEmail || apt.doctorId.slice(0, 8);
        const rowData = [
          (index + 1).toString(),
          startDate.toLocaleDateString(),
          startDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          apt.status,
          (apt.patientEmail || "N/A").substring(0, 20),
          doctorName.substring(0, 20),
        ];

        x = margin;
        rowData.forEach((cell, i) => {
          doc.text(String(cell), x + 2, y + 6);
          x += colWidths[i];
        });

        y += 8;
      });

      // Save PDF
      doc.save(`appointments-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("[AppointmentsTab] Error exporting PDF:", err);
      onError("Failed to export appointments. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-yellow-100 p-3">
              <svg
                className="h-6 w-6 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600">
                {stats.pending}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-green-100 p-3">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Confirmed</p>
              <p className="text-2xl font-semibold text-green-600">
                {stats.confirmed}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md bg-purple-100 p-3">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-purple-600">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Appointment Management
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {filteredAppointments.length === appointments.length
                  ? `Showing all ${appointments.length} appointments`
                  : `Showing ${filteredAppointments.length} of ${appointments.length} appointments`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={exportLoading || filteredAppointments.length === 0}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {exportLoading ? "Exporting..." : "Export CSV"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={exportLoading || filteredAppointments.length === 0}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                {exportLoading ? "Exporting..." : "Export PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                Filters{" "}
                {hasActiveFilters && (
                  <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAppointments}
                disabled={appointmentsLoading}
              >
                <svg
                  className={`mr-2 h-4 w-4 ${appointmentsLoading ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by ID, patient email, doctor email, or specialization..."
              value={filters.search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {filters.search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Expandable Filters */}
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setStatus(e.target.value as AppointmentStatus | "ALL")
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Doctor
                </label>
                <select
                  value={filters.doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Doctors</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.userFirstName || doctor.userLastName
                        ? `Dr. ${doctor.userFirstName || ""} ${doctor.userLastName || ""}`.trim() +
                          (doctor.specialization
                            ? ` (${doctor.specialization})`
                            : "")
                        : doctor.userEmail}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.upcomingOnly}
                    onChange={(e) => setUpcomingOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Upcoming Only</span>
                </label>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="px-6 py-4">
          {appointmentsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <p className="mt-4 text-sm text-gray-600">
                Loading appointments...
              </p>
            </div>
          ) : paginatedAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-gray-100 p-4">
                <svg
                  className="h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No appointments found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {hasActiveFilters
                  ? "Try adjusting your search or filter criteria"
                  : "There are no appointments in the system yet"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        No.
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Patient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Doctor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Visit Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {paginatedAppointments.map((appointment, index) => {
                      // Calculate row number based on pagination
                      const rowNumber =
                        (appointmentPage - 1) * appointmentPageSize + index + 1;
                      const appointmentDate = new Date(appointment.startTime);
                      const appointmentEnd = new Date(appointment.endTime);
                      const now = new Date();
                      const isUpcoming = appointmentDate > now;
                      const isPast = appointmentDate < now;
                      const hasStarted = now >= appointmentDate;
                      const isPastEnd = now > appointmentEnd;
                      const isTerminal =
                        appointment.status === AppointmentStatus.CANCELLED ||
                        appointment.status === AppointmentStatus.COMPLETED ||
                        appointment.status === AppointmentStatus.NO_SHOW;
                      const canConfirm =
                        !isTerminal &&
                        (appointment.status === AppointmentStatus.PENDING ||
                          appointment.status === AppointmentStatus.BOOKED) &&
                        !isPastEnd;
                      const canComplete =
                        !isTerminal &&
                        (appointment.status === AppointmentStatus.CONFIRMED ||
                          appointment.status === AppointmentStatus.BOOKED) &&
                        hasStarted;
                      const doctor = doctorLookup[appointment.doctorId];
                      const payment = getPaymentInfo(
                        appointment.id,
                        appointment.payment
                      );
                      const visitType = getVisitType(appointment.id);

                      const rowBgClass =
                        appointment.status === "CANCELLED"
                          ? "bg-red-50/50"
                          : appointment.status === "COMPLETED"
                            ? "bg-green-50/50"
                            : appointment.status === "CONFIRMED" && isUpcoming
                              ? "bg-blue-50/50"
                              : isPast && appointment.status === "PENDING"
                                ? "bg-yellow-50/50"
                                : "";

                      const statusConfig = {
                        PENDING: {
                          bg: "bg-yellow-50",
                          text: "text-yellow-700",
                          border: "border border-yellow-300",
                          dot: "bg-yellow-500",
                        },
                        CONFIRMED: {
                          bg: "bg-blue-50",
                          text: "text-blue-700",
                          border: "border border-blue-300",
                          dot: "bg-blue-500",
                        },
                        COMPLETED: {
                          bg: "bg-green-50",
                          text: "text-green-700",
                          border: "border border-green-300",
                          dot: "bg-green-500",
                        },
                        CANCELLED: {
                          bg: "bg-red-50",
                          text: "text-red-700",
                          border: "border border-red-300",
                          dot: "bg-red-500",
                        },
                      };

                      const paymentColors = {
                        Paid: "text-green-600 bg-green-50",
                        Pending: "text-yellow-600 bg-yellow-50",
                        Insurance: "text-blue-600 bg-blue-50",
                        Partial: "text-orange-600 bg-orange-50",
                      };

                      return (
                        <tr
                          key={appointment.id}
                          className={`${rowBgClass} transition-colors hover:bg-gray-100`}
                        >
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className="text-sm font-medium text-gray-700"
                              title={`Appointment ID: ${appointment.id}`}
                            >
                              {rowNumber}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patientEmail || "N/A"}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {doctor ? (
                              <button
                                onClick={() => {
                                  setSelectedDoctorForModal(doctor);
                                  setShowDoctorModal(true);
                                }}
                                className="group flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                              >
                                <span>
                                  {doctor.userFirstName || doctor.userLastName
                                    ? `Dr. ${doctor.userFirstName || ""} ${doctor.userLastName || ""}`.trim()
                                    : doctor.userEmail || "Unknown Doctor"}
                                </span>
                                <svg
                                  className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </button>
                            ) : (
                              <span className="text-sm text-gray-500">
                                {appointment.doctorId.slice(0, 8)}...
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="text-sm text-gray-900">
                              {appointmentDate.toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {appointmentDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                              {visitType}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${paymentColors[payment.status as keyof typeof paymentColors]}`}
                              >
                                {payment.status}
                              </span>
                              <span className="text-xs text-gray-500">
                                ${payment.amount}
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusConfig[appointment.status as keyof typeof statusConfig]?.bg} ${statusConfig[appointment.status as keyof typeof statusConfig]?.text} ${statusConfig[appointment.status as keyof typeof statusConfig]?.border}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${statusConfig[appointment.status as keyof typeof statusConfig]?.dot}`}
                              ></span>
                              {appointment.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <a
                                href={`/appointments/${appointment.id}`}
                                className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                title="View appointment"
                              >
                                <svg
                                  className="h-4 w-4"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                              </a>
                              {!isTerminal &&
                                appointment.status !==
                                  AppointmentStatus.CONFIRMED && (
                                  <button
                                    onClick={() =>
                                      updateAppointmentStatus(
                                        appointment.id,
                                        AppointmentStatus.CONFIRMED
                                      )
                                    }
                                    disabled={
                                      updatingAppointmentId ===
                                        appointment.id || !canConfirm
                                    }
                                    className="rounded p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                                    title={
                                      canConfirm
                                        ? "Confirm appointment"
                                        : "Cannot confirm a past appointment"
                                    }
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </button>
                                )}
                              {!isTerminal &&
                                (appointment.status ===
                                  AppointmentStatus.CONFIRMED ||
                                  appointment.status ===
                                    AppointmentStatus.BOOKED) && (
                                  <button
                                    onClick={() =>
                                      updateAppointmentStatus(
                                        appointment.id,
                                        AppointmentStatus.COMPLETED
                                      )
                                    }
                                    disabled={
                                      updatingAppointmentId ===
                                        appointment.id || !canComplete
                                    }
                                    className="rounded p-1.5 text-green-500 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                                    title={
                                      canComplete
                                        ? "Mark as completed"
                                        : "Cannot complete an appointment that hasn't started"
                                    }
                                  >
                                    <svg
                                      className="h-4 w-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                  </button>
                                )}
                              {!isTerminal && (
                                <button
                                  onClick={() =>
                                    updateAppointmentStatus(
                                      appointment.id,
                                      AppointmentStatus.CANCELLED
                                    )
                                  }
                                  disabled={
                                    updatingAppointmentId === appointment.id
                                  }
                                  className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                                  title="Cancel appointment"
                                >
                                  <svg
                                    className="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Show</span>
                  <select
                    value={appointmentPageSize}
                    onChange={(e) =>
                      setAppointmentPageSize(Number(e.target.value))
                    }
                    className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>per page</span>
                  <span className="text-gray-400">|</span>
                  <span>
                    Showing {paginationRange.start} to {paginationRange.end} of{" "}
                    {paginationRange.total}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToFirstPage}
                    disabled={!canGoToPrevious}
                    className="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="First Page"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={goToPreviousPage}
                    disabled={!canGoToPrevious}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1 px-2">
                    {pageNumbers.map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setAppointmentPage(pageNum)}
                        className={`h-8 w-8 rounded-md text-sm font-medium ${
                          appointmentPage === pageNum
                            ? "bg-blue-600 text-white"
                            : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={goToNextPage}
                    disabled={!canGoToNext}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={goToLastPage}
                    disabled={!canGoToNext}
                    className="rounded-md border border-gray-300 bg-white p-2 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Last Page"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 5l7 7-7 7M5 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* Doctor Info Modal */}
      {showDoctorModal && selectedDoctorForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Doctor Information
              </h3>
              <button
                onClick={() => {
                  setShowDoctorModal(false);
                  setSelectedDoctorForModal(null);
                }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-600">
                  {selectedDoctorForModal.userEmail?.charAt(0).toUpperCase() ||
                    "D"}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">
                    {selectedDoctorForModal.specialization
                      ? `Dr. (${selectedDoctorForModal.specialization})`
                      : "Doctor"}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedDoctorForModal.userEmail || "No email available"}
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-500">
                    Doctor ID
                  </span>
                  <span className="font-mono text-sm text-gray-900">
                    {selectedDoctorForModal.id.slice(0, 12)}...
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-500">
                    Specialization
                  </span>
                  <span className="text-sm text-gray-900">
                    {selectedDoctorForModal.specialization || "Not specified"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                  <span className="text-sm font-medium text-gray-500">
                    Joined
                  </span>
                  <span className="text-sm text-gray-900">
                    {new Date(
                      selectedDoctorForModal.createdAt
                    ).toLocaleDateString()}
                  </span>
                </div>
                {selectedDoctorForModal.bio && (
                  <div className="rounded-lg bg-gray-50 px-4 py-3">
                    <span className="text-sm font-medium text-gray-500">
                      Bio
                    </span>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedDoctorForModal.bio}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => {
                  setShowDoctorModal(false);
                  setSelectedDoctorForModal(null);
                }}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
              <a
                href={`/doctors/${selectedDoctorForModal.id}`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                View Full Profile
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
