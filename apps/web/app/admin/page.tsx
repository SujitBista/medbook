"use client";

import { useEffect, useState, Suspense, useCallback, useMemo } from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import {
  UserRole,
  Availability,
  CreateAvailabilityInput,
  SlotTemplate,
} from "@medbook/types";
import { Button, Input, Card } from "@medbook/ui";
import { TimePicker } from "@/components/forms/TimePicker";

// Mark this page as dynamic to prevent pre-rendering
export const dynamic = "force-dynamic";

interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

interface SystemStats {
  totalUsers: number;
  usersByRole: {
    PATIENT: number;
    DOCTOR: number;
    ADMIN: number;
  };
}

interface Doctor {
  id: string;
  userId: string;
  specialization?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
  userEmail?: string;
}

interface DoctorStats {
  totalDoctors: number;
  doctorsBySpecialization: Record<string, number>;
}

type TabType = "general" | "manage-doctor";

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
 * Converts a UTC date string/Date to local time Date object
 * This ensures proper timezone conversion when dates come from backend (UTC)
 */
function utcToLocalDate(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  // If it's already a Date object from a UTC string, it's correctly parsed
  // getHours() and getMinutes() will return local time values
  return d;
}

/**
 * Formats a Date object to datetime-local input format (YYYY-MM-DDTHH:mm)
 * Converts UTC dates from backend to local time for display in input fields
 */
function formatDateTimeLocal(date: Date | string): string {
  const d = utcToLocalDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  // getHours() and getMinutes() return local time values
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats a Date object to date input format (YYYY-MM-DD)
 * Converts UTC dates from backend to local time for display
 */
function formatDateLocal(date: Date | string): string {
  const d = utcToLocalDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats time for display in local timezone (12-hour format with AM/PM)
 * Converts UTC time from backend to local time for display
 */
function formatTimeLocal(date: Date | string): string {
  const d = utcToLocalDate(date);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Converts a datetime-local input value (local time) to UTC Date
 * datetime-local inputs provide values in local time (e.g., "2024-01-15T14:30")
 * This function ensures they're properly converted to UTC when creating Date objects
 */
function localToUtcDate(localDateTimeString: string): Date {
  // datetime-local format: "YYYY-MM-DDTHH:mm"
  // When we create new Date() from this, JavaScript interprets it as local time
  // When serialized to JSON, it automatically converts to UTC (ISO string)
  return new Date(localDateTimeString);
}

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<UserRole>(UserRole.PATIENT);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [doctorFormData, setDoctorFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    bio: "",
  });
  const [doctorFormErrors, setDoctorFormErrors] = useState<
    Record<string, string>
  >({});
  const [doctorFormLoading, setDoctorFormLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Doctor management state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorStats | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [specializationFilter, setSpecializationFilter] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [editDoctorData, setEditDoctorData] = useState({
    specialization: "",
    bio: "",
  });
  const [editDoctorLoading, setEditDoctorLoading] = useState(false);
  const [editDoctorErrors, setEditDoctorErrors] = useState<
    Record<string, string>
  >({});

  // Schedule management state
  const [selectedDoctorForSchedule, setSelectedDoctorForSchedule] =
    useState<Doctor | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [availabilitiesLoading, setAvailabilitiesLoading] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(
    null
  );
  const [scheduleFormData, setScheduleFormData] = useState<{
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
  const [scheduleFormErrors, setScheduleFormErrors] = useState<
    Record<string, string>
  >({});
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleFilterStartDate, setScheduleFilterStartDate] = useState("");
  const [scheduleFilterEndDate, setScheduleFilterEndDate] = useState("");
  // SlotTemplate state
  const [slotTemplate, setSlotTemplate] = useState<SlotTemplate | null>(null);
  const [slotTemplateLoading, setSlotTemplateLoading] = useState(false);
  const [showSlotTemplateForm, setShowSlotTemplateForm] = useState(false);
  const [slotTemplateFormData, setSlotTemplateFormData] = useState({
    durationMinutes: 30,
    bufferMinutes: 0,
    advanceBookingDays: 30,
  });
  // Improved scheduling state
  const [schedulingMode, setSchedulingMode] = useState<
    "timeRange" | "individual"
  >("timeRange");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [useDateRange, setUseDateRange] = useState(false);
  const [dateRangeStart, setDateRangeStart] = useState("");
  const [dateRangeEnd, setDateRangeEnd] = useState("");
  const [timeRangeStart, setTimeRangeStart] = useState("09:00");
  const [timeRangeEnd, setTimeRangeEnd] = useState("17:00");
  const [previewSlots, setPreviewSlots] = useState<
    Array<{ start: string; end: string }>
  >([]);
  const [selectedIndividualSlots, setSelectedIndividualSlots] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    fetchData();
    fetchDoctors();
    fetchDoctorStats();
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, specializationFilter]);

  const fetchAvailabilities = useCallback(async () => {
    if (!selectedDoctorForSchedule) return;

    try {
      setAvailabilitiesLoading(true);
      const params = new URLSearchParams({
        doctorId: selectedDoctorForSchedule.id,
      });
      if (scheduleFilterStartDate)
        params.append("startDate", scheduleFilterStartDate);
      if (scheduleFilterEndDate)
        params.append("endDate", scheduleFilterEndDate);

      const response = await fetch(`/api/availability?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch availabilities");
      }

      const data = await response.json();
      if (data.success) {
        setAvailabilities(data.availabilities || []);
      }
    } catch (err) {
      console.error("[AdminDashboard] Error fetching availabilities:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load availability data"
      );
    } finally {
      setAvailabilitiesLoading(false);
    }
  }, [
    selectedDoctorForSchedule,
    scheduleFilterStartDate,
    scheduleFilterEndDate,
  ]);

  useEffect(() => {
    if (selectedDoctorForSchedule) {
      fetchAvailabilities();
      fetchSlotTemplate();
      // Update search query to show selected doctor (only when doctor changes, not filters)
      // Check if this is a doctor change by comparing previous values
      const isDoctorChange = !scheduleFilterStartDate && !scheduleFilterEndDate;
      if (isDoctorChange) {
        setDoctorSearchQuery(
          `${selectedDoctorForSchedule.userEmail || "N/A"}${selectedDoctorForSchedule.specialization ? ` - ${selectedDoctorForSchedule.specialization}` : ""}`
        );
      }
    } else {
      setAvailabilities([]);
      setSlotTemplate(null);
    }
  }, [
    selectedDoctorForSchedule,
    scheduleFilterStartDate,
    scheduleFilterEndDate,
    fetchAvailabilities,
  ]);

  const fetchSlotTemplate = async () => {
    if (!selectedDoctorForSchedule) return;

    try {
      setSlotTemplateLoading(true);
      const response = await fetch(
        `/api/slots/template/${selectedDoctorForSchedule.id}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch slot template");
      }
      const data = await response.json();
      if (data.success && data.template) {
        setSlotTemplate(data.template);
        setSlotTemplateFormData({
          durationMinutes: data.template.durationMinutes,
          bufferMinutes: data.template.bufferMinutes,
          advanceBookingDays: data.template.advanceBookingDays,
        });
      }
    } catch (err) {
      console.error("[AdminDashboard] Error fetching slot template:", err);
    } finally {
      setSlotTemplateLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch users and stats in parallel
      const [usersResponse, statsResponse] = await Promise.all([
        fetch("/api/admin/users", {
          headers: {
            "Content-Type": "application/json",
          },
        }),
        fetch("/api/admin/stats", {
          headers: {
            "Content-Type": "application/json",
          },
        }),
      ]);

      if (!usersResponse.ok || !statsResponse.ok) {
        throw new Error("Failed to fetch admin data");
      }

      const usersData = await usersResponse.json();
      const statsData = await statsResponse.json();

      setUsers(usersData.users || []);
      setStats(statsData.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to update role");
      }

      // Refresh data
      await fetchData();
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to delete user");
      }

      // Refresh data
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  const handleDoctorFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setDoctorFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (doctorFormErrors[name]) {
      setDoctorFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    // If password or confirmPassword changes, check if they match
    if (name === "password" || name === "confirmPassword") {
      const password = name === "password" ? value : doctorFormData.password;
      const confirmPassword =
        name === "confirmPassword" ? value : doctorFormData.confirmPassword;
      // Clear confirmPassword error if passwords now match
      if (
        doctorFormErrors.confirmPassword &&
        password === confirmPassword &&
        password !== ""
      ) {
        setDoctorFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.confirmPassword;
          return newErrors;
        });
      }
    }
  };

  const handleDoctorFormSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setDoctorFormLoading(true);
    setDoctorFormErrors({});
    setError(null);
    setSuccessMessage(null);

    // Validate password match
    if (doctorFormData.password !== doctorFormData.confirmPassword) {
      setDoctorFormErrors({
        confirmPassword: "Passwords do not match",
      });
      setDoctorFormLoading(false);
      return;
    }

    try {
      console.log("[AdminDashboard] Registering doctor:", {
        email: doctorFormData.email,
      });

      const response = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: doctorFormData.email,
          password: doctorFormData.password,
          specialization: doctorFormData.specialization || undefined,
          bio: doctorFormData.bio || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (data.error?.details?.errors) {
          setDoctorFormErrors(data.error.details.errors);
          throw new Error(data.error.message || "Validation failed");
        }
        throw new Error(data.error?.message || "Failed to register doctor");
      }

      console.log("[AdminDashboard] Doctor registered successfully:", data);

      // Reset form
      setDoctorFormData({
        email: "",
        password: "",
        confirmPassword: "",
        specialization: "",
        bio: "",
      });
      setShowDoctorForm(false);
      setSuccessMessage(`Doctor ${data.user.email} registered successfully!`);

      // Refresh data
      await fetchData();
      await fetchDoctors();
      await fetchDoctorStats();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error registering doctor:", err);
      setError(
        err instanceof Error ? err.message : "Failed to register doctor"
      );
    } finally {
      setDoctorFormLoading(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      setDoctorsLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (specializationFilter)
        queryParams.append("specialization", specializationFilter);
      queryParams.append("limit", "100"); // Get more doctors for admin view

      const response = await fetch(
        `/api/admin/doctors?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch doctors");
      }

      const data = await response.json();
      setDoctors(data.data || []);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching doctors:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch doctors");
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchDoctorStats = async () => {
    try {
      const response = await fetch("/api/admin/doctors/stats", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch doctor stats");
      }

      const data = await response.json();
      setDoctorStats(data.stats || null);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching doctor stats:", err);
      // Don't set error for stats, just log it
    }
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setEditDoctorData({
      specialization: doctor.specialization || "",
      bio: doctor.bio || "",
    });
    setEditDoctorErrors({});
  };

  const handleUpdateDoctor = async () => {
    if (!selectedDoctor) return;

    setEditDoctorLoading(true);
    setEditDoctorErrors({});
    setError(null);

    try {
      const response = await fetch(`/api/admin/doctors/${selectedDoctor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          specialization: editDoctorData.specialization || undefined,
          bio: editDoctorData.bio || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.details?.errors) {
          setEditDoctorErrors(data.error.details.errors);
          throw new Error(data.error.message || "Validation failed");
        }
        throw new Error(data.error?.message || "Failed to update doctor");
      }

      setSuccessMessage("Doctor updated successfully!");
      setSelectedDoctor(null);
      await fetchDoctors();
      await fetchDoctorStats();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error updating doctor:", err);
      setError(err instanceof Error ? err.message : "Failed to update doctor");
    } finally {
      setEditDoctorLoading(false);
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this doctor? This will also delete their user account."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/doctors/${doctorId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to delete doctor");
      }

      setSuccessMessage("Doctor deleted successfully!");
      await fetchDoctors();
      await fetchDoctorStats();
      await fetchData(); // Refresh user stats

      // Clear selected doctor for schedule if it was deleted
      if (selectedDoctorForSchedule?.id === doctorId) {
        setSelectedDoctorForSchedule(null);
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error deleting doctor:", err);
      setError(err instanceof Error ? err.message : "Failed to delete doctor");
    }
  };

  // Schedule management handlers
  const handleScheduleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setScheduleFormErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "isRecurring") {
      setScheduleFormData((prev) => ({
        ...prev,
        isRecurring: checked,
        dayOfWeek: checked ? prev.dayOfWeek : undefined,
        validFrom: checked ? prev.validFrom : undefined,
        validTo: checked ? prev.validTo : undefined,
      }));
    } else if (name === "dayOfWeek") {
      setScheduleFormData((prev) => ({
        ...prev,
        dayOfWeek: value ? parseInt(value, 10) : undefined,
      }));
    } else if (name === "validFrom" || name === "validTo") {
      setScheduleFormData((prev) => ({
        ...prev,
        [name]: value || undefined,
      }));
    } else {
      setScheduleFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    }
  };

  const validateScheduleForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedDoctorForSchedule) {
      errors.doctorId = "Please select a doctor";
    }
    if (!scheduleFormData.startTime) {
      errors.startTime = "Start time is required";
    }
    if (!scheduleFormData.endTime) {
      errors.endTime = "End time is required";
    }
    if (scheduleFormData.startTime && scheduleFormData.endTime) {
      const start = new Date(scheduleFormData.startTime);
      const end = new Date(scheduleFormData.endTime);
      if (end <= start) {
        errors.endTime = "End time must be after start time";
      }
    }
    if (
      scheduleFormData.isRecurring &&
      scheduleFormData.dayOfWeek === undefined
    ) {
      errors.dayOfWeek = "Day of week is required for recurring availability";
    }
    if (scheduleFormData.isRecurring && !scheduleFormData.validFrom) {
      errors.validFrom = "Start date is required for recurring availability";
    }
    if (
      scheduleFormData.isRecurring &&
      scheduleFormData.validFrom &&
      scheduleFormData.validTo &&
      new Date(scheduleFormData.validTo) <= new Date(scheduleFormData.validFrom)
    ) {
      errors.validTo = "End date must be after start date";
    }

    setScheduleFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate new form
    if (!selectedDoctorForSchedule) {
      setScheduleFormErrors({ doctorId: "Please select a doctor" });
      return;
    }

    if (scheduleFormData.isRecurring) {
      // Validate recurring schedule
      if (scheduleFormData.dayOfWeek === undefined) {
        setScheduleFormErrors({ dayOfWeek: "Day of week is required" });
        return;
      }
      if (!scheduleFormData.validFrom) {
        setScheduleFormErrors({ validFrom: "Start date is required" });
        return;
      }
      if (!scheduleFormData.startTime || !scheduleFormData.endTime) {
        setScheduleFormErrors({
          startTime: "Start and end times are required",
        });
        return;
      }
    } else {
      // Validate one-time schedule
      if (useDateRange) {
        // Validate date range for bulk scheduling
        if (!dateRangeStart) {
          setScheduleFormErrors({ dateRangeStart: "Start date is required" });
          return;
        }
        if (!dateRangeEnd) {
          setScheduleFormErrors({ dateRangeEnd: "End date is required" });
          return;
        }
        if (dateRangeEnd < dateRangeStart) {
          setScheduleFormErrors({
            dateRange: "End date must be after start date",
          });
          return;
        }
        if (selectedDates.length === 0) {
          setScheduleFormErrors({ dates: "Please select valid dates" });
          return;
        }
      } else {
        // Validate single date selection
        if (selectedDates.length === 0) {
          setScheduleFormErrors({ dates: "Please select at least one date" });
          return;
        }
        // Validate that the date is in correct format
        if (selectedDates[0] && !/^\d{4}-\d{2}-\d{2}$/.test(selectedDates[0])) {
          setScheduleFormErrors({ dates: "Please select a valid date" });
          return;
        }
      }

      if (schedulingMode === "timeRange") {
        if (!timeRangeStart || !timeRangeEnd) {
          setScheduleFormErrors({
            timeRange: "Start and end times are required",
          });
          return;
        }
        if (timeRangeEnd <= timeRangeStart) {
          setScheduleFormErrors({
            timeRange: "End time must be after start time",
          });
          return;
        }
      } else {
        if (selectedIndividualSlots.size === 0) {
          setScheduleFormErrors({
            slots: "Please select at least one time slot",
          });
          return;
        }
      }
    }

    try {
      setScheduleSubmitting(true);
      setError(null);

      if (scheduleFormData.isRecurring) {
        // Handle recurring schedule (existing logic)
        const payload: CreateAvailabilityInput = {
          doctorId: selectedDoctorForSchedule.id,
          startTime: localToUtcDate(scheduleFormData.startTime!),
          endTime: localToUtcDate(scheduleFormData.endTime!),
          isRecurring: true,
          dayOfWeek: scheduleFormData.dayOfWeek,
          validFrom: scheduleFormData.validFrom
            ? localToUtcDate(`${scheduleFormData.validFrom}T00:00`)
            : undefined,
          validTo: scheduleFormData.validTo
            ? localToUtcDate(`${scheduleFormData.validTo}T23:59`)
            : undefined,
        };

        const url = editingScheduleId
          ? `/api/availability/${editingScheduleId}`
          : "/api/availability";
        const method = editingScheduleId ? "PUT" : "POST";

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error?.message || "Failed to save schedule");
        }
      } else {
        // Handle one-time schedules (new improved logic)
        const datesToSchedule = selectedDates;

        if (datesToSchedule.length === 0) {
          setScheduleFormErrors({ dates: "Please select at least one date" });
          return;
        }

        const promises: Promise<Response>[] = [];

        if (schedulingMode === "timeRange") {
          // Create availability for each date with time range
          for (const date of datesToSchedule) {
            const startDateTime = localToUtcDate(`${date}T${timeRangeStart}`);
            const endDateTime = localToUtcDate(`${date}T${timeRangeEnd}`);

            const payload: CreateAvailabilityInput = {
              doctorId: selectedDoctorForSchedule.id,
              startTime: startDateTime,
              endTime: endDateTime,
              isRecurring: false,
            };

            // Only use PUT if editing a single schedule (not bulk)
            const url =
              editingScheduleId && datesToSchedule.length === 1
                ? `/api/availability/${editingScheduleId}`
                : "/api/availability";
            const method =
              editingScheduleId && datesToSchedule.length === 1
                ? "PUT"
                : "POST";

            promises.push(
              fetch(url, {
                method,
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
              })
            );
          }
        } else {
          // Create availability for each selected slot
          if (selectedIndividualSlots.size === 0) {
            setScheduleFormErrors({
              slots: "Please select at least one time slot",
            });
            return;
          }

          for (const date of datesToSchedule) {
            for (const slotKey of selectedIndividualSlots) {
              const slot = individualSlots.find((s) => s.key === slotKey);
              if (!slot) continue;

              const startDateTime = localToUtcDate(`${date}T${slot.start}`);
              const endDateTime = localToUtcDate(`${date}T${slot.end}`);

              const payload: CreateAvailabilityInput = {
                doctorId: selectedDoctorForSchedule.id,
                startTime: startDateTime,
                endTime: endDateTime,
                isRecurring: false,
              };

              // Only use PUT if editing a single schedule (not bulk)
              const url =
                editingScheduleId &&
                datesToSchedule.length === 1 &&
                selectedIndividualSlots.size === 1
                  ? `/api/availability/${editingScheduleId}`
                  : "/api/availability";
              const method =
                editingScheduleId &&
                datesToSchedule.length === 1 &&
                selectedIndividualSlots.size === 1
                  ? "PUT"
                  : "POST";

              promises.push(
                fetch(url, {
                  method,
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(payload),
                })
              );
            }
          }
        }

        if (promises.length === 0) {
          throw new Error("No schedules to create");
        }

        const responses = await Promise.all(promises);
        const results = await Promise.all(
          responses.map(async (r) => {
            if (!r.ok) {
              const errorData = await r.json().catch(() => ({}));
              return { success: false, error: errorData };
            }
            return r.json();
          })
        );

        const failed = results.filter((r) => !r.success);
        if (failed.length > 0) {
          // Extract error message from API response structure: { success: false, error: { code, message, details } }
          const errorResponse = failed[0].error;
          let errorMessage = "Failed to save some schedules";

          if (errorResponse) {
            // API returns: { success: false, error: { code, message, details } }
            // errorResponse is the entire response object
            if (errorResponse.error?.message) {
              errorMessage = errorResponse.error.message;
            } else if (typeof errorResponse === "string") {
              errorMessage = errorResponse;
            } else if (errorResponse.message) {
              errorMessage = errorResponse.message;
            }
          }

          throw new Error(errorMessage);
        }
      }

      setSuccessMessage(
        editingScheduleId
          ? "Schedule updated successfully!"
          : "Schedule created successfully!"
      );
      setShowScheduleForm(false);
      setEditingScheduleId(null);
      resetScheduleForm();
      // Reset new form state
      setSelectedDates([]);
      setUseDateRange(false);
      setDateRangeStart("");
      setDateRangeEnd("");
      setTimeRangeStart("09:00");
      setTimeRangeEnd("17:00");
      setSelectedIndividualSlots(new Set());
      await fetchAvailabilities();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error saving schedule:", err);
      console.error("[AdminDashboard] Schedule form data:", {
        isRecurring: scheduleFormData.isRecurring,
        useDateRange,
        selectedDates,
        dateRangeStart,
        dateRangeEnd,
        schedulingMode,
        timeRangeStart,
        timeRangeEnd,
        selectedIndividualSlots: Array.from(selectedIndividualSlots),
        editingScheduleId,
      });
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleEditSchedule = (availability: Availability) => {
    setEditingScheduleId(availability.id);
    // Convert UTC dates from backend to local time
    const startDate = utcToLocalDate(availability.startTime);
    const endDate = utcToLocalDate(availability.endTime);

    setScheduleFormData({
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

    // Populate new form fields for non-recurring schedules
    if (!availability.isRecurring) {
      const dateStr = formatDateLocal(startDate);
      setSelectedDates([dateStr]);
      setUseDateRange(false);
      setDateRangeStart("");
      setDateRangeEnd("");

      // Extract time from start/end dates
      const startTimeStr = `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`;
      const endTimeStr = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
      setTimeRangeStart(startTimeStr);
      setTimeRangeEnd(endTimeStr);
      setSchedulingMode("timeRange");
      setSelectedIndividualSlots(new Set());
    }

    setShowScheduleForm(true);
    setScheduleFormErrors({});
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this schedule?")) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/availability/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || "Failed to delete schedule");
      }

      setSuccessMessage("Schedule deleted successfully!");
      await fetchAvailabilities();

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error deleting schedule:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete schedule"
      );
    }
  };

  const resetScheduleForm = () => {
    // Use local time for default values in datetime-local inputs
    const now = new Date();
    setScheduleFormData({
      doctorId: selectedDoctorForSchedule?.id || "",
      startTime: formatDateTimeLocal(now),
      endTime: formatDateTimeLocal(now),
      isRecurring: false,
      dayOfWeek: undefined,
      validFrom: undefined,
      validTo: undefined,
    });
    setScheduleFormErrors({});
    // Reset new form state
    setSelectedDates([]);
    setUseDateRange(false);
    setDateRangeStart("");
    setDateRangeEnd("");
    setTimeRangeStart("09:00");
    setTimeRangeEnd("17:00");
    setSelectedIndividualSlots(new Set());
    setSchedulingMode("timeRange");
  };

  // Update scheduleFormData.doctorId when doctor is selected
  useEffect(() => {
    if (selectedDoctorForSchedule) {
      setScheduleFormData((prev) => ({
        ...prev,
        doctorId: selectedDoctorForSchedule.id,
      }));
    }
  }, [selectedDoctorForSchedule]);

  const handleCancelSchedule = () => {
    setShowScheduleForm(false);
    setEditingScheduleId(null);
    resetScheduleForm();
  };

  const formatDateTime = (date: Date | string) => {
    // Convert UTC date from backend to local time for display (12-hour format with AM/PM)
    const localDate = utcToLocalDate(date);
    return localDate.toLocaleString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Autocomplete state for doctor selection
  const [doctorSearchQuery, setDoctorSearchQuery] = useState("");
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Filter doctors based on search query
  const filteredDoctorsForSelection = doctors.filter((doctor) => {
    const query = doctorSearchQuery.toLowerCase();
    const email = (doctor.userEmail || "").toLowerCase();
    const specialization = (doctor.specialization || "").toLowerCase();
    return email.includes(query) || specialization.includes(query);
  });

  const handleDoctorSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDoctorSearchQuery(value);
    setShowDoctorDropdown(true);
    setHighlightedIndex(-1);
    // If user starts typing and a doctor is selected, clear selection
    if (selectedDoctorForSchedule) {
      const currentDisplay = `${selectedDoctorForSchedule.userEmail || "N/A"}${selectedDoctorForSchedule.specialization ? ` - ${selectedDoctorForSchedule.specialization}` : ""}`;
      if (value !== currentDisplay) {
        setSelectedDoctorForSchedule(null);
        setShowScheduleForm(false);
        setEditingScheduleId(null);
        resetScheduleForm();
      }
    }
  };

  const handleDoctorSelect = (doctor: Doctor) => {
    setSelectedDoctorForSchedule(doctor);
    setDoctorSearchQuery(
      `${doctor.userEmail || "N/A"}${doctor.specialization ? ` - ${doctor.specialization}` : ""}`
    );
    setShowDoctorDropdown(false);
    setShowScheduleForm(false);
    setEditingScheduleId(null);
    resetScheduleForm();
  };

  const handleDoctorSearchKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredDoctorsForSelection.length - 1 ? prev + 1 : prev
      );
      setShowDoctorDropdown(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleDoctorSelect(filteredDoctorsForSelection[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowDoctorDropdown(false);
      setHighlightedIndex(-1);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-doctor-autocomplete]") && showDoctorDropdown) {
        setShowDoctorDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDoctorDropdown]);

  // Generate slot preview from time range
  const generateSlotPreview = useCallback(() => {
    if (!slotTemplate || !timeRangeStart || !timeRangeEnd) {
      setPreviewSlots([]);
      return;
    }

    const [startHour, startMin] = timeRangeStart.split(":").map(Number);
    const [endHour, endMin] = timeRangeEnd.split(":").map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      setPreviewSlots([]);
      return;
    }

    const slots: Array<{ start: string; end: string }> = [];
    let currentMinutes = startMinutes;
    const duration = slotTemplate.durationMinutes;
    const buffer = slotTemplate.bufferMinutes;

    while (currentMinutes + duration <= endMinutes) {
      const slotStartMinutes = currentMinutes;
      const slotEndMinutes = currentMinutes + duration;

      const startHourStr = Math.floor(slotStartMinutes / 60)
        .toString()
        .padStart(2, "0");
      const startMinStr = (slotStartMinutes % 60).toString().padStart(2, "0");
      const endHourStr = Math.floor(slotEndMinutes / 60)
        .toString()
        .padStart(2, "0");
      const endMinStr = (slotEndMinutes % 60).toString().padStart(2, "0");

      slots.push({
        start: `${startHourStr}:${startMinStr}`,
        end: `${endHourStr}:${endMinStr}`,
      });

      currentMinutes = slotEndMinutes + buffer;
    }

    setPreviewSlots(slots);
  }, [slotTemplate, timeRangeStart, timeRangeEnd]);

  useEffect(() => {
    if (schedulingMode === "timeRange") {
      generateSlotPreview();
    }
  }, [schedulingMode, generateSlotPreview]);

  // Generate individual slots for selection
  const individualSlots = useMemo(() => {
    if (!slotTemplate) return [];

    const slots: Array<{ start: string; end: string; key: string }> = [];
    const startHour = 0;
    const endHour = 24;
    const duration = slotTemplate.durationMinutes;
    const buffer = slotTemplate.bufferMinutes;

    let currentMinutes = startHour * 60;
    const maxMinutes = endHour * 60;

    while (currentMinutes + duration <= maxMinutes) {
      const slotStartMinutes = currentMinutes;
      const slotEndMinutes = currentMinutes + duration;

      const startHourStr = Math.floor(slotStartMinutes / 60)
        .toString()
        .padStart(2, "0");
      const startMinStr = (slotStartMinutes % 60).toString().padStart(2, "0");
      const endHourStr = Math.floor(slotEndMinutes / 60)
        .toString()
        .padStart(2, "0");
      const endMinStr = (slotEndMinutes % 60).toString().padStart(2, "0");

      const key = `${startHourStr}:${startMinStr}`;
      slots.push({
        start: `${startHourStr}:${startMinStr}`,
        end: `${endHourStr}:${endMinStr}`,
        key,
      });

      currentMinutes = slotEndMinutes + buffer;
    }

    return slots;
  }, [slotTemplate]);

  // Format time for display (12-hour format)
  const formatTimeDisplay = (time24: string): string => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  // Generate date range array
  const generateDateRange = (startDate: string, endDate: string): string[] => {
    if (!startDate || !endDate) return [];

    // Parse dates as local dates (YYYY-MM-DD format)
    // Split and create date objects to avoid timezone issues
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

    if (
      !startYear ||
      !startMonth ||
      !startDay ||
      !endYear ||
      !endMonth ||
      !endDay
    ) {
      return [];
    }

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [];
    }

    const dates: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      dates.push(formatDateLocal(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Manage users, doctors, and system settings
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error: {error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 rounded-lg bg-green-50 p-4 text-green-800">
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("general")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "general"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab("manage-doctor")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "manage-doctor"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Manage Doctor
          </button>
        </nav>
      </div>

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="space-y-8">
          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-sm font-medium text-gray-500">
                  Total Users
                </h3>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalUsers}
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-sm font-medium text-gray-500">Patients</h3>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {stats.usersByRole.PATIENT}
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-sm font-medium text-gray-500">Doctors</h3>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {stats.usersByRole.DOCTOR}
                </p>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="text-sm font-medium text-gray-500">Admins</h3>
                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {stats.usersByRole.ADMIN}
                </p>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {user.email}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            user.role === UserRole.ADMIN
                              ? "bg-purple-100 text-purple-800"
                              : user.role === UserRole.DOCTOR
                                ? "bg-green-100 text-green-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                            }}
                          >
                            Change Role
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manage Doctor Tab */}
      {activeTab === "manage-doctor" && (
        <div className="space-y-8">
          {/* Doctor Registration Form */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Doctor Registration
                </h2>
                <Button
                  variant={showDoctorForm ? "outline" : "primary"}
                  onClick={() => {
                    setShowDoctorForm(!showDoctorForm);
                    setDoctorFormErrors({});
                    setError(null);
                    if (!showDoctorForm) {
                      setDoctorFormData({
                        email: "",
                        password: "",
                        confirmPassword: "",
                        specialization: "",
                        bio: "",
                      });
                    }
                  }}
                >
                  {showDoctorForm ? "Cancel" : "Register New Doctor"}
                </Button>
              </div>
            </div>
            {showDoctorForm && (
              <div className="px-6 py-4">
                <form onSubmit={handleDoctorFormSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={doctorFormData.email}
                      onChange={handleDoctorFormChange}
                      required
                      className={`mt-1 w-full rounded-md border px-3 py-2 ${
                        doctorFormErrors.email
                          ? "border-red-500"
                          : "border-gray-300"
                      } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                    />
                    {doctorFormErrors.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {doctorFormErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      label="Password"
                      type="password"
                      id="password"
                      name="password"
                      value={doctorFormData.password}
                      onChange={handleDoctorFormChange}
                      required
                      error={doctorFormErrors.password}
                      disabled={doctorFormLoading}
                      autoComplete="new-password"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 8 characters long and contain at
                      least one uppercase letter, one lowercase letter, and one
                      number.
                    </p>
                  </div>

                  <div>
                    <Input
                      label="Confirm Password"
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={doctorFormData.confirmPassword}
                      onChange={handleDoctorFormChange}
                      required
                      error={doctorFormErrors.confirmPassword}
                      disabled={doctorFormLoading}
                      autoComplete="new-password"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="specialization"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Specialization
                    </label>
                    <input
                      type="text"
                      id="specialization"
                      name="specialization"
                      value={doctorFormData.specialization}
                      onChange={handleDoctorFormChange}
                      placeholder="e.g., Cardiology, Pediatrics"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bio"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={doctorFormData.bio}
                      onChange={handleDoctorFormChange}
                      rows={3}
                      placeholder="Doctor's bio or description"
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={doctorFormLoading}
                    >
                      {doctorFormLoading ? "Registering..." : "Register Doctor"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowDoctorForm(false);
                        setDoctorFormData({
                          email: "",
                          password: "",
                          confirmPassword: "",
                          specialization: "",
                          bio: "",
                        });
                        setDoctorFormErrors({});
                      }}
                      disabled={doctorFormLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Doctor Management Section */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Doctor Management
              </h2>
            </div>

            {/* Doctor Statistics */}
            {doctorStats && (
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500">
                    Total Doctors:{" "}
                    <span className="text-lg font-bold text-green-600">
                      {doctorStats.totalDoctors}
                    </span>
                  </h3>
                </div>
                {Object.keys(doctorStats.doctorsBySpecialization).length >
                  0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-gray-700">
                      By Specialization:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(doctorStats.doctorsBySpecialization).map(
                        ([specialization, count]) => (
                          <span
                            key={specialization}
                            className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-800"
                          >
                            {specialization}: {count}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search and Filter */}
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="doctor-search"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Search Doctors
                  </label>
                  <input
                    type="text"
                    id="doctor-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email..."
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="specialization-filter"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Filter by Specialization
                  </label>
                  <input
                    type="text"
                    id="specialization-filter"
                    value={specializationFilter}
                    onChange={(e) => setSpecializationFilter(e.target.value)}
                    placeholder="e.g., Cardiology"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Doctors Table */}
            <div className="overflow-x-auto">
              {doctorsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                </div>
              ) : doctors.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No doctors found
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Specialization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Bio
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {doctors.map((doctor) => (
                      <tr key={doctor.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {doctor.userEmail || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {doctor.specialization || (
                            <span className="text-gray-400">Unspecified</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {doctor.bio ? (
                            <span className="line-clamp-2 max-w-xs">
                              {doctor.bio}
                            </span>
                          ) : (
                            <span className="text-gray-400">No bio</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                          {new Date(doctor.createdAt).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditDoctor(doctor)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteDoctor(doctor.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Schedule Management Section */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Doctor Schedule Management
              </h2>
            </div>

            <div className="px-6 py-4">
              {/* Doctor Selection - Autocomplete */}
              <div className="mb-6" data-doctor-autocomplete>
                <label
                  htmlFor="doctor-schedule-select"
                  className="block text-sm font-medium text-gray-700"
                >
                  Select Doctor <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-1">
                  <input
                    id="doctor-schedule-select"
                    type="text"
                    value={doctorSearchQuery}
                    onChange={handleDoctorSearchChange}
                    onFocus={() => {
                      setShowDoctorDropdown(true);
                    }}
                    onKeyDown={handleDoctorSearchKeyDown}
                    placeholder={
                      selectedDoctorForSchedule
                        ? "Type to search for another doctor..."
                        : "Search by email or specialization..."
                    }
                    className={`w-full rounded-md border px-3 py-2 pr-10 ${
                      scheduleFormErrors.doctorId
                        ? "border-red-500"
                        : "border-gray-300"
                    } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                  />
                  {selectedDoctorForSchedule && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDoctorForSchedule(null);
                        setDoctorSearchQuery("");
                        setShowScheduleForm(false);
                        setEditingScheduleId(null);
                        resetScheduleForm();
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label="Clear selection"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
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
                  {showDoctorDropdown &&
                    filteredDoctorsForSelection.length > 0 && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-300 bg-white shadow-lg">
                        {filteredDoctorsForSelection.map((doctor, index) => (
                          <div
                            key={doctor.id}
                            onClick={() => handleDoctorSelect(doctor)}
                            className={`cursor-pointer px-4 py-2 ${
                              index === highlightedIndex
                                ? "bg-blue-50"
                                : "hover:bg-gray-50"
                            } ${
                              selectedDoctorForSchedule?.id === doctor.id
                                ? "bg-blue-100"
                                : ""
                            }`}
                          >
                            <div className="font-medium text-gray-900">
                              {doctor.userEmail || "N/A"}
                            </div>
                            {doctor.specialization && (
                              <div className="text-sm text-gray-500">
                                {doctor.specialization}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  {showDoctorDropdown &&
                    doctorSearchQuery &&
                    filteredDoctorsForSelection.length === 0 && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-500 shadow-lg">
                        No doctors found matching "{doctorSearchQuery}"
                      </div>
                    )}
                </div>
                {scheduleFormErrors.doctorId && (
                  <p className="mt-1 text-sm text-red-600">
                    {scheduleFormErrors.doctorId}
                  </p>
                )}
              </div>

              {selectedDoctorForSchedule && (
                <>
                  {/* Slot Template Display */}
                  {slotTemplate && (
                    <Card title="Slot Template Settings" className="mb-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Slot Duration
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {slotTemplate.durationMinutes} minutes
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Buffer Between Slots
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {slotTemplate.bufferMinutes} minutes
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Advance Booking Days
                          </label>
                          <p className="mt-1 text-sm text-gray-900">
                            {slotTemplate.advanceBookingDays} days
                          </p>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSlotTemplateForm(true)}
                        >
                          Update Template
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* Schedule Filters */}
                  <Card title="Filter Schedules" className="mb-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Input
                        label="Start Date"
                        type="date"
                        value={scheduleFilterStartDate}
                        onChange={(e) =>
                          setScheduleFilterStartDate(e.target.value)
                        }
                      />
                      <Input
                        label="End Date"
                        type="date"
                        value={scheduleFilterEndDate}
                        onChange={(e) =>
                          setScheduleFilterEndDate(e.target.value)
                        }
                      />
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setScheduleFilterStartDate("");
                            setScheduleFilterEndDate("");
                            // The useEffect will automatically refetch when filter dates change
                          }}
                          className="w-full"
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Create/Edit Schedule Form */}
                  {showScheduleForm && (
                    <Card
                      title={
                        editingScheduleId ? "Edit Schedule" : "Add New Schedule"
                      }
                      className="mb-6"
                    >
                      <form
                        onSubmit={handleScheduleSubmit}
                        noValidate
                        className="space-y-4"
                      >
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            <input
                              type="checkbox"
                              name="isRecurring"
                              checked={scheduleFormData.isRecurring}
                              onChange={handleScheduleFormChange}
                              className="mr-2"
                            />
                            Recurring Schedule
                          </label>
                        </div>

                        {scheduleFormData.isRecurring ? (
                          <>
                            <div>
                              <label
                                htmlFor="dayOfWeek"
                                className="block text-sm font-medium text-gray-700"
                              >
                                Day of Week{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <select
                                id="dayOfWeek"
                                name="dayOfWeek"
                                value={scheduleFormData.dayOfWeek ?? ""}
                                onChange={handleScheduleFormChange}
                                required
                                className={`mt-1 w-full rounded-md border px-3 py-2 ${
                                  scheduleFormErrors.dayOfWeek
                                    ? "border-red-500"
                                    : "border-gray-300"
                                } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                              >
                                <option value="">Select day</option>
                                {DAYS_OF_WEEK.map((day) => (
                                  <option key={day.value} value={day.value}>
                                    {day.label}
                                  </option>
                                ))}
                              </select>
                              {scheduleFormErrors.dayOfWeek && (
                                <p className="mt-1 text-sm text-red-600">
                                  {scheduleFormErrors.dayOfWeek}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <TimePicker
                                  id="recurring-start-time"
                                  name="startTime"
                                  label="Start Time"
                                  required
                                  value={
                                    scheduleFormData.startTime
                                      ? scheduleFormData.startTime.split(
                                          "T"
                                        )[1] || "00:00"
                                      : "00:00"
                                  }
                                  onChange={(time) => {
                                    const datePart =
                                      scheduleFormData.startTime.split(
                                        "T"
                                      )[0] || formatDateLocal(new Date());
                                    setScheduleFormData((prev) => ({
                                      ...prev,
                                      startTime: `${datePart}T${time}`,
                                    }));
                                  }}
                                  error={scheduleFormErrors.startTime}
                                />
                              </div>

                              <div>
                                <TimePicker
                                  id="recurring-end-time"
                                  name="endTime"
                                  label="End Time"
                                  required
                                  value={
                                    scheduleFormData.endTime
                                      ? scheduleFormData.endTime.split(
                                          "T"
                                        )[1] || "00:00"
                                      : "00:00"
                                  }
                                  onChange={(time) => {
                                    const datePart =
                                      scheduleFormData.endTime.split("T")[0] ||
                                      formatDateLocal(new Date());
                                    setScheduleFormData((prev) => ({
                                      ...prev,
                                      endTime: `${datePart}T${time}`,
                                    }));
                                  }}
                                  error={scheduleFormErrors.endTime}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <label
                                  htmlFor="validFrom"
                                  className="block text-sm font-medium text-gray-700"
                                >
                                  Valid From{" "}
                                  <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  id="validFrom"
                                  name="validFrom"
                                  value={scheduleFormData.validFrom || ""}
                                  onChange={handleScheduleFormChange}
                                  required
                                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                                    scheduleFormErrors.validFrom
                                      ? "border-red-500"
                                      : "border-gray-300"
                                  } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                />
                                {scheduleFormErrors.validFrom && (
                                  <p className="mt-1 text-sm text-red-600">
                                    {scheduleFormErrors.validFrom}
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor="validTo"
                                  className="block text-sm font-medium text-gray-700"
                                >
                                  Valid To
                                </label>
                                <input
                                  type="date"
                                  id="validTo"
                                  name="validTo"
                                  value={scheduleFormData.validTo || ""}
                                  onChange={handleScheduleFormChange}
                                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                                    scheduleFormErrors.validTo
                                      ? "border-red-500"
                                      : "border-gray-300"
                                  } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                />
                                {scheduleFormErrors.validTo && (
                                  <p className="mt-1 text-sm text-red-600">
                                    {scheduleFormErrors.validTo}
                                  </p>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Date Selection - Single or Range */}
                            <div className="space-y-4">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={useDateRange}
                                    onChange={(e) => {
                                      setUseDateRange(e.target.checked);
                                      if (!e.target.checked) {
                                        setDateRangeStart("");
                                        setDateRangeEnd("");
                                        setSelectedDates([]);
                                        // Clear date range errors
                                        setScheduleFormErrors((prev) => {
                                          const newErrors = { ...prev };
                                          delete newErrors.dateRangeStart;
                                          delete newErrors.dateRangeEnd;
                                          delete newErrors.dateRange;
                                          return newErrors;
                                        });
                                      }
                                    }}
                                    className="mr-2"
                                  />
                                  Schedule for multiple dates (bulk scheduling)
                                </label>
                              </div>

                              {useDateRange ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <div>
                                    <label
                                      htmlFor="date-range-start"
                                      className="block text-sm font-medium text-gray-700"
                                    >
                                      Start Date{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="date"
                                      id="date-range-start"
                                      value={dateRangeStart}
                                      onChange={(e) => {
                                        const newStartDate = e.target.value;
                                        // Ensure the date is in valid format (YYYY-MM-DD)
                                        if (
                                          newStartDate &&
                                          !/^\d{4}-\d{2}-\d{2}$/.test(
                                            newStartDate
                                          )
                                        ) {
                                          return; // Invalid format, don't update
                                        }
                                        setDateRangeStart(newStartDate);
                                        // Clear errors for this field
                                        setScheduleFormErrors((prev) => ({
                                          ...prev,
                                          dateRangeStart: "",
                                          dateRange: "",
                                        }));
                                        // Generate date list
                                        if (newStartDate && dateRangeEnd) {
                                          const dates = generateDateRange(
                                            newStartDate,
                                            dateRangeEnd
                                          );
                                          setSelectedDates(dates);
                                          // Validate date range
                                          if (
                                            dates.length === 0 &&
                                            dateRangeEnd < newStartDate
                                          ) {
                                            setScheduleFormErrors((prev) => ({
                                              ...prev,
                                              dateRange:
                                                "End date must be after start date",
                                            }));
                                          }
                                        } else {
                                          setSelectedDates([]);
                                        }
                                      }}
                                      onInvalid={(e) => {
                                        e.preventDefault();
                                        const target =
                                          e.target as HTMLInputElement;
                                        if (!target.value) {
                                          setScheduleFormErrors((prev) => ({
                                            ...prev,
                                            dateRangeStart:
                                              "Start date is required",
                                          }));
                                        } else {
                                          setScheduleFormErrors((prev) => ({
                                            ...prev,
                                            dateRangeStart:
                                              "Please select a valid start date",
                                          }));
                                        }
                                      }}
                                      min={formatDateLocal(new Date())}
                                      required={useDateRange}
                                      className={`mt-1 w-full rounded-md border px-3 py-2 ${
                                        scheduleFormErrors.dateRangeStart ||
                                        scheduleFormErrors.dateRange
                                          ? "border-red-500"
                                          : "border-gray-300"
                                      } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                    />
                                    {scheduleFormErrors.dateRangeStart && (
                                      <p className="mt-1 text-sm text-red-600">
                                        {scheduleFormErrors.dateRangeStart}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label
                                      htmlFor="date-range-end"
                                      className="block text-sm font-medium text-gray-700"
                                    >
                                      End Date{" "}
                                      <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                      type="date"
                                      id="date-range-end"
                                      value={dateRangeEnd}
                                      onChange={(e) => {
                                        const newEndDate = e.target.value;
                                        // Ensure the date is in valid format (YYYY-MM-DD)
                                        if (
                                          newEndDate &&
                                          !/^\d{4}-\d{2}-\d{2}$/.test(
                                            newEndDate
                                          )
                                        ) {
                                          return; // Invalid format, don't update
                                        }
                                        setDateRangeEnd(newEndDate);
                                        // Clear errors for this field
                                        setScheduleFormErrors((prev) => ({
                                          ...prev,
                                          dateRangeEnd: "",
                                          dateRange: "",
                                        }));
                                        // Generate date list
                                        if (dateRangeStart && newEndDate) {
                                          const dates = generateDateRange(
                                            dateRangeStart,
                                            newEndDate
                                          );
                                          setSelectedDates(dates);
                                          // Validate date range
                                          if (dates.length === 0) {
                                            setScheduleFormErrors((prev) => ({
                                              ...prev,
                                              dateRange:
                                                "End date must be after start date",
                                            }));
                                          }
                                        } else {
                                          setSelectedDates([]);
                                        }
                                      }}
                                      onInvalid={(e) => {
                                        e.preventDefault();
                                        const target =
                                          e.target as HTMLInputElement;
                                        if (!target.value) {
                                          setScheduleFormErrors((prev) => ({
                                            ...prev,
                                            dateRangeEnd:
                                              "End date is required",
                                          }));
                                        } else {
                                          setScheduleFormErrors((prev) => ({
                                            ...prev,
                                            dateRangeEnd:
                                              "Please select a valid end date",
                                          }));
                                        }
                                      }}
                                      min={
                                        dateRangeStart ||
                                        formatDateLocal(new Date())
                                      }
                                      required={useDateRange}
                                      className={`mt-1 w-full rounded-md border px-3 py-2 ${
                                        scheduleFormErrors.dateRangeEnd ||
                                        scheduleFormErrors.dateRange
                                          ? "border-red-500"
                                          : "border-gray-300"
                                      } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                    />
                                    {scheduleFormErrors.dateRangeEnd && (
                                      <p className="mt-1 text-sm text-red-600">
                                        {scheduleFormErrors.dateRangeEnd}
                                      </p>
                                    )}
                                    {scheduleFormErrors.dateRange && (
                                      <p className="mt-1 text-sm text-red-600">
                                        {scheduleFormErrors.dateRange}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <label
                                    htmlFor="single-date"
                                    className="block text-sm font-medium text-gray-700"
                                  >
                                    Select Date{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="date"
                                    id="single-date"
                                    value={selectedDates[0] || ""}
                                    onChange={(e) => {
                                      const newDate = e.target.value;
                                      // HTML date inputs always return YYYY-MM-DD format
                                      // Update state if date is valid or empty
                                      if (newDate) {
                                        // Validate format (YYYY-MM-DD)
                                        if (
                                          /^\d{4}-\d{2}-\d{2}$/.test(newDate)
                                        ) {
                                          setSelectedDates([newDate]);
                                          // Clear errors for this field
                                          setScheduleFormErrors((prev) => {
                                            const newErrors = { ...prev };
                                            delete newErrors.dates;
                                            return newErrors;
                                          });
                                        }
                                      } else {
                                        // Empty value - clear selection
                                        setSelectedDates([]);
                                        // Clear errors for this field
                                        setScheduleFormErrors((prev) => {
                                          const newErrors = { ...prev };
                                          delete newErrors.dates;
                                          return newErrors;
                                        });
                                      }
                                    }}
                                    onInvalid={(e) => {
                                      e.preventDefault();
                                      const target =
                                        e.target as HTMLInputElement;
                                      if (!target.value) {
                                        setScheduleFormErrors((prev) => ({
                                          ...prev,
                                          dates: "Please select a date",
                                        }));
                                      } else {
                                        setScheduleFormErrors((prev) => ({
                                          ...prev,
                                          dates: "Please select a valid date",
                                        }));
                                      }
                                    }}
                                    min={formatDateLocal(new Date())}
                                    required
                                    className={`mt-1 w-full rounded-md border px-3 py-2 ${
                                      scheduleFormErrors.dates
                                        ? "border-red-500"
                                        : "border-gray-300"
                                    } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                                  />
                                  {scheduleFormErrors.dates && (
                                    <p className="mt-1 text-sm text-red-600">
                                      {scheduleFormErrors.dates}
                                    </p>
                                  )}
                                </div>
                              )}

                              {selectedDates.length > 0 && (
                                <div className="rounded-md bg-blue-50 p-3">
                                  <p className="text-sm font-medium text-blue-900">
                                    {selectedDates.length} date
                                    {selectedDates.length > 1 ? "s" : ""}{" "}
                                    selected
                                  </p>
                                  <p className="mt-1 text-xs text-blue-700">
                                    {selectedDates.slice(0, 5).join(", ")}
                                    {selectedDates.length > 5 &&
                                      ` ... and ${selectedDates.length - 5} more`}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Scheduling Mode Selection */}
                            <div className="space-y-4">
                              <label className="block text-sm font-medium text-gray-700">
                                Scheduling Mode
                              </label>
                              <div className="flex gap-4">
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name="schedulingMode"
                                    value="timeRange"
                                    checked={schedulingMode === "timeRange"}
                                    onChange={(e) =>
                                      setSchedulingMode(
                                        e.target.value as
                                          | "timeRange"
                                          | "individual"
                                      )
                                    }
                                    className="mr-2"
                                  />
                                  Time Range (auto-generate slots)
                                </label>
                                <label className="flex items-center">
                                  <input
                                    type="radio"
                                    name="schedulingMode"
                                    value="individual"
                                    checked={schedulingMode === "individual"}
                                    onChange={(e) =>
                                      setSchedulingMode(
                                        e.target.value as
                                          | "timeRange"
                                          | "individual"
                                      )
                                    }
                                    className="mr-2"
                                  />
                                  Individual Slots
                                </label>
                              </div>
                            </div>

                            {/* Time Range Mode */}
                            {schedulingMode === "timeRange" && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <div>
                                    <TimePicker
                                      id="time-range-start"
                                      label="Start Time"
                                      value={timeRangeStart}
                                      onChange={setTimeRangeStart}
                                      required
                                    />
                                  </div>
                                  <div>
                                    <TimePicker
                                      id="time-range-end"
                                      label="End Time"
                                      value={timeRangeEnd}
                                      onChange={setTimeRangeEnd}
                                      required
                                    />
                                  </div>
                                </div>

                                {/* Slot Preview */}
                                {previewSlots.length > 0 && (
                                  <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                                    <p className="mb-2 text-sm font-medium text-gray-700">
                                      Preview: {previewSlots.length} slot
                                      {previewSlots.length > 1 ? "s" : ""} will
                                      be generated
                                    </p>
                                    <div className="max-h-40 overflow-y-auto">
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {previewSlots
                                          .slice(0, 10)
                                          .map((slot, idx) => (
                                            <div
                                              key={idx}
                                              className="rounded bg-white px-2 py-1"
                                            >
                                              {formatTimeDisplay(slot.start)} -{" "}
                                              {formatTimeDisplay(slot.end)}
                                            </div>
                                          ))}
                                        {previewSlots.length > 10 && (
                                          <div className="col-span-2 text-center text-gray-500">
                                            ... and {previewSlots.length - 10}{" "}
                                            more
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Individual Slots Mode */}
                            {schedulingMode === "individual" && (
                              <div className="space-y-4">
                                <p className="text-sm text-gray-600">
                                  Select individual time slots to schedule
                                  (based on slot template:{" "}
                                  {slotTemplate?.durationMinutes || 30} min
                                  duration)
                                </p>
                                <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200 p-4">
                                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                                    {individualSlots.map((slot) => (
                                      <label
                                        key={slot.key}
                                        className="flex items-center rounded border p-2 hover:bg-gray-50"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedIndividualSlots.has(
                                            slot.key
                                          )}
                                          onChange={(e) => {
                                            const newSet = new Set(
                                              selectedIndividualSlots
                                            );
                                            if (e.target.checked) {
                                              newSet.add(slot.key);
                                            } else {
                                              newSet.delete(slot.key);
                                            }
                                            setSelectedIndividualSlots(newSet);
                                          }}
                                          className="mr-2"
                                        />
                                        <span className="text-sm">
                                          {formatTimeDisplay(slot.start)}
                                        </span>
                                      </label>
                                    ))}
                                  </div>
                                </div>
                                {selectedIndividualSlots.size > 0 && (
                                  <p className="text-sm text-gray-600">
                                    {selectedIndividualSlots.size} slot
                                    {selectedIndividualSlots.size > 1
                                      ? "s"
                                      : ""}{" "}
                                    selected
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={scheduleSubmitting}
                          >
                            {scheduleSubmitting
                              ? "Saving..."
                              : editingScheduleId
                                ? "Update Schedule"
                                : "Create Schedule"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelSchedule}
                            disabled={scheduleSubmitting}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Card>
                  )}

                  {/* Add Schedule Button - Show when form is hidden */}
                  {!showScheduleForm && (
                    <div className="mb-6">
                      <Button
                        variant="primary"
                        onClick={() => {
                          resetScheduleForm();
                          setScheduleFormData((prev) => ({
                            ...prev,
                            doctorId: selectedDoctorForSchedule.id,
                          }));
                          setShowScheduleForm(true);
                          setEditingScheduleId(null);
                        }}
                      >
                        Add New Schedule
                      </Button>
                    </div>
                  )}

                  {/* Schedule List */}
                  <Card
                    title={`Schedules for ${selectedDoctorForSchedule.userEmail}`}
                  >
                    {availabilitiesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                      </div>
                    ) : availabilities.length === 0 ? (
                      <div className="py-12 text-center text-gray-500">
                        No schedules found. Click "Add New Schedule" to create
                        one.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Schedule
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {availabilities.map((availability) => (
                              <tr key={availability.id}>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                  <span
                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                      availability.isRecurring
                                        ? "bg-blue-100 text-blue-800"
                                        : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {availability.isRecurring
                                      ? "Recurring"
                                      : "One-time"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {availability.isRecurring ? (
                                    <div>
                                      <div>
                                        <strong>
                                          {
                                            DAYS_OF_WEEK.find(
                                              (d) =>
                                                d.value ===
                                                availability.dayOfWeek
                                            )?.label
                                          }
                                        </strong>
                                        :{" "}
                                        {formatTimeLocal(
                                          availability.startTime
                                        )}{" "}
                                        -{" "}
                                        {formatTimeLocal(availability.endTime)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        Valid:{" "}
                                        {availability.validFrom
                                          ? formatDateLocal(
                                              availability.validFrom
                                            )
                                          : "N/A"}{" "}
                                        -{" "}
                                        {availability.validTo
                                          ? formatDateLocal(
                                              availability.validTo
                                            )
                                          : "Ongoing"}
                                      </div>
                                    </div>
                                  ) : (
                                    <div>
                                      {formatDateTime(availability.startTime)} -{" "}
                                      {formatDateTime(availability.endTime)}
                                    </div>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 text-sm">
                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleEditSchedule(availability)
                                      }
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteSchedule(availability.id)
                                      }
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Change User Role</h3>
            <p className="mb-4 text-sm text-gray-600">
              User: {selectedUser.email}
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                New Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="w-full rounded-md border border-gray-300 px-3 py-2"
              >
                <option value={UserRole.PATIENT}>PATIENT</option>
                <option value={UserRole.DOCTOR}>DOCTOR</option>
                <option value={UserRole.ADMIN}>ADMIN</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => handleRoleChange(selectedUser.id, newRole)}
              >
                Save
              </Button>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Edit Doctor Profile</h3>
            <p className="mb-4 text-sm text-gray-600">
              Doctor: {selectedDoctor.userEmail || "N/A"}
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="edit-specialization"
                  className="block text-sm font-medium text-gray-700"
                >
                  Specialization
                </label>
                <input
                  type="text"
                  id="edit-specialization"
                  value={editDoctorData.specialization}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      specialization: e.target.value,
                    })
                  }
                  placeholder="e.g., Cardiology, Pediatrics"
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    editDoctorErrors.specialization
                      ? "border-red-500"
                      : "border-gray-300"
                  } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {editDoctorErrors.specialization && (
                  <p className="mt-1 text-sm text-red-600">
                    {editDoctorErrors.specialization}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="edit-bio"
                  className="block text-sm font-medium text-gray-700"
                >
                  Bio
                </label>
                <textarea
                  id="edit-bio"
                  value={editDoctorData.bio}
                  onChange={(e) =>
                    setEditDoctorData({
                      ...editDoctorData,
                      bio: e.target.value,
                    })
                  }
                  rows={4}
                  placeholder="Doctor's bio or description"
                  className={`mt-1 w-full rounded-md border px-3 py-2 ${
                    editDoctorErrors.bio ? "border-red-500" : "border-gray-300"
                  } focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                />
                {editDoctorErrors.bio && (
                  <p className="mt-1 text-sm text-red-600">
                    {editDoctorErrors.bio}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button
                variant="primary"
                onClick={handleUpdateDoctor}
                disabled={editDoctorLoading}
              >
                {editDoctorLoading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDoctor(null);
                  setEditDoctorErrors({});
                }}
                disabled={editDoctorLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Template Update Modal */}
      {showSlotTemplateForm && selectedDoctorForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Update Slot Template</h3>
            <p className="mb-4 text-sm text-gray-600">
              Doctor: {selectedDoctorForSchedule.userEmail || "N/A"}
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="duration-minutes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Slot Duration (minutes){" "}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="duration-minutes"
                  min="5"
                  max="480"
                  value={slotTemplateFormData.durationMinutes}
                  onChange={(e) =>
                    setSlotTemplateFormData({
                      ...slotTemplateFormData,
                      durationMinutes: parseInt(e.target.value, 10) || 30,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Minimum 5 minutes, maximum 480 minutes (8 hours)
                </p>
              </div>
              <div>
                <label
                  htmlFor="buffer-minutes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Buffer Between Slots (minutes)
                </label>
                <input
                  type="number"
                  id="buffer-minutes"
                  min="0"
                  value={slotTemplateFormData.bufferMinutes}
                  onChange={(e) =>
                    setSlotTemplateFormData({
                      ...slotTemplateFormData,
                      bufferMinutes: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="advance-booking-days"
                  className="block text-sm font-medium text-gray-700"
                >
                  Advance Booking Days <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="advance-booking-days"
                  min="1"
                  value={slotTemplateFormData.advanceBookingDays}
                  onChange={(e) =>
                    setSlotTemplateFormData({
                      ...slotTemplateFormData,
                      advanceBookingDays: parseInt(e.target.value, 10) || 30,
                    })
                  }
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <Button
                variant="primary"
                onClick={async () => {
                  try {
                    setSlotTemplateLoading(true);
                    const response = await fetch("/api/slots/template", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        doctorId: selectedDoctorForSchedule.id,
                        ...slotTemplateFormData,
                      }),
                    });

                    const data = await response.json();

                    if (!response.ok) {
                      throw new Error(
                        data.error?.message || "Failed to update template"
                      );
                    }

                    setSuccessMessage("Slot template updated successfully!");
                    setShowSlotTemplateForm(false);
                    await fetchSlotTemplate();

                    setTimeout(() => {
                      setSuccessMessage(null);
                    }, 5000);
                  } catch (err) {
                    console.error(
                      "[AdminDashboard] Error updating slot template:",
                      err
                    );
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to update template"
                    );
                  } finally {
                    setSlotTemplateLoading(false);
                  }
                }}
                disabled={slotTemplateLoading}
              >
                {slotTemplateLoading ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowSlotTemplateForm(false);
                  if (slotTemplate) {
                    setSlotTemplateFormData({
                      durationMinutes: slotTemplate.durationMinutes,
                      bufferMinutes: slotTemplate.bufferMinutes,
                      advanceBookingDays: slotTemplate.advanceBookingDays,
                    });
                  }
                }}
                disabled={slotTemplateLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      }
    >
      <ProtectedRoute requiredRoles={[UserRole.ADMIN]}>
        <AdminDashboardContent />
      </ProtectedRoute>
    </Suspense>
  );
}
