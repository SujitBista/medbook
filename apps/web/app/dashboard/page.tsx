"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@medbook/ui";
import { Doctor } from "@medbook/types";
import { UserProfileDropdown } from "@/components/layout/UserProfileDropdown";
import Link from "next/link";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

interface DoctorsResponse {
  success: boolean;
  data: Doctor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Redirect based on role
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard");
    } else if (status === "authenticated" && session?.user?.role === "ADMIN") {
      // Redirect admins to admin dashboard
      router.push("/admin");
    } else if (
      status === "authenticated" &&
      session?.user?.role === "PATIENT"
    ) {
      // Redirect patients to patient dashboard
      router.push("/dashboard/patient");
    }
  }, [status, session, router]);

  // Fetch doctors (for doctors only - patients and admins are redirected)
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "DOCTOR") {
      fetchDoctors();
    } else if (status === "authenticated") {
      // For patients and admins, don't fetch doctors here (they're redirected)
      setLoading(false);
    }
  }, [status, session, pagination.page, searchTerm, specializationFilter]);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      if (specializationFilter) {
        params.append("specialization", specializationFilter);
      }

      console.log("[Dashboard] Fetching doctors:", params.toString());

      const response = await fetch(`${API_URL}/doctors?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch doctors: ${response.statusText}`);
      }

      const data: DoctorsResponse = await response.json();

      if (data.success) {
        setDoctors(data.data);
        setPagination(data.pagination);
      } else {
        throw new Error("Failed to fetch doctors");
      }
    } catch (err) {
      console.error("[Dashboard] Error fetching doctors:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load doctors. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchDoctors();
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // Will redirect via useEffect
  }

  // Show loading or redirect message for admins and patients (they're redirected)
  if (
    status === "authenticated" &&
    (session?.user?.role === "ADMIN" || session?.user?.role === "PATIENT")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">
            {session?.user?.role === "ADMIN"
              ? "Redirecting to admin dashboard..."
              : "Redirecting to patient dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">MedBook</h1>
          <div className="flex items-center gap-4">
            {session && (
              <span className="text-sm text-gray-600">
                {session.user.email} ({session.user.role})
              </span>
            )}
            <div className="flex gap-2">
              {session?.user?.role === "DOCTOR" && (
                <>
                  <Link href="/dashboard/doctor/availability">
                    <Button variant="outline" size="sm">
                      Manage Availability
                    </Button>
                  </Link>
                  <Link href="/appointments">
                    <Button variant="outline" size="sm">
                      My Appointments
                    </Button>
                  </Link>
                </>
              )}
              <Link href="/">
                <Button variant="outline" size="sm">
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Doctor Directory
              </h2>
              <p className="mt-2 text-gray-600">
                Browse and search for doctors to book appointments
              </p>
            </div>
            {session?.user?.role === "DOCTOR" && (
              <Link href="/appointments">
                <Button variant="primary">View My Appointments</Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Input
                  label="Search by email"
                  type="text"
                  placeholder="Enter doctor email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <Input
                  label="Filter by specialization"
                  type="text"
                  placeholder="e.g., Cardiology, Neurology..."
                  value={specializationFilter}
                  onChange={(e) => setSpecializationFilter(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="primary" className="w-full">
                  Search
                </Button>
              </div>
            </div>
          </form>
        </Card>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDoctors}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading doctors...</p>
            </div>
          </div>
        )}

        {/* Doctors List */}
        {!loading && !error && (
          <>
            {doctors.length === 0 ? (
              <Card>
                <div className="py-12 text-center">
                  <p className="text-gray-600">No doctors found.</p>
                  {searchTerm || specializationFilter ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setSpecializationFilter("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="mt-4"
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              </Card>
            ) : (
              <>
                <div className="mb-4 text-sm text-gray-600">
                  Showing {doctors.length} of {pagination.total} doctors
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {doctors.map((doctor) => (
                    <Card
                      key={doctor.id}
                      title={doctor.specialization || "General Practitioner"}
                      footer={
                        <Link href={`/doctors/${doctor.id}`}>
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                          >
                            Book Appointment
                          </Button>
                        </Link>
                      }
                    >
                      <div className="space-y-2">
                        <div>
                          {doctor.userEmail && (
                            <p className="text-sm font-medium text-gray-900">
                              {doctor.userEmail}
                            </p>
                          )}
                          {doctor.bio && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                              {doctor.bio}
                            </p>
                          )}
                        </div>
                        <div className="pt-2 text-xs text-gray-500">
                          <p>
                            Joined:{" "}
                            {new Date(doctor.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
