"use client";

import React, { useState } from "react";
import { Button, Card, Input } from "@medbook/ui";
import { TimeSlot, formatDateTime } from "./utils";
import { CreateAppointmentInput } from "@medbook/types";

interface BookingFormProps {
  doctorId: string;
  patientId: string;
  selectedSlot: TimeSlot | null;
  onSubmit: (input: CreateAppointmentInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Form component for booking an appointment
 */
export function BookingForm({
  doctorId,
  patientId,
  selectedSlot,
  onSubmit,
  onCancel,
  loading = false,
}: BookingFormProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedSlot) {
      setError("Please select a time slot");
      return;
    }

    if (!patientId || patientId.trim() === "") {
      setError("Please select a patient");
      return;
    }

    try {
      const input: CreateAppointmentInput = {
        patientId,
        doctorId,
        availabilityId: selectedSlot.availabilityId,
        slotId: selectedSlot.id, // Include slotId for atomic slot-based booking
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: notes.trim() || undefined,
      };

      await onSubmit(input);
    } catch (err) {
      console.error("[BookingForm] Error submitting booking:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to book appointment. Please try again."
      );
    }
  };

  return (
    <Card title="Book Appointment">
      {selectedSlot ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Selected Time Slot</p>
            <p className="font-semibold text-gray-900">
              {formatDateTime(selectedSlot.startTime)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Duration:{" "}
              {Math.round(
                (selectedSlot.endTime.getTime() -
                  selectedSlot.startTime.getTime()) /
                  60000
              )}{" "}
              minutes
            </p>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Notes (Optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes or concerns..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div
            className="flex gap-3 pt-4"
            style={{ visibility: "visible", display: "flex" }}
          >
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            Please select a time slot to continue booking.
          </p>
        </div>
      )}
    </Card>
  );
}
