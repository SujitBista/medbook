"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button, Card } from "@medbook/ui";
import {
  Doctor,
  Availability,
  Appointment,
  CreateAppointmentInput,
} from "@medbook/types";
import {
  TimeSlotSelector,
  BookingForm,
  AppointmentConfirmation,
  generateAvailableTimeSlots,
  TimeSlot,
} from "@/components/features/appointment";
import Link from "next/link";

interface DoctorResponse {
  success: boolean;
  doctor: Doctor;
}

interface AvailabilitiesResponse {
  success: boolean;
  availabilities: Availability[];
}

interface AppointmentsResponse {
  success: boolean;
  data: Appointment[];
}

interface AppointmentCreateResponse {
  success: boolean;
  data: Appointment;
  error?: {
    code: string;
    message: string;
  };
}

export default function DoctorDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const doctorId = params.id as string;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<
    Appointment[]
  >([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] =
    useState<Appointment | null>(null);

  // Fetch doctor details, availability, and existing appointments
  useEffect(() => {
    if (doctorId) {
      fetchDoctorData();
    }
  }, [doctorId]);

  // Generate available slots when data changes
  useEffect(() => {
    if (availabilities.length > 0) {
      const slots = generateAvailableTimeSlots(
        availabilities,
        existingAppointments
      );
      setAvailableSlots(slots);
    }
  }, [availabilities, existingAppointments]);

  const fetchDoctorData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch doctor details
      const doctorResponse = await fetch(`/api/doctors/${doctorId}`);
      if (!doctorResponse.ok) {
        throw new Error("Failed to fetch doctor details");
      }
      const doctorData: DoctorResponse = await doctorResponse.json();
      if (!doctorData.success || !doctorData.doctor) {
        throw new Error("Doctor not found");
      }
      setDoctor(doctorData.doctor);

      // Fetch availabilities (public endpoint)
      const params = new URLSearchParams({ doctorId });
      // Get availability for next 30 days
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      params.append("startDate", startDate.toISOString());
      params.append("endDate", endDate.toISOString());

      const availResponse = await fetch(
        `/api/availability?${params.toString()}`
      );
      if (availResponse.ok) {
        const availData: AvailabilitiesResponse = await availResponse.json();
        if (availData.success) {
          setAvailabilities(availData.availabilities);
        }
      }

      // Fetch existing appointments for this doctor to exclude booked slots
      // Only if authenticated (appointments endpoint requires auth)
      if (status === "authenticated" && session?.user?.id) {
        const appointmentsResponse = await fetch(
          `/api/appointments?doctorId=${doctorId}`
        );
        if (appointmentsResponse.ok) {
          const appointmentsData: AppointmentsResponse =
            await appointmentsResponse.json();
          if (appointmentsData.success) {
            setExistingAppointments(appointmentsData.data);
          }
        }
      }
    } catch (err) {
      console.error("[DoctorDetail] Error fetching data:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load doctor information. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowBookingForm(true);
    setError(null);
  };

  const handleBookingSubmit = async (input: CreateAppointmentInput) => {
    if (!session?.user?.id) {
      router.push(`/login?callbackUrl=/doctors/${doctorId}`);
      return;
    }

    try {
      setBooking(true);
      setError(null);

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...input,
          patientId: session.user.id,
        }),
      });

      const data: AppointmentCreateResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error?.message || "Failed to book appointment. Please try again."
        );
      }

      setBookedAppointment(data.data);
      setShowBookingForm(false);
      setSelectedSlot(null);

      // Refresh data to update available slots
      await fetchDoctorData();
    } catch (err) {
      console.error("[DoctorDetail] Error booking appointment:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to book appointment. Please try again."
      );
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = () => {
    setShowBookingForm(false);
    setSelectedSlot(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading doctor information...</p>
        </div>
      </div>
    );
  }

  if (error && !doctor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Link href="/dashboard">
              <Button variant="primary">Back to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-8">
            <p className="text-gray-600">Doctor not found</p>
            <Link href="/dashboard" className="mt-4 inline-block">
              <Button variant="primary">Back to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/doctors">
          <Button variant="ghost" size="sm">
            ← Back to Doctors
          </Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Doctor Information */}
        <div className="lg:col-span-1">
          <Card title="Doctor Information">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-semibold text-gray-900">
                  {doctor.userEmail || "N/A"}
                </p>
              </div>
              {doctor.specialization && (
                <div>
                  <p className="text-sm text-gray-600">Specialization</p>
                  <p className="font-semibold text-gray-900">
                    {doctor.specialization}
                  </p>
                </div>
              )}
              {doctor.bio && (
                <div>
                  <p className="text-sm text-gray-600">Bio</p>
                  <p className="text-gray-900">{doctor.bio}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Booking Section */}
        <div className="lg:col-span-2">
          {bookedAppointment ? (
            <AppointmentConfirmation
              appointment={bookedAppointment}
              doctorName={doctor.userEmail}
              onClose={() => {
                setBookedAppointment(null);
                router.push("/dashboard");
              }}
            />
          ) : !showBookingForm ? (
            <Card title="Available Time Slots">
              {!loading &&
              availabilities.length === 0 &&
              availableSlots.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-2">
                    No available time slots found for this doctor.
                  </p>
                  <p className="text-sm text-gray-500 mb-6">
                    Please check back later or contact the doctor directly.
                  </p>
                  <Link href="/doctors">
                    <Button variant="ghost" size="sm">
                      ← Back to Doctors
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <TimeSlotSelector
                    slots={availableSlots}
                    selectedSlot={selectedSlot}
                    onSelectSlot={handleSlotSelect}
                    loading={loading}
                  />
                  {selectedSlot && (
                    <div className="mt-6">
                      {status === "unauthenticated" ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600 text-center">
                            Please sign in to book this appointment
                          </p>
                          <Link
                            href={`/login?callbackUrl=/doctors/${doctorId}`}
                          >
                            <Button variant="primary" className="w-full">
                              Sign In to Book
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <Button
                          variant="primary"
                          onClick={() => setShowBookingForm(true)}
                          className="w-full"
                        >
                          Book Selected Slot
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </Card>
          ) : (
            <BookingForm
              doctorId={doctorId}
              patientId={session?.user?.id || ""}
              selectedSlot={selectedSlot}
              onSubmit={handleBookingSubmit}
              onCancel={handleCancelBooking}
              loading={booking}
            />
          )}
        </div>
      </div>
    </div>
  );
}
