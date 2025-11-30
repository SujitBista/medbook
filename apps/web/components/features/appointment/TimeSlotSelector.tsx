"use client";

import React from "react";
import { Button, Card } from "@medbook/ui";
import { TimeSlot, formatDate, formatTime, groupSlotsByDate } from "./utils";

interface TimeSlotSelectorProps {
  slots: TimeSlot[];
  selectedSlot: TimeSlot | null;
  onSelectSlot: (slot: TimeSlot) => void;
  loading?: boolean;
}

/**
 * Component for selecting available time slots
 */
export function TimeSlotSelector({
  slots,
  selectedSlot,
  onSelectSlot,
  loading = false,
}: TimeSlotSelectorProps) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading available slots...</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          No available time slots found for this doctor.
        </p>
        <p className="text-sm text-gray-400 mt-2">
          Please check back later or contact the doctor directly.
        </p>
      </div>
    );
  }

  const groupedSlots = groupSlotsByDate(slots);

  return (
    <div className="space-y-6">
      {Array.from(groupedSlots.entries()).map(([dateKey, dateSlots]) => {
        const date = new Date(dateKey + "T00:00:00");
        return (
          <Card key={dateKey} title={formatDate(date)}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {dateSlots.map((slot, index) => {
                const isSelected =
                  selectedSlot?.startTime.getTime() ===
                  slot.startTime.getTime();
                return (
                  <Button
                    key={`${slot.startTime.getTime()}-${index}`}
                    variant={isSelected ? "primary" : "outline"}
                    size="sm"
                    onClick={() => onSelectSlot(slot)}
                    className="text-sm"
                  >
                    {formatTime(slot.startTime)}
                  </Button>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
