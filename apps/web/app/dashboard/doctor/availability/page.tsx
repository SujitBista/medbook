"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Skeleton, useToast } from "@medbook/ui";
import { Availability } from "@medbook/types";
import Link from "next/link";
import { WeeklyAvailabilityEditor } from "./WeeklyAvailabilityEditor";
import { ExceptionsEditor } from "./ExceptionsEditor";
import {
  availabilitiesToBuckets,
  recurringToWeeklySchedule,
  exceptionsToParsedList,
  weeklyScheduleToCreatePayloads,
  exceptionFormToCreatePayload,
  createEmptyWeeklySchedule,
  type WeeklySchedule,
  type ExceptionForm,
} from "./availabilityMappers";

interface Doctor {
  id: string;
  userId: string;
}

interface AvailabilitiesResponse {
  success: boolean;
  availabilities: Availability[];
}

export default function AvailabilityManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingWeekly, setSavingWeekly] = useState(false);
  const [addingException, setAddingException] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

  const { recurring, exceptions } = useMemo(
    () => availabilitiesToBuckets(availabilities),
    [availabilities]
  );

  useEffect(() => {
    if (recurring.length > 0) {
      const first = recurring[0];
      if (first?.validFrom) {
        const d = new Date(first.validFrom);
        setValidFrom(d.toISOString().slice(0, 10));
      }
      if (first?.validTo) {
        const d = new Date(first.validTo);
        setValidTo(d.toISOString().slice(0, 10));
      }
    }
  }, [recurring]);

  const weeklySchedule = useMemo<WeeklySchedule>(() => {
    if (recurring.length > 0) {
      return recurringToWeeklySchedule(recurring);
    }
    return createEmptyWeeklySchedule();
  }, [recurring]);

  const [schedule, setSchedule] = useState<WeeklySchedule>(weeklySchedule);

  useEffect(() => {
    setSchedule(weeklySchedule);
  }, [weeklySchedule]);

  const parsedExceptions = useMemo(
    () => exceptionsToParsedList(exceptions),
    [exceptions]
  );

  const hasAnySchedule = recurring.length > 0;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/dashboard/doctor/availability");
    } else if (status === "authenticated" && session?.user?.role !== "DOCTOR") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchDoctorAndAvailabilities();
    }
  }, [status, session?.user?.id]);

  const fetchDoctorAndAvailabilities = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      setError(null);

      const doctorResponse = await fetch(
        `/api/doctors/user/${session?.user?.id}`
      );
      if (!doctorResponse.ok) {
        throw new Error("Failed to fetch doctor profile");
      }
      const doctorData = await doctorResponse.json();
      if (!doctorData.success || !doctorData.doctor) {
        throw new Error("Doctor profile not found");
      }
      setDoctor(doctorData.doctor);

      const params = new URLSearchParams({ doctorId: doctorData.doctor.id });
      params.append("_t", Date.now().toString());

      const availResponse = await fetch(`/api/availability?${params}`, {
        cache: "no-store",
      });
      if (!availResponse.ok) {
        throw new Error("Failed to fetch availabilities");
      }
      const availData: AvailabilitiesResponse = await availResponse.json();
      if (availData.success) {
        setAvailabilities(availData.availabilities);
      }
    } catch (err) {
      console.error("[AvailabilityManagement] Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load availability data. Please try again."
      );
      showError("Failed to load availability data");
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  const handleSaveWeekly = async () => {
    if (!doctor) return;
    setSavingWeekly(true);
    setWeeklyError(null);
    try {
      const payloads = weeklyScheduleToCreatePayloads(doctor.id, schedule, {
        validFrom: validFrom || undefined,
        validTo: validTo || undefined,
      });

      if (payloads.length === 0) {
        setWeeklyError("Add at least one time range to save your schedule.");
        return;
      }

      for (const id of recurring.map((r) => r.id)) {
        const res = await fetch(`/api/availability/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(
            data.error?.message ?? "Failed to remove old schedule"
          );
        }
      }

      for (const payload of payloads) {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error?.message ?? "Failed to save schedule");
        }
      }

      showSuccess("Weekly schedule saved");
      await fetchDoctorAndAvailabilities(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save weekly schedule.";
      setWeeklyError(msg);
      showError(msg);
    } finally {
      setSavingWeekly(false);
    }
  };

  const handleAddException = async (form: ExceptionForm) => {
    if (!doctor) return;
    const payload = exceptionFormToCreatePayload(doctor.id, form);
    if (!payload) return;

    setAddingException(true);
    setExceptionError(null);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "Failed to add exception");
      }
      showSuccess("Exception added");
      await fetchDoctorAndAvailabilities(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add exception.";
      setExceptionError(msg);
      showError(msg);
    } finally {
      setAddingException(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      setExceptionError(null);
      const res = await fetch(`/api/availability/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "Failed to delete exception");
      }
      showSuccess("Exception removed");
      await fetchDoctorAndAvailabilities(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete exception.";
      setExceptionError(msg);
      showError(msg);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <Skeleton width={120} height={28} />
            <Skeleton width={100} height={36} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton width={280} height={36} className="mb-2" />
          <Skeleton width={360} height={20} className="mb-8" />
          <div className="space-y-6">
            <Skeleton height={200} className="rounded-lg" />
            <Skeleton height={150} className="rounded-lg" />
          </div>
        </main>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (session?.user?.role !== "DOCTOR") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">
            Only doctors can manage availability.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-bold text-gray-900">MedBook</h1>
          <div className="flex items-center gap-4">
            {session && (
              <span className="text-sm text-gray-600">
                {session.user.email} ({session.user.role})
              </span>
            )}
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Manage Availability
          </h2>
          <p className="mt-2 text-gray-600">
            Set your available time slots for appointments
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}

        {!hasAnySchedule && (
          <Card className="mb-6">
            <div className="py-12 text-center">
              <p className="text-gray-600">
                No availability set yet. Add your weekly schedule to start
                accepting appointments.
              </p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => {
                  document
                    .getElementById("weekly-availability-section")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Set weekly availability
              </Button>
            </div>
          </Card>
        )}

        <div id="weekly-availability-section">
          <WeeklyAvailabilityEditor
            schedule={schedule}
            onChange={setSchedule}
            validFrom={validFrom}
            validTo={validTo}
            onValidFromChange={setValidFrom}
            onValidToChange={setValidTo}
            onSave={handleSaveWeekly}
            saving={savingWeekly}
            error={weeklyError}
          />
        </div>

        <ExceptionsEditor
          exceptions={parsedExceptions}
          onAdd={handleAddException}
          onDelete={handleDeleteException}
          adding={addingException}
          error={exceptionError}
        />
      </main>
    </div>
  );
}
