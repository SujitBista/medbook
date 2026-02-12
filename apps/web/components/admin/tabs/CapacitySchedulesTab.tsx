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

function scheduleDisplayDate(s: Schedule): string {
  return String(s.date).slice(0, 10);
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
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("09:00");
  const [editEndTime, setEditEndTime] = useState("12:00");
  const [editMaxPatients, setEditMaxPatients] = useState(15);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const openEdit = (s: Schedule) => {
    setEditingSchedule(s);
    setEditDate(scheduleDisplayDate(s));
    setEditStartTime(s.startTime);
    setEditEndTime(s.endTime);
    setEditMaxPatients(s.maxPatients);
  };

  const closeEditModal = () => {
    setEditingSchedule(null);
    setEditSubmitting(false);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    if (!editDate || !editStartTime || !editEndTime) {
      onError("Please fill date, start time, and end time.");
      return;
    }
    setEditSubmitting(true);
    onError("");
    try {
      const res = await fetch(`/api/admin/schedules/${editingSchedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editDate,
          startTime: editStartTime,
          endTime: editEndTime,
          maxPatients: Number(editMaxPatients) || 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error?.message || "Failed to update schedule");
        return;
      }
      onSuccess("Schedule updated.");
      closeEditModal();
      fetchSchedules();
    } catch {
      onError("Failed to update schedule");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (s: Schedule) => {
    const dateDisplay = scheduleDisplayDate(s);
    if (
      !confirm(
        `Delete this schedule? ${dateDisplay} • ${s.startTime}–${s.endTime} • max ${s.maxPatients}. This cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingId(s.id);
    onError("");
    try {
      const res = await fetch(`/api/admin/schedules/${s.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error?.message || "Failed to delete schedule");
        return;
      }
      onSuccess("Schedule deleted.");
      fetchSchedules();
    } catch {
      onError("Failed to delete schedule");
    } finally {
      setDeletingId(null);
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
                const dateDisplay = scheduleDisplayDate(s);
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                  >
                    <span>
                      {dateDisplay} • {s.startTime}–{s.endTime} • max{" "}
                      {s.maxPatients}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s)}
                        disabled={deletingId === s.id}
                        className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                      >
                        {deletingId === s.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit schedule
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {scheduleDisplayDate(editingSchedule)} •{" "}
              {editingSchedule.startTime}–{editingSchedule.endTime}
            </p>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start time
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
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
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max patients
                </label>
                <input
                  type="number"
                  min={1}
                  value={editMaxPatients}
                  onChange={(e) =>
                    setEditMaxPatients(Number(e.target.value) || 15)
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEditModal}
                  disabled={editSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? "Saving…" : "Update schedule"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
