"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card } from "@medbook/ui";
import type { Doctor } from "@/app/admin/types";

interface Schedule {
  id: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  maxPatients: number;
  createdAt: string;
}

interface CapacitySchedulesTabProps {
  doctors: Doctor[];
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function CapacitySchedulesTab({
  doctors,
  onError,
  onSuccess,
}: CapacitySchedulesTabProps) {
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [maxPatients, setMaxPatients] = useState(15);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!doctorId) {
      setSchedules([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ doctorId });
      if (date) params.set("date", date);
      const res = await fetch(`/api/admin/schedules?${params}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSchedules(data.data);
      } else {
        setSchedules([]);
      }
    } catch {
      onError("Failed to load schedules");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [doctorId, date, onError]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId || !date || !startTime || !endTime) {
      onError("Please fill doctor, date, start time, and end time.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          date,
          startTime,
          endTime,
          maxPatients: Number(maxPatients) || 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error?.message || "Failed to create schedule");
        return;
      }
      onSuccess("Schedule created.");
      setDate("");
      fetchSchedules();
    } catch {
      onError("Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Create capacity schedule">
        <form onSubmit={handleCreate} className="space-y-4 p-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doctor
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
              required
            >
              <option value="">Select doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.userFirstName} {d.userLastName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max patients
              </label>
              <input
                type="number"
                min={1}
                value={maxPatients}
                onChange={(e) => setMaxPatients(Number(e.target.value) || 15)}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2"
                required
              />
            </div>
          </div>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create schedule"}
          </Button>
        </form>
      </Card>

      <Card title="Schedules">
        <div className="p-4">
          {!doctorId ? (
            <p className="text-gray-500">Select a doctor to list schedules.</p>
          ) : loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : schedules.length === 0 ? (
            <p className="text-gray-500">No schedules found.</p>
          ) : (
            <ul className="space-y-2">
              {schedules.map((s) => {
                const dateDisplay = String(s.date).slice(0, 10);
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {dateDisplay} • {s.startTime}–{s.endTime} • max{" "}
                      {s.maxPatients}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
