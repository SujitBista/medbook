"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button, Input, Card } from "@medbook/ui";
import { TimePicker } from "@/components/forms/TimePicker";
import type {
  Availability,
  CreateAvailabilityInput,
  SlotTemplate,
} from "@medbook/types";
import type { Doctor } from "@/app/admin/types";
import {
  DAYS_OF_WEEK,
  utcToLocalDate,
  formatDateTimeLocal,
  formatDateLocal,
  formatTimeLocal,
  localToUtcDate,
} from "@/app/admin/utils/date.utils";

interface ScheduleManagementTabProps {
  onError: (error: string) => void;
  onSuccess: (message: string) => void;
}

export function ScheduleManagementTab({
  onError,
  onSuccess,
}: ScheduleManagementTabProps) {
  // Fetch doctors for autocomplete
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch("/api/admin/doctors?limit=1000", {
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch doctors");
        }

        const data = await response.json();
        setDoctors(data.data || []);
      } catch (err) {
        console.error("[ScheduleManagementTab] Error fetching doctors:", err);
      }
    };

    fetchDoctors();
  }, []);
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
      params.append("_t", Date.now().toString());

      const response = await fetch(`/api/availability?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch availabilities");
      }

      const data = await response.json();
      if (data.success) {
        setAvailabilities(data.availabilities || []);
      }
    } catch (err) {
      console.error(
        "[ScheduleManagementTab] Error fetching availabilities:",
        err
      );
      onError(
        err instanceof Error ? err.message : "Failed to load availability data"
      );
    } finally {
      setAvailabilitiesLoading(false);
    }
  }, [
    selectedDoctorForSchedule,
    scheduleFilterStartDate,
    scheduleFilterEndDate,
    onError,
  ]);

  const fetchSlotTemplateMemo = useCallback(async () => {
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
      console.error(
        "[ScheduleManagementTab] Error fetching slot template:",
        err
      );
    } finally {
      setSlotTemplateLoading(false);
    }
  }, [selectedDoctorForSchedule]);

  useEffect(() => {
    if (selectedDoctorForSchedule) {
      fetchAvailabilities();
      fetchSlotTemplateMemo();
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
    fetchSlotTemplateMemo,
  ]);

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

  const handleDoctorSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDoctorSearchQuery(value);
    setShowDoctorDropdown(true);
    setHighlightedIndex(-1);
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

  const resetScheduleForm = () => {
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
    setSelectedDates([]);
    setUseDateRange(false);
    setDateRangeStart("");
    setDateRangeEnd("");
    setTimeRangeStart("09:00");
    setTimeRangeEnd("17:00");
    setSelectedIndividualSlots(new Set());
    setSchedulingMode("timeRange");
  };

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

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDoctorForSchedule) {
      setScheduleFormErrors({ doctorId: "Please select a doctor" });
      return;
    }

    if (scheduleFormData.isRecurring) {
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
      if (useDateRange) {
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
        if (selectedDates.length === 0) {
          setScheduleFormErrors({ dates: "Please select at least one date" });
          return;
        }
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
      onError("");

      if (scheduleFormData.isRecurring) {
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
        const datesToSchedule = selectedDates;

        if (datesToSchedule.length === 0) {
          setScheduleFormErrors({ dates: "Please select at least one date" });
          return;
        }

        const promises: Promise<Response>[] = [];

        if (schedulingMode === "timeRange") {
          for (const date of datesToSchedule) {
            const startDateTime = localToUtcDate(`${date}T${timeRangeStart}`);
            const endDateTime = localToUtcDate(`${date}T${timeRangeEnd}`);

            const payload: CreateAvailabilityInput = {
              doctorId: selectedDoctorForSchedule.id,
              startTime: startDateTime,
              endTime: endDateTime,
              isRecurring: false,
            };

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
          const errorResponse = failed[0].error;
          let errorMessage = "Failed to save some schedules";

          if (errorResponse) {
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

      onSuccess(
        editingScheduleId
          ? "Schedule updated successfully!"
          : "Schedule created successfully!"
      );
      setShowScheduleForm(false);
      setEditingScheduleId(null);
      resetScheduleForm();
      setSelectedDates([]);
      setUseDateRange(false);
      setDateRangeStart("");
      setDateRangeEnd("");
      setTimeRangeStart("09:00");
      setTimeRangeEnd("17:00");
      setSelectedIndividualSlots(new Set());

      await new Promise((resolve) => setTimeout(resolve, 100));
      await fetchAvailabilities();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
      }
    } catch (err) {
      console.error("[ScheduleManagementTab] Error saving schedule:", err);
      onError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleEditSchedule = (availability: Availability) => {
    setEditingScheduleId(availability.id);
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

    if (!availability.isRecurring) {
      const dateStr = formatDateLocal(startDate);
      setSelectedDates([dateStr]);
      setUseDateRange(false);
      setDateRangeStart("");
      setDateRangeEnd("");

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
      setDeleteError(null);
      onError("");
      setDeletingScheduleId(id);

      const response = await fetch(`/api/availability/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          const errorMessage =
            data.error?.message ||
            "Cannot delete schedule: appointments exist in this period.";
          setDeleteError(errorMessage);
          setTimeout(() => setDeleteError(null), 10000);
          return;
        }
        throw new Error(data.error?.message || "Failed to delete schedule");
      }

      onSuccess("Schedule deleted successfully!");
      await fetchAvailabilities();

      await new Promise((resolve) => setTimeout(resolve, 100));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("doctors-updated"));
      }
    } catch (err) {
      console.error("[ScheduleManagementTab] Error deleting schedule:", err);
      onError(err instanceof Error ? err.message : "Failed to delete schedule");
    } finally {
      setDeletingScheduleId(null);
    }
  };

  const handleCancelSchedule = () => {
    setShowScheduleForm(false);
    setEditingScheduleId(null);
    resetScheduleForm();
  };

  const formatDateTime = (date: Date | string) => {
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

  // Update scheduleFormData.doctorId when doctor is selected
  useEffect(() => {
    if (selectedDoctorForSchedule) {
      setScheduleFormData((prev) => ({
        ...prev,
        doctorId: selectedDoctorForSchedule.id,
      }));
    }
  }, [selectedDoctorForSchedule]);

  return (
    <div className="space-y-8">
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
              {showDoctorDropdown && filteredDoctorsForSelection.length > 0 && (
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
                    No doctors found matching &quot;{doctorSearchQuery}&quot;
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
                    <p className="mb-2 text-sm font-medium text-blue-900">
                      No custom template set. Using default values:
                    </p>
                    <ul className="space-y-1 text-sm text-blue-800">
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
                    onChange={(e) => setScheduleFilterStartDate(e.target.value)}
                  />
                  <Input
                    label="End Date"
                    type="date"
                    value={scheduleFilterEndDate}
                    onChange={(e) => setScheduleFilterEndDate(e.target.value)}
                  />
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setScheduleFilterStartDate("");
                        setScheduleFilterEndDate("");
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
                            Day of Week <span className="text-red-500">*</span>
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
                                  ? scheduleFormData.startTime.split("T")[1] ||
                                    "00:00"
                                  : "00:00"
                              }
                              onChange={(time) => {
                                const datePart =
                                  scheduleFormData.startTime.split("T")[0] ||
                                  formatDateLocal(new Date());
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
                                  ? scheduleFormData.endTime.split("T")[1] ||
                                    "00:00"
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
                              Valid From <span className="text-red-500">*</span>
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
                                    if (
                                      newStartDate &&
                                      !/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)
                                    ) {
                                      return;
                                    }
                                    setDateRangeStart(newStartDate);
                                    setScheduleFormErrors((prev) => ({
                                      ...prev,
                                      dateRangeStart: "",
                                      dateRange: "",
                                    }));
                                    if (newStartDate && dateRangeEnd) {
                                      const dates = generateDateRange(
                                        newStartDate,
                                        dateRangeEnd
                                      );
                                      setSelectedDates(dates);
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
                                    if (
                                      newEndDate &&
                                      !/^\d{4}-\d{2}-\d{2}$/.test(newEndDate)
                                    ) {
                                      return;
                                    }
                                    setDateRangeEnd(newEndDate);
                                    setScheduleFormErrors((prev) => ({
                                      ...prev,
                                      dateRangeEnd: "",
                                      dateRange: "",
                                    }));
                                    if (dateRangeStart && newEndDate) {
                                      const dates = generateDateRange(
                                        dateRangeStart,
                                        newEndDate
                                      );
                                      setSelectedDates(dates);
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
                                  if (newDate) {
                                    if (/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
                                      setSelectedDates([newDate]);
                                      setScheduleFormErrors((prev) => {
                                        const newErrors = { ...prev };
                                        delete newErrors.dates;
                                        return newErrors;
                                      });
                                    }
                                  } else {
                                    setSelectedDates([]);
                                    setScheduleFormErrors((prev) => {
                                      const newErrors = { ...prev };
                                      delete newErrors.dates;
                                      return newErrors;
                                    });
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
                                {selectedDates.length > 1 ? "s" : ""} selected
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
                                    e.target.value as "timeRange" | "individual"
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
                                    e.target.value as "timeRange" | "individual"
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

                            {previewSlots.length > 0 && (
                              <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                                <p className="mb-2 text-sm font-medium text-gray-700">
                                  Preview: {previewSlots.length} slot
                                  {previewSlots.length > 1 ? "s" : ""} will be
                                  generated
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
                                        ... and {previewSlots.length - 10} more
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
                              Select individual time slots to schedule (based on
                              slot template:{" "}
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

              {/* Add Schedule Button */}
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
                    No schedules found. Click &quot;Add New Schedule&quot; to
                    create one.
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
                                            d.value === availability.dayOfWeek
                                        )?.label
                                      }
                                    </strong>
                                    : {formatTimeLocal(availability.startTime)}{" "}
                                    - {formatTimeLocal(availability.endTime)}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Valid:{" "}
                                    {availability.validFrom
                                      ? formatDateLocal(availability.validFrom)
                                      : "N/A"}{" "}
                                    -{" "}
                                    {availability.validTo
                                      ? formatDateLocal(availability.validTo)
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
                                  {deletingScheduleId === availability.id ? (
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

              {/* Slot Template Form Modal */}
              {showSlotTemplateForm && selectedDoctorForSchedule && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                    <h3 className="mb-4 text-lg font-semibold">
                      Update Slot Template
                    </h3>
                    <p className="mb-4 text-sm text-gray-600">
                      Doctor: {selectedDoctorForSchedule.userEmail || "N/A"}
                    </p>
                    <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800">
                      <p className="font-medium">Default Values:</p>
                      <ul className="mt-1 list-inside list-disc space-y-1">
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
                              durationMinutes:
                                parseInt(e.target.value, 10) || 30,
                            })
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Minimum 5 minutes, maximum 480 minutes (8 hours).
                          Default: 30 minutes.
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
                          Advance Booking Days{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="advance-booking-days"
                          min="1"
                          value={slotTemplateFormData.advanceBookingDays}
                          onChange={(e) =>
                            setSlotTemplateFormData({
                              ...slotTemplateFormData,
                              advanceBookingDays:
                                parseInt(e.target.value, 10) || 30,
                            })
                          }
                          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Default: 30 days.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-2">
                      <Button
                        variant="primary"
                        onClick={async () => {
                          try {
                            setSlotTemplateLoading(true);
                            const response = await fetch(
                              "/api/slots/template",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  doctorId: selectedDoctorForSchedule.id,
                                  ...slotTemplateFormData,
                                }),
                              }
                            );

                            const data = await response.json();

                            if (!response.ok) {
                              throw new Error(
                                data.error?.message ||
                                  "Failed to update template"
                              );
                            }

                            onSuccess("Slot template updated successfully!");
                            setShowSlotTemplateForm(false);
                            await fetchSlotTemplateMemo();
                          } catch (err) {
                            console.error(
                              "[ScheduleManagementTab] Error updating slot template:",
                              err
                            );
                            onError(
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
                        {slotTemplateLoading ? "Saving..." : "Update Template"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowSlotTemplateForm(false)}
                        disabled={slotTemplateLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
