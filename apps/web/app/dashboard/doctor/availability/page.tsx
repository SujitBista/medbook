"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@medbook/ui";
import { Availability, CreateAvailabilityInput } from "@medbook/types";
import Link from "next/link";

interface Doctor {
  id: string;
  userId: string;
}

interface AvailabilitiesResponse {
  success: boolean;
  availabilities: Availability[];
}

interface AvailabilityResponse {
  success: boolean;
  availability: Availability;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

/**
 * Formats a Date object to datetime-local input format (YYYY-MM-DDTHH:mm)
 * Uses local timezone, not UTC
 */
function formatDateTimeLocal(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats a Date object to date input format (YYYY-MM-DD)
 * Uses local timezone, not UTC
 */
function formatDateLocal(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function AvailabilityManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    doctorId: string;
    startTime: string;
    endTime: string;
    isRecurring: boolean;
    dayOfWeek?: number;
    validFrom?: string;
    validTo?: string;
  }>({
    doctorId: "",
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date().toISOString().slice(0, 16),
    isRecurring: false,
    dayOfWeek: undefined,
    validFrom: undefined,
    validTo: undefined,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/doctor/availability");
    } else if (status === "authenticated" && session?.user?.role !== "DOCTOR") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  // Fetch doctor and availabilities
  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchDoctorAndAvailabilities();
    }
  }, [status, session, filterStartDate, filterEndDate]);

  const fetchDoctorAndAvailabilities = async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }
      setError(null);

      // Fetch doctor by user ID
      const doctorResponse = await fetch(
        `/api/doctors/user/${session?.user?.id}`
      );
      if (!doctorResponse.ok) {
        throw new Error("Failed to fetch doctor profile");
      }
      const doctorData = await doctorResponse.json();
      if (!doctorData.success || !doctorData.doctor) {
        throw new Error("Doctor profile not found");
      }
      setDoctor(doctorData.doctor);

      // Fetch availabilities
      const params = new URLSearchParams({ doctorId: doctorData.doctor.id });
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const availResponse = await fetch(
        `/api/availability?${params.toString()}`
      );
      if (!availResponse.ok) {
        throw new Error("Failed to fetch availabilities");
      }
      const availData: AvailabilitiesResponse = await availResponse.json();
      if (availData.success) {
        console.log(
          "[AvailabilityManagement] Fetched availabilities:",
          availData.availabilities.length
        );
        setAvailabilities(availData.availabilities);
      } else {
        console.warn(
          "[AvailabilityManagement] API returned success=false:",
          availData
        );
      }
    } catch (err) {
      console.error("[AvailabilityManagement] Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load availability data. Please try again."
      );
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "isRecurring") {
      setFormData((prev) => ({
        ...prev,
        isRecurring: checked,
        dayOfWeek: checked ? prev.dayOfWeek : undefined,
        validFrom: checked ? prev.validFrom : undefined,
        validTo: checked ? prev.validTo : undefined,
      }));
    } else if (name === "dayOfWeek") {
      setFormData((prev) => ({
        ...prev,
        dayOfWeek: value ? parseInt(value, 10) : undefined,
      }));
    } else if (name === "validFrom" || name === "validTo") {
      setFormData((prev) => ({
        ...prev,
        [name]: value || undefined,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.startTime) {
      errors.startTime = "Start time is required";
    }
    if (!formData.endTime) {
      errors.endTime = "End time is required";
    }
    if (formData.startTime && formData.endTime) {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (end <= start) {
        errors.endTime = "End time must be after start time";
      }
    }
    if (formData.isRecurring && formData.dayOfWeek === undefined) {
      errors.dayOfWeek = "Day of week is required for recurring availability";
    }
    if (formData.isRecurring && !formData.validFrom) {
      errors.validFrom = "Start date is required for recurring availability";
    }
    if (
      formData.isRecurring &&
      formData.validFrom &&
      formData.validTo &&
      new Date(formData.validTo) <= new Date(formData.validFrom)
    ) {
      errors.validTo = "End date must be after start date";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !doctor) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload: CreateAvailabilityInput = {
        doctorId: doctor.id,
        startTime: new Date(formData.startTime!),
        endTime: new Date(formData.endTime!),
        isRecurring: formData.isRecurring || false,
        dayOfWeek: formData.isRecurring ? formData.dayOfWeek : undefined,
        validFrom:
          formData.isRecurring && formData.validFrom
            ? new Date(formData.validFrom)
            : undefined,
        validTo:
          formData.isRecurring && formData.validTo
            ? new Date(formData.validTo)
            : undefined,
      };

      const url = editingId
        ? `/api/availability/${editingId}`
        : "/api/availability";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to save availability");
      }

      // Reset form and refresh list (skip loading state to avoid flicker)
      setShowForm(false);
      setEditingId(null);
      resetForm();
      await fetchDoctorAndAvailabilities(true);
    } catch (err) {
      console.error("[AvailabilityManagement] Error saving:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save availability. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (availability: Availability) => {
    setEditingId(availability.id);
    // For recurring schedules, startTime/endTime represent the time of day
    // For one-time schedules, they represent the full datetime
    const startDate = new Date(availability.startTime);
    const endDate = new Date(availability.endTime);

    setFormData({
      doctorId: availability.doctorId,
      startTime: availability.isRecurring
        ? `${formatDateLocal(new Date())}T${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`
        : formatDateTimeLocal(startDate),
      endTime: availability.isRecurring
        ? `${formatDateLocal(new Date())}T${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`
        : formatDateTimeLocal(endDate),
      isRecurring: availability.isRecurring,
      dayOfWeek: availability.dayOfWeek,
      validFrom: availability.validFrom
        ? formatDateLocal(availability.validFrom)
        : undefined,
      validTo: availability.validTo
        ? formatDateLocal(availability.validTo)
        : undefined,
    });
    setShowForm(true);
    setFormErrors({});
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this availability?")) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/availability/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to delete availability");
      }

      await fetchDoctorAndAvailabilities(true);
    } catch (err) {
      console.error("[AvailabilityManagement] Error deleting:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete availability. Please try again."
      );
    }
  };

  const resetForm = () => {
    setFormData({
      doctorId: doctor?.id || "",
      startTime: new Date().toISOString().slice(0, 16),
      endTime: new Date().toISOString().slice(0, 16),
      isRecurring: false,
      dayOfWeek: undefined,
      validFrom: undefined,
      validTo: undefined,
    });
    setFormErrors({});
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    resetForm();
  };

  const formatDateTime = (date: Date | string) => {
    return new Date(date).toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading" || loading) {
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

  if (session?.user?.role !== "DOCTOR") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            Only doctors can manage availability.
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
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Manage Availability
          </h2>
          <p className="mt-2 text-gray-600">
            Set your available time slots for appointments
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Filters */}
        <Card title="Filter Availability" className="mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Start Date"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
            <Input
              label="End Date"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Create/Edit Form */}
        {showForm && (
          <Card
            title={editingId ? "Edit Availability" : "Add New Availability"}
            className="mb-6"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Start Time"
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleFormChange}
                  error={formErrors.startTime}
                  required
                />
                <Input
                  label="End Time"
                  type="datetime-local"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleFormChange}
                  error={formErrors.endTime}
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isRecurring"
                  name="isRecurring"
                  checked={formData.isRecurring || false}
                  onChange={handleFormChange}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label
                  htmlFor="isRecurring"
                  className="ml-2 text-sm font-medium text-gray-700"
                >
                  Recurring schedule
                </label>
              </div>

              {formData.isRecurring && (
                <>
                  <div>
                    <label
                      htmlFor="dayOfWeek"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Day of Week
                    </label>
                    <select
                      id="dayOfWeek"
                      name="dayOfWeek"
                      value={formData.dayOfWeek ?? ""}
                      onChange={handleFormChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select day</option>
                      {DAYS_OF_WEEK.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.dayOfWeek && (
                      <p className="mt-1 text-sm text-red-600">
                        {formErrors.dayOfWeek}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input
                      label="Valid From (Start Date)"
                      type="date"
                      name="validFrom"
                      value={formData.validFrom || ""}
                      onChange={handleFormChange}
                      error={formErrors.validFrom}
                    />
                    <Input
                      label="Valid To (End Date)"
                      type="date"
                      name="validTo"
                      value={formData.validTo || ""}
                      onChange={handleFormChange}
                      error={formErrors.validTo}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-4">
                <Button type="submit" variant="primary" disabled={submitting}>
                  {submitting
                    ? "Saving..."
                    : editingId
                      ? "Update Availability"
                      : "Add Availability"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Add Button */}
        {!showForm && (
          <div className="mb-6">
            <Button
              variant="primary"
              onClick={() => {
                setShowForm(true);
                setEditingId(null);
                resetForm();
              }}
            >
              Add New Availability
            </Button>
          </div>
        )}

        {/* Availability List */}
        <div className="space-y-4">
          {availabilities.length === 0 ? (
            <Card>
              <div className="py-12 text-center">
                <p className="text-gray-600">No availability slots found.</p>
                {filterStartDate || filterEndDate ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterStartDate("");
                      setFilterEndDate("");
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
              <div className="text-sm text-gray-600">
                Showing {availabilities.length} availability slot
                {availabilities.length !== 1 ? "s" : ""}
              </div>
              {availabilities.map((availability) => (
                <Card key={availability.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-gray-900">
                            Start:
                          </span>{" "}
                          <span className="text-gray-700">
                            {formatDateTime(availability.startTime)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">
                            End:
                          </span>{" "}
                          <span className="text-gray-700">
                            {formatDateTime(availability.endTime)}
                          </span>
                        </div>
                        {availability.isRecurring && (
                          <>
                            {availability.dayOfWeek !== undefined && (
                              <div>
                                <span className="font-medium text-gray-900">
                                  Day:
                                </span>{" "}
                                <span className="text-gray-700">
                                  {
                                    DAYS_OF_WEEK.find(
                                      (d) => d.value === availability.dayOfWeek
                                    )?.label
                                  }
                                </span>
                              </div>
                            )}
                            {availability.validFrom && (
                              <div>
                                <span className="font-medium text-gray-900">
                                  Valid From:
                                </span>{" "}
                                <span className="text-gray-700">
                                  {new Date(
                                    availability.validFrom
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {availability.validTo && (
                              <div>
                                <span className="font-medium text-gray-900">
                                  Valid To:
                                </span>{" "}
                                <span className="text-gray-700">
                                  {new Date(
                                    availability.validTo
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        <div>
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            {availability.isRecurring
                              ? "Recurring"
                              : "One-time"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(availability)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(availability.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
