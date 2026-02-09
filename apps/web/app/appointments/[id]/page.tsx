"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button, Card, useToast } from "@medbook/ui";
import {
  Appointment,
  AppointmentStatus,
  Doctor,
  Slot,
  SlotStatus,
  Payment,
} from "@medbook/types";

const REFUND_THRESHOLD_HOURS = 24;

/** Refund message for cancel confirm modal (matches backend policy) */
function getCancelRefundMessage(
  role: string,
  startTime: string | Date
): string {
  if (role === "DOCTOR" || role === "ADMIN") {
    return "Cancel now: Full refund (doctor/clinic cancellation).";
  }
  const start = new Date(startTime).getTime();
  const hoursUntil = (start - Date.now()) / (3600 * 1000);
  if (hoursUntil >= REFUND_THRESHOLD_HOURS) {
    return "Cancel now: Full refund (cancelled at least 24 hours before).";
  }
  return "Cancel now: No refund (within 24 hours of appointment).";
}
import { formatDateTime } from "@/components/features/appointment/utils";
import { PaymentStatus } from "@/components/features/payment/PaymentStatus";
import Link from "next/link";

interface AppointmentResponse {
  success: boolean;
  data: Appointment;
  error?: {
    code: string;
    message: string;
  };
}

interface DoctorResponse {
  success: boolean;
  doctor: Doctor;
}

interface SlotsResponse {
  success: boolean;
  slots: Slot[];
}

export default function AppointmentDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loggedInDoctor, setLoggedInDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [payment, setPayment] = useState<Payment | null>(null);
  const { showSuccess, showError } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/appointments/${appointmentId}`);
    }
  }, [status, router, appointmentId]);

  // Fetch appointment details
  useEffect(() => {
    if (appointmentId && status === "authenticated") {
      fetchAppointment();
    }
  }, [appointmentId, status]);

  // Fetch doctor details when appointment is loaded
  useEffect(() => {
    if (appointment?.doctorId) {
      fetchDoctor();
    }
  }, [appointment?.doctorId]);

  // Fetch logged-in doctor's profile if user is a doctor
  useEffect(() => {
    if (session?.user?.role === "DOCTOR" && session.user.id) {
      fetchLoggedInDoctor();
    }
  }, [session?.user?.role, session?.user?.id]);

  // Fetch payment information when appointment is loaded
  useEffect(() => {
    if (appointment?.id) {
      fetchPayment();
    }
  }, [appointment?.id]);

  const fetchPayment = async () => {
    if (!appointmentId) return;

    try {
      const response = await fetch(
        `/api/payments/appointment/${appointmentId}`,
        { cache: "no-store" }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setPayment(data.data);
        }
      }
    } catch (err) {
      console.error("[AppointmentDetail] Error fetching payment:", err);
      // Don't show error, payment might not exist
    }
  };

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/appointments/${appointmentId}`);
      const data: AppointmentResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error?.message || "Failed to fetch appointment details"
        );
      }

      setAppointment(data.data);
    } catch (err) {
      console.error("[AppointmentDetail] Error fetching appointment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load appointment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDoctor = async () => {
    if (!appointment?.doctorId) return;

    try {
      const response = await fetch(`/api/doctors/${appointment.doctorId}`);
      const data: DoctorResponse = await response.json();

      if (response.ok && data.success && data.doctor) {
        setDoctor(data.doctor);
      }
    } catch (err) {
      console.error("[AppointmentDetail] Error fetching doctor:", err);
      // Don't set error here, doctor info is optional
    }
  };

  const fetchLoggedInDoctor = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch(`/api/doctors/user/${session.user.id}`);
      const data: DoctorResponse = await response.json();

      if (response.ok && data.success && data.doctor) {
        setLoggedInDoctor(data.doctor);
      }
    } catch (err) {
      console.error(
        "[AppointmentDetail] Error fetching logged-in doctor:",
        err
      );
      // Don't set error here, doctor info is optional
    }
  };

  const fetchAvailableSlots = async () => {
    if (!appointment?.doctorId) return;

    try {
      setLoadingSlots(true);
      // Add timestamp to prevent browser caching and use no-store
      const params = new URLSearchParams();
      params.append("status", SlotStatus.AVAILABLE);
      params.append("_t", Date.now().toString());

      const response = await fetch(
        `/api/slots/doctor/${appointment.doctorId}?${params.toString()}`,
        {
          cache: "no-store", // Always fetch fresh slot data
        }
      );
      const data: SlotsResponse = await response.json();

      if (response.ok && data.success) {
        // Filter out past slots and the current appointment's slot
        const futureSlots = data.slots.filter(
          (slot) =>
            new Date(slot.startTime) > new Date() &&
            slot.id !== appointment.slotId
        );
        setAvailableSlots(futureSlots);
      } else {
        setAvailableSlots([]);
      }
    } catch (err) {
      console.error("[AppointmentDetail] Error fetching slots:", err);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleReschedule = async () => {
    if (!appointment || !selectedSlotId) return;

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(
        `/api/appointments/${appointmentId}/reschedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newSlotId: selectedSlotId,
            reason: rescheduleReason || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error?.message || "Failed to reschedule appointment"
        );
      }

      setAppointment(data.data);
      setShowReschedule(false);
      setSelectedSlotId(null);
      setRescheduleReason("");
      setSuccessMessage("Appointment rescheduled successfully");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("[AppointmentDetail] Error rescheduling appointment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reschedule appointment. Please try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  const openRescheduleModal = () => {
    setShowReschedule(true);
    fetchAvailableSlots();
  };

  const closeRescheduleModal = () => {
    setShowReschedule(false);
    setSelectedSlotId(null);
    setRescheduleReason("");
    setAvailableSlots([]);
  };

  const handleCancel = async () => {
    if (!appointment) return;

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(
        `/api/appointments/${appointmentId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: undefined }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to cancel appointment");
      }

      const result = data.data as {
        appointment: Appointment;
        refundDecision?: { type: string; reason: string };
        paymentSummary?: { refundFailed?: boolean };
      };
      setAppointment(result.appointment);
      setShowCancelConfirm(false);
      const refundNote =
        result.refundDecision?.type === "FULL"
          ? " A full refund will be processed."
          : result.paymentSummary?.refundFailed
            ? " Refund could not be processed; please contact support."
            : "";
      setSuccessMessage("Appointment cancelled successfully." + refundNote);
      setTimeout(() => setSuccessMessage(null), 6000);
      showSuccess("Appointment cancelled successfully");
    } catch (err) {
      console.error("[AppointmentDetail] Error cancelling appointment:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to cancel appointment. Please try again.";
      setError(message);
      showError(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: AppointmentStatus) => {
    if (!appointment) return;

    // Enforce time-based rules so disabled buttons don't trigger API; show message if user bypasses UI
    if (newStatus === AppointmentStatus.CONFIRMED && !canConfirm) {
      setError(
        isPast
          ? "Cannot confirm a past appointment."
          : "Cannot confirm this appointment."
      );
      return;
    }
    if (newStatus === AppointmentStatus.COMPLETED && !canComplete) {
      setError(
        isFuture
          ? "You can complete only after the appointment starts."
          : "Cannot complete this appointment."
      );
      return;
    }

    try {
      setUpdating(true);
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

      setAppointment(data.data);
      setSuccessMessage(`Appointment status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error(
        "[AppointmentDetail] Error updating appointment status:",
        err
      );
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update appointment status. Please try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  // Time-based state for status actions (use ISO timestamps from server; avoid comparing formatted strings).
  const startAt = appointment
    ? new Date(appointment.startTime)
    : (null as Date | null);
  const endAt = appointment
    ? new Date(appointment.endTime)
    : (null as Date | null);
  const now = new Date();
  const isPast = startAt && endAt ? now > endAt : false;
  const isFuture = startAt ? now < startAt : false;
  const isInProgress =
    startAt && endAt ? now >= startAt && now <= endAt : false;

  const canConfirm =
    appointment &&
    !isPast &&
    appointment.status !== AppointmentStatus.CANCELLED &&
    appointment.status !== AppointmentStatus.COMPLETED;
  const canComplete =
    appointment &&
    !isFuture &&
    appointment.status !== AppointmentStatus.CANCELLED &&
    appointment.status !== AppointmentStatus.COMPLETED;
  const canCancelStatus =
    appointment &&
    appointment.status !== AppointmentStatus.CANCELLED &&
    appointment.status !== AppointmentStatus.COMPLETED;

  const canCancel =
    appointment &&
    canCancelStatus &&
    new Date(appointment.startTime) > new Date(); // Patient: can only cancel future appointments

  const canReschedule =
    appointment &&
    appointment.status !== AppointmentStatus.CANCELLED &&
    appointment.status !== AppointmentStatus.COMPLETED &&
    new Date(appointment.startTime) > new Date(); // Can only reschedule future appointments

  const isDoctor = session?.user?.role === "DOCTOR";
  const isPatient =
    session?.user?.role === "PATIENT" &&
    appointment?.patientId === session.user.id;
  const isAdmin = session?.user?.role === "ADMIN";

  // Check if the appointment belongs to the logged-in doctor
  const isAppointmentDoctor =
    isDoctor && loggedInDoctor && appointment?.doctorId === loggedInDoctor.id;

  // Show loading state
  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !appointment) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
              <Button variant="primary" onClick={fetchAppointment}>
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show not found or unauthorized
  if (!appointment) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">Appointment not found</p>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            ← Back to Dashboard
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          <p>{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointment Details */}
        <div className="lg:col-span-2">
          <Card title="Appointment Details">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Appointment ID</p>
                <p className="font-mono text-sm text-gray-900">
                  {appointment.id}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                    appointment.status === AppointmentStatus.PENDING
                      ? "bg-yellow-100 text-yellow-800"
                      : appointment.status === AppointmentStatus.CONFIRMED
                        ? "bg-green-100 text-green-800"
                        : appointment.status === AppointmentStatus.CANCELLED
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {appointment.status}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-semibold text-gray-900">
                  {formatDateTime(appointment.startTime)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Duration:{" "}
                  {Math.round(
                    (new Date(appointment.endTime).getTime() -
                      new Date(appointment.startTime).getTime()) /
                      60000
                  )}{" "}
                  minutes
                </p>
              </div>

              {doctor && (
                <div>
                  <p className="text-sm text-gray-600">Doctor</p>
                  <p className="font-semibold text-gray-900">
                    {doctor.userEmail || "N/A"}
                  </p>
                  {doctor.specialization && (
                    <p className="text-sm text-gray-500">
                      {doctor.specialization}
                    </p>
                  )}
                  <Link href={`/doctors/${doctor.id}`}>
                    <Button variant="ghost" size="sm" className="mt-2">
                      View Doctor Profile →
                    </Button>
                  </Link>
                </div>
              )}

              {appointment.patientEmail && (
                <div>
                  <p className="text-sm text-gray-600">Patient</p>
                  <p className="font-semibold text-gray-900">
                    {appointment.patientEmail}
                  </p>
                </div>
              )}

              {appointment.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {appointment.notes}
                  </p>
                </div>
              )}

              {payment && (
                <div className="pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Payment Information
                  </h3>
                  <PaymentStatus
                    status={payment.status}
                    amount={payment.amount}
                    refundedAmount={payment.refundedAmount}
                    refundReason={payment.refundReason}
                  />
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Created: {new Date(appointment.createdAt).toLocaleString()}
                </p>
                {appointment.updatedAt !== appointment.createdAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Updated: {new Date(appointment.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Actions */}
        <div className="lg:col-span-1">
          <Card title="Actions">
            <div className="space-y-3">
              {/* Patient Actions */}
              {isPatient && (
                <>
                  {canCancel && (
                    <>
                      {!showCancelConfirm ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={updating}
                        >
                          Cancel Appointment
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            Are you sure you want to cancel this appointment?
                          </p>
                          <p className="text-sm font-medium text-gray-800">
                            {getCancelRefundMessage(
                              session?.user?.role ?? "PATIENT",
                              appointment.startTime
                            )}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setShowCancelConfirm(false)}
                              disabled={updating}
                            >
                              No
                            </Button>
                            <Button
                              variant="primary"
                              className="flex-1"
                              onClick={handleCancel}
                              disabled={updating}
                            >
                              Yes, Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {canReschedule && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={openRescheduleModal}
                      disabled={updating}
                    >
                      Reschedule Appointment
                    </Button>
                  )}
                </>
              )}

              {/* Doctor Actions — Confirm/Complete disabled by appointment time; Cancel allowed when not CANCELLED/COMPLETED */}
              {isAppointmentDoctor && (
                <>
                  {appointment.status === AppointmentStatus.PENDING && (
                    <>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() =>
                          handleStatusUpdate(AppointmentStatus.CONFIRMED)
                        }
                        disabled={updating || !canConfirm}
                      >
                        Confirm Appointment
                      </Button>
                      {!canConfirm && isPast && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Cannot confirm a past appointment.
                        </p>
                      )}
                    </>
                  )}

                  {appointment.status === AppointmentStatus.CONFIRMED && (
                    <>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() =>
                          handleStatusUpdate(AppointmentStatus.COMPLETED)
                        }
                        disabled={updating || !canComplete}
                      >
                        Mark as Completed
                      </Button>
                      {!canComplete && isFuture && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          You can complete only after the appointment starts.
                        </p>
                      )}
                    </>
                  )}

                  {canCancelStatus && (
                    <>
                      {!showCancelConfirm ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setShowCancelConfirm(true)}
                          disabled={updating}
                        >
                          Cancel Appointment
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600">
                            Are you sure you want to cancel this appointment?
                          </p>
                          <p className="text-sm font-medium text-gray-800">
                            {getCancelRefundMessage(
                              session?.user?.role ?? "DOCTOR",
                              appointment.startTime
                            )}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => setShowCancelConfirm(false)}
                              disabled={updating}
                            >
                              No
                            </Button>
                            <Button
                              variant="primary"
                              className="flex-1"
                              onClick={handleCancel}
                              disabled={updating}
                            >
                              Yes, Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Admin Actions — Confirm/Complete disabled by appointment time; Cancel disabled only when already CANCELLED/COMPLETED */}
              {isAdmin && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Update Status:
                    </p>
                    <div className="space-y-1">
                      {appointment.status !== AppointmentStatus.PENDING && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            handleStatusUpdate(AppointmentStatus.PENDING)
                          }
                          disabled={updating}
                        >
                          Set to Pending
                        </Button>
                      )}
                      {appointment.status !== AppointmentStatus.CONFIRMED && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              handleStatusUpdate(AppointmentStatus.CONFIRMED)
                            }
                            disabled={updating || !canConfirm}
                          >
                            Set to Confirmed
                          </Button>
                          {!canConfirm && isPast && (
                            <p className="text-xs text-gray-500">
                              Cannot confirm a past appointment.
                            </p>
                          )}
                        </>
                      )}
                      {appointment.status !== AppointmentStatus.COMPLETED && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              handleStatusUpdate(AppointmentStatus.COMPLETED)
                            }
                            disabled={updating || !canComplete}
                          >
                            Set to Completed
                          </Button>
                          {!canComplete && isFuture && (
                            <p className="text-xs text-gray-500">
                              You can complete only after the appointment
                              starts.
                            </p>
                          )}
                        </>
                      )}
                      {appointment.status !== AppointmentStatus.CANCELLED && (
                        <>
                          {!showCancelConfirm ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => setShowCancelConfirm(true)}
                              disabled={updating}
                            >
                              Set to Cancelled
                            </Button>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">
                                Are you sure you want to cancel this
                                appointment?
                              </p>
                              <p className="text-sm font-medium text-gray-800">
                                {getCancelRefundMessage(
                                  "ADMIN",
                                  appointment.startTime
                                )}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  onClick={() => setShowCancelConfirm(false)}
                                  disabled={updating}
                                >
                                  No
                                </Button>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  className="flex-1"
                                  onClick={handleCancel}
                                  disabled={updating}
                                >
                                  Yes, Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {updating && (
                <div className="text-center">
                  <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                  <p className="mt-2 text-sm text-gray-600">Updating...</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showReschedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">
                Reschedule Appointment
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Select a new time slot for your appointment
              </p>
            </div>

            {/* Reason field - always visible at the top */}
            <div className="px-6 pt-4 flex-shrink-0">
              <label
                htmlFor="rescheduleReason"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Reason for rescheduling (optional)
              </label>
              <textarea
                id="rescheduleReason"
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Enter reason for rescheduling..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>

            {/* Scrollable slots list */}
            <div className="px-6 py-4 overflow-y-auto flex-1 min-h-0">
              {loadingSlots ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
                  <p className="mt-4 text-gray-600">
                    Loading available slots...
                  </p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    No available slots found. Please try again later.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Select a new time slot:
                  </p>
                  {availableSlots.map((slot) => (
                    <label
                      key={slot.id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedSlotId === slot.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="slot"
                        value={slot.id}
                        checked={selectedSlotId === slot.id}
                        onChange={() => setSelectedSlotId(slot.id)}
                        className="h-4 w-4 text-blue-600"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">
                          {formatDateTime(slot.startTime)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Duration:{" "}
                          {Math.round(
                            (new Date(slot.endTime).getTime() -
                              new Date(slot.startTime).getTime()) /
                              60000
                          )}{" "}
                          minutes
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end flex-shrink-0">
              <Button
                variant="outline"
                onClick={closeRescheduleModal}
                disabled={updating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleReschedule}
                disabled={updating || !selectedSlotId}
              >
                {updating ? "Rescheduling..." : "Confirm Reschedule"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
