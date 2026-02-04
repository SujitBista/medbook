"use client";

import { useState } from "react";
import { Button, Card, Input } from "@medbook/ui";
import type {
  DaySchedule,
  TimeRange,
  WeeklySchedule,
} from "./availabilityMappers";
import {
  DAYS_ORDERED,
  formatTimeRange,
  validateDayRanges,
  validateTimeRange,
} from "./availabilityMappers";

interface WeeklyAvailabilityEditorProps {
  schedule: WeeklySchedule;
  onChange: (schedule: WeeklySchedule) => void;
  validFrom?: string;
  validTo?: string;
  onValidFromChange?: (v: string) => void;
  onValidToChange?: (v: string) => void;
  onSave: () => void;
  saving?: boolean;
  error?: string | null;
}

export function WeeklyAvailabilityEditor({
  schedule,
  onChange,
  validFrom = "",
  validTo = "",
  onValidFromChange,
  onValidToChange,
  onSave,
  saving = false,
  error = null,
}: WeeklyAvailabilityEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [newRange, setNewRange] = useState<TimeRange>({
    start: "09:00",
    end: "17:00",
  });
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [dayErrors, setDayErrors] = useState<Record<number, string>>({});

  const dayLabel = (dayOfWeek: number) =>
    DAYS_ORDERED.find((d) => d.value === dayOfWeek)?.label ?? "";

  const toggleDayAvailable = (dayOfWeek: number) => {
    const next = schedule.map((d) =>
      d.dayOfWeek === dayOfWeek
        ? { ...d, available: !d.available, ranges: d.available ? [] : d.ranges }
        : d
    );
    onChange(next);
    setDayErrors((prev) => ({ ...prev, [dayOfWeek]: "" }));
  };

  const addTimeRange = (dayOfWeek: number, range: TimeRange) => {
    const day = schedule.find((d) => d.dayOfWeek === dayOfWeek);
    if (!day) return;
    const err = validateTimeRange(range);
    if (err) {
      setRangeError(err);
      return;
    }
    const combined = [...day.ranges, range];
    const overlapErr = validateDayRanges(combined);
    if (overlapErr) {
      setRangeError(overlapErr);
      return;
    }
    const next = schedule.map((d) =>
      d.dayOfWeek === dayOfWeek
        ? { ...d, available: true, ranges: combined }
        : d
    );
    onChange(next);
    setEditingDay(null);
    setNewRange({ start: "09:00", end: "17:00" });
    setRangeError(null);
    setDayErrors((prev) => ({ ...prev, [dayOfWeek]: "" }));
  };

  const removeTimeRange = (dayOfWeek: number, index: number) => {
    const next = schedule.map((d) => {
      if (d.dayOfWeek !== dayOfWeek) return d;
      const ranges = d.ranges.filter((_, i) => i !== index);
      return { ...d, ranges, available: ranges.length > 0 };
    });
    onChange(next);
    setDayErrors((prev) => ({ ...prev, [dayOfWeek]: "" }));
  };

  const validateAll = (): boolean => {
    const errors: Record<number, string> = {};
    for (const day of schedule) {
      if (day.available && day.ranges.length > 0) {
        const err = validateDayRanges(day.ranges);
        if (err) errors[day.dayOfWeek] = err;
      }
    }
    setDayErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validateAll()) return;
    onSave();
  };

  return (
    <Card title="Weekly Availability" className="mb-6">
      <p className="mb-4 text-sm text-gray-600">
        Set your recurring weekly schedule. Add one or more time ranges per day.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {schedule.map((day) => (
          <DayRow
            key={day.dayOfWeek}
            day={day}
            dayLabel={dayLabel(day.dayOfWeek)}
            isEditing={editingDay === day.dayOfWeek}
            newRange={newRange}
            onNewRangeChange={setNewRange}
            rangeError={editingDay === day.dayOfWeek ? rangeError : null}
            dayError={dayErrors[day.dayOfWeek]}
            onToggle={() => toggleDayAvailable(day.dayOfWeek)}
            onAddRange={() => {
              setEditingDay(day.dayOfWeek);
              setRangeError(null);
            }}
            onSaveRange={() => addTimeRange(day.dayOfWeek, newRange)}
            onCancelEdit={() => {
              setEditingDay(null);
              setRangeError(null);
            }}
            onRemoveRange={(idx) => removeTimeRange(day.dayOfWeek, idx)}
          />
        ))}
      </div>

      {/* Advanced options */}
      <div className="mt-6 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm font-medium text-gray-700 hover:text-gray-900"
          aria-expanded={showAdvanced}
        >
          {showAdvanced ? "Hide" : "Show"} advanced options
        </button>
        {showAdvanced && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Valid From (optional)"
              type="date"
              value={validFrom}
              onChange={(e) => onValidFromChange?.(e.target.value)}
            />
            <Input
              label="Valid To (optional)"
              type="date"
              value={validTo}
              onChange={(e) => onValidToChange?.(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="mt-6">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          aria-label="Save weekly schedule"
        >
          {saving ? "Saving..." : "Save weekly schedule"}
        </Button>
      </div>
    </Card>
  );
}

interface DayRowProps {
  day: DaySchedule;
  dayLabel: string;
  isEditing: boolean;
  newRange: TimeRange;
  onNewRangeChange: (r: TimeRange) => void;
  rangeError: string | null;
  dayError?: string;
  onToggle: () => void;
  onAddRange: () => void;
  onSaveRange: () => void;
  onCancelEdit: () => void;
  onRemoveRange: (index: number) => void;
}

function DayRow({
  day,
  dayLabel,
  isEditing,
  newRange,
  onNewRangeChange,
  rangeError,
  dayError,
  onToggle,
  onAddRange,
  onSaveRange,
  onCancelEdit,
  onRemoveRange,
}: DayRowProps) {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={day.available}
              onChange={onToggle}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              aria-label={`${dayLabel} - ${day.available ? "Available" : "Not available"}`}
            />
            <span className="font-medium text-gray-900">{dayLabel}</span>
          </label>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {day.ranges.map((r, idx) => (
            <span
              key={`${r.start}-${r.end}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800"
            >
              {formatTimeRange(r)}
              <button
                type="button"
                onClick={() => onRemoveRange(idx)}
                className="ml-1 rounded p-0.5 hover:bg-blue-200"
                aria-label={`Remove time range ${formatTimeRange(r)}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
          {day.available && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAddRange}
              aria-label={`Add time range for ${dayLabel}`}
            >
              + Add time range
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 flex flex-wrap items-end gap-4 rounded bg-gray-50 p-4">
          <div className="flex-1 min-w-[120px]">
            <Input
              label="Start"
              type="time"
              value={newRange.start}
              onChange={(e) =>
                onNewRangeChange({ ...newRange, start: e.target.value })
              }
              error={rangeError ?? undefined}
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <Input
              label="End"
              type="time"
              value={newRange.end}
              onChange={(e) =>
                onNewRangeChange({ ...newRange, end: e.target.value })
              }
            />
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={onSaveRange}>
              Add
            </Button>
            <Button variant="outline" size="sm" onClick={onCancelEdit}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {dayError && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {dayError}
        </p>
      )}
    </div>
  );
}
