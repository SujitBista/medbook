"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Appointment, AppointmentStatus, Doctor } from "@medbook/types";
import {
  AppointmentList,
  AppointmentStatistics,
} from "@/components/features/appointment";
import { Button, Card } from "@medbook/ui";
import { UserProfileDropdown } from "@/components/layout/UserProfileDropdown";
import Link from "next/link";

interface AppointmentsResponse {
  success: boolean;
  data: Appointment[];
  error?: {
    code: string;
    message: string;
  };
}

interface DoctorResponse {
  success: boolean;
  doctor?: Doctor;
  error?: {
    code: string;
    message: string;
  };
}

export default function DoctorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loggedInDoctor, setLoggedInDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorProfileLoading, setDoctorProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated or not a doctor
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/doctor");
    } else if (status === "authenticated" && session?.user?.role !== "DOCTOR") {
      // Redirect non-doctors to appropriate dashboard
      if (session?.user?.role === "ADMIN") {
        router.push("/admin");
      } else if (session?.user?.role === "PATIENT") {
        router.push("/dashboard/patient");
      } else {
        router.push("/");
      }
    }
  }, [status, session, router]);

  // Fetch logged-in doctor's profile
  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.role === "DOCTOR" &&
      session?.user?.id
    ) {
      fetchLoggedInDoctor();
    } else if (status === "authenticated" && session?.user?.role !== "DOCTOR") {
      setDoctorProfileLoading(false);
    }
  }, [status, session?.user?.role, session?.user?.id]);

  // Fetch appointments
  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.id &&
      session?.user?.role === "DOCTOR"
    ) {
      // Wait until doctor profile loading is complete (success or failure)
      if (doctorProfileLoading) {
        return;
      }
      // Only fetch if we have a doctor profile OR if there's an error
      if (!loggedInDoctor && !error) {
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
      const data: DoctorResponse = await response.json();

      if (response.ok && data.success && data.doctor) {
        setLoggedInDoctor(data.doctor);
      } else {
        // Doctor profile not found - this is a critical error for doctors
        const errorMessage =
          data.error?.message ||
          "Doctor profile not found. Please contact an administrator to create your doctor profile.";
        setError(errorMessage);
        console.error(
          "[DoctorDashboard] Doctor profile not found:",
          response.status,
          data
        );
      }
    } catch (err) {
      console.error("[DoctorDashboard] Error fetching logged-in doctor:", err);
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

      if (!loggedInDoctor) {
        setError("Doctor profile not found. Please contact support.");
        return;
      }

      const response = await fetch(
        `/api/appointments?doctorId=${loggedInDoctor.id}`
      );
      const data: AppointmentsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to fetch appointments");
      }

      setAppointments(data.data || []);
    } catch (err) {
      console.error("[DoctorDashboard] Error fetching appointments:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load appointments. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (status === "loading" || loading || doctorProfileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect via useEffect
  }

  // Filter appointments
  const now = new Date();
  const upcomingAppointments = appointments
    .filter((apt) => {
      const startTime = new Date(apt.startTime);
      return (
        startTime >= now &&
        apt.status !== AppointmentStatus.CANCELLED &&
        apt.status !== AppointmentStatus.COMPLETED
      );
    })
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    .slice(0, 5); // Show up to 5 upcoming appointments

  const recentAppointments = appointments
    .filter((apt) => {
      const startTime = new Date(apt.startTime);
      return (
        startTime < now ||
        apt.status === AppointmentStatus.COMPLETED ||
        apt.status === AppointmentStatus.CANCELLED
      );
    })
    .sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )
    .slice(0, 5); // Show up to 5 recent appointments

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">MedBook</h1>
          <div className="flex items-center gap-4">
            <UserProfileDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome back!</h2>
          <p className="mt-2 text-gray-600">
            Manage your appointments, availability, and patient information.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
            {error.includes("Doctor profile not found") ? (
              <p className="mt-2 text-sm text-red-700">
                Please contact an administrator to create your doctor profile.
              </p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAppointments}
                className="mt-2"
              >
                Retry
              </Button>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/doctor/availability">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <svg
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Manage Availability
                    </h3>
                    <p className="text-sm text-gray-600">
                      Set your available time slots
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/appointments">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      View All Appointments
                    </h3>
                    <p className="text-sm text-gray-600">
                      See all your appointments
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/profile">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <svg
                      className="h-6 w-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      My Profile
                    </h3>
                    <p className="text-sm text-gray-600">
                      Update your profile information
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        {/* Appointment Statistics */}
        {appointments.length > 0 && (
          <div className="mb-8">
            <AppointmentStatistics appointments={appointments} role="DOCTOR" />
          </div>
        )}

        {/* Upcoming Appointments */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-2xl font-bold text-gray-900">
              Upcoming Appointments
            </h3>
            {upcomingAppointments.length > 0 && (
              <Link href="/appointments">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            )}
          </div>
          {upcomingAppointments.length > 0 ? (
            <AppointmentList
              appointments={upcomingAppointments}
              emptyMessage="No upcoming appointments"
              showPatientEmail={true}
            />
          ) : (
            <Card>
              <div className="py-8 text-center">
                <p className="text-gray-600 mb-4">
                  You don&apos;t have any upcoming appointments.
                </p>
                <Link href="/dashboard/doctor/availability">
                  <Button variant="primary">Set Your Availability</Button>
                </Link>
              </div>
            </Card>
          )}
        </div>

        {/* Recent Appointments */}
        {recentAppointments.length > 0 && (
          <div className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-900">
                Recent Appointments
              </h3>
              <Link href="/appointments">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            <AppointmentList
              appointments={recentAppointments}
              emptyMessage="No recent appointments"
              showPatientEmail={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}
