"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Appointment, AppointmentStatus } from "@medbook/types";
import { AppointmentList } from "@/components/features/appointment";
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

export default function PatientDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated or not a patient
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/patient");
    } else if (
      status === "authenticated" &&
      session?.user?.role !== "PATIENT"
    ) {
      // Redirect non-patients to appropriate dashboard
      if (session?.user?.role === "ADMIN") {
        router.push("/admin");
      } else if (session?.user?.role === "DOCTOR") {
        router.push("/dashboard");
      } else {
        router.push("/");
      }
    }
  }, [status, session, router]);

  // Fetch appointments
  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user?.id &&
      session?.user?.role === "PATIENT"
    ) {
      fetchAppointments();
    }
  }, [status, session?.user?.id]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = session?.user?.id;
      if (!userId) return;

      const response = await fetch(`/api/appointments?patientId=${userId}`);
      const data: AppointmentsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to fetch appointments");
      }

      setAppointments(data.data || []);
    } catch (err) {
      console.error("[PatientDashboard] Error fetching appointments:", err);
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
  if (status === "loading" || loading) {
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
            Manage your appointments and find doctors to book new appointments.
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link href="/doctors">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                    <svg
                      className="h-6 w-6 text-primary-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Book Appointment
                    </h3>
                    <p className="text-sm text-gray-600">
                      Find and book with a doctor
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

          <Link href="/doctors">
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
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Browse Doctors
                    </h3>
                    <p className="text-sm text-gray-600">
                      Search for doctors by specialty
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        </div>

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
              showDoctorInfo={true}
            />
          ) : (
            <Card>
              <div className="py-8 text-center">
                <p className="text-gray-600 mb-4">
                  You don't have any upcoming appointments.
                </p>
                <Link href="/doctors">
                  <Button variant="primary">Book Your First Appointment</Button>
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
              showDoctorInfo={true}
            />
          </div>
        )}
      </main>
    </div>
  );
}
