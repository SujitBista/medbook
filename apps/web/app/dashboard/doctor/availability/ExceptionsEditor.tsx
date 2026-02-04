"use client";

import { useState } from "react";
import { Button, Card, Input } from "@medbook/ui";
import type {
  ExceptionForm,
  ExceptionType,
  ParsedException,
} from "./availabilityMappers";

interface ExceptionsEditorProps {
  exceptions: ParsedException[];
  onAdd: (form: ExceptionForm) => void;
  onDelete: (id: string) => void;
  adding?: boolean;
  error?: string | null;
}

const EXCEPTION_TYPES: { value: ExceptionType; label: string }[] = [
  { value: "extra_availability", label: "Extra availability" },
  { value: "unavailable", label: "Unavailable" },
];

export function ExceptionsEditor({
  exceptions,
  onAdd,
  onDelete,
  adding = false,
  error = null,
}: ExceptionsEditorProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ExceptionForm>({
    date: "",
    startTime: "09:00",
    endTime: "17:00",
    type: "extra_availability",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const err: Record<string, string> = {};
    if (!form.date) err.date = "Date is required";
    if (!form.startTime) err.startTime = "Start time is required";
    if (!form.endTime) err.endTime = "End time is required";
    if (form.startTime && form.endTime) {
      const [sh, sm] = form.startTime.split(":").map(Number);
      const [eh, em] = form.endTime.split(":").map(Number);
      const startM = sh! * 60 + sm!;
      const endM = eh! * 60 + em!;
      if (endM <= startM) err.endTime = "End time must be after start time";
    }
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (form.type === "unavailable") {
      setFormErrors({
        type: "Unavailable exceptions are not yet supported. Use Extra availability for now.",
      });
      return;
    }
    onAdd(form);
    setForm({
      date: "",
      startTime: "09:00",
      endTime: "17:00",
      type: "extra_availability",
    });
    setShowForm(false);
    setFormErrors({});
  };

  const handleDeleteClick = (id: string) => {
    if (
      typeof window !== "undefined" &&
      window.confirm("Are you sure you want to delete this exception?")
    ) {
      onDelete(id);
    }
  };

  const formatExceptionDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatExceptionTime = (start: string, end: string) => {
    const fmt = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const h12 = h! % 12 || 12;
      const ampm = h! < 12 ? "AM" : "PM";
      return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
    };
    return `${fmt(start)} – ${fmt(end)}`;
  };

  return (
    <Card title="Exceptions" className="mb-6">
      <p className="mb-4 text-sm text-gray-600">
        One-time overrides to your weekly schedule (e.g. extra hours or time
        off).
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {!showForm ? (
        <Button
          variant="outline"
          onClick={() => setShowForm(true)}
          aria-label="Add exception"
        >
          Add exception
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => {
              setForm((f) => ({ ...f, date: e.target.value }));
              setFormErrors((prev) => ({ ...prev, date: "" }));
            }}
            error={formErrors.date}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start time"
              type="time"
              value={form.startTime}
              onChange={(e) => {
                setForm((f) => ({ ...f, startTime: e.target.value }));
                setFormErrors((prev) => ({ ...prev, endTime: "" }));
              }}
              error={formErrors.startTime}
            />
            <Input
              label="End time"
              type="time"
              value={form.endTime}
              onChange={(e) => {
                setForm((f) => ({ ...f, endTime: e.target.value }));
                setFormErrors((prev) => ({ ...prev, endTime: "" }));
              }}
              error={formErrors.endTime}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as ExceptionType,
                }))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Exception type"
            >
              {EXCEPTION_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {formErrors.type && (
              <p className="mt-1 text-sm text-red-600">{formErrors.type}</p>
            )}
          </div>
          <Input
            label="Note (optional)"
            type="text"
            value={form.note ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, note: e.target.value || undefined }))
            }
            placeholder="e.g. Holiday hours"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="primary" disabled={adding}>
              {adding ? "Adding..." : "Add exception"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setFormErrors({});
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {exceptions.length > 0 && (
        <ul className="mt-6 space-y-2" aria-label="Upcoming exceptions">
          {exceptions.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
            >
              <div>
                <span className="font-medium text-gray-900">
                  {formatExceptionDate(ex.date)}
                </span>
                <span className="ml-2 text-gray-600">
                  {formatExceptionTime(ex.startTime, ex.endTime)}
                </span>
                <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                  {EXCEPTION_TYPES.find((t) => t.value === ex.type)?.label ??
                    ex.type}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteClick(ex.id)}
                className="text-red-600 hover:text-red-700"
                aria-label={`Delete exception on ${formatExceptionDate(ex.date)}`}
              >
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}

      {exceptions.length === 0 && !showForm && (
        <p className="mt-4 text-sm text-gray-500">
          No exceptions set. Add one-time overrides above.
        </p>
      )}
    </Card>
  );
}
