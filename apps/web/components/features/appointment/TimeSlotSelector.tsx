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
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          This doctor currently has no available appointment slots. Please check
          back later or browse other doctors.
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
