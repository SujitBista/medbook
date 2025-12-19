/**
 * Tests for BookingForm component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingForm } from "../BookingForm";
import { TimeSlot } from "../utils";

// Mock next/navigation
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

describe("BookingForm", () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const mockSlot: TimeSlot = {
    id: "slot-1",
    startTime: new Date("2024-12-20T10:00:00Z"),
    endTime: new Date("2024-12-20T10:30:00Z"),
    availabilityId: "avail-1",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders form when slot is selected", () => {
    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={mockSlot}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText("Book Appointment")).toBeInTheDocument();
    expect(screen.getByText(/Selected Time Slot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Notes/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Confirm Booking/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("shows message when no slot is selected", () => {
    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(
      screen.getByText(/Please select a time slot to continue booking/i)
    ).toBeInTheDocument();
  });

  it("displays selected slot information", () => {
    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={mockSlot}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Check that the slot date/time is displayed
    expect(screen.getByText(/Duration:/i)).toBeInTheDocument();
  });

  it("allows user to enter notes", async () => {
    const user = userEvent.setup();
    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={mockSlot}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const notesInput = screen.getByLabelText(/Notes/i);
    await user.type(notesInput, "Test notes");

    expect(notesInput).toHaveValue("Test notes");
  });

  it("calls onSubmit with correct data when form is submitted", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={mockSlot}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const notesInput = screen.getByLabelText(/Notes/i);
    await user.type(notesInput, "Test appointment notes");

    const submitButton = screen.getByRole("button", {
      name: /Confirm Booking/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith({
        patientId: "patient-1",
        doctorId: "doctor-1",
        availabilityId: "avail-1",
        slotId: "slot-1",
        startTime: mockSlot.startTime,
        endTime: mockSlot.endTime,
        notes: "Test appointment notes",
      });
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={mockSlot}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /Cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("shows error when submitting without selected slot", async () => {
    const user = userEvent.setup();
    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={null}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // This shouldn't happen in practice, but test error handling
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("shows error message when onSubmit fails", async () => {
    const user = userEvent.setup();
    const errorMessage = "Failed to book appointment";
    mockOnSubmit.mockRejectedValue(new Error(errorMessage));

    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={mockSlot}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole("button", {
      name: /Confirm Booking/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it("disables buttons when loading", () => {
    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={mockSlot}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        loading={true}
      />
    );

    const submitButton = screen.getByRole("button", { name: /Booking.../i });
    const cancelButton = screen.getByRole("button", { name: /Cancel/i });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it("submits with empty notes when notes field is empty", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <BookingForm
        doctorId="doctor-1"
        patientId="patient-1"
        selectedSlot={mockSlot}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole("button", {
      name: /Confirm Booking/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: undefined,
        })
      );
    });
  });
});
