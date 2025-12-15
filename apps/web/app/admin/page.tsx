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
import { DoctorRegistrationModal } from "@/components/admin/DoctorRegistrationModal";
import { TabNavigation } from "@/components/admin/TabNavigation";
import { GeneralTab } from "@/components/admin/tabs/GeneralTab";
import { DoctorsTab } from "@/components/admin/tabs/DoctorsTab";
import { ScheduleManagementTab } from "@/components/admin/tabs/ScheduleManagementTab";
import { AppointmentsTab } from "@/components/admin/tabs/AppointmentsTab";
import type {
  User,
  SystemStats,
  AppointmentStats,
  Doctor,
  DoctorStats,
  TabType,
} from "@/app/admin/types";
import {
  DAYS_OF_WEEK,
  utcToLocalDate,
  formatDateTimeLocal,
  formatDateLocal,
  formatTimeLocal,
  localToUtcDate,
} from "@/app/admin/utils/date.utils";

// Mark this page as dynamic to prevent pre-rendering
export const dynamic = "force-dynamic";

function AdminDashboardContent() {
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [appointmentStats, setAppointmentStats] =
    useState<AppointmentStats | null>(null);
  const [appointmentStatsLoading, setAppointmentStatsLoading] = useState(false);
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
    licenseNumber: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    yearsOfExperience: "",
    education: "",
    profilePictureUrl: "",
  });
  const [editDoctorLoading, setEditDoctorLoading] = useState(false);
  const [editDoctorErrors, setEditDoctorErrors] = useState<
    Record<string, string>
  >({});
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [doctorPage, setDoctorPage] = useState(1);
  const [doctorPageSize, setDoctorPageSize] = useState(10);
  const [doctorTotal, setDoctorTotal] = useState(0);

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

  // Define fetchDoctors before useEffect hooks that use it
  const fetchDoctors = useCallback(async () => {
    try {
      setDoctorsLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append("search", searchQuery);
      if (specializationFilter)
        queryParams.append("specialization", specializationFilter);
      queryParams.append("page", doctorPage.toString());
      queryParams.append("limit", doctorPageSize.toString());
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
      setDoctorTotal(data.pagination?.total || 0);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching doctors:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch doctors");
    } finally {
      setDoctorsLoading(false);
    }
  }, [searchQuery, specializationFilter, doctorPage, doctorPageSize]);

  useEffect(() => {
    fetchData();
    fetchDoctorStats();
    fetchAppointmentStats();
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setDoctorPage(1); // Reset to first page when filters change
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, specializationFilter]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

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

  const fetchAppointmentStats = async () => {
    try {
      setAppointmentStatsLoading(true);
      const response = await fetch("/api/admin/appointments/stats", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch appointment stats");
      }

      const data = await response.json();
      setAppointmentStats(data.stats || null);
    } catch (err) {
      console.error("[AdminDashboard] Error fetching appointment stats:", err);
      // Don't set error for stats, just log it
    } finally {
      setAppointmentStatsLoading(false);
    }
  };

  const handleEditDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setEditDoctorData({
      specialization: doctor.specialization || "",
      bio: doctor.bio || "",
      licenseNumber: doctor.licenseNumber || "",
      address: doctor.address || "",
      city: doctor.city || "",
      state: doctor.state || "",
      zipCode: doctor.zipCode || "",
      yearsOfExperience: doctor.yearsOfExperience?.toString() || "",
      education: doctor.education || "",
      profilePictureUrl: doctor.profilePictureUrl || "",
    });
    setEditDoctorErrors({});
    setEditSelectedFile(null);
    setEditImagePreview(doctor.profilePictureUrl || null);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setEditDoctorErrors((prev) => ({
        ...prev,
        profilePicture: "Please select a valid image file (JPEG, PNG, or WebP)",
      }));
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setEditDoctorErrors((prev) => ({
        ...prev,
        profilePicture: "File size must be less than 5MB",
      }));
      return;
    }

    // Clear previous errors
    setEditDoctorErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.profilePicture;
      return newErrors;
    });

    // Set file and create preview
    setEditSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleEditRemoveImage = () => {
    setEditSelectedFile(null);
    setEditImagePreview(null);
    setEditDoctorData((prev) => ({ ...prev, profilePictureUrl: "" }));
    // Reset file input
    const fileInput = document.getElementById(
      "edit-profilePicture"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const uploadEditImage = async (): Promise<string | null> => {
    if (!editSelectedFile) {
      return editDoctorData.profilePictureUrl || null;
    }

    setEditUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", editSelectedFile);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to upload image");
      }

      return data.data.url;
    } catch (err) {
      console.error("[AdminDashboard] Error uploading image:", err);
      setEditDoctorErrors((prev) => ({
        ...prev,
        profilePicture:
          err instanceof Error ? err.message : "Failed to upload image",
      }));
      return null;
    } finally {
      setEditUploadingImage(false);
    }
  };

  const handleUpdateDoctor = async () => {
    if (!selectedDoctor) return;

    setEditDoctorLoading(true);
    setEditDoctorErrors({});
    setError(null);

    try {
      // Upload image first if a new file is selected
      let profilePictureUrl = editDoctorData.profilePictureUrl;
      if (editSelectedFile) {
        const uploadedUrl = await uploadEditImage();
        if (uploadedUrl) {
          profilePictureUrl = uploadedUrl;
        } else {
          // If upload failed, stop the update
          setEditDoctorLoading(false);
          return;
        }
      }

      const response = await fetch(`/api/admin/doctors/${selectedDoctor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          specialization: editDoctorData.specialization || undefined,
          bio: editDoctorData.bio || undefined,
          licenseNumber: editDoctorData.licenseNumber || undefined,
          address: editDoctorData.address || undefined,
          city: editDoctorData.city || undefined,
          state: editDoctorData.state || undefined,
          zipCode: editDoctorData.zipCode || undefined,
          yearsOfExperience: editDoctorData.yearsOfExperience
            ? parseInt(editDoctorData.yearsOfExperience, 10)
            : undefined,
          education: editDoctorData.education || undefined,
          profilePictureUrl: profilePictureUrl || undefined,
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
      setEditSelectedFile(null);
      setEditImagePreview(null);
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
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* General Tab */}
      {activeTab === "general" && (
        <GeneralTab
          users={users}
          stats={stats}
          appointmentStats={appointmentStats}
          appointmentStatsLoading={appointmentStatsLoading}
          selectedUser={selectedUser}
          newRole={newRole}
          onRoleChangeClick={(user) => {
            setSelectedUser(user);
            setNewRole(user.role);
          }}
          onRoleChange={(role) => setNewRole(role)}
          onRoleChangeConfirm={() => {
            if (selectedUser) {
              handleRoleChange(selectedUser.id, newRole);
            }
          }}
          onRoleChangeClose={() => setSelectedUser(null)}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {/* Doctors Tab */}
      {activeTab === "doctors" && (
        <DoctorsTab
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
          onDoctorSelectForSchedule={(doctor) => {
            setSelectedDoctorForSchedule(doctor);
            setActiveTab("schedule-management");
          }}
        />
      )}

      {/* Schedule Management Tab */}
      {activeTab === "schedule-management" && (
        <ScheduleManagementTab
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
      )}

      {/* Appointments Tab */}
      {activeTab === "appointments" && (
        <AppointmentsTab
          doctors={doctors}
          onError={setError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
          }}
        />
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
