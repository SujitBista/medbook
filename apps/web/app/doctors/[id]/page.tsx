"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button, Card } from "@medbook/ui";
import { Doctor, Appointment, CreateAppointmentInput } from "@medbook/types";
import {
  TimeSlotSelector,
  BookingForm,
  AppointmentConfirmation,
  TimeSlot,
} from "@/components/features/appointment";
import { Slot, SlotStatus } from "@medbook/types";
import {
  parseBookingConfirmParams,
  buildBookingConfirmCallbackUrl,
} from "@/lib/booking-callback";
import Link from "next/link";
import useSWR from "swr";
import { UserProfileDropdown } from "@/components/layout/UserProfileDropdown";
import { AuthStatus } from "@/app/components/AuthStatus";

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

  // Check if we're on the client side
  const isClient = typeof window !== "undefined";

  // Show initials if no profile picture, or if image error occurred (client-side only)
  if (!profilePictureUrl || (isClient && imageError)) {
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
      onError={() => {
        if (typeof window !== "undefined") {
          setImageError(true);
        }
      }}
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
  const searchParams = useSearchParams();
  const doctorId = params.id as string;
  const hasRestoredRef = useRef(false);

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] =
    useState<Appointment | null>(null);
  const [appointmentPrice, setAppointmentPrice] = useState<
    number | undefined
  >();
  const [paymentIntentId, setPaymentIntentId] = useState<string | undefined>();
  const [clientSecret, setClientSecret] = useState<string | undefined>();
  const [creatingPaymentIntent, setCreatingPaymentIntent] = useState(false);

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

  // Fetch commission settings to get appointment price
  useEffect(() => {
    if (!doctorId) return;

    const fetchCommissionSettings = async () => {
      try {
        const response = await fetch(
          `/api/admin/doctors/${doctorId}/commission-settings`,
          { cache: "no-store" }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setAppointmentPrice(data.data.appointmentPrice);
          }
        }
      } catch (err) {
        console.error(
          "[DoctorDetail] Error fetching commission settings:",
          err
        );
        // Don't show error to user, just proceed without payment
      }
    };

    fetchCommissionSettings();
  }, [doctorId]);

  // Restore confirm step from callbackUrl params after post-login redirect
  useEffect(() => {
    if (!doctorId || !doctor || hasRestoredRef.current) return;
    const parsed = parseBookingConfirmParams(searchParams);
    if (!parsed) return;

    hasRestoredRef.current = true;
    const restoredSlot: TimeSlot = {
      id: parsed.slotId,
      availabilityId: parsed.availabilityId,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
    };
    setSelectedSlot(restoredSlot);
    setError(null);

    const createPaymentIntentAndShowForm = async () => {
      if (appointmentPrice && session?.user?.id) {
        try {
          setCreatingPaymentIntent(true);
          const res = await fetch("/api/payments/create-intent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: appointmentPrice,
              currency: "usd",
              appointmentId: "",
              patientId: session.user.id,
              doctorId,
            }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            setPaymentIntentId(data.data.paymentIntentId);
            setClientSecret(data.data.clientSecret);
          }
        } catch (err) {
          console.error(
            "[DoctorDetail] Error creating payment intent on restore:",
            err
          );
          setError("Failed to prepare payment. Please try again.");
        } finally {
          setCreatingPaymentIntent(false);
        }
      }
      setShowBookingForm(true);
    };

    createPaymentIntentAndShowForm();
  }, [doctorId, doctor, searchParams, session?.user?.id, appointmentPrice]);

  // Create payment intent when appointmentPrice arrives after restore (commission fetch async)
  useEffect(() => {
    if (
      !hasRestoredRef.current ||
      !showBookingForm ||
      !selectedSlot ||
      !appointmentPrice ||
      !session?.user?.id ||
      paymentIntentId
    )
      return;
    if (!parseBookingConfirmParams(searchParams)) return;

    let cancelled = false;
    setCreatingPaymentIntent(true);
    fetch("/api/payments/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: appointmentPrice,
        currency: "usd",
        appointmentId: "",
        patientId: session.user.id,
        doctorId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) {
          setPaymentIntentId(data.data.paymentIntentId);
          setClientSecret(data.data.clientSecret);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(
            "[DoctorDetail] Error creating payment intent on restore:",
            err
          );
          setError("Failed to prepare payment. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setCreatingPaymentIntent(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    showBookingForm,
    selectedSlot,
    appointmentPrice,
    session?.user?.id,
    paymentIntentId,
    doctorId,
    searchParams,
  ]);

  // Combined loading state
  const loading = doctorLoading || slotsLoading;

  // Combined error state
  const fetchError = doctorError || slotsError;

  const handleSlotSelect = async (slot: TimeSlot) => {
    // Prevent admins from selecting slots
    if (session?.user?.role === "ADMIN") {
      setError(
        "Admins cannot book appointments. Please use the admin dashboard to manage appointments."
      );
      return;
    }

    setSelectedSlot(slot);
    setError(null);

    // If payment is required, create payment intent first
    if (appointmentPrice && session?.user?.id) {
      try {
        setCreatingPaymentIntent(true);
        const response = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: appointmentPrice,
            currency: "usd",
            appointmentId: "", // Will be set after appointment creation
            patientId: session.user.id,
            doctorId: doctorId,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error?.message || "Failed to initialize payment"
          );
        }

        setPaymentIntentId(data.data.paymentIntentId);
        setClientSecret(data.data.clientSecret);
        setShowBookingForm(true);
      } catch (err) {
        console.error("[DoctorDetail] Error creating payment intent:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize payment. Please try again."
        );
      } finally {
        setCreatingPaymentIntent(false);
      }
    } else {
      // No payment required, show booking form directly
      setShowBookingForm(true);
    }
  };

  const handlePaymentSuccess = async (piId: string) => {
    // Payment is confirmed, now create the appointment
    if (!selectedSlot || !session?.user?.id) {
      return;
    }

    try {
      setBooking(true);
      setError(null);

      // First confirm the payment
      const confirmResponse = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentIntentId: piId,
          appointmentId: "", // Will be set after appointment creation
        }),
      });

      if (!confirmResponse.ok) {
        const confirmData = await confirmResponse.json();
        throw new Error(
          confirmData.error?.message || "Failed to confirm payment"
        );
      }

      // Now create the appointment
      const input: CreateAppointmentInput = {
        patientId: session.user.id,
        doctorId: doctorId,
        availabilityId: selectedSlot.availabilityId,
        slotId: selectedSlot.id,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const data: AppointmentCreateResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error?.message || "Failed to book appointment. Please try again."
        );
      }

      // Update payment with appointment ID
      if (paymentIntentId && data.data.id) {
        await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntentId,
            appointmentId: data.data.id,
          }),
        });
      }

      setBookedAppointment(data.data);
      setShowBookingForm(false);
      setSelectedSlot(null);
      setPaymentIntentId(undefined);
      setClientSecret(undefined);

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

  const handleBookingSubmit = async (input: CreateAppointmentInput) => {
    if (!session?.user?.id) {
      const callbackUrl =
        selectedSlot?.id && selectedSlot?.availabilityId
          ? buildBookingConfirmCallbackUrl(doctorId, {
              id: selectedSlot.id,
              availabilityId: selectedSlot.availabilityId,
              startTime: selectedSlot.startTime,
              endTime: selectedSlot.endTime,
            })
          : `/doctors/${doctorId}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    // Prevent admins from booking
    if (session.user.role === "ADMIN") {
      setError(
        "Admins cannot book appointments. Please use the admin dashboard."
      );
      return;
    }

    // If payment is required but not completed, don't proceed
    if (appointmentPrice && !paymentIntentId) {
      setError("Payment is required to complete booking");
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

      // If payment was made, confirm it with appointment ID
      if (paymentIntentId && data.data.id) {
        await fetch("/api/payments/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntentId,
            appointmentId: data.data.id,
          }),
        });
      }

      setBookedAppointment(data.data);
      setShowBookingForm(false);
      setSelectedSlot(null);
      setPaymentIntentId(undefined);
      setClientSecret(undefined);

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
    setPaymentIntentId(undefined);
    setClientSecret(undefined);
    const hasConfirmParams = parseBookingConfirmParams(searchParams);
    if (hasConfirmParams) {
      hasRestoredRef.current = false;
      router.replace(`/doctors/${doctorId}`, { scroll: false });
    }
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
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link href="/">
              <h1 className="text-xl font-bold text-gray-900">MedBook</h1>
            </Link>
            <div className="flex items-center gap-4">
              {status === "authenticated" && session?.user ? (
                <UserProfileDropdown />
              ) : (
                <AuthStatus />
              )}
            </div>
          </div>
        </div>
      </header>

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

                {/* Doctor Details - Essential only */}
                {(doctor.city || doctor.state) && (
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <svg
                        className="h-4 w-4 text-gray-400"
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
                      <span>
                        {[doctor.city, doctor.state].filter(Boolean).join(", ")}
                      </span>
                    </div>
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
                doctorName={doctorName}
                onClose={() => {
                  setBookedAppointment(null);
                  router.push("/dashboard");
                }}
              />
            ) : !showBookingForm ? (
              <Card title="Available Time Slots">
                {session?.user?.role === "ADMIN" ? (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 mb-4 text-amber-500">
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
                          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-900 font-semibold text-lg mb-2">
                      Admin Access
                    </p>
                    <p className="text-gray-600 mb-6 max-w-md mx-auto">
                      Admins cannot book appointments through the public booking
                      page. Please use the admin dashboard to manage
                      appointments and view booking information.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link href="/admin">
                        <Button variant="primary">Go to Admin Dashboard</Button>
                      </Link>
                      <Link href="/doctors">
                        <Button variant="outline">Browse Doctors</Button>
                      </Link>
                    </div>
                  </div>
                ) : availableSlots.length === 0 ? (
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
                              href={`/login?callbackUrl=${encodeURIComponent(
                                selectedSlot?.id && selectedSlot?.availabilityId
                                  ? buildBookingConfirmCallbackUrl(doctorId, {
                                      id: selectedSlot.id,
                                      availabilityId:
                                        selectedSlot.availabilityId,
                                      startTime: selectedSlot.startTime,
                                      endTime: selectedSlot.endTime,
                                    })
                                  : `/doctors/${doctorId}`
                              )}`}
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
                patientName={
                  typeof session?.user?.name === "string"
                    ? session.user.name
                    : undefined
                }
                patientEmail={
                  typeof session?.user?.email === "string"
                    ? session.user.email
                    : undefined
                }
                selectedSlot={selectedSlot}
                onSubmit={handleBookingSubmit}
                onCancel={handleCancelBooking}
                loading={booking || creatingPaymentIntent}
                appointmentPrice={appointmentPrice}
                paymentIntentId={paymentIntentId}
                clientSecret={clientSecret}
                onPaymentSuccess={handlePaymentSuccess}
                showPayment={
                  !!appointmentPrice && !!paymentIntentId && !!clientSecret
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
