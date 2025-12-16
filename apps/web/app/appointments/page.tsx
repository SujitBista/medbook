"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Appointment, AppointmentStatus, Doctor } from "@medbook/types";
import { AppointmentList } from "@/components/features/appointment";
import { Button, Card } from "@medbook/ui";
import Link from "next/link";
import { useAppointmentFilters } from "@/hooks/useAppointmentFilters";
import type { Doctor as AdminDoctor } from "@/app/admin/types";

interface AppointmentsResponse {
  success: boolean;
  data: Appointment[];
  error?: {
    code: string;
    message: string;
  };
}

interface DoctorsResponse {
  success: boolean;
  data: AdminDoctor[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AppointmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<AdminDoctor[]>([]);
  const [loggedInDoctor, setLoggedInDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doctorProfileLoading, setDoctorProfileLoading] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const isPatient = session?.user?.role === "PATIENT";
  const isDoctor = session?.user?.role === "DOCTOR";

  // Use appointment filters hook
  const {
    filters,
    filteredAppointments,
    hasActiveFilters: hasFilters,
    setSearch,
    setStatus,
    setDoctorId,
    setDateStart,
    setDateEnd,
    setUpcomingOnly,
    clearFilters,
    doctorLookup,
  } = useAppointmentFilters({
    appointments,
    doctors,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/appointments`);
    }
  }, [status, router]);

  // Fetch doctors for patient filtering
  useEffect(() => {
    if (status === "authenticated" && isPatient) {
      fetchDoctors();
    }
  }, [status, isPatient]);

  // Fetch logged-in doctor's profile if user is a doctor
  useEffect(() => {
    if (session?.user?.role === "DOCTOR" && session.user.id) {
      fetchLoggedInDoctor();
    } else if (session?.user?.role !== "DOCTOR") {
      setDoctorProfileLoading(false);
    }
  }, [session?.user?.role, session?.user?.id]);

  // Fetch appointments (refetch when date filters or status filter changes)
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      if (session?.user?.role === "DOCTOR" && doctorProfileLoading) {
        return;
      }
      if (session?.user?.role === "DOCTOR" && !loggedInDoctor && !error) {
        return;
      }
      fetchAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    status,
    session?.user?.id,
    loggedInDoctor,
    doctorProfileLoading,
    filters.dateStart,
    filters.dateEnd,
    filters.status,
  ]);

  const fetchDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const response = await fetch(
        `/api/doctors?hasAvailability=false&limit=100`
      );
      const data: DoctorsResponse = await response.json();

      if (response.ok && data.success && data.data) {
        setDoctors(data.data);
      }
    } catch (err) {
      console.error("[Appointments] Error fetching doctors:", err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchLoggedInDoctor = async () => {
    if (!session?.user?.id) return;

    try {
      setDoctorProfileLoading(true);
      setError(null);

      const response = await fetch(`/api/doctors/user/${session.user.id}`);
      const data = await response.json();

      if (response.ok && data.success && data.doctor) {
        setLoggedInDoctor(data.doctor);
      } else {
        const errorMessage =
          data.error?.message ||
          "Doctor profile not found. Please contact an administrator to create your doctor profile.";
        setError(errorMessage);
        console.error(
          "[Appointments] Doctor profile not found:",
          response.status,
          data
        );
      }
    } catch (err) {
      console.error("[Appointments] Error fetching logged-in doctor:", err);
      setError(
        "Failed to load doctor profile. Please check your connection and try again."
      );
    } finally {
      setDoctorProfileLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = session?.user?.id;
      if (!userId) return;

      let url: string;
      // Add date range filters to URL if provided
      const params = new URLSearchParams();
      if (filters.dateStart) {
        params.append("startDate", filters.dateStart);
      }
      if (filters.dateEnd) {
        params.append("endDate", filters.dateEnd);
      }
      if (filters.status !== "ALL") {
        params.append("status", filters.status);
      }

      if (isPatient) {
        url = `/api/appointments?patientId=${userId}`;
      } else if (isDoctor) {
        if (!loggedInDoctor) {
          setError("Doctor profile not found. Please contact support.");
          return;
        }
        url = `/api/appointments?doctorId=${loggedInDoctor.id}`;
      } else {
        setError("Unable to fetch appointments for your role");
        return;
      }

      if (params.toString()) {
        url += `&${params.toString()}`;
      }

      const response = await fetch(url);
      const data: AppointmentsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to fetch appointments");
      }

      setAppointments(data.data || []);
    } catch (err) {
      console.error("[Appointments] Error fetching appointments:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load appointments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = filteredAppointments.length;
    const byStatus = filteredAppointments.reduce(
      (acc, apt) => {
        acc[apt.status] = (acc[apt.status] || 0) + 1;
        return acc;
      },
      {} as Record<AppointmentStatus, number>
    );
    const upcoming = filteredAppointments.filter(
      (apt) => new Date(apt.startTime) > new Date()
    ).length;
    const past = filteredAppointments.filter(
      (apt) => new Date(apt.startTime) <= new Date()
    ).length;

    return {
      total,
      upcoming,
      past,
      pending: byStatus[AppointmentStatus.PENDING] || 0,
      confirmed: byStatus[AppointmentStatus.CONFIRMED] || 0,
      completed: byStatus[AppointmentStatus.COMPLETED] || 0,
      cancelled: byStatus[AppointmentStatus.CANCELLED] || 0,
    };
  }, [filteredAppointments]);

  // Export to CSV
  const handleExportCSV = () => {
    setExportLoading(true);
    try {
      const headers = [
        "ID",
        "Date",
        "Time",
        "Status",
        isPatient ? "Doctor" : "Patient",
        "Duration (minutes)",
        "Notes",
      ];

      const rows = filteredAppointments.map((apt) => {
        const startDate = new Date(apt.startTime);
        const endDate = new Date(apt.endTime);
        const duration = Math.round(
          (endDate.getTime() - startDate.getTime()) / 60000
        );

        const doctorInfo = isPatient
          ? doctorLookup[apt.doctorId]?.userEmail || apt.doctorId
          : apt.patientEmail || "N/A";

        return [
          apt.id,
          startDate.toLocaleDateString(),
          startDate.toLocaleTimeString(),
          apt.status,
          doctorInfo,
          duration.toString(),
          apt.notes || "",
        ];
      });

      const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appointments-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[Appointments] Error exporting CSV:", err);
      alert("Failed to export appointments. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  // Show loading state
  if (
    status === "loading" ||
    loading ||
    (session?.user?.role === "DOCTOR" && doctorProfileLoading) ||
    (isPatient && doctorsLoading)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">
            {session?.user?.role === "DOCTOR" && doctorProfileLoading
              ? "Loading doctor profile..."
              : isPatient && doctorsLoading
                ? "Loading doctors..."
                : "Loading appointments..."}
          </p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && appointments.length === 0) {
    const isDoctorProfileError =
      session?.user?.role === "DOCTOR" && !loggedInDoctor;

    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            {isDoctorProfileError && (
              <p className="text-gray-600 mb-4 text-sm">
                You need a doctor profile to view appointments. Please contact
                an administrator to set up your doctor profile.
              </p>
            )}
            <div className="flex gap-4 justify-center">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
              {!isDoctorProfileError && (
                <Button variant="primary" onClick={fetchAppointments}>
                  Retry
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isPatient
            ? "My Appointments"
            : isDoctor
              ? "My Appointments"
              : "Appointments"}
        </h1>
        <p className="text-gray-600">
          {isPatient
            ? "View and manage your appointments"
            : isDoctor
              ? "View and manage your patient appointments"
              : "View all appointments"}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">
              {statistics.total}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Upcoming</p>
            <p className="text-2xl font-bold text-blue-600">
              {statistics.upcoming}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Confirmed</p>
            <p className="text-2xl font-bold text-green-600">
              {statistics.confirmed}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-1">Completed</p>
            <p className="text-2xl font-bold text-gray-600">
              {statistics.completed}
            </p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <div className="flex gap-2">
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters ? "Hide" : "Show"} Advanced
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID, email, doctor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setStatus(e.target.value as AppointmentStatus | "ALL")
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="ALL">All Statuses</option>
                <option value={AppointmentStatus.PENDING}>Pending</option>
                <option value={AppointmentStatus.CONFIRMED}>Confirmed</option>
                <option value={AppointmentStatus.COMPLETED}>Completed</option>
                <option value={AppointmentStatus.CANCELLED}>Cancelled</option>
              </select>
            </div>

            {/* Doctor Filter (for patients only) */}
            {isPatient && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor
                </label>
                <select
                  value={filters.doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ALL">All Doctors</option>
                  {doctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.userEmail || doctor.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Upcoming Only Toggle */}
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.upcomingOnly}
                  onChange={(e) => setUpcomingOnly(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Upcoming only</span>
              </label>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Date Range
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={filters.dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">
          Showing {filteredAppointments.length} of {appointments.length}{" "}
          appointment{appointments.length !== 1 ? "s" : ""}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={exportLoading || filteredAppointments.length === 0}
          >
            {exportLoading ? "Exporting..." : "Export CSV"}
          </Button>
          <Link href="/doctors">
            <Button variant="primary" size="sm">
              Book New Appointment
            </Button>
          </Link>
        </div>
      </div>

      {/* Appointments List */}
      <AppointmentList
        appointments={filteredAppointments}
        title={`${filteredAppointments.length} Appointment${filteredAppointments.length !== 1 ? "s" : ""}`}
        emptyMessage={
          hasFilters
            ? "No appointments match your filters. Try adjusting your search criteria."
            : isDoctor
              ? "No appointments yet"
              : "No appointments found. Book your first appointment to get started!"
        }
        showPatientEmail={isDoctor}
        showDoctorInfo={isPatient}
      />
    </div>
  );
}
