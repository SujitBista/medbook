"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Appointment, AppointmentStatus, Doctor } from "@medbook/types";
import { AppointmentList } from "@/components/features/appointment";
import { Button, Card } from "@medbook/ui";
import Link from "next/link";

interface AppointmentsResponse {
  success: boolean;
  data: Appointment[];
  error?: {
    code: string;
    message: string;
  };
}

export default function AppointmentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loggedInDoctor, setLoggedInDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [doctorProfileLoading, setDoctorProfileLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "ALL">(
    "ALL"
  );
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/appointments`);
    }
  }, [status, router]);

  // Fetch logged-in doctor's profile if user is a doctor
  useEffect(() => {
    if (session?.user?.role === "DOCTOR" && session.user.id) {
      fetchLoggedInDoctor();
    } else if (session?.user?.role !== "DOCTOR") {
      // For non-doctors, we can proceed without doctor profile
      setDoctorProfileLoading(false);
    }
  }, [session?.user?.role, session?.user?.id]);

  // Fetch appointments
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      // For doctors, wait until doctor profile loading is complete (success or failure)
      if (session?.user?.role === "DOCTOR" && doctorProfileLoading) {
        return;
      }
      // For doctors, only fetch if we have a doctor profile OR if there's an error
      if (session?.user?.role === "DOCTOR" && !loggedInDoctor && !error) {
        return;
      }
      fetchAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session?.user?.id, loggedInDoctor, doctorProfileLoading]);

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
        // Doctor profile not found - this is a critical error for doctors
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

      // Determine if user is patient or doctor
      const isPatient = session?.user?.role === "PATIENT";
      const isDoctor = session?.user?.role === "DOCTOR";

      let url: string;
      if (isPatient) {
        url = `/api/appointments?patientId=${userId}`;
      } else if (isDoctor) {
        // Use doctor profile ID instead of user ID
        if (!loggedInDoctor) {
          setError("Doctor profile not found. Please contact support.");
          return;
        }
        url = `/api/appointments?doctorId=${loggedInDoctor.id}`;
      } else {
        // Admin or other roles - show error
        setError("Unable to fetch appointments for your role");
        return;
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

  const isPatient = session?.user?.role === "PATIENT";
  const isDoctor = session?.user?.role === "DOCTOR";

  // Show loading state
  if (
    status === "loading" ||
    loading ||
    (session?.user?.role === "DOCTOR" && doctorProfileLoading)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">
            {session?.user?.role === "DOCTOR" && doctorProfileLoading
              ? "Loading doctor profile..."
              : "Loading appointments..."}
          </p>
        </div>
      </div>
    );
  }

  // Show error state (especially for doctor profile errors)
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

  // Filter appointments based on selected filters
  let filteredAppointments = appointments;
  if (statusFilter !== "ALL") {
    filteredAppointments = filteredAppointments.filter(
      (apt) => apt.status === statusFilter
    );
  }
  if (showUpcomingOnly) {
    const now = new Date();
    filteredAppointments = filteredAppointments.filter(
      (apt) => new Date(apt.startTime) >= now
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

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as AppointmentStatus | "ALL")
              }
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Statuses</option>
              <option value={AppointmentStatus.PENDING}>Pending</option>
              <option value={AppointmentStatus.CONFIRMED}>Confirmed</option>
              <option value={AppointmentStatus.COMPLETED}>Completed</option>
              <option value={AppointmentStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUpcomingOnly}
                onChange={(e) => setShowUpcomingOnly(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Upcoming only</span>
            </label>
          </div>

          <div className="ml-auto">
            <Link href="/doctors">
              <Button variant="primary" size="sm">
                Book New Appointment
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Appointments List */}
      <AppointmentList
        appointments={filteredAppointments}
        title={`${filteredAppointments.length} Appointment${filteredAppointments.length !== 1 ? "s" : ""}`}
        emptyMessage={
          isDoctor
            ? "No appointments yet"
            : "No appointments found. Book your first appointment to get started!"
        }
        showPatientEmail={isDoctor}
        showDoctorInfo={isPatient}
      />
    </div>
  );
}
