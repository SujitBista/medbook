"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Card, Input } from "@medbook/ui";
import { Doctor } from "@medbook/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AdvancedDoctorFilters } from "@/components/features/AdvancedDoctorFilters";

// Doctor Avatar Component with fallback
function DoctorAvatar({
  profilePictureUrl,
  name,
  initials,
}: {
  profilePictureUrl?: string;
  name: string;
  initials: string;
}) {
  const [imageError, setImageError] = useState(false);

  if (!profilePictureUrl || imageError) {
    return (
      <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-xl font-bold border-2 border-primary-100 shadow-md group-hover:shadow-lg transition-shadow">
        {initials}
      </div>
    );
  }

  return (
    <img
      src={profilePictureUrl}
      alt={name}
      className="h-20 w-20 rounded-full object-cover border-2 border-primary-100 shadow-md group-hover:border-primary-300 transition-colors"
      onError={() => setImageError(true)}
    />
  );
}

// Doctor Price Display Component
function DoctorPriceDisplay({
  doctorId,
  className = "",
}: {
  doctorId: string;
  className?: string;
}) {
  const [appointmentPrice, setAppointmentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/doctors/${doctorId}/price`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.appointmentPrice) {
          setAppointmentPrice(data.data.appointmentPrice);
        }
      })
      .catch((err) => {
        console.error("[DoctorPriceDisplay] Error fetching price:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [doctorId]);

  if (loading || !appointmentPrice) {
    return null;
  }

  return (
    <div className={className}>
      <p className="text-lg font-semibold text-primary-600">
        ${appointmentPrice.toFixed(2)}
        <span className="text-sm font-normal text-gray-500 ml-1">
          per visit
        </span>
      </p>
    </div>
  );
}

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

// Fetcher function for SWR
const fetcher = async (url: string): Promise<DoctorsResponse> => {
  console.log("[Doctors] Fetching doctors:", url);
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch doctors: ${response?.statusText || "Unknown error"}`
    );
  }

  const data: DoctorsResponse = await response.json();

  if (!data.success) {
    throw new Error("Failed to fetch doctors");
  }

  return data;
};

/** Slug to search-friendly string for API (hyphens → spaces) */
function slugToSearchTerm(slug: string): string {
  return slug.trim().replace(/-/g, " ").trim();
}

/** Search term to URL slug (spaces → hyphens, lowercase) */
function searchTermToSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Format YYYY-MM-DD for display (e.g. "Feb 10, 2026" or "Tomorrow") */
function formatScheduleDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  if (isNaN(d.getTime())) return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Parse URL search params: prefer q, department, doctorId; support legacy params */
function getFiltersFromSearchParams(searchParams: URLSearchParams | null): {
  q: string;
  department: string;
  doctorId: string;
} {
  if (!searchParams) return { q: "", department: "", doctorId: "" };
  const q =
    searchParams.get("q") ??
    searchParams.get("specialty") ??
    searchParams.get("specialization") ??
    searchParams.get("search") ??
    "";
  const department = searchParams.get("department") ?? "";
  const doctorId = searchParams.get("doctorId") ?? "";
  const legacyDoctor = searchParams.get("doctor") ?? "";
  const dept =
    department.trim() ||
    (legacyDoctor.trim()
      ? legacyDoctor.trim().toLowerCase().replace(/\s+/g, "-")
      : "");
  return {
    q: q.trim(),
    department: dept,
    doctorId: doctorId.trim(),
  };
}

function DoctorsPageContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFilters = getFiltersFromSearchParams(searchParams);
  const [searchTerm, setSearchTerm] = useState(urlFilters.q);
  const [specializationFilter, setSpecializationFilter] = useState(
    urlFilters.department || urlFilters.q
  );
  const [doctorIdFilter, setDoctorIdFilter] = useState(urlFilters.doctorId);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
  });

  // Sync URL query params into filter state (deep link + refresh support)
  useEffect(() => {
    const next = getFiltersFromSearchParams(searchParams);
    const id = setTimeout(() => {
      setSearchTerm(next.q);
      setSpecializationFilter(next.department || next.q);
      setDoctorIdFilter(next.doctorId);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 0);
    return () => clearTimeout(id);
  }, [searchParams]);

  const [showAllDoctors, setShowAllDoctors] = useState(false);

  const [advancedFilters, setAdvancedFilters] = useState({
    city: "",
    state: "",
    sortBy: "createdAt" as
      | "name"
      | "specialization"
      | "yearsOfExperience"
      | "createdAt",
    sortOrder: "desc" as "asc" | "desc",
  });

  // Build API URL: q → search + specialization (slug to words), department → specialization, doctorId when present
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
    });

    if (searchTerm) {
      params.append("search", searchTerm);
    }
    const specializationValue = slugToSearchTerm(specializationFilter);
    if (specializationValue) {
      params.append("specialization", specializationValue);
    }
    if (doctorIdFilter) {
      params.append("doctorId", doctorIdFilter);
    }

    if (advancedFilters.city) {
      params.append("city", advancedFilters.city);
    }

    if (advancedFilters.state) {
      params.append("state", advancedFilters.state);
    }

    if (advancedFilters.sortBy) {
      params.append("sortBy", advancedFilters.sortBy);
    }

    if (advancedFilters.sortOrder) {
      params.append("sortOrder", advancedFilters.sortOrder);
    }

    if (showAllDoctors) {
      params.append("includeNoSchedule", "true");
    }

    return `/api/doctors?${params.toString()}`;
  }, [
    pagination.page,
    pagination.limit,
    searchTerm,
    specializationFilter,
    doctorIdFilter,
    advancedFilters,
    showAllDoctors,
  ]);

  // Use SWR for data fetching with revalidation options
  const {
    data: responseData,
    error,
    isLoading,
    mutate,
  } = useSWR<DoctorsResponse>(apiUrl, fetcher, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    revalidateOnReconnect: true,
  });

  // Extract doctors and pagination from response
  const doctors = responseData?.data ?? [];
  const paginationData = responseData?.pagination ?? {
    page: pagination.page,
    limit: pagination.limit,
    total: 0,
    totalPages: 0,
  };

  // Helper function to get doctor's full name
  const getDoctorName = (doctor: Doctor): string => {
    if (doctor.userFirstName && doctor.userLastName) {
      return `${doctor.userFirstName} ${doctor.userLastName}`;
    }
    if (doctor.userFirstName) {
      return doctor.userFirstName;
    }
    if (doctor.userLastName) {
      return doctor.userLastName;
    }
    return doctor.userEmail || "Doctor";
  };

  // Helper function to get doctor's initials
  const getDoctorInitials = (doctor: Doctor): string => {
    const name = getDoctorName(doctor);
    if (name === "Doctor") {
      return "D";
    }
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    // Sync filters to URL: "Search by name or email" → q only; specialization → department; doctorId when present
    const params = new URLSearchParams();
    if (searchTerm.trim()) {
      params.set("q", searchTerm.trim());
    }
    if (specializationFilter.trim()) {
      params.set("department", searchTermToSlug(specializationFilter));
    }
    if (doctorIdFilter.trim()) {
      params.set("doctorId", doctorIdFilter.trim());
    }
    const query = params.toString();
    router.replace(query ? `/doctors?${query}` : "/doctors");
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAdvancedFiltersChange = (filters: typeof advancedFilters) => {
    setAdvancedFilters(filters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Get unique specializations for filter from current data
  const specializations = Array.from(
    new Set(doctors.map((d) => d.specialization).filter(Boolean))
  );

  // Format error message
  const errorMessage = error
    ? error instanceof Error
      ? error.message
      : "Failed to load doctors. Please try again."
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/">
              <h1 className="text-xl font-bold text-gray-900">MedBook</h1>
            </Link>
            <div className="flex items-center gap-4">
              {session ? (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
        <div className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Find Your Doctor
            </h1>
            <p className="mt-6 text-lg leading-8 text-primary-100 max-w-2xl mx-auto">
              Book appointments with qualified healthcare professionals. Browse
              our network of doctors and find the right specialist for your
              needs.
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mb-8 shadow-lg">
          <form
            onSubmit={handleSearch}
            className="space-y-4 md:space-y-0 md:flex md:gap-4"
          >
            <div className="flex-1">
              <Input
                label="Search by name or email"
                type="text"
                placeholder="Search doctors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="md:w-64">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <select
                value={specializationFilter}
                onChange={(e) => {
                  setSpecializationFilter(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                variant="primary"
                className="w-full md:w-auto"
              >
                Search
              </Button>
            </div>
          </form>

          {/* Show all doctors toggle */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showAllDoctors}
                onChange={(e) => {
                  setShowAllDoctors(e.target.checked);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show all doctors (including those without schedule)
              </span>
            </label>
          </div>
        </Card>

        {/* Advanced Filters */}
        <AdvancedDoctorFilters
          filters={advancedFilters}
          onFiltersChange={handleAdvancedFiltersChange}
          doctors={doctors}
        />

        {/* Error State */}
        {errorMessage && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200">
            <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600"></div>
              <p className="mt-4 text-gray-600">Loading doctors...</p>
            </div>
          </div>
        )}

        {/* Doctors Grid */}
        {!isLoading && !errorMessage && (
          <>
            {doctors.length === 0 ? (
              <Card>
                <div className="py-16 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    No doctors found
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    {searchTerm || specializationFilter || doctorIdFilter
                      ? "Try adjusting your search filters."
                      : showAllDoctors
                        ? "No doctors are currently available."
                        : 'No doctors have upcoming schedules. Try "Show all doctors".'}
                  </p>
                  {(searchTerm || specializationFilter || doctorIdFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setSpecializationFilter("");
                        setDoctorIdFilter("");
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="mt-4"
                    >
                      Clear filters
                    </Button>
                  )}
                  {!showAllDoctors &&
                    !searchTerm &&
                    !specializationFilter &&
                    !doctorIdFilter && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setShowAllDoctors(true);
                          setPagination((prev) => ({ ...prev, page: 1 }));
                        }}
                        className="mt-4"
                      >
                        Show all doctors
                      </Button>
                    )}
                </div>
              </Card>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {doctors.length} of {paginationData.total} doctors
                  </p>
                  {!session && (
                    <Link href="/login">
                      <Button variant="outline" size="sm">
                        Sign In to Book
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {doctors.map((doctor) => {
                    const doctorName = getDoctorName(doctor);
                    const doctorInitials = getDoctorInitials(doctor);

                    return (
                      <Card
                        key={doctor.id}
                        className="hover:shadow-xl transition-all duration-300 overflow-hidden group border border-gray-200"
                      >
                        <div className="p-6">
                          {/* Doctor Avatar and Name */}
                          <div className="flex items-start gap-4 mb-4">
                            <div className="flex-shrink-0">
                              <DoctorAvatar
                                profilePictureUrl={doctor.profilePictureUrl}
                                name={doctorName}
                                initials={doctorInitials}
                              />
                            </div>
                            <div className="flex-1 min-w-0 pt-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-700 transition-colors">
                                  {doctorName}
                                </h3>
                                {showAllDoctors &&
                                  doctor.hasSchedule === false && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                                      No schedule available
                                    </span>
                                  )}
                              </div>
                              {doctor.specialization && (
                                <p className="text-sm text-primary-600 font-medium mt-1">
                                  {doctor.specialization}
                                </p>
                              )}
                              {doctor.nextScheduleDate &&
                                (doctor.nextScheduleStartTime != null ||
                                  doctor.nextScheduleEndTime != null) && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Next available:{" "}
                                    {formatScheduleDate(
                                      doctor.nextScheduleDate
                                    )}{" "}
                                    {[
                                      doctor.nextScheduleStartTime,
                                      doctor.nextScheduleEndTime,
                                    ]
                                      .filter(Boolean)
                                      .join("–")}
                                    {doctor.remainingTokens != null &&
                                      doctor.remainingTokens >= 0 && (
                                        <span className="text-gray-500">
                                          {" "}
                                          ({doctor.remainingTokens} spots left)
                                        </span>
                                      )}
                                  </p>
                                )}
                              {doctor.nextScheduleDate &&
                                !doctor.nextScheduleStartTime &&
                                !doctor.nextScheduleEndTime && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    Next available:{" "}
                                    {formatScheduleDate(
                                      doctor.nextScheduleDate
                                    )}
                                  </p>
                                )}
                              {doctor.yearsOfExperience && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {doctor.yearsOfExperience}{" "}
                                  {doctor.yearsOfExperience === 1
                                    ? "year"
                                    : "years"}{" "}
                                  of experience
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Bio */}
                          {doctor.bio && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">
                              {doctor.bio}
                            </p>
                          )}

                          {/* Location (if available) */}
                          {(doctor.city || doctor.state) && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                              <span>
                                {[doctor.city, doctor.state]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                            </div>
                          )}

                          {/* Appointment Price */}
                          <DoctorPriceDisplay
                            doctorId={doctor.id}
                            className="mb-4"
                          />

                          {/* Action Button */}
                          {showAllDoctors && doctor.hasSchedule === false ? (
                            <Link href={`/doctors/${doctor.id}`}>
                              <Button
                                variant="outline"
                                className="w-full group-hover:shadow-md transition-all"
                              >
                                View Profile
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/doctors/${doctor.id}`}>
                              <Button
                                variant="primary"
                                className="w-full group-hover:shadow-md transition-all"
                                onClick={() => {
                                  if (!session) {
                                    router.push(
                                      `/login?callbackUrl=/doctors/${doctor.id}`
                                    );
                                  }
                                }}
                              >
                                {!session
                                  ? "View Profile"
                                  : session.user?.role === "PATIENT"
                                    ? "Book Appointment"
                                    : "View Profile"}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Pagination */}
                {paginationData.totalPages > 1 && (
                  <div className="mt-12 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(paginationData.page - 1)}
                      disabled={paginationData.page === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from(
                        { length: paginationData.totalPages },
                        (_, i) => i + 1
                      )
                        .filter(
                          (page) =>
                            page === 1 ||
                            page === paginationData.totalPages ||
                            (page >= paginationData.page - 1 &&
                              page <= paginationData.page + 1)
                        )
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-500">...</span>
                            )}
                            <Button
                              variant={
                                page === paginationData.page
                                  ? "primary"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(paginationData.page + 1)}
                      disabled={
                        paginationData.page >= paginationData.totalPages
                      }
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Call to Action Section */}
      {!session && (
        <div className="bg-gray-50 border-t border-gray-200 mt-16">
          <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Ready to book an appointment?
              </h2>
              <p className="mt-2 text-gray-600">
                Sign in or create an account to book appointments with our
                doctors.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button variant="primary" size="lg">
                    Create Account
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DoctorsPageFallback() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-primary-600" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

export default function DoctorsPage() {
  return (
    <React.Suspense fallback={<DoctorsPageFallback />}>
      <DoctorsPageContent />
    </React.Suspense>
  );
}
