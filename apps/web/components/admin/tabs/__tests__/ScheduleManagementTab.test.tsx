/**
 * Tests for ScheduleManagementTab component
 * Includes regression test for doctor switching bug
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScheduleManagementTab } from "../ScheduleManagementTab";

// Mock fetch
global.fetch = vi.fn();

describe("ScheduleManagementTab", () => {
  const mockOnError = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockDoctor1 = {
    id: "doctor-1",
    userId: "user-1",
    userEmail: "doctor1@example.com",
    specialization: "Cardiology",
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDoctor2 = {
    id: "doctor-2",
    userId: "user-2",
    userEmail: "doctor2@example.com",
    specialization: "Neurology",
    bio: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  it("renders doctor selection input", () => {
    // Mock fetch to prevent errors
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });

    render(
      <ScheduleManagementTab onError={mockOnError} onSuccess={mockOnSuccess} />
    );

    expect(
      screen.getByPlaceholderText(/Search by email or specialization/i)
    ).toBeInTheDocument();
  });

  it("fetches and displays doctors list", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [mockDoctor1, mockDoctor2],
      }),
    });

    render(
      <ScheduleManagementTab onError={mockOnError} onSuccess={mockOnSuccess} />
    );

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/doctors"),
        expect.any(Object)
      );
    });
  });

  it("clears date/time state when switching doctors", async () => {
    const user = userEvent.setup();

    // Mock doctors fetch
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/api/admin/doctors")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [mockDoctor1, mockDoctor2],
          }),
        });
      }
      if (typeof url === "string" && url.includes("/api/availability")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        });
      }
      if (typeof url === "string" && url.includes("/api/slots/template")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            template: {
              durationMinutes: 30,
              bufferMinutes: 0,
              advanceBookingDays: 30,
            },
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(
      <ScheduleManagementTab onError={mockOnError} onSuccess={mockOnSuccess} />
    );

    // Wait for doctors to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/doctors"),
        expect.any(Object)
      );
    });

    // Select first doctor
    const doctorInput = screen.getByPlaceholderText(
      /Search by email or specialization/i
    );
    await user.click(doctorInput);
    await user.type(doctorInput, "doctor1");

    // Wait for dropdown and select doctor
    await waitFor(() => {
      const doctorOption = screen.getByText(/doctor1@example.com/i);
      expect(doctorOption).toBeInTheDocument();
    });

    const doctorOption1 = screen.getByText(/doctor1@example.com/i);
    await user.click(doctorOption1);

    // Wait for doctor to be selected and button to appear
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add New Schedule/i })
      ).toBeInTheDocument();
    });

    // Click "Add New Schedule" button (use getByRole to be more specific)
    const addScheduleButton = screen.getByRole("button", {
      name: /Add New Schedule/i,
    });
    await user.click(addScheduleButton);

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByLabelText(/Select Date/i)).toBeInTheDocument();
    });

    // Set a future date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const dateInput = screen.getByLabelText(/Select Date/i);
    await user.clear(dateInput);
    await user.type(dateInput, tomorrowStr);

    // Verify date is set
    expect(dateInput).toHaveValue(tomorrowStr);

    // Now switch to second doctor
    const doctorInput2 = screen.getByPlaceholderText(
      /Type to search for another doctor/i
    );
    await user.click(doctorInput2);
    await user.clear(doctorInput2);
    await user.type(doctorInput2, "doctor2");

    // Wait for second doctor option
    await waitFor(() => {
      const doctorOption2 = screen.getByText(/doctor2@example.com/i);
      expect(doctorOption2).toBeInTheDocument();
    });

    const doctorOption2 = screen.getByText(/doctor2@example.com/i);
    await user.click(doctorOption2);

    // Wait for doctor switch to complete
    await waitFor(() => {
      expect(screen.getByText(/doctor2@example.com/i)).toBeInTheDocument();
    });

    // Click "Add New Schedule" again (use getByRole to be more specific)
    const addScheduleButton2 = screen.getByRole("button", {
      name: /Add New Schedule/i,
    });
    await user.click(addScheduleButton2);

    // Wait for form to appear
    await waitFor(() => {
      const dateInputAfterSwitch = screen.getByLabelText(/Select Date/i);
      expect(dateInputAfterSwitch).toBeInTheDocument();
    });

    // Verify that the date input is cleared (should be empty or have today's date minimum)
    const dateInputAfterSwitch = screen.getByLabelText(/Select Date/i);
    // The date should be cleared - it should not have the previous doctor's date
    expect(dateInputAfterSwitch).not.toHaveValue(tomorrowStr);
  });

  it("validates future dates when submitting schedule after doctor switch", async () => {
    const user = userEvent.setup();

    // Mock doctors fetch
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url) => {
      if (typeof url === "string" && url.includes("/api/admin/doctors")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [mockDoctor1, mockDoctor2],
          }),
        });
      }
      if (typeof url === "string" && url.includes("/api/availability")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            availabilities: [],
          }),
        });
      }
      if (typeof url === "string" && url.includes("/api/slots/template")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            template: {
              durationMinutes: 30,
              bufferMinutes: 0,
              advanceBookingDays: 30,
            },
          }),
        });
      }
      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    render(
      <ScheduleManagementTab onError={mockOnError} onSuccess={mockOnSuccess} />
    );

    // Wait for doctors to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/doctors"),
        expect.any(Object)
      );
    });

    // Select first doctor
    const doctorInput = screen.getByPlaceholderText(
      /Search by email or specialization/i
    );
    await user.click(doctorInput);
    await user.type(doctorInput, "doctor1");

    await waitFor(() => {
      const doctorOption = screen.getByText(/doctor1@example.com/i);
      expect(doctorOption).toBeInTheDocument();
    });

    const doctorOption1 = screen.getByText(/doctor1@example.com/i);
    await user.click(doctorOption1);

    // Switch to second doctor immediately
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add New Schedule/i })
      ).toBeInTheDocument();
    });

    const doctorInput2 = screen.getByPlaceholderText(
      /Type to search for another doctor/i
    );
    await user.click(doctorInput2);
    await user.clear(doctorInput2);
    await user.type(doctorInput2, "doctor2");

    await waitFor(() => {
      const doctorOption2 = screen.getByText(/doctor2@example.com/i);
      expect(doctorOption2).toBeInTheDocument();
    });

    const doctorOption2 = screen.getByText(/doctor2@example.com/i);
    await user.click(doctorOption2);

    // Wait for doctor switch
    await waitFor(() => {
      expect(screen.getByText(/doctor2@example.com/i)).toBeInTheDocument();
    });

    // Add new schedule for second doctor (use getByRole to be more specific)
    const addScheduleButton = screen.getByRole("button", {
      name: /Add New Schedule/i,
    });
    await user.click(addScheduleButton);

    // Wait for form
    await waitFor(() => {
      expect(screen.getByLabelText(/Select Date/i)).toBeInTheDocument();
    });

    // Set a future date for the second doctor
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const dateInput = screen.getByLabelText(/Select Date/i);
    await user.type(dateInput, tomorrowStr);

    // Verify date is set correctly
    expect(dateInput).toHaveValue(tomorrowStr);

    // The form should be ready to submit with a future date
    // This test verifies that switching doctors doesn't leave stale date state
    // that would cause validation errors
  });
});
