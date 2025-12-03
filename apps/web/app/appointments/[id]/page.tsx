"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button, Card } from "@medbook/ui";
import { Appointment, AppointmentStatus, Doctor } from "@medbook/types";
import { formatDateTime } from "@/components/features/appointment/utils";
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

export default function AppointmentDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const appointmentId = params.id as string;

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

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

  const handleCancel = async () => {
    if (!appointment) return;

    try {
      setUpdating(true);
      setError(null);

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: AppointmentStatus.CANCELLED,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to cancel appointment");
      }

      setAppointment(data.data);
      setShowCancelConfirm(false);
      setSuccessMessage("Appointment cancelled successfully");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("[AppointmentDetail] Error cancelling appointment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel appointment. Please try again."
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: AppointmentStatus) => {
    if (!appointment) return;

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

  const canCancel =
    appointment &&
    appointment.status !== AppointmentStatus.CANCELLED &&
    appointment.status !== AppointmentStatus.COMPLETED &&
    new Date(appointment.startTime) > new Date(); // Can only cancel future appointments

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
                    <Link href={`/doctors/${appointment.doctorId}`}>
                      <Button variant="primary" className="w-full">
                        Reschedule Appointment
                      </Button>
                    </Link>
                  )}
                </>
              )}

              {/* Doctor Actions */}
              {isDoctor && appointment.doctorId === session.user.id && (
                <>
                  {appointment.status === AppointmentStatus.PENDING && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() =>
                        handleStatusUpdate(AppointmentStatus.CONFIRMED)
                      }
                      disabled={updating}
                    >
                      Confirm Appointment
                    </Button>
                  )}

                  {appointment.status === AppointmentStatus.CONFIRMED && (
                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={() =>
                        handleStatusUpdate(AppointmentStatus.COMPLETED)
                      }
                      disabled={updating}
                    >
                      Mark as Completed
                    </Button>
                  )}

                  {canCancel && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        handleStatusUpdate(AppointmentStatus.CANCELLED)
                      }
                      disabled={updating}
                    >
                      Cancel Appointment
                    </Button>
                  )}
                </>
              )}

              {/* Admin Actions */}
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
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            handleStatusUpdate(AppointmentStatus.CONFIRMED)
                          }
                          disabled={updating}
                        >
                          Set to Confirmed
                        </Button>
                      )}
                      {appointment.status !== AppointmentStatus.COMPLETED && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            handleStatusUpdate(AppointmentStatus.COMPLETED)
                          }
                          disabled={updating}
                        >
                          Set to Completed
                        </Button>
                      )}
                      {appointment.status !== AppointmentStatus.CANCELLED && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            handleStatusUpdate(AppointmentStatus.CANCELLED)
                          }
                          disabled={updating}
                        >
                          Set to Cancelled
                        </Button>
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
    </div>
  );
}
