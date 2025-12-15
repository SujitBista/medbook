"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Button, Card } from "@medbook/ui";
import { Doctor, Appointment, CreateAppointmentInput } from "@medbook/types";
import {
  TimeSlotSelector,
  BookingForm,
  AppointmentConfirmation,
  TimeSlot,
} from "@/components/features/appointment";
import { Slot, SlotStatus } from "@medbook/types";
import Link from "next/link";
import useSWR from "swr";

// Doctor Avatar Component with fallback
function DoctorAvatar({
  profilePictureUrl,
  name,
  initials,
  size = "large",
}: {
  profilePictureUrl?: string;
  name: string;
  initials: string;
  size?: "small" | "large";
}) {
  const [imageError, setImageError] = useState(false);
  const sizeClasses =
    size === "large" ? "h-32 w-32 text-3xl" : "h-20 w-20 text-xl";

  if (!profilePictureUrl || imageError) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold border-4 border-primary-100 shadow-lg`}
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      src={profilePictureUrl}
      alt={name}
      className={`${sizeClasses} rounded-full object-cover border-4 border-primary-100 shadow-lg`}
      onError={() => setImageError(true)}
    />
  );
}

interface DoctorResponse {
  success: boolean;
  doctor: Doctor;
}

interface SlotsResponse {
  success: boolean;
  slots: Slot[];
}

interface AppointmentCreateResponse {
  success: boolean;
  data: Appointment;
  error?: {
    code: string;
    message: string;
  };
}

// Fetcher function for doctor data
const fetchDoctor = async (url: string): Promise<Doctor> => {
  console.log("[DoctorDetail] Fetching doctor:", url);
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch doctor details");
  }

  const data: DoctorResponse = await response.json();

  if (!data.success || !data.doctor) {
    throw new Error("Doctor not found");
  }

  return data.doctor;
};

// Fetcher function for slots
const fetchSlots = async (url: string): Promise<TimeSlot[]> => {
  console.log("[DoctorDetail] Fetching slots:", url);
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn(
      "[DoctorDetail] Failed to fetch slots:",
      response.status,
      response.statusText
    );
    return [];
  }

  const data: SlotsResponse = await response.json();

  if (!data.success) {
    console.warn("[DoctorDetail] Slots response not successful:", data);
    return [];
  }

  if (!data.slots || data.slots.length === 0) {
    console.log("[DoctorDetail] No slots returned from API");
    return [];
  }

  console.log("[DoctorDetail] Received slots from API:", data.slots.length);

  // Convert backend Slot[] to TimeSlot[]
  // Filter to only include future slots (use >= to include slots starting now)
  const now = new Date();
  const timeSlots = data.slots
    .filter((slot) => {
      const slotStart = new Date(slot.startTime);
      const isFuture = slotStart >= now;
      if (!isFuture) {
        console.log(
          "[DoctorDetail] Filtered out past slot:",
          slotStart.toISOString()
        );
      }
      return isFuture;
    })
    .map((slot) => ({
      id: slot.id,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      availabilityId: slot.availabilityId,
      status: slot.status,
    }));

  console.log("[DoctorDetail] Filtered time slots:", timeSlots.length);
  return timeSlots;
};

export default function DoctorDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const doctorId = params.id as string;

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] =
    useState<Appointment | null>(null);

  // Build slots API URL
  const slotsUrl = useMemo(() => {
    if (!doctorId) return null;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    const params = new URLSearchParams();
    params.append("startDate", startDate.toISOString());
    params.append("endDate", endDate.toISOString());
    params.append("status", SlotStatus.AVAILABLE);

    return `/api/slots/doctor/${doctorId}?${params.toString()}`;
  }, [doctorId]);

  // Use SWR for doctor data
  const {
    data: doctor,
    error: doctorError,
    isLoading: doctorLoading,
  } = useSWR<Doctor>(
    doctorId ? `/api/doctors/${doctorId}` : null,
    fetchDoctor,
    {
      revalidateOnFocus: true,
      revalidateIfStale: true,
      revalidateOnReconnect: true,
    }
  );

  // Use SWR for slots
  const {
    data: availableSlots = [],
    error: slotsError,
    isLoading: slotsLoading,
    mutate: mutateSlots,
  } = useSWR<TimeSlot[]>(slotsUrl, fetchSlots, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    revalidateOnReconnect: true,
    // Refresh interval: check for new slots every 30 seconds
    refreshInterval: 30000,
  });

  // Combined loading state
  const loading = doctorLoading || slotsLoading;

  // Combined error state
  const fetchError = doctorError || slotsError;

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

    // Prevent admins from booking
    if (session.user.role === "ADMIN") {
      setError(
        "Admins cannot book appointments. Please use the admin dashboard."
      );
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

      // Refresh slots to update available slots
      await mutateSlots();
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

  if (fetchError && !doctor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">
              {fetchError instanceof Error
                ? fetchError.message
                : "Failed to load doctor information. Please try again."}
            </p>
            <Link href="/doctors">
              <Button variant="primary">Back to Doctors</Button>
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
            <Link href="/doctors" className="mt-4 inline-block">
              <Button variant="primary">Back to Doctors</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Helper function to get doctor's full name
  const getDoctorName = (doctor: Doctor): string => {
    if (doctor.userFirstName && doctor.userLastName) {
      return `${doctor.userFirstName} ${doctor.userLastName}`;
    }
    if (doctor.userFirstName) {
      return doctor.userFirstName;
    }
    if (doctor.userLastName) {
      return doctor.userLastName;
    }
    return "Doctor";
  };

  // Helper function to get doctor's initials
  const getDoctorInitials = (doctor: Doctor): string => {
    const name = getDoctorName(doctor);
    if (name === "Doctor") {
      return "D";
    }
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const doctorName = getDoctorName(doctor);
  const doctorInitials = getDoctorInitials(doctor);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Information Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6 shadow-xl border border-gray-200">
              <div className="p-6">
                {/* Profile Header */}
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <DoctorAvatar
                      profilePictureUrl={doctor.profilePictureUrl}
                      name={doctorName}
                      initials={doctorInitials}
                      size="large"
                    />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {doctorName}
                  </h1>
                  {doctor.specialization && (
                    <p className="text-lg text-primary-600 font-semibold">
                      {doctor.specialization}
                    </p>
                  )}
                </div>

                {/* Doctor Details */}
                <div className="space-y-4 border-t border-gray-200 pt-6">
                  {/* License Number */}
                  {doctor.licenseNumber && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          License Number
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {doctor.licenseNumber}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Years of Experience */}
                  {doctor.yearsOfExperience && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Experience
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {doctor.yearsOfExperience}{" "}
                          {doctor.yearsOfExperience === 1 ? "year" : "years"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {doctor.education && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14l9-5-9-5-9 5 9 5z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 14v9M12 14l-9-5m9 5l9-5m-9 5V5"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Education
                        </p>
                        <p className="text-sm text-gray-900 mt-1 leading-relaxed">
                          {doctor.education}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  {(doctor.city || doctor.state) && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                          Location
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          {[doctor.city, doctor.state]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                        {doctor.address && (
                          <p className="text-xs text-gray-600 mt-1">
                            {doctor.address}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bio */}
                  {doctor.bio && (
                    <div className="border-t border-gray-200 pt-6 mt-6">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                        About
                      </p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {doctor.bio}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Booking Section */}
          <div className="lg:col-span-2">
            {bookedAppointment ? (
              <AppointmentConfirmation
                appointment={bookedAppointment}
                doctorName={doctorName}
                onClose={() => {
                  setBookedAppointment(null);
                  router.push("/dashboard");
                }}
              />
            ) : !showBookingForm ? (
              <Card title="Available Time Slots">
                {availableSlots.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 mb-4 text-gray-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium mb-2">
                      No Available Time Slots
                    </p>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
                      This doctor currently has no available appointment slots.
                      Please check back later or browse other doctors.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mutateSlots()}
                        disabled={slotsLoading}
                      >
                        {slotsLoading ? "Refreshing..." : "Refresh Slots"}
                      </Button>
                      <Link href="/doctors">
                        <Button variant="ghost" size="sm">
                          ← Browse Other Doctors
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <TimeSlotSelector
                      slots={availableSlots}
                      selectedSlot={selectedSlot}
                      onSelectSlot={handleSlotSelect}
                      loading={slotsLoading}
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
                        ) : session?.user?.role === "ADMIN" ? (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-600 text-center">
                              Admins cannot book appointments. Please use the
                              admin dashboard to manage appointments.
                            </p>
                            <Link href="/admin">
                              <Button variant="outline" className="w-full">
                                Go to Admin Dashboard
                              </Button>
                            </Link>
                          </div>
                        ) : session?.user?.role === "DOCTOR" ? (
                          <div className="space-y-3">
                            <p className="text-sm text-gray-600 text-center">
                              Doctors cannot book appointments with other
                              doctors. Please use the appointments page to
                              manage your own appointments.
                            </p>
                            <Link href="/appointments">
                              <Button variant="outline" className="w-full">
                                View My Appointments
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
    </div>
  );
}
