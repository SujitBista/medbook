"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Input, Card } from "@medbook/ui";
import type { Doctor } from "@/app/admin/types";
import { formatDateLocal } from "@/app/admin/utils/date.utils";
import { ScheduleExceptionType, type ScheduleException } from "@medbook/types";

interface ExceptionsTabProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

type ExceptionFormType = "HOLIDAY_CLOSURE" | "EXTRA_HOURS";

export function ExceptionsTab({ onError, onSuccess }: ExceptionsTabProps) {
  const [exceptionType, setExceptionType] =
    useState<ExceptionFormType>("HOLIDAY_CLOSURE");
  const [scope, setScope] = useState<"ALL_DOCTORS" | "SELECTED_DOCTORS">(
    "ALL_DOCTORS"
  );
  const [selectedDoctorIds, setSelectedDoctorIds] = useState<string[]>([]);
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/doctors?limit=1000", {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to fetch doctors");
      const data = await response.json();
      setDoctors(data.data || []);
    } catch (err) {
      console.error("[ExceptionsTab] Error fetching doctors:", err);
      onError(err instanceof Error ? err.message : "Failed to load doctors");
    }
  }, [onError]);

  const fetchExceptions = useCallback(async () => {
    setExceptionsLoading(true);
    try {
      const response = await fetch("/api/admin/scheduling/exceptions", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (data?.error as { message?: string } | undefined)?.message ||
          "Failed to fetch exceptions";
        throw new Error(message);
      }
      setExceptions(data.data || []);
    } catch (err) {
      console.error("[ExceptionsTab] Error fetching exceptions:", err);
      onError(err instanceof Error ? err.message : "Failed to load exceptions");
    } finally {
      setExceptionsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    fetchDoctors();
    fetchExceptions();
  }, [fetchDoctors, fetchExceptions]);

  const clearErrors = () => setErrors({});

  const isFormValid = (): boolean => {
    if (!dateFrom) return false;
    if (dateMode === "range" && (!dateTo || dateTo < dateFrom)) return false;
    if (scope === "SELECTED_DOCTORS" && selectedDoctorIds.length === 0)
      return false;
    if (exceptionType === "HOLIDAY_CLOSURE") {
      if (!isFullDay && (startTime == null || endTime == null)) return false;
      if (!isFullDay && endTime <= startTime) return false;
    } else {
      if (!startTime || !endTime) return false;
      if (endTime <= startTime) return false;
    }
    return true;
  };

  const getSummaryText = (): string => {
    if (!isFormValid()) return "";
    const typeLabel =
      exceptionType === "EXTRA_HOURS" ? "EXTRA_HOURS" : "Holiday/Closure";
    const doctorCount =
      scope === "ALL_DOCTORS"
        ? "all doctors"
        : `${selectedDoctorIds.length} doctors`;
    const dateStr =
      dateMode === "single" ? dateFrom : `${dateFrom} – ${dateTo}`;
    const timeStr =
      exceptionType === "EXTRA_HOURS" || !isFullDay
        ? `, ${startTime}–${endTime}`
        : " (full day)";
    return `You're adding ${typeLabel} for ${doctorCount} on ${dateStr}${timeStr}.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearErrors();
    if (!isFormValid()) {
      if (!dateFrom)
        setErrors((prev) => ({ ...prev, dateFrom: "Date is required" }));
      if (dateMode === "range" && dateTo < dateFrom)
        setErrors((prev) => ({
          ...prev,
          dateRange: "End date must be on or after start date",
        }));
      if (scope === "SELECTED_DOCTORS" && selectedDoctorIds.length === 0)
        setErrors((prev) => ({
          ...prev,
          doctors: "Select at least one doctor",
        }));
      if (
        (exceptionType === "EXTRA_HOURS" || !isFullDay) &&
        endTime <= startTime
      )
        setErrors((prev) => ({
          ...prev,
          time: "End time must be after start time",
        }));
      return;
    }

    setSubmitting(true);
    onError("");
    try {
      const payload = {
        scope,
        doctorIds: scope === "SELECTED_DOCTORS" ? selectedDoctorIds : undefined,
        dateFrom,
        dateTo: dateMode === "range" ? dateTo : undefined,
        isFullDay: exceptionType === "HOLIDAY_CLOSURE" ? isFullDay : false,
        startTime:
          exceptionType === "EXTRA_HOURS" || !isFullDay ? startTime : null,
        endTime: exceptionType === "EXTRA_HOURS" || !isFullDay ? endTime : null,
        type:
          exceptionType === "EXTRA_HOURS"
            ? ScheduleExceptionType.AVAILABLE
            : ScheduleExceptionType.UNAVAILABLE,
        reason: exceptionType === "EXTRA_HOURS" ? "EXTRA_HOURS" : "HOLIDAY",
        label: reason.trim() || undefined,
      };

      const response = await fetch("/api/admin/scheduling/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to save exception");
      }
      onSuccess("Exception(s) saved successfully.");
      setDateFrom("");
      setDateTo("");
      setReason("");
      setSelectedDoctorIds([]);
      await fetchExceptions();
    } catch (err) {
      console.error("[ExceptionsTab] Error saving exception:", err);
      onError(err instanceof Error ? err.message : "Failed to save exception");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exception?")) return;
    setDeletingId(id);
    onError("");
    try {
      const response = await fetch(`/api/admin/scheduling/exceptions/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to delete exception");
      }
      onSuccess("Exception deleted.");
      await fetchExceptions();
    } catch (err) {
      console.error("[ExceptionsTab] Error deleting exception:", err);
      onError(
        err instanceof Error ? err.message : "Failed to delete exception"
      );
    } finally {
      setDeletingId(null);
    }
  };

  const toggleDoctor = (doctorId: string) => {
    setSelectedDoctorIds((prev) =>
      prev.includes(doctorId)
        ? prev.filter((id) => id !== doctorId)
        : [...prev, doctorId]
    );
    clearErrors();
  };

  const displayDate = (d: Date) =>
    formatDateLocal(typeof d === "string" ? new Date(d) : d);

  return (
    <div className="space-y-8">
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Special Availability
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Add one-time exceptions: holidays/closures (unavailable) or extra
            hours (available).
          </p>
        </div>

        <div className="px-6 py-4">
          {/* Type tabs */}
          <div className="mb-6">
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Exception type
            </span>
            <div
              role="group"
              className="inline-flex rounded-lg border border-gray-300 bg-gray-100 p-0.5"
            >
              <button
                type="button"
                onClick={() => {
                  setExceptionType("HOLIDAY_CLOSURE");
                  setIsFullDay(true);
                  clearErrors();
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  exceptionType === "HOLIDAY_CLOSURE"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Holiday / Closure
              </button>
              <button
                type="button"
                onClick={() => {
                  setExceptionType("EXTRA_HOURS");
                  clearErrors();
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  exceptionType === "EXTRA_HOURS"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Extra Hours
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Applies to */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Applies to
              </span>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === "ALL_DOCTORS"}
                    onChange={() => {
                      setScope("ALL_DOCTORS");
                      setSelectedDoctorIds([]);
                      clearErrors();
                    }}
                    className="mr-2"
                  />
                  All doctors
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="scope"
                    checked={scope === "SELECTED_DOCTORS"}
                    onChange={() => setScope("SELECTED_DOCTORS")}
                    className="mr-2"
                  />
                  Selected doctors
                </label>
              </div>
              {scope === "SELECTED_DOCTORS" && (
                <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-300 p-2">
                  {doctors.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-center gap-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDoctorIds.includes(d.id)}
                        onChange={() => toggleDoctor(d.id)}
                      />
                      {d.userEmail || "N/A"}
                      {d.specialization && ` — ${d.specialization}`}
                    </label>
                  ))}
                </div>
              )}
              {errors.doctors && (
                <p className="mt-1 text-sm text-red-600">{errors.doctors}</p>
              )}
            </div>

            {/* Date mode */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </span>
              <div className="flex gap-4 mb-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={dateMode === "single"}
                    onChange={() => {
                      setDateMode("single");
                      setDateTo("");
                      clearErrors();
                    }}
                    className="mr-2"
                  />
                  Single date
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="dateMode"
                    checked={dateMode === "range"}
                    onChange={() => setDateMode("range")}
                    className="mr-2"
                  />
                  Date range
                </label>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-gray-500">
                    {dateMode === "single" ? "Date" : "From"}
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      clearErrors();
                    }}
                    className={`mt-1 rounded-md border px-3 py-2 text-sm ${
                      errors.dateFrom ? "border-red-500" : "border-gray-300"
                    } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {errors.dateFrom && (
                    <p className="text-sm text-red-600">{errors.dateFrom}</p>
                  )}
                </div>
                {dateMode === "range" && (
                  <div>
                    <label className="block text-xs text-gray-500">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom}
                      onChange={(e) => {
                        setDateTo(e.target.value);
                        clearErrors();
                      }}
                      className={`mt-1 rounded-md border px-3 py-2 text-sm ${
                        errors.dateRange ? "border-red-500" : "border-gray-300"
                      } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    {errors.dateRange && (
                      <p className="text-sm text-red-600">{errors.dateRange}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Time */}
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </span>
              {exceptionType === "HOLIDAY_CLOSURE" && (
                <label className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    checked={isFullDay}
                    onChange={(e) => {
                      setIsFullDay(e.target.checked);
                      clearErrors();
                    }}
                    className="mr-2"
                  />
                  Full day off
                </label>
              )}
              {(exceptionType === "EXTRA_HOURS" || !isFullDay) && (
                <div className="flex gap-4">
                  <div>
                    <label className="block text-xs text-gray-500">Start</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        clearErrors();
                      }}
                      className={`mt-1 rounded-md border px-3 py-2 text-sm ${
                        errors.time ? "border-red-500" : "border-gray-300"
                      } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500">End</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        clearErrors();
                      }}
                      className={`mt-1 rounded-md border px-3 py-2 text-sm ${
                        errors.time ? "border-red-500" : "border-gray-300"
                      } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                  </div>
                </div>
              )}
              {errors.time && (
                <p className="mt-1 text-sm text-red-600">{errors.time}</p>
              )}
            </div>

            {/* Reason */}
            <div>
              <Input
                label="Reason (optional)"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Health camp"
              />
            </div>

            {/* Summary */}
            {isFormValid() && (
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50/60 p-4">
                <p className="text-sm font-medium text-blue-900">
                  {getSummaryText()}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                disabled={!isFormValid() || submitting}
              >
                {submitting ? "Saving…" : "Save exception"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* List */}
      <Card title="Existing exceptions">
        {exceptionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />
          </div>
        ) : exceptions.length === 0 ? (
          <p className="py-8 text-center text-gray-500">
            No exceptions yet. Add one above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Date(s)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Time
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Applies to
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Reason
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {exceptions.map((ex) => (
                  <tr key={ex.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {displayDate(ex.dateFrom) === displayDate(ex.dateTo)
                        ? displayDate(ex.dateFrom)
                        : `${displayDate(ex.dateFrom)} – ${displayDate(ex.dateTo)}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          ex.type === "UNAVAILABLE"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {ex.type === "UNAVAILABLE"
                          ? "Holiday/Closure"
                          : "Extra Hours"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {ex.startTime && ex.endTime
                        ? `${ex.startTime}–${ex.endTime}`
                        : "Full day"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {ex.doctorId == null ? "All doctors" : "Selected"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {ex.label || ex.reason || "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(ex.id)}
                        disabled={deletingId === ex.id}
                      >
                        {deletingId === ex.id ? "Deleting…" : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
