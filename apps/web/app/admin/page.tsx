"use client";

import { useEffect, useState, Suspense, useCallback, useMemo } from "react";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import {
  UserRole,
  Availability,
  CreateAvailabilityInput,
  SlotTemplate,
  Appointment,
  AppointmentStatus,
} from "@medbook/types";
import { Button, Input, Card } from "@medbook/ui";
import { TimePicker } from "@/components/forms/TimePicker";
import { DoctorRegistrationModal } from "@/components/admin/DoctorRegistrationModal";

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

type TabType = "general" | "manage-doctor" | "appointments";

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
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(
    null
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  // Appointments management state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState<
    AppointmentStatus | "ALL"
  >("ALL");
  const [appointmentUpcomingOnly, setAppointmentUpcomingOnly] = useState(false);
  const [updatingAppointmentId, setUpdatingAppointmentId] = useState<
    string | null
  >(null);
  // Enhanced appointments management state
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [appointmentDoctorFilter, setAppointmentDoctorFilter] =
    useState<string>("ALL");
  const [appointmentDateStart, setAppointmentDateStart] = useState("");
  const [appointmentDateEnd, setAppointmentDateEnd] = useState("");
  const [appointmentPage, setAppointmentPage] = useState(1);
  const [appointmentPageSize, setAppointmentPageSize] = useState(10);
  const [selectedDoctorForModal, setSelectedDoctorForModal] =
    useState<Doctor | null>(null);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
    fetchDoctors();
    fetchDoctorStats();
  }, []);

  useEffect(() => {
    if (activeTab === "appointments") {
      fetchAppointments();
    }
  }, [activeTab, appointmentStatusFilter, appointmentUpcomingOnly]);

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
      // Add timestamp to prevent browser caching
      params.append("_t", Date.now().toString());

      const response = await fetch(`/api/availability?${params.toString()}`, {
        cache: "no-store", // Always fetch fresh data
      });
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

  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      setError(null);

      // Admins can fetch all appointments without filters
      const response = await fetch("/api/appointments?all=true");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to fetch appointments");
      }

      let filteredAppointments = data.data || [];

      // Apply status filter
      if (appointmentStatusFilter !== "ALL") {
        filteredAppointments = filteredAppointments.filter(
          (apt: Appointment) => apt.status === appointmentStatusFilter
        );
      }

      // Apply upcoming only filter
      if (appointmentUpcomingOnly) {
        const now = new Date();
        filteredAppointments = filteredAppointments.filter(
          (apt: Appointment) => new Date(apt.startTime) > now
        );
      }

      // Sort by start time (most recent first)
      filteredAppointments.sort(
        (a: Appointment, b: Appointment) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      setAppointments(filteredAppointments);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching appointments:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load appointments. Please try again."
      );
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const handleAppointmentStatusUpdate = async (
    appointmentId: string,
    newStatus: AppointmentStatus
  ) => {
    try {
      setUpdatingAppointmentId(appointmentId);
      setError(null);

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error?.message || "Failed to update appointment status"
        );
      }

      setSuccessMessage(
        `Appointment status updated to ${newStatus} successfully!`
      );
      setTimeout(() => setSuccessMessage(null), 5000);

      // Refresh appointments
      await fetchAppointments();
    } catch (err) {
      console.error("[AdminDashboard] Error updating appointment status:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update appointment status. Please try again."
      );
    } finally {
      setUpdatingAppointmentId(null);
    }
  };

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

      // Dispatch event to notify doctors page to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
        console.log(
          "[AdminDashboard] Dispatched doctors-updated event after doctor creation"
        );
      }

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
      // Add timestamp to prevent browser caching
      queryParams.append("_t", Date.now().toString());

      const response = await fetch(
        `/api/admin/doctors?${queryParams.toString()}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store", // Always fetch fresh data
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

      // Dispatch event to notify doctors page to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
        console.log(
          "[AdminDashboard] Dispatched doctors-updated event after doctor update"
        );
      }

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

      // Dispatch event to notify doctors page to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
        console.log(
          "[AdminDashboard] Dispatched doctors-updated event after doctor deletion"
        );
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

      // Small delay to ensure database commit completes before refreshing
      await new Promise((resolve) => setTimeout(resolve, 100));
      await fetchAvailabilities();

      // Dispatch event to notify doctors page to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
        console.log("[AdminDashboard] Dispatched doctors-updated event");
      }

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
      // Clear any previous delete errors
      setDeleteError(null);
      setError(null);
      setDeletingScheduleId(id);

      const response = await fetch(`/api/availability/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle 409 Conflict - appointments exist
        if (response.status === 409) {
          const errorMessage =
            data.error?.message ||
            "Cannot delete schedule: appointments exist in this period.";
          setDeleteError(errorMessage);
          // Auto-clear after 10 seconds for conflict errors
          setTimeout(() => setDeleteError(null), 10000);
          return;
        }
        throw new Error(data.error?.message || "Failed to delete schedule");
      }

      setSuccessMessage("Schedule deleted successfully!");
      await fetchAvailabilities();

      // Small delay to ensure database commit completes before notifying other pages
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dispatch event to notify doctors page to refresh
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
        console.log(
          "[AdminDashboard] Dispatched doctors-updated event after schedule deletion"
        );
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error("[AdminDashboard] Error deleting schedule:", err);
      setError(
        err instanceof Error ? err.message : "Failed to delete schedule"
      );
    } finally {
      setDeletingScheduleId(null);
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

  // Create a lookup map for doctors by ID for efficient access in appointments table
  const doctorLookup = useMemo(() => {
    const lookup: Record<string, Doctor> = {};
    doctors.forEach((doctor) => {
      lookup[doctor.id] = doctor;
    });
    return lookup;
  }, [doctors]);

  // Mock data generators for payment and visit type
  const getPaymentInfo = useMemo(() => {
    const paymentTypes = ["Paid", "Pending", "Insurance", "Partial"];
    const amounts = [50, 75, 100, 125, 150, 200];
    return (appointmentId: string) => {
      const hash = appointmentId
        .split("")
        .reduce((a, b) => a + b.charCodeAt(0), 0);
      return {
        status: paymentTypes[hash % paymentTypes.length],
        amount: amounts[hash % amounts.length],
      };
    };
  }, []);

  const getVisitType = useMemo(() => {
    const visitTypes = [
      "In-Person",
      "Video Call",
      "Phone",
      "Follow-up",
      "Initial Consultation",
    ];
    return (appointmentId: string) => {
      const hash = appointmentId
        .split("")
        .reduce((a, b) => a + b.charCodeAt(0), 0);
      return visitTypes[hash % visitTypes.length];
    };
  }, []);

  // Filtered and paginated appointments
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Apply search filter
    if (appointmentSearch.trim()) {
      const searchLower = appointmentSearch.toLowerCase().trim();
      filtered = filtered.filter((apt) => {
        const doctor = doctorLookup[apt.doctorId];
        const doctorEmail = doctor?.userEmail?.toLowerCase() || "";
        const doctorSpec = doctor?.specialization?.toLowerCase() || "";
        return (
          apt.id.toLowerCase().includes(searchLower) ||
          (apt.patientEmail?.toLowerCase() || "").includes(searchLower) ||
          doctorEmail.includes(searchLower) ||
          doctorSpec.includes(searchLower)
        );
      });
    }

    // Apply status filter
    if (appointmentStatusFilter !== "ALL") {
      filtered = filtered.filter(
        (apt) => apt.status === appointmentStatusFilter
      );
    }

    // Apply doctor filter
    if (appointmentDoctorFilter !== "ALL") {
      filtered = filtered.filter(
        (apt) => apt.doctorId === appointmentDoctorFilter
      );
    }

    // Apply date range filter
    if (appointmentDateStart) {
      const startDate = new Date(appointmentDateStart);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter((apt) => new Date(apt.startTime) >= startDate);
    }
    if (appointmentDateEnd) {
      const endDate = new Date(appointmentDateEnd);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((apt) => new Date(apt.startTime) <= endDate);
    }

    // Apply upcoming only filter
    if (appointmentUpcomingOnly) {
      const now = new Date();
      filtered = filtered.filter((apt) => new Date(apt.startTime) > now);
    }

    // Sort by start time (most recent first)
    filtered.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );

    return filtered;
  }, [
    appointments,
    appointmentSearch,
    appointmentStatusFilter,
    appointmentDoctorFilter,
    appointmentDateStart,
    appointmentDateEnd,
    appointmentUpcomingOnly,
    doctorLookup,
  ]);

  // Paginated appointments
  const paginatedAppointments = useMemo(() => {
    const startIndex = (appointmentPage - 1) * appointmentPageSize;
    return filteredAppointments.slice(
      startIndex,
      startIndex + appointmentPageSize
    );
  }, [filteredAppointments, appointmentPage, appointmentPageSize]);

  // Total pages
  const totalAppointmentPages = useMemo(() => {
    return Math.ceil(filteredAppointments.length / appointmentPageSize);
  }, [filteredAppointments.length, appointmentPageSize]);

  // Reset page when filters change
  useEffect(() => {
    setAppointmentPage(1);
  }, [
    appointmentSearch,
    appointmentStatusFilter,
    appointmentDoctorFilter,
    appointmentDateStart,
    appointmentDateEnd,
    appointmentUpcomingOnly,
    appointmentPageSize,
  ]);

  // Clear all appointment filters
  const clearAppointmentFilters = () => {
    setAppointmentSearch("");
    setAppointmentStatusFilter("ALL");
    setAppointmentDoctorFilter("ALL");
    setAppointmentDateStart("");
    setAppointmentDateEnd("");
    setAppointmentUpcomingOnly(false);
    setAppointmentPage(1);
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      appointmentSearch.trim() !== "" ||
      appointmentStatusFilter !== "ALL" ||
      appointmentDoctorFilter !== "ALL" ||
      appointmentDateStart !== "" ||
      appointmentDateEnd !== "" ||
      appointmentUpcomingOnly
    );
  }, [
    appointmentSearch,
    appointmentStatusFilter,
    appointmentDoctorFilter,
    appointmentDateStart,
    appointmentDateEnd,
    appointmentUpcomingOnly,
  ]);

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
          <button
            onClick={() => setActiveTab("appointments")}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === "appointments"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
            }`}
          >
            Appointments
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
          {/* Doctor Registration */}
          <div className="rounded-lg bg-white shadow">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Doctor Registration
                </h2>
                <Button
                  variant="primary"
                  onClick={() => setShowDoctorForm(true)}
                >
                  Register New Doctor
                </Button>
              </div>
            </div>
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
                        No doctors found matching &quot;{doctorSearchQuery}
                        &quot;
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
                  {slotTemplate ? (
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
                  ) : (
                    <Card title="Slot Template Settings" className="mb-6">
                      <div className="rounded-md bg-blue-50 p-4">
                        <p className="text-sm font-medium text-blue-900 mb-2">
                          No custom template set. Using default values:
                        </p>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Slot Duration: 30 minutes</li>
                          <li>• Buffer Between Slots: 0 minutes</li>
                          <li>• Advance Booking Days: 30 days</li>
                        </ul>
                      </div>
                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSlotTemplateFormData({
                              durationMinutes: 30,
                              bufferMinutes: 0,
                              advanceBookingDays: 30,
                            });
                            setShowSlotTemplateForm(true);
                          }}
                        >
                          Create Custom Template
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
                    {/* Delete Error Banner - shown when trying to delete schedule with appointments */}
                    {deleteError && (
                      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <svg
                              className="h-5 w-5 text-red-600"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-red-800">
                              Cannot Delete Schedule
                            </h4>
                            <p className="mt-1 text-sm text-red-700">
                              {deleteError}
                            </p>
                          </div>
                          <button
                            onClick={() => setDeleteError(null)}
                            className="flex-shrink-0 rounded-md p-1 hover:bg-red-100"
                          >
                            <svg
                              className="h-4 w-4 text-red-600"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {availabilitiesLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                      </div>
                    ) : availabilities.length === 0 ? (
                      <div className="py-12 text-center text-gray-500">
                        No schedules found. Click &quot;Add New Schedule&quot;
                        to create one.
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
                                      disabled={
                                        deletingScheduleId === availability.id
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
                                      disabled={
                                        deletingScheduleId === availability.id
                                      }
                                      className={
                                        deletingScheduleId === availability.id
                                          ? "opacity-50 cursor-not-allowed"
                                          : ""
                                      }
                                    >
                                      {deletingScheduleId ===
                                      availability.id ? (
                                        <span className="flex items-center gap-1">
                                          <svg
                                            className="h-4 w-4 animate-spin"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            ></circle>
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                          </svg>
                                          Deleting…
                                        </span>
                                      ) : (
                                        "Delete"
                                      )}
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
            <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
              <p className="font-medium">Default Values:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Slot Duration: 30 minutes</li>
                <li>Buffer Between Slots: 0 minutes</li>
                <li>Advance Booking Days: 30 days</li>
              </ul>
            </div>
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
                  Minimum 5 minutes, maximum 480 minutes (8 hours). Default: 30
                  minutes.
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
                <p className="mt-1 text-xs text-gray-500">
                  Default: 0 minutes (no buffer between slots).
                </p>
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
                <p className="mt-1 text-xs text-gray-500">Default: 30 days.</p>
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

      {/* Appointments Tab */}
      {activeTab === "appointments" && (
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
                    {appointments.length}
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
                    {appointments.filter((a) => a.status === "PENDING").length}
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
                    {
                      appointments.filter((a) => a.status === "CONFIRMED")
                        .length
                    }
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
                    {
                      appointments.filter((a) => a.status === "COMPLETED")
                        .length
                    }
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
                        {
                          [
                            appointmentSearch,
                            appointmentStatusFilter !== "ALL",
                            appointmentDoctorFilter !== "ALL",
                            appointmentDateStart,
                            appointmentDateEnd,
                            appointmentUpcomingOnly,
                          ].filter(Boolean).length
                        }
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
                  value={appointmentSearch}
                  onChange={(e) => setAppointmentSearch(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {appointmentSearch && (
                  <button
                    onClick={() => setAppointmentSearch("")}
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
                      value={appointmentStatusFilter}
                      onChange={(e) =>
                        setAppointmentStatusFilter(
                          e.target.value as AppointmentStatus | "ALL"
                        )
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
                      value={appointmentDoctorFilter}
                      onChange={(e) =>
                        setAppointmentDoctorFilter(e.target.value)
                      }
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="ALL">All Doctors</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.specialization
                            ? `Dr. (${doctor.specialization})`
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
                      value={appointmentDateStart}
                      onChange={(e) => setAppointmentDateStart(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={appointmentDateEnd}
                      onChange={(e) => setAppointmentDateEnd(e.target.value)}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={appointmentUpcomingOnly}
                        onChange={(e) =>
                          setAppointmentUpcomingOnly(e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">Upcoming Only</span>
                    </label>
                    {hasActiveFilters && (
                      <button
                        onClick={clearAppointmentFilters}
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
                      onClick={clearAppointmentFilters}
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
                            ID
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
                        {paginatedAppointments.map((appointment) => {
                          const appointmentDate = new Date(
                            appointment.startTime
                          );
                          const isUpcoming = appointmentDate > new Date();
                          const isPast = appointmentDate < new Date();
                          const doctor = doctorLookup[appointment.doctorId];
                          const payment = getPaymentInfo(appointment.id);
                          const visitType = getVisitType(appointment.id);

                          const rowBgClass =
                            appointment.status === "CANCELLED"
                              ? "bg-red-50/50"
                              : appointment.status === "COMPLETED"
                                ? "bg-green-50/50"
                                : appointment.status === "CONFIRMED" &&
                                    isUpcoming
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
                                  className="font-mono text-xs text-gray-600"
                                  title={appointment.id}
                                >
                                  {appointment.id.slice(0, 8)}
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
                                      {doctor.specialization
                                        ? `Dr. (${doctor.specialization})`
                                        : doctor.userEmail}
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
                                  {appointment.status !==
                                    AppointmentStatus.CONFIRMED &&
                                    appointment.status !==
                                      AppointmentStatus.CANCELLED && (
                                      <button
                                        onClick={() =>
                                          handleAppointmentStatusUpdate(
                                            appointment.id,
                                            AppointmentStatus.CONFIRMED
                                          )
                                        }
                                        disabled={
                                          updatingAppointmentId ===
                                          appointment.id
                                        }
                                        className="rounded p-1.5 text-blue-500 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"
                                        title="Confirm appointment"
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
                                  {appointment.status ===
                                    AppointmentStatus.CONFIRMED && (
                                    <button
                                      onClick={() =>
                                        handleAppointmentStatusUpdate(
                                          appointment.id,
                                          AppointmentStatus.COMPLETED
                                        )
                                      }
                                      disabled={
                                        updatingAppointmentId === appointment.id
                                      }
                                      className="rounded p-1.5 text-green-500 hover:bg-green-50 hover:text-green-700 disabled:opacity-50"
                                      title="Mark as completed"
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
                                  {appointment.status !==
                                    AppointmentStatus.CANCELLED && (
                                    <button
                                      onClick={() =>
                                        handleAppointmentStatusUpdate(
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
                        Showing{" "}
                        {(appointmentPage - 1) * appointmentPageSize + 1} to{" "}
                        {Math.min(
                          appointmentPage * appointmentPageSize,
                          filteredAppointments.length
                        )}{" "}
                        of {filteredAppointments.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAppointmentPage(1)}
                        disabled={appointmentPage === 1}
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
                        onClick={() =>
                          setAppointmentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={appointmentPage === 1}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <div className="flex items-center gap-1 px-2">
                        {Array.from(
                          { length: Math.min(5, totalAppointmentPages) },
                          (_, i) => {
                            let pageNum;
                            if (totalAppointmentPages <= 5) {
                              pageNum = i + 1;
                            } else if (appointmentPage <= 3) {
                              pageNum = i + 1;
                            } else if (
                              appointmentPage >=
                              totalAppointmentPages - 2
                            ) {
                              pageNum = totalAppointmentPages - 4 + i;
                            } else {
                              pageNum = appointmentPage - 2 + i;
                            }
                            return (
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
                            );
                          }
                        )}
                      </div>
                      <button
                        onClick={() =>
                          setAppointmentPage((p) =>
                            Math.min(totalAppointmentPages, p + 1)
                          )
                        }
                        disabled={appointmentPage === totalAppointmentPages}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                      <button
                        onClick={() =>
                          setAppointmentPage(totalAppointmentPages)
                        }
                        disabled={appointmentPage === totalAppointmentPages}
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
                      {selectedDoctorForModal.userEmail
                        ?.charAt(0)
                        .toUpperCase() || "D"}
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">
                        {selectedDoctorForModal.specialization
                          ? `Dr. (${selectedDoctorForModal.specialization})`
                          : "Doctor"}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {selectedDoctorForModal.userEmail ||
                          "No email available"}
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
                        {selectedDoctorForModal.specialization ||
                          "Not specified"}
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
      )}

      {/* Doctor Registration Modal */}
      <DoctorRegistrationModal
        isOpen={showDoctorForm}
        onClose={() => {
          setShowDoctorForm(false);
          setDoctorFormErrors({});
          setError(null);
        }}
        onSuccess={async () => {
          await fetchDoctors();
          await fetchDoctorStats();
          await fetchData();
          setSuccessMessage("Doctor registered successfully!");
          setTimeout(() => {
            setSuccessMessage(null);
          }, 5000);
        }}
      />
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
