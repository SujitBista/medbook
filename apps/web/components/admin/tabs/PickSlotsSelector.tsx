"use client";

import { useMemo, useState } from "react";
import {
  filterSlotsByRange,
  groupSlots,
  calcSelectedSummary,
  DEFAULT_VISIBLE_START,
  DEFAULT_VISIBLE_END,
  type TimeSlot,
  type GroupedSlots,
} from "./slot-utils";

export interface PickSlotsSelectorProps {
  /** All slots (full 24h) */
  slots: TimeSlot[];
  /** Currently selected slot keys (e.g. "09:00", "09:30") */
  selectedSlots: Set<string>;
  /** Callback when selection changes */
  onChange: (slots: Set<string>) => void;
  /** Slot keys that are in the past (disabled) */
  pastSlotKeys: Set<string>;
  /** Slot duration in minutes (for summary hours) */
  slotDurationMinutes: number;
}

function formatTimeDisplay(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const period = (hours ?? 0) >= 12 ? "PM" : "AM";
  const hours12 = (hours ?? 0) % 12 || 12;
  return `${hours12}:${(minutes ?? 0).toString().padStart(2, "0")} ${period}`;
}

const GROUP_LABELS: Record<keyof GroupedSlots, string> = {
  morning: "Morning (6:00 – 12:00)",
  afternoon: "Afternoon (12:00 – 17:00)",
  evening: "Evening (17:00 – 21:00)",
  night: "Night (21:00 – 6:00)",
};

export function PickSlotsSelector({
  slots,
  selectedSlots,
  onChange,
  pastSlotKeys,
  slotDurationMinutes,
}: PickSlotsSelectorProps) {
  const [showAll24Hours, setShowAll24Hours] = useState(false);

  const grouped = useMemo(
    () => groupSlots(slots, showAll24Hours),
    [slots, showAll24Hours]
  );

  const visibleSlots = useMemo(() => {
    if (showAll24Hours) return slots;
    return filterSlotsByRange(
      slots,
      DEFAULT_VISIBLE_START,
      DEFAULT_VISIBLE_END
    );
  }, [slots, showAll24Hours]);

  const visibleSlotKeys = useMemo(
    () => new Set(visibleSlots.map((s) => s.key)),
    [visibleSlots]
  );

  const summary = useMemo(
    () => calcSelectedSummary(selectedSlots, slotDurationMinutes),
    [selectedSlots, slotDurationMinutes]
  );

  const handleSlotClick = (key: string) => {
    if (pastSlotKeys.has(key)) return;
    const newSet = new Set(selectedSlots);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    onChange(newSet);
  };

  const selectAllVisible = () => {
    const keys = visibleSlots
      .filter((s) => !pastSlotKeys.has(s.key))
      .map((s) => s.key);
    const newSet = new Set(selectedSlots);
    keys.forEach((k) => newSet.add(k));
    onChange(newSet);
  };

  const clearVisible = () => {
    const newSet = new Set(selectedSlots);
    visibleSlotKeys.forEach((k) => newSet.delete(k));
    onChange(newSet);
  };

  const selectGroup = (groupKey: keyof GroupedSlots) => {
    const group = grouped[groupKey];
    if (!group) return;
    const keys = group
      .filter((s) => !pastSlotKeys.has(s.key))
      .map((s) => s.key);
    onChange(new Set(keys));
  };

  const clearGroup = (groupKey: keyof GroupedSlots) => {
    const group = grouped[groupKey];
    if (!group) return;
    const keys = group.map((s) => s.key);
    const newSet = new Set(selectedSlots);
    keys.forEach((k) => newSet.delete(k));
    onChange(newSet);
  };

  const groupsToRender: (keyof GroupedSlots)[] = showAll24Hours
    ? ["morning", "afternoon", "evening", "night"]
    : ["morning", "afternoon", "evening"];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Pick specific times (each slot is {slotDurationMinutes} min)
      </p>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selectAllVisible}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Select all visible
        </button>
        <button
          type="button"
          onClick={clearVisible}
          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
        >
          Clear visible
        </button>
        {groupsToRender.map((gk) => (
          <button
            key={gk}
            type="button"
            onClick={() => selectGroup(gk)}
            className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
          >
            Select {gk}
          </button>
        ))}
      </div>

      {/* Show all 24 hours toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={showAll24Hours}
          onChange={(e) => setShowAll24Hours(e.target.checked)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Show all 24 hours
      </label>

      {/* Grouped slot grid */}
      <div className="max-h-60 overflow-y-auto rounded-md border border-gray-200 p-4">
        <div className="space-y-4">
          {groupsToRender.map((groupKey) => {
            const group = grouped[groupKey];
            if (!group || group.length === 0) return null;
            return (
              <div key={groupKey}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {GROUP_LABELS[groupKey]}
                  </span>
                  <button
                    type="button"
                    onClick={() => clearGroup(groupKey)}
                    className="text-xs text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {group.map((slot) => {
                    const isPast = pastSlotKeys.has(slot.key);
                    const isSelected = selectedSlots.has(slot.key);
                    return (
                      <button
                        key={slot.key}
                        type="button"
                        onClick={() => handleSlotClick(slot.key)}
                        disabled={isPast}
                        title={
                          isPast
                            ? "Past time – will be skipped"
                            : isSelected
                              ? "Click to deselect"
                              : "Click to select"
                        }
                        className={`flex items-center justify-center rounded-md border p-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                          isPast
                            ? "cursor-default border-gray-200 bg-gray-100 opacity-70"
                            : isSelected
                              ? "border-blue-600 bg-blue-50 text-blue-800 ring-1 ring-blue-600"
                              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {formatTimeDisplay(slot.start)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {summary.count > 0 && (
        <p className="text-sm text-gray-600">
          {summary.count} slot{summary.count !== 1 ? "s" : ""} selected
          {summary.hours > 0 && ` (${summary.hours.toFixed(1)} hours)`}
        </p>
      )}
    </div>
  );
}
