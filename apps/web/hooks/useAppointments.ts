import { useState, useCallback } from "react";
import type { Appointment, AppointmentStatus } from "@medbook/types";

interface UseAppointmentsOptions {
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

interface UseAppointmentsReturn {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  fetchAppointments: () => Promise<void>;
  updateAppointmentStatus: (
    appointmentId: string,
    newStatus: AppointmentStatus
  ) => Promise<void>;
  updatingId: string | null;
}

/**
 * Custom hook for fetching and managing appointments
 */
export function useAppointments(
  options: UseAppointmentsOptions = {}
): UseAppointmentsReturn {
  const { onError, onSuccess } = options;
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Admins can fetch all appointments without filters
      const response = await fetch("/api/appointments?all=true");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to fetch appointments");
      }

      // Sort by start time (most recent first)
      const sortedAppointments = (data.data || []).sort(
        (a: Appointment, b: Appointment) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      setAppointments(sortedAppointments);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to load appointments. Please try again.";
      console.error("[useAppointments] Error fetching appointments:", err);
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  const updateAppointmentStatus = useCallback(
    async (appointmentId: string, newStatus: AppointmentStatus) => {
      try {
        setUpdatingId(appointmentId);
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

        const successMessage = `Appointment status updated to ${newStatus} successfully!`;
        onSuccess?.(successMessage);

        // Refresh appointments
        await fetchAppointments();
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update appointment status. Please try again.";
        console.error(
          "[useAppointments] Error updating appointment status:",
          err
        );
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setUpdatingId(null);
      }
    },
    [fetchAppointments, onError, onSuccess]
  );

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
    updateAppointmentStatus,
    updatingId,
  };
}
